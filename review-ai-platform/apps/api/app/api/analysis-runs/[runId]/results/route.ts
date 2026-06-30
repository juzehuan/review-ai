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
  const scoped = await requireScopedRun(runId, workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response) {
    return scoped.response;
  }

  const { searchParams } = new URL(request.url);
  const sentiment = searchParams.get("sentiment");
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);

  const [total, items] = await Promise.all([
    prisma.reviewAnalysis.count({
      where: {
        runId,
        ...(sentiment ? { sentiment: sentiment as never } : {})
      }
    }),
    prisma.reviewAnalysis.findMany({
      where: {
        runId,
        ...(sentiment ? { sentiment: sentiment as never } : {})
      },
      include: { review: true },
      orderBy: { sentimentScore: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return ok({
    total,
    page,
    pageSize,
    items
  });
}
