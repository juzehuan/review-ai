import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { ensurePersonalWorkspace } from "@/lib/personal-workspace";
import { serializeAdminUser } from "@/lib/serializers";
import { ensureSubscriptionPeriod } from "@/lib/workspace";

function toLimit(value: unknown, fallback: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return fallback;
  }
  return Math.floor(numberValue);
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const { userId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return fail("用户不存在", 404);
  }

  const nextIsActive = typeof body.isActive === "boolean" ? body.isActive : user.isActive;
  const nextIsSuperAdmin = typeof body.isSuperAdmin === "boolean" ? body.isSuperAdmin : user.isSuperAdmin;

  if (auth.user?.id === userId && !nextIsActive) {
    return fail("不能禁用当前登录账号", 400);
  }

  if (user.isSuperAdmin && (!nextIsActive || !nextIsSuperAdmin)) {
    const activeSuperAdminCount = await prisma.user.count({
      where: { isSuperAdmin: true, isActive: true }
    });
    if (activeSuperAdminCount <= 1) {
      return fail("至少保留一个启用中的超管账号", 400);
    }
  }

  const workspace = await ensurePersonalWorkspace(prisma, user);
  const currentSubscription =
    workspace.subscription ||
    (await prisma.subscription.create({
      data: { workspaceId: workspace.id }
    }));
  const activeSubscription = await ensureSubscriptionPeriod(workspace.id, currentSubscription);

  await prisma.$transaction(async (tx) => {
    if (typeof body.name === "string" || typeof body.isSuperAdmin === "boolean" || typeof body.isActive === "boolean") {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
          ...(typeof body.isSuperAdmin === "boolean" ? { isSuperAdmin: body.isSuperAdmin } : {}),
          ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {})
        }
      });

      if (body.isActive === false) {
        await tx.authSession.deleteMany({ where: { userId } });
      }
    }

    await tx.subscription.update({
      where: { workspaceId: workspace.id },
      data: {
        monthlyReviewLimit: toLimit(body.monthlyReviewLimit, activeSubscription?.monthlyReviewLimit ?? currentSubscription.monthlyReviewLimit),
        monthlyRunLimit: toLimit(body.monthlyRunLimit, activeSubscription?.monthlyRunLimit ?? currentSubscription.monthlyRunLimit)
      }
    });
  });
  await writeAuditLog(request, {
    workspaceId: workspace.id,
    actor: auth.user,
    action: "admin.user.update",
    targetType: "user",
    targetId: user.id,
    targetLabel: `${user.name} <${user.email}>`,
    metadata: {
      before: {
        name: user.name,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        monthlyReviewLimit: activeSubscription?.monthlyReviewLimit ?? currentSubscription.monthlyReviewLimit,
        monthlyRunLimit: activeSubscription?.monthlyRunLimit ?? currentSubscription.monthlyRunLimit
      },
      after: {
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : user.name,
        isActive: nextIsActive,
        isSuperAdmin: nextIsSuperAdmin,
        monthlyReviewLimit: toLimit(body.monthlyReviewLimit, activeSubscription?.monthlyReviewLimit ?? currentSubscription.monthlyReviewLimit),
        monthlyRunLimit: toLimit(body.monthlyRunLimit, activeSubscription?.monthlyRunLimit ?? currentSubscription.monthlyRunLimit)
      }
    }
  });

  const updated = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      usedInviteCode: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        include: {
          workspace: {
            include: { subscription: true }
          }
        }
      }
    }
  });

  return ok(serializeAdminUser(updated));
}
