import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { serializeRun, serializeRunLog } from "@/lib/serializers";
import { getWorkspaceContext, requireScopedTask } from "@/lib/workspace";

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string; runId: string }> }
) {
  const { taskId, runId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response) {
    return scoped.response;
  }

  const run = await prisma.analysisRun.findFirst({
    where: { id: runId, taskId },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (!run) {
    return ok({ run: null, logs: [] });
  }

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

  const logs = await prisma.analysisRunLog.findMany({
    where: {
      runId,
      ...(after ? { createdAt: { gt: new Date(after) } } : {})
    },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  return ok({
    run: serializeRun(run),
    logs: logs.map(serializeRunLog)
  });
}
