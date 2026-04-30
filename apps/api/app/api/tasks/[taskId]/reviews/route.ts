import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { serializeReviewRow } from "@/lib/serializers";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const { searchParams } = new URL(request.url);
  const sentiment = searchParams.get("sentiment") || undefined;
  const ratingStar = Number(searchParams.get("ratingStar") || 0) || undefined;
  const variant = searchParams.get("variant") || undefined;
  const keyword = searchParams.get("keyword") || undefined;
  const hasMedia = searchParams.get("hasMedia");
  const needsAttention = searchParams.get("needsAttention");
  const sortBy = searchParams.get("sortBy") || "commentTime";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? ("asc" as const) : ("desc" as const);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 20)));

  const run = await prisma.analysisRun.findFirst({
    where: { taskId, status: { in: ["completed", "partial_failed"] } },
    orderBy: { startedAt: "desc" }
  });

  // Build orderBy for database-level sorting
  let orderBy: Record<string, string> = { commentTime: sortOrder };
  if (sortBy === "ratingStar") {
    orderBy = { ratingStar: sortOrder };
  } else if (sortBy === "commentTime") {
    orderBy = { commentTime: sortOrder };
  }

  // needsAttention filter requires joining ReviewAnalysis
  const needsAttentionFilter =
    needsAttention === "true" && run
      ? { analyses: { some: { runId: run.id, needsAttention: true } } }
      : {};

  const keywordFilter = keyword
    ? {
        OR: [
          { comment: { contains: keyword, mode: "insensitive" as const } },
          { commentTr: { contains: keyword, mode: "insensitive" as const } },
          // Search AI topic labels and keywords arrays
          ...(run
            ? [
                {
                  analyses: {
                    some: {
                      runId: run.id,
                      OR: [
                        { topicLabels: { has: keyword } },
                        { keywords: { has: keyword } }
                      ]
                    }
                  }
                }
              ]
            : [])
        ]
      }
    : {};

  const where = {
    taskId,
    ...(ratingStar ? { ratingStar } : {}),
    ...(variant ? { modelName: variant } : {}),
    ...(hasMedia !== null && hasMedia !== "" ? { hasMedia: hasMedia === "true" } : {}),
    ...keywordFilter,
    ...needsAttentionFilter
  };

  // sentiment filter requires post-processing since it's on the joined analysis table
  // We fetch all matching reviews and then filter by sentiment in memory only when needed
  // For large datasets, sentiment is indexed via the run join
  const includeAnalyses = run
    ? {
        analyses: {
          where: sentiment ? { runId: run.id, sentiment: sentiment as never } : { runId: run.id },
          take: 1
        }
      }
    : (false as const);

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: { task: true, ...includeAnalyses },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  // When sentiment filter is active, reviews without matching analysis were excluded by the
  // include filter above (they return empty analyses array), so we remove them here.
  const rows = reviews
    .map(serializeReviewRow)
    .filter((row) => !sentiment || row.sentiment === sentiment);

  // sentimentScore sort must be done post-fetch since it lives on the joined table
  if (sortBy === "sentimentScore") {
    rows.sort((a, b) => {
      const av = a.sentimentScore ?? 0;
      const bv = b.sentimentScore ?? 0;
      return sortOrder === "asc" ? av - bv : bv - av;
    });
  }

  return ok({ total, page, pageSize, items: rows });
}
