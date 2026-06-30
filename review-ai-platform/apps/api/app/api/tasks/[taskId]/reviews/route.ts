import { Prisma, prisma } from "@review-ai/db";
import type { ReviewListFacetsDTO, ReviewListResponseDTO, ReviewListStatsDTO } from "@review-ai/shared";
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
  const scoped = await requireScopedTask(taskId, workspace.id, workspaceContext.user?.isSuperAdmin);
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
  const sourceChannelRowsPromise = prisma.review.findMany({
    where: { taskId },
    distinct: ["sourceChannel"],
    select: { sourceChannel: true }
  });

  const run = await findAnalysisRunForResults(taskId, searchParams.get("runId"));
  const analysisFacetRowsPromise = run
    ? prisma.reviewAnalysis.findMany({
        where: { runId: run.id, review: { taskId } },
        select: { intentLabels: true, topicLabels: true }
      })
    : Promise.resolve([]);
  const hasAnalysisFilter = Boolean(sentiment || issue || intent || tag || needsAttention !== null);
  if (hasAnalysisFilter && !run) {
    const facets = buildReviewFacets(await sourceChannelRowsPromise, []);
    return ok<ReviewListResponseDTO>({ total: 0, page, pageSize, items: [], facets, stats: emptyReviewStats() });
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

  const baseAnalysisFilter: Prisma.ReviewAnalysisWhereInput | null = run
    ? {
        runId: run.id,
        ...(issue ? { painPoints: { has: issue } } : {}),
        ...(intent ? { intentLabels: { has: intent } } : {}),
        ...(tag ? { topicLabels: { has: tag } } : {}),
        ...(needsAttention !== null ? { needsAttention: needsAttention === "true" } : {})
      }
    : null;
  const analysisFilter: Prisma.ReviewAnalysisWhereInput | null = baseAnalysisFilter
    ? {
        ...baseAnalysisFilter,
        ...(sentiment ? { sentiment: sentiment as never } : {})
      }
    : null;
  const analysisWhere: Prisma.ReviewAnalysisWhereInput | null = analysisFilter
    ? { ...analysisFilter, review: baseWhere }
    : null;
  const reviewWhere: Prisma.ReviewWhereInput = {
    ...baseWhere,
    ...(analysisFilter ? { analyses: { some: analysisFilter } } : {})
  };
  const statsPromise = readReviewListStats({
    baseWhere,
    reviewWhere,
    baseAnalysisFilter,
    sentiment,
    hasMedia
  });

  if (sortBy === "sentimentScore" && analysisWhere) {
    const [sourceChannelRows, analysisFacetRows, stats, total, analyses] = await Promise.all([
      sourceChannelRowsPromise,
      analysisFacetRowsPromise,
      statsPromise,
      prisma.reviewAnalysis.count({ where: analysisWhere }),
      prisma.reviewAnalysis.findMany({
        where: analysisWhere,
        include: { review: { include: { task: true } } },
        orderBy: { sentimentScore: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return ok<ReviewListResponseDTO>({
      total,
      page,
      pageSize,
      facets: buildReviewFacets(sourceChannelRows, analysisFacetRows),
      stats,
      items: analyses.map((analysis) => serializeReviewRow({ ...analysis.review, analyses: [analysis] }))
    });
  }

  const orderBy: Prisma.ReviewOrderByWithRelationInput =
    sortBy === "ratingStar" ? { ratingStar: sortOrder } : { commentTime: sortOrder };

  const [sourceChannelRows, analysisFacetRows, stats, total, reviews] = await Promise.all([
    sourceChannelRowsPromise,
    analysisFacetRowsPromise,
    statsPromise,
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

  return ok<ReviewListResponseDTO>({
    total,
    page,
    pageSize,
    facets: buildReviewFacets(sourceChannelRows, analysisFacetRows),
    stats,
    items: reviews.map(serializeReviewRow)
  });
}

function emptyReviewStats(): ReviewListStatsDTO {
  return { mediaCount: 0, negativeCount: 0 };
}

async function readReviewListStats({
  baseWhere,
  reviewWhere,
  baseAnalysisFilter,
  sentiment,
  hasMedia
}: {
  baseWhere: Prisma.ReviewWhereInput;
  reviewWhere: Prisma.ReviewWhereInput;
  baseAnalysisFilter: Prisma.ReviewAnalysisWhereInput | null;
  sentiment: string | null;
  hasMedia: string | null;
}): Promise<ReviewListStatsDTO> {
  const mediaCountPromise =
    hasMedia !== null && hasMedia !== "true"
      ? Promise.resolve(0)
      : prisma.review.count({
          where: {
            ...reviewWhere,
            hasMedia: true
          }
        });

  const negativeCountPromise =
    !baseAnalysisFilter || (sentiment && sentiment !== "negative")
      ? Promise.resolve(0)
      : prisma.reviewAnalysis.count({
          where: {
            ...baseAnalysisFilter,
            sentiment: "negative",
            review: baseWhere
          }
        });

  const [mediaCount, negativeCount] = await Promise.all([mediaCountPromise, negativeCountPromise]);
  return { mediaCount, negativeCount };
}

function buildReviewFacets(
  sourceChannelRows: Array<{ sourceChannel: string }>,
  analysisFacetRows: Array<{ intentLabels: string[]; topicLabels: string[] }>
): ReviewListFacetsDTO {
  return {
    sourceChannels: [...new Set(sourceChannelRows.map((item) => item.sourceChannel).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "zh-Hans-CN")
    ),
    intentLabels: sortedUnique(analysisFacetRows.flatMap((item) => item.intentLabels)),
    analysisTags: sortedUnique(analysisFacetRows.flatMap((item) => item.topicLabels))
  };
}

function sortedUnique(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}
