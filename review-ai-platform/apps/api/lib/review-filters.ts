import type { Prisma } from "@review-ai/db";

export function buildReviewTextKeywordWhere(keyword: string): Prisma.ReviewWhereInput {
  return {
    OR: [{ comment: { contains: keyword, mode: "insensitive" } }, { commentTr: { contains: keyword, mode: "insensitive" } }]
  };
}

export function buildAnalysisKeywordWhere(keyword: string): Prisma.ReviewAnalysisWhereInput {
  return {
    OR: [
      { keywords: { has: keyword } },
      { topicLabels: { has: keyword } },
      { intentLabels: { has: keyword } },
      { painPoints: { has: keyword } },
      { highlights: { has: keyword } }
    ]
  };
}

export function buildKeywordReviewWhere(keyword: string, runId?: string | null): Prisma.ReviewWhereInput {
  const textWhere = buildReviewTextKeywordWhere(keyword);
  if (!runId) {
    return textWhere;
  }

  return {
    OR: [...(textWhere.OR || []), { analyses: { some: { runId, ...buildAnalysisKeywordWhere(keyword) } } }]
  };
}
