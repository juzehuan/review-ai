import { prisma } from "@review-ai/db";
import { getAnalysisQueue } from "@/lib/queue";
import { fail, ok } from "@/lib/http";
import { serializeRun } from "@/lib/serializers";

export async function GET(_: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const runs = await prisma.analysisRun.findMany({
    where: { taskId },
    orderBy: { startedAt: "desc" }
  });
  return ok(runs.map(serializeRun));
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task) {
    return fail("任务不存在", 404);
  }

  const body = await request.json().catch(() => ({}));
  const modelName = String(body.modelName || process.env.OPENAI_MODEL || "gpt-4.1-mini");
  const promptVersion = String(body.promptVersion || "v2-thai");

  const reviewCount = await prisma.review.count({ where: { taskId } });
  const run = await prisma.analysisRun.create({
    data: {
      taskId,
      provider: "openai",
      modelName,
      promptVersion,
      status: "queued",
      reviewCount
    }
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "analyzing" }
  });

  await getAnalysisQueue().add("run-analysis", {
    runId: run.id,
    taskId
  });

  return ok(serializeRun(run), 201);
}
