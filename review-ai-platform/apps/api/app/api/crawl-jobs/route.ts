import { Prisma, prisma } from "@review-ai/db";
import { getCrawlQueue } from "@/lib/queue";
import { resolvedCrawlerSettingFromRecord, normalizeRequestedCrawlInput } from "@/lib/crawl-utils";
import { fail, ok } from "@/lib/http";
import { getPlatformCrawlerSetting } from "@/lib/platform-settings";
import { serializeCrawlJob } from "@/lib/serializers";
import { getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const jobs = await prisma.crawlJob.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });

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
    return fail("请填写商品/视频链接");
  }
  if (!name) {
    return fail("请填写任务名称");
  }
  if (!input.crawlerPlatform) {
    return fail("暂不支持该链接抓取，目前仅支持 YouTube 视频链接和 TikTok 视频链接", 400);
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

  return ok({ job: serializeCrawlJob(job) }, 201);
}
