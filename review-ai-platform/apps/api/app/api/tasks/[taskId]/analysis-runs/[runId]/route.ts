import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { getAnalysisQueue, removePendingQueueJobsByData } from "@/lib/queue";
import { serializeRun } from "@/lib/serializers";
import { getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string; runId: string }> }
) {
  const { taskId, runId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }

  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response) {
    return scoped.response;
  }

  const body = await request.json().catch(() => ({}));
  if (body.action !== "cancel") {
    return fail("Unknown action", 400);
  }

  const run = await prisma.analysisRun.findFirst({ where: { id: runId, taskId } });
  if (!run) {
    return fail("分析任务不存在", 404);
  }
  if (!["queued", "running"].includes(run.status)) {
    return fail("当前分析任务不可中断", 400);
  }

  await prisma.analysisRun.update({
    where: { id: runId },
    data: {
      status: "failed",
      finishedAt: new Date(),
      lastError: "已手动停止分析"
    }
  });

  await prisma.analysisRunLog.create({
    data: {
      runId,
      level: "warn",
      message: "Analysis run cancelled by user"
    }
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "imported" }
  });

  const removedQueueJobs = await removePendingQueueJobsByData(getAnalysisQueue(), "runId", run.id);

  await writeAuditLog(request, {
    workspaceId: scoped.task?.workspaceId || workspaceContext.workspace.id,
    actor: workspaceContext.user,
    action: "analysis_run.cancel",
    targetType: "analysis_run",
    targetId: run.id,
    targetLabel: scoped.task?.name || taskId,
    metadata: {
      taskId,
      previousStatus: run.status,
      reviewCount: run.reviewCount,
      successCount: run.successCount,
      failedCount: run.failedCount,
      provider: run.provider,
      modelName: run.modelName,
      lastError: run.lastError,
      removedQueueJobs
    }
  });

  const refreshed = await prisma.analysisRun.findUnique({
    where: { id: runId },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (!refreshed) {
    return fail("分析任务不存在", 404);
  }

  return ok(serializeRun(refreshed));
}
