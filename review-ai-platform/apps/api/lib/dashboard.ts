import { prisma } from "@review-ai/db";
import type { AnalysisType, DashboardDTO, DashboardScoreKind } from "@review-ai/shared";
import { buildDashboardSnapshot } from "@review-ai/shared";
import { findAnalysisRunForResults } from "@/lib/analysis-runs";

function scoreMeta(analysisType: AnalysisType): { scoreKind: DashboardScoreKind; scoreLabel: string; scoreDescription: string } {
  if (analysisType === "video") {
    return {
      scoreKind: "support_index",
      scoreLabel: "观众支持度",
      scoreDescription: "正向观众占比与负向争议占比的净差"
    };
  }
  if (analysisType === "tweet") {
    return {
      scoreKind: "stance_index",
      scoreLabel: "舆情支持度",
      scoreDescription: "支持立场占比与反对/风险占比的净差"
    };
  }
  return {
    scoreKind: "nps",
    scoreLabel: "NPS",
    scoreDescription: "推荐者与批评者净差"
  };
}

export async function buildDashboardForTask(taskId: string, requestedRunId?: string | null): Promise<DashboardDTO> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { analysisType: true } });
  const analysisType = ((task?.analysisType as AnalysisType | null) || "product");
  const metric = scoreMeta(analysisType);
  const latestRun = await findAnalysisRunForResults(taskId, requestedRunId);

  if (!latestRun) {
    const reviews = await prisma.review.count({ where: { taskId } });
    return {
      taskId,
      runId: null,
      reviewCount: reviews,
      negativeCount: 0,
      avgRating: 0,
      nps: 0,
      scoreKind: metric.scoreKind,
      scoreLabel: metric.scoreLabel,
      scoreDescription: metric.scoreDescription,
      npsBreakdown: [],
      ratingSentiment: [1, 2, 3, 4, 5].map((ratingStar) => ({
        ratingStar,
        positive: 0,
        neutral: 0,
        negative: 0
      })),
      ratingDistribution: [1, 2, 3, 4, 5].map((star) => ({ star, count: 0 })),
      sentimentDistribution: [
        { sentiment: "positive", count: 0, percent: 0 },
        { sentiment: "neutral", count: 0, percent: 0 },
        { sentiment: "negative", count: 0, percent: 0 }
      ],
      sourceDistribution: [],
      intentDistribution: [],
      insightClusters: [],
      qualityAlerts: [],
      contentProfile: {
        primaryCategory: analysisType === "video" ? "视频综合讨论" : analysisType === "tweet" ? "社媒综合讨论" : "商品综合体验",
        categoryDistribution: [],
        valuableCommentCount: 0,
        lowValueCommentCount: 0,
        lowValueCommentRate: 0
      },
      dynamicContentTags: [],
      duplicateProfile: {
        duplicateGroupCount: 0,
        duplicateCommentCount: 0,
        duplicateRate: 0,
        largestGroupPercent: 0,
        topGroups: []
      },
      wordCloud: [],
      issues: [],
      representativeReviews: { positive: [], negative: [] },
      trend: [],
      userProfile: {
        mediaRate: 0,
        needsAttentionCount: 0,
        needsAttentionRate: 0,
        reviewDepth: [],
        sentimentIntensity: [],
        variantDistribution: [],
        hourDistribution: []
      },
      productInsights: null,
      aiSummary: null
    };
  }

  if (latestRun.dashboardSnapshot) {
    const snapshot = latestRun.dashboardSnapshot as unknown as Partial<DashboardDTO>;
    return {
      scoreKind: metric.scoreKind,
      scoreLabel: metric.scoreLabel,
      scoreDescription: metric.scoreDescription,
      intentDistribution: [],
      insightClusters: [],
      qualityAlerts: [],
      contentProfile: {
        primaryCategory: analysisType === "video" ? "视频综合讨论" : analysisType === "tweet" ? "社媒综合讨论" : "商品综合体验",
        categoryDistribution: [],
        valuableCommentCount: snapshot.reviewCount || 0,
        lowValueCommentCount: 0,
        lowValueCommentRate: 0
      },
      dynamicContentTags: [],
      duplicateProfile: {
        duplicateGroupCount: 0,
        duplicateCommentCount: 0,
        duplicateRate: 0,
        largestGroupPercent: 0,
        topGroups: []
      },
      ...snapshot
    } as DashboardDTO;
  }

  const analyses = await prisma.reviewAnalysis.findMany({
    where: { runId: latestRun.id },
    include: { review: true }
  });

  if (!analyses.length) {
    throw new Error("当前分析结果为空");
  }

  return buildDashboardSnapshot(taskId, analyses, analysisType);
}
