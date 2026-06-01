import { prisma } from "@review-ai/db";
import type { CreateCrawlMonitorResponse } from "@review-ai/shared";
import { normalizeRequestedCrawlInput, resolvedCrawlerSettingFromRecord } from "@/lib/crawl-utils";
import { fail, ok } from "@/lib/http";
import { serializeCrawlMonitor } from "@/lib/serializers";
import { getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

function normalizeIntervalMinutes(value: unknown) {
  const numberValue = Number(value || 360);
  if (!Number.isFinite(numberValue)) {
    return 360;
  }
  return Math.min(Math.max(Math.floor(numberValue), 15), 10080);
}

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const monitors = await prisma.crawlMonitor.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: [{ enabled: "desc" }, { createdAt: "desc" }]
  });

  return ok(monitors.map(serializeCrawlMonitor));
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
  const storedCrawlerSetting = await prisma.workspaceCrawlerSetting.findUnique({
    where: { workspaceId: context.workspace.id }
  });
  const crawlerSetting = resolvedCrawlerSettingFromRecord(storedCrawlerSetting);
  const input = normalizeRequestedCrawlInput(body, crawlerSetting);

  if (!name) {
    return fail("请填写监听任务名称。");
  }
  if (!input.productUrl) {
    return fail("请填写 YouTube 或 TikTok 视频链接。");
  }
  if (!input.crawlerPlatform) {
    return fail("暂不支持该链接监听，目前仅支持 YouTube 视频链接和 TikTok 视频链接。", 400);
  }
  if (!crawlerSetting.enabled) {
    return fail("当前账号没有启用链接抓取，请先在抓取设置中开启评论采集。");
  }

  const monitor = await prisma.crawlMonitor.create({
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
      intervalMinutes: normalizeIntervalMinutes(body.intervalMinutes),
      autoAnalyze: body.autoAnalyze !== false,
      enabled: body.enabled !== false,
      nextRunAt: new Date()
    }
  });

  return ok({ monitor: serializeCrawlMonitor(monitor) } satisfies CreateCrawlMonitorResponse, 201);
}
