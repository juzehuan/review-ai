import { prisma, type AnalysisRun } from "@review-ai/db";

export async function attachAnalysisQueuePositions<T extends AnalysisRun>(runs: T[]) {
  const queuedRuns = runs.filter((run) => run.status === "queued");
  if (!queuedRuns.length) {
    return runs.map((run) => ({ ...run, queuePosition: null }));
  }

  const positions = new Map<string, number>();
  await Promise.all(
    queuedRuns.map(async (run) => {
      const earlierQueuedCount = await prisma.analysisRun.count({
        where: {
          status: "queued",
          createdAt: { lt: run.createdAt }
        }
      });
      positions.set(run.id, earlierQueuedCount + 1);
    })
  );

  return runs.map((run) => ({ ...run, queuePosition: positions.get(run.id) ?? null }));
}

export async function attachAnalysisQueuePosition<T extends AnalysisRun>(run: T) {
  const [withPosition] = await attachAnalysisQueuePositions([run]);
  return withPosition;
}
