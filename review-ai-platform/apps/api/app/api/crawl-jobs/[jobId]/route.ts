import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { canAccessAllWorkspaces, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function DELETE(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const allowGlobalAccess = canAccessAllWorkspaces(workspaceContext);
  const job = await prisma.crawlJob.findFirst({
    where: allowGlobalAccess ? { id: jobId } : { id: jobId, workspaceId: workspaceContext.workspace.id }
  });
  if (!job) {
    return fail("采集任务不存在或不属于当前空间", 404);
  }
  if (["queued", "running"].includes(job.status)) {
    return fail("采集任务仍在排队或运行中，暂不能删除", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.crawlMonitor.updateMany({
      where: { workspaceId: job.workspaceId, lastCrawlJobId: job.id },
      data: { lastCrawlJobId: null }
    });
    await tx.crawlJob.delete({
      where: { id: job.id }
    });
  });

  await writeAuditLog(request, {
    workspaceId: job.workspaceId,
    actor: workspaceContext.user,
    action: "crawl_job.delete",
    targetType: "crawl_job",
    targetId: job.id,
    targetLabel: job.name,
    metadata: {
      productUrl: job.normalizedUrl,
      sourceChannel: job.sourceChannel,
      platform: job.platform,
      status: job.status,
      fetchedRows: job.fetchedRows,
      importedRows: job.importedRows,
      taskId: job.taskId,
      monitorId: job.monitorId
    }
  });

  return ok({ deleted: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const body = await request.json().catch(() => ({}));
  if (body.action !== "cancel") {
    return fail("Unknown action", 400);
  }

  const allowGlobalAccess = canAccessAllWorkspaces(workspaceContext);
  const job = await prisma.crawlJob.findFirst({
    where: allowGlobalAccess ? { id: jobId } : { id: jobId, workspaceId: workspaceContext.workspace.id }
  });
  if (!job) {
    return fail("采集任务不存在或不属于当前空间", 404);
  }
  if (!["queued", "running"].includes(job.status)) {
    return fail("当前采集任务不可中断", 400);
  }

  const message = "已手动停止采集";
  const updated = await prisma.$transaction(async (tx) => {
    const nextJob = await tx.crawlJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        progress: 100,
        lastError: message,
        finishedAt: new Date()
      }
    });
    if (job.monitorId) {
      await tx.crawlMonitor.updateMany({
        where: { id: job.monitorId, workspaceId: job.workspaceId },
        data: { lastError: message }
      });
    }
    return nextJob;
  });

  await writeAuditLog(request, {
    workspaceId: job.workspaceId,
    actor: workspaceContext.user,
    action: "crawl_job.cancel",
    targetType: "crawl_job",
    targetId: job.id,
    targetLabel: job.name || job.productName || job.normalizedUrl,
    metadata: {
      previousStatus: job.status,
      productUrl: job.normalizedUrl,
      sourceChannel: job.sourceChannel,
      platform: job.platform,
      fetchedRows: job.fetchedRows,
      importedRows: job.importedRows,
      taskId: job.taskId,
      monitorId: job.monitorId,
      lastError: job.lastError
    }
  });

  return ok({ job: updated });
}
