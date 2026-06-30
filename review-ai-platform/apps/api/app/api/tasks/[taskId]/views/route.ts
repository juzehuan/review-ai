import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { serializeSavedView } from "@/lib/serializers";
import { getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response) {
    return scoped.response;
  }

  const views = await prisma.savedReviewView.findMany({
    where: { taskId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
  });
  return ok(views.map(serializeSavedView));
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
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
  const name = String(body.name || "").trim();
  if (!name) {
    return fail("视图名称不能为空", 400);
  }

  const isDefault = Boolean(body.isDefault);
  const created = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.savedReviewView.updateMany({ where: { taskId }, data: { isDefault: false } });
    }
    return tx.savedReviewView.create({
      data: {
        taskId,
        name,
        filters: body.filters || {},
        groupBy: String(body.groupBy || "sentiment"),
        viewMode: String(body.viewMode || "table"),
        sortBy: String(body.sortBy || "commentTime"),
        sortOrder: String(body.sortOrder || "desc"),
        visibleColumnKeys: Array.isArray(body.visibleColumnKeys) ? body.visibleColumnKeys.map(String) : [],
        isDefault
      }
    });
  });

  return ok(serializeSavedView(created), 201);
}
