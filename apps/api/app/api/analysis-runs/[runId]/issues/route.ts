import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";

export async function GET(_: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;

  const items = await prisma.issueStat.findMany({
    where: { runId },
    orderBy: { count: "desc" },
    take: 10
  });

  return ok(
    items.map((item) => ({
      issueName: item.issueName,
      count: item.count,
      sampleReviewIds: item.sampleReviewIds
    }))
  );
}

