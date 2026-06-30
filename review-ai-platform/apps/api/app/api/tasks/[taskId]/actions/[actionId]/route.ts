import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { serializeActionItem } from "@/lib/serializers";
import { getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

const statuses = ["open", "in_progress", "resolved", "archived"];
const priorities = ["high", "medium", "low"];

function parseDate(value: unknown) {
  if (!value) {
    return null;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string; actionId: string }> }
) {
  const { taskId, actionId } = await context.params;
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
  const taskWorkspaceId = scoped.task.workspaceId || workspaceContext.workspace.id;

  const body = await request.json().catch(() => ({}));
  const existing = await prisma.reviewActionItem.findFirst({ where: { id: actionId, taskId } });
  if (!existing) {
    return fail("行动项不存在", 404);
  }
  const assigneeUserId =
    typeof body.assigneeUserId === "string" && body.assigneeUserId ? body.assigneeUserId : null;
  if (typeof body.assigneeUserId !== "undefined" && assigneeUserId) {
    const assignee = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: taskWorkspaceId, userId: assigneeUserId } }
    });
    if (!assignee) {
      return fail("负责人不属于当前空间", 400);
    }
  }
  const nextStatus = typeof body.status === "string" && statuses.includes(body.status) ? body.status : undefined;
  const nextPriority =
    typeof body.priority === "string" && priorities.includes(body.priority) ? body.priority : undefined;

  const updated = await prisma.reviewActionItem.update({
    where: { id: actionId },
    data: {
      ...(typeof body.title === "string" ? { title: body.title.trim() || existing.title } : {}),
      ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(nextStatus === "resolved" && existing.status !== "resolved" ? { completedAt: new Date() } : {}),
      ...(nextStatus && nextStatus !== "resolved" ? { completedAt: null } : {}),
      ...(nextPriority ? { priority: nextPriority } : {}),
      ...(typeof body.assigneeUserId !== "undefined" ? { assigneeUserId } : {}),
      ...(typeof body.dueAt !== "undefined" ? { dueAt: parseDate(body.dueAt) } : {}),
      ...(Array.isArray(body.relatedReviewIds) ? { relatedReviewIds: body.relatedReviewIds.map(String) } : {})
    },
    include: { assignee: true }
  });

  return ok(serializeActionItem(updated));
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ taskId: string; actionId: string }> }
) {
  const { taskId, actionId } = await context.params;
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

  await prisma.reviewActionItem.deleteMany({ where: { id: actionId, taskId } });
  return ok({ deleted: true });
}
