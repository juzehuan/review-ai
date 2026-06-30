import type { Queue } from "bullmq";
import type { QueueHealthDTO, QueueSnapshotDTO } from "@review-ai/shared";
import { requireSuperAdmin } from "@/lib/auth";
import { ok } from "@/lib/http";
import { getAnalysisQueue, getCrawlQueue } from "@/lib/queue";

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

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const queues = await Promise.all([
    readQueueSnapshot("analysis-runs", "AI 分析队列", getAnalysisQueue()),
    readQueueSnapshot("crawl-jobs", "评论采集队列", getCrawlQueue())
  ]);

  return ok<QueueHealthDTO>({
    queues,
    updatedAt: new Date().toISOString()
  });
}
