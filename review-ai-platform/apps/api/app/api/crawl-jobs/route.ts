import { Prisma, prisma } from "@review-ai/db";
import {
  buildCrawlQueueJobId,
  QUEUE_JOB_CLEANUP_OPTIONS,
  type CrawlJobListResponse,
  type CrawlJobStatus,
  type CrawlJobStatusCounts,
  type CrawlJobStatusFilter
} from "@review-ai/shared";
import { attachCrawlQueuePosition, attachCrawlQueuePositions } from "@/lib/crawl-job-queue";
import { getCrawlQueue } from "@/lib/queue";
import { resolvedCrawlerSettingFromRecord, normalizeRequestedCrawlInput, supportedCrawlUrlError } from "@/lib/crawl-utils";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { getPlatformCrawlerSetting } from "@/lib/platform-settings";
import { readCrawlTotalComments, serializeCrawlJob } from "@/lib/serializers";
import { canAccessAllWorkspaces, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

const CRAWL_JOB_STATUSES = ["queued", "running", "completed", "failed", "imported"] as const satisfies readonly CrawlJobStatus[];
const DEFAULT_CRAWL_JOB_PAGE_SIZE = 12;
const MAX_CRAWL_JOB_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

function normalizeCrawlJobStatusFilter(value: string | null): CrawlJobStatusFilter {
  if (value === "active" || value === "all") {
    return value;
  }
  return CRAWL_JOB_STATUSES.includes(value as CrawlJobStatus) ? (value as CrawlJobStatus) : "all";
}

function crawlJobStatusWhere(status: CrawlJobStatusFilter): Prisma.CrawlJobWhereInput {
  if (status === "all") {
    return {};
  }
  if (status === "active") {
    return { status: { in: ["queued", "running"] } };
  }
  return { status };
}

function emptyCrawlJobStatusCounts(): CrawlJobStatusCounts {
  return {
    all: 0,
    active: 0,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    imported: 0
  };
}

function buildCrawlJobStatusCounts(groups: Array<{ status: CrawlJobStatus; _count: { _all: number } }>): CrawlJobStatusCounts {
  const counts = emptyCrawlJobStatusCounts();
  for (const group of groups) {
    counts[group.status] = group._count._all;
    counts.all += group._count._all;
  }
  counts.active = counts.queued + counts.running;
  return counts;
}

function rawObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function summarizeCrawlCoverageGaps(rows: Array<{ fetchedRows: number; rawResult: Prisma.JsonValue | null }>) {
  let platformRemainingRows = 0;
  let platformUncoveredJobCount = 0;

  for (const row of rows) {
    const totalComments = readCrawlTotalComments(rawObject(row.rawResult));
    if (totalComments === null || totalComments <= 0) {
      continue;
    }
    const remainingRows = Math.max(0, totalComments - row.fetchedRows);
    if (remainingRows > 0) {
      platformRemainingRows += remainingRows;
      platformUncoveredJobCount += 1;
    }
  }

  return { platformRemainingRows, platformUncoveredJobCount };
}

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const { searchParams } = new URL(request.url);
  const targetJobId = searchParams.get("jobId");
  const status = normalizeCrawlJobStatusFilter(searchParams.get("status"));
  const page = parsePositiveInt(searchParams.get("page"), 1, 100000);
  const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_CRAWL_JOB_PAGE_SIZE, MAX_CRAWL_JOB_PAGE_SIZE);
  const canViewAllJobs = canAccessAllWorkspaces(context);
  const baseWhere: Prisma.CrawlJobWhereInput = canViewAllJobs ? {} : { workspaceId: context.workspace.id };
  const where: Prisma.CrawlJobWhereInput = {
    ...baseWhere,
    ...crawlJobStatusWhere(status)
  };
  const [jobs, total, statusGroups, totalsAggregate, coverageGapRows] = await Promise.all([
    prisma.crawlJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        workspace: { select: { name: true, slug: true } },
        task: {
          select: {
            analysisRuns: {
              select: { id: true },
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    }),
    prisma.crawlJob.count({ where }),
    prisma.crawlJob.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true }
    }),
    prisma.crawlJob.aggregate({
      where: baseWhere,
      _sum: {
        fetchedRows: true,
        importedRows: true,
        skippedDuplicate: true
      }
    }),
    prisma.crawlJob.findMany({
      where: {
        ...baseWhere,
        status: { in: ["completed", "imported"] }
      },
      select: {
        fetchedRows: true,
        rawResult: true
      }
    })
  ]);
  const coverageGapTotals = summarizeCrawlCoverageGaps(coverageGapRows);

  if (targetJobId && !jobs.some((job) => job.id === targetJobId)) {
    const targetJob = await prisma.crawlJob.findFirst({
      where: { ...where, id: targetJobId },
      include: {
        workspace: { select: { name: true, slug: true } },
        task: {
          select: {
            analysisRuns: {
              select: { id: true },
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });
    if (targetJob) {
      jobs.unshift(targetJob);
    }
  }

  const jobsWithQueuePositions = await attachCrawlQueuePositions(jobs);

  return ok<CrawlJobListResponse>({
    items: jobsWithQueuePositions.map(serializeCrawlJob),
    total,
    page,
    pageSize,
    status,
    statusCounts: buildCrawlJobStatusCounts(statusGroups),
    totals: {
      fetchedRows: totalsAggregate._sum.fetchedRows || 0,
      importedRows: totalsAggregate._sum.importedRows || 0,
      skippedDuplicate: totalsAggregate._sum.skippedDuplicate || 0,
      ...coverageGapTotals
    },
    updatedAt: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const roleResponse = requireWorkspaceRole(context, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const productName = String(body.productName || "").trim();
  const crawlerSetting = resolvedCrawlerSettingFromRecord(await getPlatformCrawlerSetting());
  const input = normalizeRequestedCrawlInput(body, crawlerSetting);

  if (!input.productUrl) {
    return fail("请填写商品/视频/帖子链接");
  }
  if (!name) {
    return fail("请填写任务名称");
  }
  if (!input.crawlerPlatform) {
    return fail(supportedCrawlUrlError(), 400);
  }
  if (!crawlerSetting.enabled) {
    return fail("当前账号没有启用链接抓取，请先在抓取设置中开启评论爬虫");
  }

  const job = await prisma.crawlJob.create({
    data: {
      workspaceId: context.workspace.id,
      name,
      productName,
      sourceChannel: input.sourceChannel,
      analysisType: input.analysisType,
      productUrl: input.productUrl,
      normalizedUrl: input.normalizedProductUrl,
      platform: input.crawlerPlatform,
      maxReviews: input.maxReviews,
      crawlChannels: input.crawlChannels.join(","),
      status: "queued",
      progress: 0,
      rawResult: Prisma.JsonNull
    }
  });

  await getCrawlQueue().add(
    "run-crawl",
    {
      crawlJobId: job.id,
      workspaceId: context.workspace.id
    },
    {
      jobId: buildCrawlQueueJobId(job.id),
      ...QUEUE_JOB_CLEANUP_OPTIONS
    }
  );

  await writeAuditLog(request, {
    workspaceId: job.workspaceId,
    actor: context.user,
    action: "crawl_job.create",
    targetType: "crawl_job",
    targetId: job.id,
    targetLabel: job.name,
    metadata: {
      productUrl: job.normalizedUrl,
      sourceChannel: job.sourceChannel,
      analysisType: job.analysisType,
      platform: job.platform,
      maxReviews: job.maxReviews,
      crawlChannels: input.crawlChannels
    }
  });

  return ok({ job: serializeCrawlJob(await attachCrawlQueuePosition(job)) }, 201);
}
