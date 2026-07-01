import { Queue, type JobType } from "bullmq";
import { getRedis } from "./redis";

let analysisQueue: Queue | null = null;
let crawlQueue: Queue | null = null;
const REMOVABLE_JOB_TYPES: JobType[] = ["waiting", "delayed", "prioritized", "waiting-children", "paused"];

export function getAnalysisQueue() {
  if (!analysisQueue) {
    analysisQueue = new Queue("analysis-runs", {
      connection: getRedis()
    });
  }

  return analysisQueue;
}

export function getCrawlQueue() {
  if (!crawlQueue) {
    crawlQueue = new Queue("crawl-jobs", {
      connection: getRedis()
    });
  }

  return crawlQueue;
}

export async function removePendingQueueJobsByData(queue: Queue, dataKey: string, dataValue: string) {
  const jobs = await queue.getJobs(REMOVABLE_JOB_TYPES, 0, 500);
  let removedCount = 0;

  for (const job of jobs) {
    const data = job.data as Record<string, unknown>;
    if (String(data[dataKey] || "") !== dataValue) {
      continue;
    }
    try {
      await job.remove();
      removedCount += 1;
    } catch (error) {
      console.warn(`Failed to remove pending queue job ${job.id}`, error);
    }
  }

  return removedCount;
}
