import { prisma } from "@review-ai/db";
import { normalizeCrawlMonitorIntervalMinutes, queueCrawlMonitorRun } from "@/lib/crawl-monitor-runs";
import { normalizeRequestedCrawlInput, resolvedCrawlerSettingFromRecord } from "@/lib/crawl-utils";
import { fail, ok } from "@/lib/http";
import { getPlatformCrawlerSetting } from "@/lib/platform-settings";
import { serializeCrawlMonitor } from "@/lib/serializers";
import { getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function POST(request: Request, context: { params: Promise<{ monitorId: string }> }) {
  const { monitorId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const monitor = await prisma.crawlMonitor.findFirst({
    where: { id: monitorId, workspaceId: workspaceContext.workspace.id }
  });
  if (!monitor) {
    return fail("监听任务不存在或不属于当前账号。", 404);
  }

  const result = await queueCrawlMonitorRun(monitor.id, { forceEnable: true });

  return ok(serializeCrawlMonitor(result.monitor));
}

export async function PATCH(request: Request, context: { params: Promise<{ monitorId: string }> }) {
  const { monitorId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const existing = await prisma.crawlMonitor.findFirst({
    where: { id: monitorId, workspaceId: workspaceContext.workspace.id }
  });
  if (!existing) {
    return fail("监听任务不存在或不属于当前账号。", 404);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const crawlerSetting = resolvedCrawlerSettingFromRecord(await getPlatformCrawlerSetting());
  const input = body.productUrl ? normalizeRequestedCrawlInput(body, crawlerSetting) : null;

  if (input && !input.crawlerPlatform) {
    return fail("暂不支持该链接监听，目前仅支持 YouTube 视频链接和 TikTok 视频链接。", 400);
  }

  const updated = await prisma.crawlMonitor.update({
    where: { id: existing.id },
    data: {
      ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
      ...(typeof body.productName === "string" ? { productName: body.productName.trim() } : {}),
      ...(input
        ? {
            sourceChannel: input.sourceChannel,
            analysisType: input.analysisType,
            productUrl: input.productUrl,
            normalizedUrl: input.normalizedProductUrl,
            platform: input.crawlerPlatform,
            maxReviews: input.maxReviews
          }
        : {}),
      ...(body.intervalMinutes !== undefined
        ? { intervalMinutes: normalizeCrawlMonitorIntervalMinutes(body.intervalMinutes) }
        : {}),
      ...(typeof body.autoAnalyze === "boolean" ? { autoAnalyze: body.autoAnalyze } : {}),
      ...(typeof body.enabled === "boolean"
        ? {
            enabled: body.enabled,
            ...(body.enabled ? { nextRunAt: new Date() } : {})
          }
        : {})
    }
  });

  if (body.enabled === true) {
    const result = await queueCrawlMonitorRun(updated.id, { forceEnable: true });
    return ok(serializeCrawlMonitor(result.monitor));
  }

  return ok(serializeCrawlMonitor(updated));
}

export async function DELETE(request: Request, context: { params: Promise<{ monitorId: string }> }) {
  const { monitorId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const deleted = await prisma.crawlMonitor.deleteMany({
    where: { id: monitorId, workspaceId: workspaceContext.workspace.id }
  });
  if (!deleted.count) {
    return fail("监听任务不存在或不属于当前账号。", 404);
  }

  return ok({ success: true });
}
