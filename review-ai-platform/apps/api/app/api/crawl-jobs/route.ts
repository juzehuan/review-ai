import { Prisma, prisma } from "@review-ai/db";
import { getCrawlQueue } from "@/lib/queue";
import { resolvedCrawlerSettingFromRecord, normalizeRequestedCrawlInput, supportedCrawlUrlError } from "@/lib/crawl-utils";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { getPlatformCrawlerSetting } from "@/lib/platform-settings";
import { serializeCrawlJob } from "@/lib/serializers";
import { canAccessAllWorkspaces, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const { searchParams } = new URL(request.url);
  const targetJobId = searchParams.get("jobId");
  const canViewAllJobs = canAccessAllWorkspaces(context);
  const where = canViewAllJobs ? {} : { workspaceId: context.workspace.id };
  const jobs = await prisma.crawlJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
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

  return ok(jobs.map(serializeCrawlJob));
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

  await getCrawlQueue().add("run-crawl", {
    crawlJobId: job.id,
    workspaceId: context.workspace.id
  });

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
      platform: job.platform,
      maxReviews: job.maxReviews,
      crawlChannels: input.crawlChannels
    }
  });

  return ok({ job: serializeCrawlJob(job) }, 201);
}
