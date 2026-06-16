import { Prisma, prisma, type CrawlMonitor } from "@review-ai/db";
import { getCrawlQueue } from "@/lib/queue";

export function normalizeCrawlMonitorIntervalMinutes(value: unknown) {
  const numberValue = Number(value || 360);
  if (!Number.isFinite(numberValue)) {
    return 360;
  }
  return Math.min(Math.max(Math.floor(numberValue), 15), 10080);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function crawlJobDataFromMonitor(monitor: CrawlMonitor) {
  return {
    workspaceId: monitor.workspaceId,
    taskId: monitor.taskId,
    monitorId: monitor.id,
    name: monitor.name,
    productName: monitor.productName,
    sourceChannel: monitor.sourceChannel,
    analysisType: monitor.analysisType,
    productUrl: monitor.productUrl,
    normalizedUrl: monitor.normalizedUrl,
    platform: monitor.platform,
    maxReviews: monitor.maxReviews,
    crawlChannels: "browser_intercept",
    status: "queued" as const,
    progress: 0,
    rawResult: Prisma.JsonNull
  };
}

export async function queueCrawlMonitorRun(monitorId: string, options: { forceEnable?: boolean } = {}) {
  const now = new Date();
  const { monitor, job, activeJobId } = await prisma.$transaction(async (tx) => {
    const current = await tx.crawlMonitor.findUnique({ where: { id: monitorId } });
    if (!current) {
      throw new Error("Crawl monitor not found");
    }

    const activeJob = await tx.crawlJob.findFirst({
      where: {
        monitorId,
        status: { in: ["queued", "running"] }
      },
      select: { id: true }
    });
    if (activeJob) {
      const monitor = await tx.crawlMonitor.update({
        where: { id: current.id },
        data: {
          ...(options.forceEnable ? { enabled: true } : {}),
          lastError: null
        }
      });
      return { monitor, job: null, activeJobId: activeJob.id };
    }

    const nextRunAt = addMinutes(now, current.intervalMinutes);
    const job = await tx.crawlJob.create({
      data: crawlJobDataFromMonitor(current)
    });
    const monitor = await tx.crawlMonitor.update({
      where: { id: current.id },
      data: {
        ...(options.forceEnable ? { enabled: true } : {}),
        lastRunAt: now,
        nextRunAt,
        lastCrawlJobId: job.id,
        lastError: null
      }
    });

    return { monitor, job, activeJobId: null };
  });

  if (!job) {
    return { monitor, jobId: activeJobId, queued: false, alreadyActive: true };
  }

  try {
    await getCrawlQueue().add("run-crawl", {
      crawlJobId: job.id,
      workspaceId: monitor.workspaceId,
      monitorId: monitor.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.$transaction([
      prisma.crawlJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          progress: 100,
          lastError: message,
          finishedAt: new Date()
        }
      }),
      prisma.crawlMonitor.update({
        where: { id: monitor.id },
        data: { lastError: message }
      })
    ]);
    throw error;
  }

  return { monitor, jobId: job.id, queued: true, alreadyActive: false };
}
