import { fail, ok } from "@/lib/http";
import { buildDashboardForTask } from "@/lib/dashboard";
import { getWorkspaceContext, requireScopedTask } from "@/lib/workspace";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const { workspace } = workspaceContext;
  const scoped = await requireScopedTask(taskId, workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response) {
    return scoped.response;
  }

  const { searchParams } = new URL(request.url);
  try {
    return ok(await buildDashboardForTask(taskId, searchParams.get("runId")));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "当前分析结果为空", 404);
  }
}
