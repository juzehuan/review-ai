import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { serializeRun } from "@/lib/serializers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string; runId: string }> }
) {
  const { taskId, runId } = await context.params;
  const body = await request.json().catch(() => ({}));

  if (body.action !== "cancel") {
    return fail("Unknown action", 400);
  }

  const run = await prisma.analysisRun.findFirst({ where: { id: runId, taskId } });
  if (!run) return fail("Run not found", 404);
  if (!["queued", "running"].includes(run.status)) {
    return fail("Run is not in a cancellable state", 400);
  }

  const updated = await prisma.analysisRun.update({
    where: { id: runId },
    data: {
      status: "failed",
      finishedAt: new Date(),
      lastError: "已手动停止分析"
    }
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "imported" }
  });

  return ok(serializeRun(updated));
}
