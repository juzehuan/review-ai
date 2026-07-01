import { prisma } from "@review-ai/db";
import { normalizeCrawlMonitorIntervalMinutes, queueCrawlMonitorRun } from "@/lib/crawl-monitor-runs";
import { normalizeRequestedCrawlInput, resolvedCrawlerSettingFromRecord, supportedCrawlUrlError } from "@/lib/crawl-utils";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { getPlatformCrawlerSetting } from "@/lib/platform-settings";
import { serializeCrawlMonitor } from "@/lib/serializers";
import { canAccessAllWorkspaces, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

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
  const allowGlobalAccess = canAccessAllWorkspaces(workspaceContext);

  const monitor = await prisma.crawlMonitor.findFirst({
    where: allowGlobalAccess ? { id: monitorId } : { id: monitorId, workspaceId: workspaceContext.workspace.id }
  });
  if (!monitor) {
    return fail("监听任务不存在或不属于当前账号。", 404);
  }

  const result = await queueCrawlMonitorRun(monitor.id, { forceEnable: true });
  await writeAuditLog(request, {
    workspaceId: monitor.workspaceId,
    actor: workspaceContext.user,
    action: "crawl_monitor.run_now",
    targetType: "crawl_monitor",
    targetId: monitor.id,
    targetLabel: monitor.name,
    metadata: {
      productUrl: monitor.normalizedUrl,
      sourceChannel: monitor.sourceChannel,
      analysisType: monitor.analysisType,
      platform: monitor.platform,
      jobId: result.jobId,
      queued: result.queued,
      alreadyActive: result.alreadyActive
    }
  });

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
  const allowGlobalAccess = canAccessAllWorkspaces(workspaceContext);

  const existing = await prisma.crawlMonitor.findFirst({
    where: allowGlobalAccess ? { id: monitorId } : { id: monitorId, workspaceId: workspaceContext.workspace.id }
  });
  if (!existing) {
    return fail("监听任务不存在或不属于当前账号。", 404);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const crawlerSetting = resolvedCrawlerSettingFromRecord(await getPlatformCrawlerSetting());
  const input = body.productUrl ? normalizeRequestedCrawlInput(body, crawlerSetting) : null;

  if (input && !input.crawlerPlatform) {
    return fail(supportedCrawlUrlError("暂不支持该链接监听"), 400);
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
    await writeAuditLog(request, {
      workspaceId: existing.workspaceId,
      actor: workspaceContext.user,
      action: "crawl_monitor.update",
      targetType: "crawl_monitor",
      targetId: existing.id,
      targetLabel: updated.name,
      metadata: {
        previousEnabled: existing.enabled,
        nextEnabled: result.monitor.enabled,
        previousIntervalMinutes: existing.intervalMinutes,
        nextIntervalMinutes: result.monitor.intervalMinutes,
        previousAutoAnalyze: existing.autoAnalyze,
        nextAutoAnalyze: result.monitor.autoAnalyze,
        productUrl: result.monitor.normalizedUrl,
        sourceChannel: result.monitor.sourceChannel,
        analysisType: result.monitor.analysisType,
        platform: result.monitor.platform,
        jobId: result.jobId,
        queued: result.queued
      }
    });
    return ok(serializeCrawlMonitor(result.monitor));
  }

  await writeAuditLog(request, {
    workspaceId: existing.workspaceId,
    actor: workspaceContext.user,
    action: "crawl_monitor.update",
    targetType: "crawl_monitor",
    targetId: existing.id,
    targetLabel: updated.name,
    metadata: {
      previousEnabled: existing.enabled,
      nextEnabled: updated.enabled,
      previousIntervalMinutes: existing.intervalMinutes,
      nextIntervalMinutes: updated.intervalMinutes,
      previousAutoAnalyze: existing.autoAnalyze,
      nextAutoAnalyze: updated.autoAnalyze,
      productUrl: updated.normalizedUrl,
      sourceChannel: updated.sourceChannel,
      analysisType: updated.analysisType,
      platform: updated.platform
    }
  });

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
  const allowGlobalAccess = canAccessAllWorkspaces(workspaceContext);

  const monitor = await prisma.crawlMonitor.findFirst({
    where: allowGlobalAccess ? { id: monitorId } : { id: monitorId, workspaceId: workspaceContext.workspace.id }
  });
  if (!monitor) {
    return fail("监听任务不存在或不属于当前账号。", 404);
  }

  await prisma.crawlMonitor.delete({
    where: { id: monitor.id }
  });

  await writeAuditLog(request, {
    workspaceId: monitor.workspaceId,
    actor: workspaceContext.user,
    action: "crawl_monitor.delete",
    targetType: "crawl_monitor",
    targetId: monitor.id,
    targetLabel: monitor.name,
    metadata: {
      productUrl: monitor.normalizedUrl,
      sourceChannel: monitor.sourceChannel,
      analysisType: monitor.analysisType,
      platform: monitor.platform,
      lastCrawlJobId: monitor.lastCrawlJobId,
      taskId: monitor.taskId
    }
  });

  return ok({ success: true });
}
