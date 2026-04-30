import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";

export async function GET(_: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;

  const tagStats = await prisma.tagStat.findMany({
    where: { runId },
    orderBy: { count: "desc" },
    take: 50
  });

  return ok(
    tagStats.map((item) => ({
      name: item.tagName,
      value: item.count
    }))
  );
}
