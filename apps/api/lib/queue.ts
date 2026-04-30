import { Queue } from "bullmq";
import { getRedis } from "./redis";

let queue: Queue | null = null;

export function getAnalysisQueue() {
  if (!queue) {
    queue = new Queue("analysis-runs", {
      connection: getRedis()
    });
  }

  return queue;
}
