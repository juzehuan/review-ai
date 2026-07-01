import type { Queue } from "bullmq";
import type { QueueControlResponse } from "@review-ai/shared";
import { writeAuditLog } from "@/lib/audit-log";
import { requireSuperAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getAnalysisQueue, getCrawlQueue } from "@/lib/queue";

type ControllableQueueName = QueueControlResponse["queueName"];
type QueueControlAction = QueueControlResponse["action"];

const QUEUE_LABELS: Record<ControllableQueueName, string> = {
  "analysis-runs": "AI 分析队列",
  "crawl-jobs": "评论采集队列"
};

function readPayload(value: unknown): { queueName: ControllableQueueName | null; action: QueueControlAction | null } {
  const body = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const queueName =
    body.queueName === "analysis-runs" || body.queueName === "crawl-jobs" ? body.queueName : null;
  const action = body.action === "pause" || body.action === "resume" ? body.action : null;
  return { queueName, action };
}

function queueByName(queueName: ControllableQueueName): Queue {
  return queueName === "analysis-runs" ? getAnalysisQueue() : getCrawlQueue();
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { queueName, action } = readPayload(await request.json().catch(() => null));
  if (!queueName || !action) {
    return fail("缺少队列名称或控制动作", 400);
  }

  const queue = queueByName(queueName);
  if (action === "pause") {
    await queue.pause();
  } else {
    await queue.resume();
  }

  const isPaused = await queue.isPaused();
  await writeAuditLog(request, {
    actor: auth.user,
    action: `queue.${action}`,
    targetType: "queue",
    targetId: queueName,
    targetLabel: QUEUE_LABELS[queueName],
    metadata: {
      queueName,
      isPaused
    }
  });

  return ok<QueueControlResponse>({
    queueName,
    action,
    isPaused
  });
}
