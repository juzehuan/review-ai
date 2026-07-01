import { prisma } from "@review-ai/db";
import type { Prisma } from "@review-ai/db";
import type { TaskListResponse, TaskStatus, TaskStatusCounts, TaskStatusFilter } from "@review-ai/shared";
import { ok } from "@/lib/http";
import { serializeTask } from "@/lib/serializers";
import { canAccessAllWorkspaces, getWorkspaceContext } from "@/lib/workspace";

const TASK_STATUSES = ["draft", "imported", "analyzing", "completed", "failed"] as const satisfies readonly TaskStatus[];
const DEFAULT_TASK_PAGE_SIZE = 20;
const MAX_TASK_PAGE_SIZE = 500;

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

function normalizeTaskStatusFilter(value: string | null): TaskStatusFilter {
  if (value === "all") {
    return value;
  }
  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : "all";
}

function taskStatusWhere(status: TaskStatusFilter): Prisma.TaskWhereInput {
  return status === "all" ? {} : { status };
}

function emptyTaskStatusCounts(): TaskStatusCounts {
  return {
    all: 0,
    draft: 0,
    imported: 0,
    analyzing: 0,
    completed: 0,
    failed: 0
  };
}

function buildTaskStatusCounts(groups: Array<{ status: TaskStatus; _count: { _all: number } }>): TaskStatusCounts {
  const counts = emptyTaskStatusCounts();
  for (const group of groups) {
    counts[group.status] = group._count._all;
    counts.all += group._count._all;
  }
  return counts;
}

function taskInclude() {
  return {
    analysisRuns: {
      orderBy: { createdAt: "desc" as const },
      take: 1
    },
    workspace: {
      include: {
        memberships: {
          where: { role: "owner" as const },
          include: { user: true },
          take: 1
        }
      }
    }
  };
}

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }
  const { searchParams } = new URL(request.url);
  const targetTaskId = searchParams.get("taskId");
  const status = normalizeTaskStatusFilter(searchParams.get("status"));
  const page = parsePositiveInt(searchParams.get("page"), 1, 100000);
  const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_TASK_PAGE_SIZE, MAX_TASK_PAGE_SIZE);
  const canViewAllTasks = canAccessAllWorkspaces(context);
  const baseWhere: Prisma.TaskWhereInput = canViewAllTasks ? {} : { workspaceId: context.workspace.id };
  const where: Prisma.TaskWhereInput = {
    ...baseWhere,
    ...taskStatusWhere(status)
  };
  const include = taskInclude();
  const [tasks, total, statusGroups] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include
    }),
    prisma.task.count({ where }),
    prisma.task.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true }
    })
  ]);

  if (targetTaskId && !tasks.some((task) => task.id === targetTaskId)) {
    const targetTask = await prisma.task.findFirst({
      where: { ...where, id: targetTaskId },
      include
    });
    if (targetTask) {
      tasks.unshift(targetTask);
    }
  }

  return ok<TaskListResponse>({
    items: tasks.map(serializeTask),
    total,
    page,
    pageSize,
    status,
    statusCounts: buildTaskStatusCounts(statusGroups),
    updatedAt: new Date().toISOString()
  });
}
