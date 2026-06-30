import { prisma } from "@review-ai/db";
import type { Sentiment } from "@review-ai/shared";
import { fail, ok } from "@/lib/http";
import { serializeCorrection } from "@/lib/serializers";
import { findAnalysisRunForResults } from "@/lib/analysis-runs";
import { getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
}

function parseSentiment(value: unknown): Sentiment | null {
  if (value === "positive" || value === "neutral" || value === "negative") {
    return value;
  }
  return null;
}

export async function GET(request: Request, context: { params: Promise<{ taskId: string; reviewId: string }> }) {
  const { taskId, reviewId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response) {
    return scoped.response;
  }

  const corrections = await prisma.reviewCorrection.findMany({
    where: { taskId, reviewId },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return ok(corrections.map(serializeCorrection));
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string; reviewId: string }> }) {
  const { taskId, reviewId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace || !workspaceContext.user) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response) {
    return scoped.response;
  }

  const review = await prisma.review.findFirst({ where: { id: reviewId, taskId } });
  if (!review) {
    return fail("评论不存在或不属于当前任务。", 404);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const requestedRunId = typeof body.runId === "string" && body.runId ? body.runId : null;
  const targetRun = await findAnalysisRunForResults(taskId, requestedRunId);
  const runId = targetRun?.id || null;
  if (requestedRunId && !targetRun) {
    return fail("分析批次不存在或不属于当前任务。", 404);
  }
  const sentiment = parseSentiment(body.sentiment);
  const summary = String(body.summary || "").trim().slice(0, 1000);
  const suggestion = String(body.suggestion || "").trim().slice(0, 1000);
  const note = String(body.note || "").trim().slice(0, 1000);
  const topicLabels = stringArray(body.topicLabels);
  const painPoints = stringArray(body.painPoints);
  const highlights = stringArray(body.highlights);

  if (!sentiment && !summary && !suggestion && !note && !topicLabels.length && !painPoints.length && !highlights.length) {
    return fail("请至少填写一项纠错内容。");
  }

  const correction = await prisma.reviewCorrection.create({
    data: {
      taskId,
      reviewId,
      runId,
      createdByUserId: workspaceContext.user.id,
      sentiment,
      summary,
      suggestion,
      note,
      topicLabels,
      painPoints,
      highlights
    },
    include: { createdBy: true }
  });

  if (runId) {
    await prisma.reviewAnalysis.updateMany({
      where: { runId, reviewId },
      data: {
        ...(sentiment ? { sentiment } : {}),
        ...(summary ? { summary } : {}),
        ...(suggestion ? { suggestion } : {}),
        ...(topicLabels.length ? { topicLabels } : {}),
        ...(painPoints.length ? { painPoints, needsAttention: true } : {}),
        ...(highlights.length ? { highlights } : {})
      }
    });
  }

  return ok(serializeCorrection(correction), 201);
}
