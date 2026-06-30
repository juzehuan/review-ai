import { prisma, type Subscription } from "@review-ai/db";
import { fail } from "@/lib/http";
import { requireAuthenticated } from "@/lib/auth";

export const DEFAULT_WORKSPACE_SLUG = "default-workspace";
const SUBSCRIPTION_PERIOD_DAYS = Math.max(Number(process.env.SUBSCRIPTION_PERIOD_DAYS || 30), 1);

function addPeriodDays(date: Date) {
  return new Date(date.getTime() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000);
}

function resolvePeriodEndsAt(subscription: Subscription) {
  return subscription.currentPeriodEndsAt || addPeriodDays(subscription.currentPeriodStartedAt);
}

export async function ensureSubscriptionPeriod(workspaceId: string, subscription?: Subscription | null) {
  const current = subscription || (await prisma.subscription.findUnique({ where: { workspaceId } }));
  if (!current) {
    return null;
  }

  const now = new Date();
  if (resolvePeriodEndsAt(current).getTime() > now.getTime()) {
    return current;
  }

  return prisma.subscription.update({
    where: { id: current.id },
    data: {
      currentPeriodReviewCount: 0,
      currentPeriodRunCount: 0,
      currentPeriodStartedAt: now,
      currentPeriodEndsAt: addPeriodDays(now)
    }
  });
}

export async function getWorkspaceContext(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response || !auth.user) {
    return { workspace: null, user: null, membership: null, response: auth.response };
  }

  const currentUser = auth.user;
  const requestedSlug = request.headers.get("x-workspace-slug") || request.headers.get("x-tenant-slug");

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: currentUser.id,
      ...(requestedSlug
        ? {
            workspace: {
              slug: requestedSlug
            }
          }
        : {})
    },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        include: { subscription: true }
      }
    }
  });

  if (membership) {
    const subscription = await ensureSubscriptionPeriod(membership.workspace.id, membership.workspace.subscription);
    return { workspace: { ...membership.workspace, subscription }, user: currentUser, membership, response: null };
  }

  if (requestedSlug) {
    return { workspace: null, user: currentUser, membership: null, response: fail("你不属于该工作空间", 403) };
  }

  const targetSlug = requestedSlug || process.env.DEFAULT_WORKSPACE_SLUG || DEFAULT_WORKSPACE_SLUG;

  const workspace = await prisma.workspace.upsert({
    where: { slug: targetSlug },
    update: {},
    create: {
      slug: targetSlug,
      name: process.env.DEFAULT_WORKSPACE_NAME || "Growth Ops Team",
      ownerUserId: currentUser.id,
      subscription: {
        create: {
          planTier: "pro",
          monthlyReviewLimit: Number(process.env.DEFAULT_MONTHLY_REVIEW_LIMIT || 20000),
          monthlyRunLimit: Number(process.env.DEFAULT_MONTHLY_RUN_LIMIT || 200),
          currentPeriodEndsAt: addPeriodDays(new Date())
        }
      }
    },
    include: { subscription: true }
  });

  const fallbackMembership = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: currentUser.id
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: currentUser.id,
      role: currentUser.isSuperAdmin ? "owner" : "admin"
    }
  });

  if (!workspace.subscription) {
    const subscription = await prisma.subscription.create({
      data: { workspaceId: workspace.id, currentPeriodEndsAt: addPeriodDays(new Date()) }
    });
    return { workspace: { ...workspace, subscription }, user: currentUser, membership: fallbackMembership, response: null };
  }

  const subscription = await ensureSubscriptionPeriod(workspace.id, workspace.subscription);
  return { workspace: { ...workspace, subscription }, user: currentUser, membership: fallbackMembership, response: null };
}

export type WorkspaceContext = Awaited<ReturnType<typeof getWorkspaceContext>>;
export type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";

export function requireWorkspaceRole(context: WorkspaceContext, allowedRoles: WorkspaceRole[]) {
  if (!context.user || !context.workspace || !context.membership) {
    return fail("你不属于该工作空间", 403);
  }

  if (context.user.isSuperAdmin || allowedRoles.includes(context.membership.role)) {
    return null;
  }

  return fail("当前角色没有权限执行该操作", 403);
}

export function taskWorkspaceWhere(taskId: string, workspaceId: string) {
  return {
    id: taskId,
    workspaceId
  };
}

export function canAccessAllWorkspaces(context: Pick<WorkspaceContext, "user">) {
  return Boolean(context.user?.isSuperAdmin);
}

export function canBypassQuota(context: Pick<WorkspaceContext, "user">) {
  return Boolean(context.user?.isSuperAdmin);
}

export async function getScopedTask(taskId: string, workspaceId: string, allowGlobalAccess = false) {
  return prisma.task.findFirst({
    where: allowGlobalAccess ? { id: taskId } : taskWorkspaceWhere(taskId, workspaceId)
  });
}

export async function requireScopedTask(taskId: string, workspaceId: string, allowGlobalAccess = false) {
  const task = await getScopedTask(taskId, workspaceId, allowGlobalAccess);
  if (!task) {
    return { task: null, response: fail("任务不存在或不属于当前工作空间", 404) };
  }
  return { task, response: null };
}

export async function requireScopedRun(runId: string, workspaceId: string, allowGlobalAccess = false) {
  const run = await prisma.analysisRun.findFirst({
    where: allowGlobalAccess
      ? { id: runId }
      : {
          id: runId,
          task: {
            workspaceId
          }
        }
  });

  if (!run) {
    return { run: null, response: fail("分析任务不存在或不属于当前工作空间", 404) };
  }

  return { run, response: null };
}

export async function assertReviewQuota(workspaceId: string, incomingReviewCount: number, bypassQuota = false) {
  if (bypassQuota) {
    return null;
  }

  const subscription = await ensureSubscriptionPeriod(workspaceId);
  if (!subscription) {
    return null;
  }

  const nextCount = subscription.currentPeriodReviewCount + incomingReviewCount;
  if (nextCount > subscription.monthlyReviewLimit) {
    return fail("当前工作空间本月评论额度不足，请升级套餐或重置用量。", 402);
  }

  return null;
}

export async function assertRunQuota(workspaceId: string, bypassQuota = false) {
  if (bypassQuota) {
    return null;
  }

  const subscription = await ensureSubscriptionPeriod(workspaceId);
  if (!subscription) {
    return null;
  }

  if (subscription.currentPeriodRunCount + 1 > subscription.monthlyRunLimit) {
    return fail("当前工作空间本月分析次数已用完，请升级套餐或重置用量。", 402);
  }

  return null;
}
