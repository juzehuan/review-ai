import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { serializeActionItem } from "@/lib/serializers";
import { getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

const statuses = ["open", "in_progress", "resolved", "archived"];
const priorities = ["high", "medium", "low"];

function normalizeStatus(value: unknown, fallback = "open") {
  const status = String(value || fallback);
  return statuses.includes(status) ? status : fallback;
}

function normalizePriority(value: unknown, fallback = "medium") {
  const priority = String(value || fallback);
  return priorities.includes(priority) ? priority : fallback;
}

function parseDate(value: unknown) {
  if (!value) {
    return null;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id);
  if (scoped.response) {
    return scoped.response;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const assigneeUserId = searchParams.get("assigneeUserId");
  const items = await prisma.reviewActionItem.findMany({
    where: {
      taskId,
      ...(status ? { status } : {}),
      ...(assigneeUserId ? { assigneeUserId } : {})
    },
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    include: { assignee: true }
  });
  return ok(items.map(serializeActionItem));
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
  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id);
  if (scoped.response) {
    return scoped.response;
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  if (!title) {
    return fail("行动项标题不能为空", 400);
  }
  const assigneeUserId = typeof body.assigneeUserId === "string" && body.assigneeUserId ? body.assigneeUserId : null;
  if (assigneeUserId) {
    const assignee = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspaceContext.workspace.id, userId: assigneeUserId } }
    });
    if (!assignee) {
      return fail("负责人不属于当前空间", 400);
    }
  }
  const status = normalizeStatus(body.status);

  const created = await prisma.reviewActionItem.create({
    data: {
      taskId,
      runId: typeof body.runId === "string" && body.runId ? body.runId : null,
      assigneeUserId,
      title,
      description: String(body.description || "").trim(),
      status,
      priority: normalizePriority(body.priority),
      source: String(body.source || "manual"),
      relatedReviewIds: Array.isArray(body.relatedReviewIds) ? body.relatedReviewIds.map(String) : [],
      dueAt: parseDate(body.dueAt),
      completedAt: status === "resolved" ? new Date() : null
    },
    include: { assignee: true }
  });

  return ok(serializeActionItem(created), 201);
}
