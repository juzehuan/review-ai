import { prisma, type CrawlJob } from "@review-ai/db";

export async function attachCrawlQueuePositions<T extends CrawlJob>(jobs: T[]) {
  const queuedJobs = jobs.filter((job) => job.status === "queued");
  if (!queuedJobs.length) {
    return jobs.map((job) => ({ ...job, queuePosition: null }));
  }

  const positions = new Map<string, number>();
  await Promise.all(
    queuedJobs.map(async (job) => {
      const earlierQueuedCount = await prisma.crawlJob.count({
        where: {
          status: "queued",
          createdAt: { lt: job.createdAt }
        }
      });
      positions.set(job.id, earlierQueuedCount + 1);
    })
  );

  return jobs.map((job) => ({ ...job, queuePosition: positions.get(job.id) ?? null }));
}

export async function attachCrawlQueuePosition<T extends CrawlJob>(job: T) {
  const [withPosition] = await attachCrawlQueuePositions([job]);
  return withPosition;
}
