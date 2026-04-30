import { prisma } from "@review-ai/db";
import type { DashboardDTO } from "@review-ai/shared";
import { buildDashboardSnapshot } from "@review-ai/shared";
import { fail, ok } from "@/lib/http";

export async function GET(_: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const latestRun = await prisma.analysisRun.findFirst({
    where: { taskId },
    orderBy: { startedAt: "desc" }
  });

  if (!latestRun) {
    const reviews = await prisma.review.count({ where: { taskId } });
    const empty: DashboardDTO = {
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
    return ok(empty);
  }

  if (latestRun.dashboardSnapshot) {
    return ok(latestRun.dashboardSnapshot);
  }

  const analyses = await prisma.reviewAnalysis.findMany({
    where: { runId: latestRun.id },
    include: { review: true }
  });

  if (!analyses.length) {
    return fail("当前分析结果为空", 404);
  }

  return ok(buildDashboardSnapshot(taskId, analyses));
}
