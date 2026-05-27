import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { serializeRun, serializeTask } from "@/lib/serializers";
import { getWorkspaceContext, taskWorkspaceWhere } from "@/lib/workspace";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const { workspace } = workspaceContext;

  const task = await prisma.task.findFirst({
    where: taskWorkspaceWhere(taskId, workspace.id),
    include: {
      analysisRuns: {
        orderBy: { createdAt: "desc" },
        take: 1
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
