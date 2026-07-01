import { Queue, type Job, type JobType } from "bullmq";
import { getRedis } from "./redis";

let analysisQueue: Queue | null = null;
let crawlQueue: Queue | null = null;
const REMOVABLE_JOB_TYPES: JobType[] = ["waiting", "delayed", "prioritized", "waiting-children", "paused"];
const PENDING_QUEUE_SCAN_BATCH_SIZE = 500;
const PENDING_QUEUE_SCAN_LIMIT = 10000;

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
  const jobsToRemove: Job[] = [];
  const seenJobIds = new Set<string>();
  let removedCount = 0;

  for (let start = 0; start < PENDING_QUEUE_SCAN_LIMIT; start += PENDING_QUEUE_SCAN_BATCH_SIZE) {
    const end = Math.min(start + PENDING_QUEUE_SCAN_BATCH_SIZE - 1, PENDING_QUEUE_SCAN_LIMIT - 1);
    const jobs = await queue.getJobs(REMOVABLE_JOB_TYPES, start, end, true);
    for (const job of jobs) {
      const jobId = String(job.id || "");
      const data = job.data as Record<string, unknown>;
      if (seenJobIds.has(jobId) || String(data[dataKey] || "") !== dataValue) {
        continue;
      }
      seenJobIds.add(jobId);
      jobsToRemove.push(job);
    }
    if (jobs.length < PENDING_QUEUE_SCAN_BATCH_SIZE) {
      break;
    }
  }

  for (const job of jobsToRemove) {
    try {
      await job.remove();
      removedCount += 1;
    } catch (error) {
      console.warn(`Failed to remove pending queue job ${job.id}`, error);
    }
  }

  return removedCount;
}
