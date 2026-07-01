import { Prisma, prisma } from "@review-ai/db";
import { buildCrawlQueueJobId, QUEUE_JOB_CLEANUP_OPTIONS } from "@review-ai/shared";
import { writeAuditLog } from "@/lib/audit-log";
import { attachCrawlQueuePosition } from "@/lib/crawl-job-queue";
import { fail, ok } from "@/lib/http";
import { getCrawlQueue } from "@/lib/queue";
import { serializeCrawlJob } from "@/lib/serializers";
import { canAccessAllWorkspaces, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const allowGlobalAccess = canAccessAllWorkspaces(workspaceContext);
  const job = await prisma.crawlJob.findFirst({
    where: allowGlobalAccess ? { id: jobId } : { id: jobId, workspaceId: workspaceContext.workspace.id }
  });
  if (!job) {
    return fail("爬取任务不存在或不属于当前空间", 404);
  }
  if (job.status !== "failed") {
    return fail("只有失败的采集任务可以重试", 400);
  }

  const updated = await prisma.crawlJob.update({
    where: { id: job.id },
    data: {
      status: "queued",
      progress: 0,
      fetchedRows: 0,
      importedRows: 0,
      skippedDuplicate: 0,
      crawlChannel: null,
      crawlChannelLabel: null,
      lastError: null,
      rawResult: Prisma.JsonNull,
      startedAt: null,
      finishedAt: null
    }
  });
  if (job.monitorId) {
    await prisma.crawlMonitor.updateMany({
      where: { id: job.monitorId, workspaceId: job.workspaceId },
      data: { lastError: null }
    });
  }

  await getCrawlQueue().add(
    "run-crawl",
    {
      crawlJobId: updated.id,
      workspaceId: job.workspaceId
    },
    {
      jobId: buildCrawlQueueJobId(updated.id),
      ...QUEUE_JOB_CLEANUP_OPTIONS
    }
  );

  await writeAuditLog(request, {
    workspaceId: job.workspaceId,
    actor: workspaceContext.user,
    action: "crawl_job.retry",
    targetType: "crawl_job",
    targetId: job.id,
    targetLabel: job.name || job.productName || job.normalizedUrl,
    metadata: {
      previousError: job.lastError || null,
      sourceChannel: job.sourceChannel,
      platform: job.platform
    }
  });

  return ok(serializeCrawlJob(await attachCrawlQueuePosition(updated)));
}
