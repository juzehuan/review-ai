import { prisma } from "@review-ai/db";
import type { CreateCrawlMonitorResponse } from "@review-ai/shared";
import { normalizeCrawlMonitorIntervalMinutes, queueCrawlMonitorRun } from "@/lib/crawl-monitor-runs";
import { normalizeRequestedCrawlInput, resolvedCrawlerSettingFromRecord, supportedCrawlUrlError } from "@/lib/crawl-utils";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { getPlatformCrawlerSetting } from "@/lib/platform-settings";
import { serializeCrawlMonitor } from "@/lib/serializers";
import { canAccessAllWorkspaces, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const canViewAllMonitors = canAccessAllWorkspaces(context);
  const monitors = await prisma.crawlMonitor.findMany({
    where: canViewAllMonitors ? {} : { workspaceId: context.workspace.id },
    orderBy: [{ enabled: "desc" }, { createdAt: "desc" }],
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
  const crawlerSetting = resolvedCrawlerSettingFromRecord(await getPlatformCrawlerSetting());
  const input = normalizeRequestedCrawlInput(body, crawlerSetting);

  if (!name) {
    return fail("请填写监听任务名称。");
  }
  if (!input.productUrl) {
    return fail("请填写商品/视频/帖子链接。");
  }
  if (!input.crawlerPlatform) {
    return fail(supportedCrawlUrlError("暂不支持该链接监听"), 400);
  }
  if (!crawlerSetting.enabled) {
    return fail("当前账号没有启用链接抓取，请先在抓取设置中开启评论采集。");
  }

  const enabled = body.enabled !== false;
  const intervalMinutes = normalizeCrawlMonitorIntervalMinutes(body.intervalMinutes);
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
      intervalMinutes,
      autoAnalyze: body.autoAnalyze !== false,
      enabled: false,
      nextRunAt: new Date()
    }
  });

  const result = enabled
    ? await queueCrawlMonitorRun(monitor.id, { forceEnable: true })
    : { monitor, jobId: null, queued: false, alreadyActive: false };

  await writeAuditLog(request, {
    workspaceId: monitor.workspaceId,
    actor: context.user,
    action: "crawl_monitor.create",
    targetType: "crawl_monitor",
    targetId: monitor.id,
    targetLabel: monitor.name,
    metadata: {
      productUrl: monitor.normalizedUrl,
      sourceChannel: monitor.sourceChannel,
      platform: monitor.platform,
      intervalMinutes: monitor.intervalMinutes,
      autoAnalyze: monitor.autoAnalyze,
      enabled,
      jobId: result.jobId,
      queued: result.queued
    }
  });

  return ok({ monitor: serializeCrawlMonitor(result.monitor) } satisfies CreateCrawlMonitorResponse, 201);
}
