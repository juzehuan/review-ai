import { prisma } from "@review-ai/db";
import type { QueueIntegrityRepairResponse } from "@review-ai/shared";
import { writeAuditLog } from "@/lib/audit-log";
import { requireSuperAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getAnalysisQueue, getCrawlQueue, hasPendingQueueJobByData } from "@/lib/queue";

function readPayload(value: unknown) {
  const body = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const kind = body.kind === "crawl" || body.kind === "analysis" ? body.kind : null;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  return { kind, id };
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { kind, id } = readPayload(await request.json().catch(() => null));
  if (!kind || !id) {
    return fail("缺少队列恢复类型或任务 ID", 400);
  }

  if (kind === "crawl") {
    const job = await prisma.crawlJob.findUnique({
      where: { id },
      include: { workspace: { select: { id: true, name: true, slug: true } } }
    });
    if (!job) {
      return fail("采集任务不存在", 404);
    }
    if (job.status !== "queued") {
      return fail("只有排队中的采集任务可以补回队列", 400);
    }

    const queue = getCrawlQueue();
    const queueExists = await hasPendingQueueJobByData(queue, "crawlJobId", job.id);
    if (!queueExists) {
      await queue.add("run-crawl", {
        crawlJobId: job.id,
        workspaceId: job.workspaceId,
        ...(job.monitorId ? { monitorId: job.monitorId } : {})
      });
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: { lastError: null }
      });
      if (job.monitorId) {
        await prisma.crawlMonitor.updateMany({
          where: { id: job.monitorId, workspaceId: job.workspaceId },
          data: { lastError: null }
        });
      }
    }

    await writeAuditLog(request, {
      workspaceId: job.workspaceId,
      actor: auth.user,
      action: "queue_integrity.requeue",
      targetType: "crawl_job",
      targetId: job.id,
      targetLabel: job.name || job.productName || job.normalizedUrl,
      metadata: {
        kind,
        queueName: "crawl-jobs",
        queueDataKey: "crawlJobId",
        requeued: !queueExists,
        workspaceSlug: job.workspace.slug,
        sourceChannel: job.sourceChannel,
        platform: job.platform
      }
    });

    return ok<QueueIntegrityRepairResponse>({
      id: job.id,
      kind,
      queueName: "crawl-jobs",
      requeued: !queueExists,
      message: queueExists ? "队列 job 已存在" : "队列 job 已补回"
    });
  }

  const run = await prisma.analysisRun.findUnique({
    where: { id },
    include: {
      task: {
        select: {
          id: true,
          name: true,
          productName: true,
          workspaceId: true,
          sourceChannel: true,
          workspace: { select: { id: true, name: true, slug: true } }
        }
      }
    }
  });
  if (!run) {
    return fail("分析批次不存在", 404);
  }
  if (run.status !== "queued") {
    return fail("只有排队中的分析批次可以补回队列", 400);
  }

  const queue = getAnalysisQueue();
  const queueExists = await hasPendingQueueJobByData(queue, "runId", run.id);
  if (!queueExists) {
    await queue.add("run-analysis", {
      runId: run.id,
      taskId: run.taskId,
      workspaceId: run.task.workspaceId
    });
    await prisma.$transaction([
      prisma.task.update({
        where: { id: run.taskId },
        data: { status: "analyzing" }
      }),
      prisma.analysisRunLog.create({
        data: {
          runId: run.id,
          level: "info",
          message: "Analysis run requeued by queue integrity repair",
          meta: { queueName: "analysis-runs", queueDataKey: "runId" }
        }
      })
    ]);
  }

  await writeAuditLog(request, {
    workspaceId: run.task.workspaceId,
    actor: auth.user,
    action: "queue_integrity.requeue",
    targetType: "analysis_run",
    targetId: run.id,
    targetLabel: run.task.name || run.task.productName || run.id,
    metadata: {
      kind,
      queueName: "analysis-runs",
      queueDataKey: "runId",
      requeued: !queueExists,
      taskId: run.taskId,
      workspaceSlug: run.task.workspace?.slug || null,
      sourceChannel: run.task.sourceChannel,
      modelName: run.modelName
    }
  });

  return ok<QueueIntegrityRepairResponse>({
    id: run.id,
    kind: "analysis",
    queueName: "analysis-runs",
    requeued: !queueExists,
    message: queueExists ? "队列 job 已存在" : "队列 job 已补回"
  });
}
