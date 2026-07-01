import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { serializeRun, serializeTask } from "@/lib/serializers";
import { canAccessAllWorkspaces, getWorkspaceContext, requireWorkspaceRole, taskWorkspaceWhere } from "@/lib/workspace";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const { workspace } = workspaceContext;
  const allowGlobalAccess = canAccessAllWorkspaces(workspaceContext);

  const task = await prisma.task.findFirst({
    where: allowGlobalAccess ? { id: taskId } : taskWorkspaceWhere(taskId, workspace.id),
    include: {
      analysisRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          logs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true }
          }
        }
      },
      importRecords: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!task) {
    return Response.json({ error: "任务不存在或不属于当前工作空间" }, { status: 404 });
  }

  return ok({
    task: serializeTask(task),
    latestImport: task.importRecords[0] || null,
    latestRun: task.analysisRuns[0] ? serializeRun(task.analysisRuns[0]) : null
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const task = await prisma.task.findFirst({
    where: canAccessAllWorkspaces(workspaceContext) ? { id: taskId } : taskWorkspaceWhere(taskId, workspaceContext.workspace.id),
    include: {
      analysisRuns: {
        where: { status: { in: ["queued", "running"] } },
        select: { id: true },
        take: 1
      }
    }
  });
  if (!task) {
    return fail("分析任务不存在或不属于当前空间", 404);
  }
  if (task.analysisRuns.length) {
    return fail("该分析任务仍有排队或运行中的分析批次，请先停止后再删除", 400);
  }

  await prisma.task.delete({
    where: { id: task.id }
  });
  await writeAuditLog(request, {
    workspaceId: task.workspaceId || workspaceContext.workspace.id,
    actor: workspaceContext.user,
    action: "task.delete",
    targetType: "task",
    targetId: task.id,
    targetLabel: task.name,
    metadata: {
      productName: task.productName,
      sourceChannel: task.sourceChannel,
      analysisType: task.analysisType
    }
  });

  return ok({ deleted: true });
}
