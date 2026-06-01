import { prisma } from "@review-ai/db";
import type { DashboardDTO } from "@review-ai/shared";
import { buildDashboardSnapshot } from "@review-ai/shared";
import { findAnalysisRunForResults } from "@/lib/analysis-runs";

export async function buildDashboardForTask(taskId: string, requestedRunId?: string | null): Promise<DashboardDTO> {
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
    return latestRun.dashboardSnapshot as unknown as DashboardDTO;
  }

  const analyses = await prisma.reviewAnalysis.findMany({
    where: { runId: latestRun.id },
    include: { review: true }
  });

  if (!analyses.length) {
    throw new Error("当前分析结果为空");
  }

  return buildDashboardSnapshot(taskId, analyses);
}
