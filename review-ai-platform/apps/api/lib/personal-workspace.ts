import type { PrismaClient, User } from "@review-ai/db";

type Tx = PrismaClient | Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

function slugBase(email: string) {
  const prefix = email.split("@")[0] || "user";
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 36) || "user";
}

export async function ensurePersonalWorkspace(
  tx: Tx,
  user: Pick<User, "id" | "name" | "email" | "isSuperAdmin">,
  quota?: { monthlyReviewLimit?: number; monthlyRunLimit?: number }
) {
  const membership = await tx.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        include: { subscription: true }
      }
    }
  });

  if (membership?.workspace) {
    if (!membership.workspace.subscription) {
      const subscription = await tx.subscription.create({
        data: {
          workspaceId: membership.workspace.id,
          monthlyReviewLimit: quota?.monthlyReviewLimit ?? 20000,
          monthlyRunLimit: quota?.monthlyRunLimit ?? 200
        }
      });
      return { ...membership.workspace, subscription };
    }
    return membership.workspace;
  }

  return tx.workspace.create({
    data: {
      name: `${user.name} 的分析后台`,
      slug: `user-${slugBase(user.email)}-${Date.now().toString(36)}`,
      ownerUserId: user.id,
      subscription: {
        create: {
          planTier: "pro",
          monthlyReviewLimit: quota?.monthlyReviewLimit ?? 20000,
          monthlyRunLimit: quota?.monthlyRunLimit ?? 200
        }
      },
      memberships: {
        create: {
          userId: user.id,
          role: user.isSuperAdmin ? "owner" : "admin"
        }
      }
    },
    include: { subscription: true }
  });
}
