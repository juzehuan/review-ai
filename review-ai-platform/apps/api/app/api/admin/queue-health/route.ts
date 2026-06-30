import type { Queue } from "bullmq";
import type { QueueFailureDTO, QueueHealthDTO, QueueSnapshotDTO, WorkloadHealthSnapshotDTO } from "@review-ai/shared";
import { prisma } from "@review-ai/db";
import { requireSuperAdmin } from "@/lib/auth";
import { ok } from "@/lib/http";
import { getAnalysisQueue, getCrawlQueue } from "@/lib/queue";

const CRAWL_STALL_SECONDS = 180;
const ANALYSIS_STALL_SECONDS = 300;

async function readQueueSnapshot(name: string, label: string, queue: Queue): Promise<QueueSnapshotDTO> {
  try {
    const counts = await queue.getJobCounts("waiting", "active", "delayed", "failed", "completed", "paused", "waiting-children");
    const isPaused = await queue.isPaused();
    const waiting = counts.waiting || 0;
    const active = counts.active || 0;
    const delayed = counts.delayed || 0;
    const failed = counts.failed || 0;
    const paused = counts.paused || 0;
    const waitingChildren = counts["waiting-children"] || 0;
    return {
      name,
      label,
      waiting,
      active,
      delayed,
      failed,
      completed: counts.completed || 0,
      paused,
      waitingChildren,
      pending: waiting + active + delayed + paused + waitingChildren,
      isPaused,
      error: null
    };
  } catch (error) {
    return {
      name,
      label,
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0,
      completed: 0,
      paused: 0,
      waitingChildren: 0,
      pending: 0,
      isPaused: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function secondsAgo(seconds: number) {
  return new Date(Date.now() - seconds * 1000);
}

async function readCrawlWorkloadSnapshot(): Promise<WorkloadHealthSnapshotDTO> {
  const activeStatuses = ["queued", "running"] as const;
  const stalledBefore = secondsAgo(CRAWL_STALL_SECONDS);
  const [queued, running, failed, stalled, oldestActive, lastFailure] = await Promise.all([
    prisma.crawlJob.count({ where: { status: "queued" } }),
    prisma.crawlJob.count({ where: { status: "running" } }),
    prisma.crawlJob.count({ where: { status: "failed" } }),
    prisma.crawlJob.count({
      where: {
        status: { in: [...activeStatuses] },
        updatedAt: { lt: stalledBefore }
      }
    }),
    prisma.crawlJob.findFirst({
      where: { status: { in: [...activeStatuses] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true }
    }),
    prisma.crawlJob.findFirst({
      where: { status: "failed" },
      orderBy: [{ finishedAt: "desc" }, { updatedAt: "desc" }],
      select: { finishedAt: true, updatedAt: true }
    })
  ]);

  return {
    name: "crawl-jobs",
    label: "采集任务库",
    queued,
    running,
    failed,
    stalled,
    oldestActiveCreatedAt: oldestActive?.createdAt.toISOString() || null,
    lastFailureAt: (lastFailure?.finishedAt || lastFailure?.updatedAt)?.toISOString() || null
  };
}

async function readAnalysisWorkloadSnapshot(): Promise<WorkloadHealthSnapshotDTO> {
  const activeStatuses = ["queued", "running"] as const;
  const failedStatuses = ["failed", "partial_failed"] as const;
  const stalledBefore = secondsAgo(ANALYSIS_STALL_SECONDS);
  const [queued, running, failed, stalled, oldestActive, lastFailure] = await Promise.all([
    prisma.analysisRun.count({ where: { status: "queued" } }),
    prisma.analysisRun.count({ where: { status: "running" } }),
    prisma.analysisRun.count({ where: { status: { in: [...failedStatuses] } } }),
    prisma.analysisRun.count({
      where: {
        status: { in: [...activeStatuses] },
        createdAt: { lt: stalledBefore },
        logs: { none: { createdAt: { gte: stalledBefore } } }
      }
    }),
    prisma.analysisRun.findFirst({
      where: { status: { in: [...activeStatuses] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true }
    }),
    prisma.analysisRun.findFirst({
      where: { status: { in: [...failedStatuses] } },
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      select: { finishedAt: true, createdAt: true }
    })
  ]);

  return {
    name: "analysis-runs",
    label: "AI 分析批次库",
    queued,
    running,
    failed,
    stalled,
    oldestActiveCreatedAt: oldestActive?.createdAt.toISOString() || null,
    lastFailureAt: (lastFailure?.finishedAt || lastFailure?.createdAt)?.toISOString() || null
  };
}

async function readRecentFailures(limit = 12): Promise<QueueFailureDTO[]> {
  const [crawlFailures, analysisFailures] = await Promise.all([
    prisma.crawlJob.findMany({
      where: { status: "failed" },
      orderBy: [{ finishedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        task: { select: { id: true, name: true, productName: true } }
      }
    }),
    prisma.analysisRun.findMany({
      where: { status: { in: ["failed", "partial_failed"] } },
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        task: {
          select: {
            id: true,
            name: true,
            productName: true,
            sourceChannel: true,
            workspaceId: true,
            workspace: { select: { id: true, name: true, slug: true } }
          }
        }
      }
    })
  ]);

  return [
    ...crawlFailures.map((job) => ({
      id: job.id,
      kind: "crawl" as const,
      status: job.status,
      label: job.name || job.productName || job.normalizedUrl,
      workspaceId: job.workspaceId,
      workspaceName: job.workspace.name,
      workspaceSlug: job.workspace.slug,
      taskId: job.taskId,
      taskName: job.task?.name || job.task?.productName || null,
      sourceChannel: job.sourceChannel || job.platform || null,
      modelName: null,
      error: job.lastError,
      failedAt: (job.finishedAt || job.updatedAt).toISOString()
    })),
    ...analysisFailures.map((run) => ({
      id: run.id,
      kind: "analysis" as const,
      status: run.status,
      label: run.task?.name || run.task?.productName || run.id,
      workspaceId: run.task?.workspaceId || null,
      workspaceName: run.task?.workspace?.name || null,
      workspaceSlug: run.task?.workspace?.slug || null,
      taskId: run.taskId,
      taskName: run.task?.name || run.task?.productName || null,
      sourceChannel: run.task?.sourceChannel || null,
      modelName: run.modelName,
      error: run.lastError,
      failedAt: (run.finishedAt || run.createdAt).toISOString()
    }))
  ]
    .sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime())
    .slice(0, limit);
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const workloadPromise = Promise.all([readAnalysisWorkloadSnapshot(), readCrawlWorkloadSnapshot()]);
  const recentFailuresPromise = readRecentFailures();
  const queues = await Promise.all([
    readQueueSnapshot("analysis-runs", "AI 分析队列", getAnalysisQueue()),
    readQueueSnapshot("crawl-jobs", "评论采集队列", getCrawlQueue())
  ]);

  const workloads = await workloadPromise;
  const recentFailures = await recentFailuresPromise;

  return ok<QueueHealthDTO>({
    queues,
    workloads,
    recentFailures,
    updatedAt: new Date().toISOString()
  });
}
