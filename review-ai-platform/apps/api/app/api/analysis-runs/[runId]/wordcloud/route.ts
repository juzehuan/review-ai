import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { getWorkspaceContext, requireScopedRun } from "@/lib/workspace";

export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const { workspace } = workspaceContext;
  const scoped = await requireScopedRun(runId, workspace.id);
  if (scoped.response) {
    return scoped.response;
  }

  const tagStats = await prisma.tagStat.findMany({
    where: { runId },
    orderBy: { count: "desc" },
    take: 50
  });

  return ok(
    tagStats.map((item) => ({
      name: item.tagName,
      value: item.count
    }))
  );
}
