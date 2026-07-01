import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { serializeSavedView } from "@/lib/serializers";
import { getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string; viewId: string }> }
) {
  const { taskId, viewId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }
  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response || !scoped.task) {
    return scoped.response;
  }

  const body = await request.json().catch(() => ({}));
  const existing = await prisma.savedReviewView.findFirst({ where: { id: viewId, taskId } });
  if (!existing) {
    return fail("视图不存在", 404);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (body.isDefault === true) {
      await tx.savedReviewView.updateMany({ where: { taskId }, data: { isDefault: false } });
    }
    return tx.savedReviewView.update({
      where: { id: viewId },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() || existing.name } : {}),
        ...(body.filters ? { filters: body.filters } : {}),
        ...(typeof body.groupBy === "string" ? { groupBy: body.groupBy } : {}),
        ...(typeof body.viewMode === "string" ? { viewMode: body.viewMode } : {}),
        ...(typeof body.sortBy === "string" ? { sortBy: body.sortBy } : {}),
        ...(typeof body.sortOrder === "string" ? { sortOrder: body.sortOrder } : {}),
        ...(Array.isArray(body.visibleColumnKeys) ? { visibleColumnKeys: body.visibleColumnKeys.map(String) } : {}),
        ...(typeof body.isDefault === "boolean" ? { isDefault: body.isDefault } : {})
      }
    });
  });

  await writeAuditLog(request, {
    workspaceId: scoped.task.workspaceId || workspaceContext.workspace.id,
    actor: workspaceContext.user,
    action: "review_view.update",
    targetType: "review_view",
    targetId: updated.id,
    targetLabel: updated.name,
    metadata: {
      taskId,
      taskName: scoped.task.name,
      viewId: updated.id,
      previousName: existing.name,
      name: updated.name,
      previousIsDefault: existing.isDefault,
      isDefault: updated.isDefault,
      filters: updated.filters,
      groupBy: updated.groupBy,
      viewMode: updated.viewMode,
      sortBy: updated.sortBy,
      sortOrder: updated.sortOrder,
      visibleColumnKeys: updated.visibleColumnKeys
    }
  });

  return ok(serializeSavedView(updated));
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ taskId: string; viewId: string }> }
) {
  const { taskId, viewId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }
  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response || !scoped.task) {
    return scoped.response;
  }

  const existing = await prisma.savedReviewView.findFirst({ where: { id: viewId, taskId } });
  if (!existing) {
    return fail("视图不存在", 404);
  }

  await prisma.savedReviewView.delete({ where: { id: existing.id } });
  await writeAuditLog(request, {
    workspaceId: scoped.task.workspaceId || workspaceContext.workspace.id,
    actor: workspaceContext.user,
    action: "review_view.delete",
    targetType: "review_view",
    targetId: existing.id,
    targetLabel: existing.name,
    metadata: {
      taskId,
      taskName: scoped.task.name,
      viewId: existing.id,
      name: existing.name,
      filters: existing.filters,
      groupBy: existing.groupBy,
      viewMode: existing.viewMode,
      sortBy: existing.sortBy,
      sortOrder: existing.sortOrder,
      visibleColumnKeys: existing.visibleColumnKeys,
      isDefault: existing.isDefault
    }
  });

  return ok({ deleted: true });
}
