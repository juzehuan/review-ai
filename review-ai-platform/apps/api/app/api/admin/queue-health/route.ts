import type { Queue } from "bullmq";
import type { QueueHealthDTO, QueueSnapshotDTO, WorkloadHealthSnapshotDTO } from "@review-ai/shared";
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

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const workloadPromise = Promise.all([readAnalysisWorkloadSnapshot(), readCrawlWorkloadSnapshot()]);
  const queues = await Promise.all([
    readQueueSnapshot("analysis-runs", "AI 分析队列", getAnalysisQueue()),
    readQueueSnapshot("crawl-jobs", "评论采集队列", getCrawlQueue())
  ]);

  const workloads = await workloadPromise;

  return ok<QueueHealthDTO>({
    queues,
    workloads,
    updatedAt: new Date().toISOString()
  });
}
