import { Queue } from "bullmq";
import { getRedis } from "./redis";

let analysisQueue: Queue | null = null;
let crawlQueue: Queue | null = null;

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
