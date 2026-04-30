import { prisma } from "@review-ai/db";
import { NextResponse } from "next/server";
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

  const aiConfig = await prisma.aiConfig.findUnique({ where: { id: "singleton" } });
  if (!aiConfig?.apiKey || !aiConfig.apiKey.trim()) {
    return NextResponse.json(
      {
        message: "尚未配置 AI 模型 API Key，请前往「AI 设置」填写后再发起分析。",
        code: "ai_config_missing"
      },
      { status: 400 }
    );
  }
  if (!aiConfig.modelName || !aiConfig.modelName.trim()) {
    return NextResponse.json(
      {
        message: "尚未选择 AI 模型，请前往「AI 设置」选择模型后再发起分析。",
        code: "ai_config_missing"
      },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const modelName = String(body.modelName || aiConfig.modelName);
  const promptVersion = String(body.promptVersion || "v2-thai");

  const reviewCount = await prisma.review.count({ where: { taskId } });
  if (reviewCount === 0) {
    return fail("当前任务没有可分析的评论。", 400);
  }
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
