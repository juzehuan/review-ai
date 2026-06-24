import { Prisma, prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { findAnalysisRunForResults } from "@/lib/analysis-runs";
import { buildKeywordReviewWhere } from "@/lib/review-filters";
import { serializeReviewRow } from "@/lib/serializers";
import { getWorkspaceContext, requireScopedTask } from "@/lib/workspace";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const { workspace } = workspaceContext;
  const scoped = await requireScopedTask(taskId, workspace.id);
  if (scoped.response) {
    return scoped.response;
  }

  const { searchParams } = new URL(request.url);
  const sentiment = searchParams.get("sentiment");
  const issue = searchParams.get("issue");
  const intent = searchParams.get("intent");
  const reviewIds = searchParams
    .get("reviewIds")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const tag = searchParams.get("tag");
  const needsAttention = searchParams.get("needsAttention");
  const ratingStar = Number(searchParams.get("ratingStar") || 0);
  const variant = searchParams.get("variant");
  const keyword = searchParams.get("keyword")?.trim() || "";
  const hasMedia = searchParams.get("hasMedia");
  const sourceChannel = searchParams.get("sourceChannel")?.trim() || "";
  const sortBy = searchParams.get("sortBy") || "commentTime";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || 20), 1), 500);

  const run = await findAnalysisRunForResults(taskId, searchParams.get("runId"));
  const hasAnalysisFilter = Boolean(sentiment || issue || intent || tag || needsAttention !== null);
  if (hasAnalysisFilter && !run) {
    return ok({ total: 0, page, pageSize, items: [] });
  }

  const baseWhere: Prisma.ReviewWhereInput = {
    taskId,
    ...(reviewIds?.length ? { id: { in: reviewIds } } : {}),
    ...(ratingStar ? { ratingStar } : {}),
    ...(variant ? { modelName: variant } : {}),
    ...(hasMedia !== null ? { hasMedia: hasMedia === "true" } : {}),
    ...(sourceChannel ? { sourceChannel } : {}),
    ...(keyword ? buildKeywordReviewWhere(keyword, run?.id) : {})
  };

  const analysisFilter: Prisma.ReviewAnalysisWhereInput | null = run
    ? {
        runId: run.id,
        ...(sentiment ? { sentiment: sentiment as never } : {}),
        ...(issue ? { painPoints: { has: issue } } : {}),
        ...(intent ? { intentLabels: { has: intent } } : {}),
        ...(tag ? { topicLabels: { has: tag } } : {}),
        ...(needsAttention !== null ? { needsAttention: needsAttention === "true" } : {})
      }
    : null;
  const analysisWhere: Prisma.ReviewAnalysisWhereInput | null = analysisFilter
    ? { ...analysisFilter, review: baseWhere }
    : null;

  if (sortBy === "sentimentScore" && analysisWhere) {
    const [total, analyses] = await Promise.all([
      prisma.reviewAnalysis.count({ where: analysisWhere }),
      prisma.reviewAnalysis.findMany({
        where: analysisWhere,
        include: { review: { include: { task: true } } },
        orderBy: { sentimentScore: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return ok({
      total,
      page,
      pageSize,
      items: analyses.map((analysis) => serializeReviewRow({ ...analysis.review, analyses: [analysis] }))
    });
  }

  const reviewWhere: Prisma.ReviewWhereInput = {
    ...baseWhere,
    ...(analysisFilter ? { analyses: { some: analysisFilter } } : {})
  };
  const orderBy: Prisma.ReviewOrderByWithRelationInput =
    sortBy === "ratingStar" ? { ratingStar: sortOrder } : { commentTime: sortOrder };

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where: reviewWhere }),
    prisma.review.findMany({
      where: reviewWhere,
      include: {
        task: true,
        analyses: run ? { where: { runId: run.id }, take: 1 } : false
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return ok({
    total,
    page,
    pageSize,
    items: reviews.map(serializeReviewRow)
  });
}
