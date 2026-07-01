import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { requireSuperAdmin } from "@/lib/auth";
import { serializeAdminWorkspace } from "@/lib/serializers";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      _count: {
        select: {
          tasks: true,
          memberships: true
        }
      }
    }
  });

  return ok(workspaces.map(serializeAdminWorkspace));
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const slug = slugify(String(body.slug || name));

  if (!name || !slug) {
    return fail("空间名称和 slug 不能为空");
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      ownerUserId: auth.user.id,
      subscription: {
        create: {
          planTier: body.planTier || "pro",
          monthlyReviewLimit: Number(body.monthlyReviewLimit || 20000),
          monthlyRunLimit: Number(body.monthlyRunLimit || 200)
        }
      },
      memberships: {
        create: {
          userId: auth.user.id,
          role: "owner"
        }
      }
    },
    include: {
      subscription: true,
      _count: {
        select: {
          tasks: true,
          memberships: true
        }
      }
    }
  });

  await writeAuditLog(request, {
    workspaceId: workspace.id,
    actor: auth.user,
    action: "workspace.create",
    targetType: "workspace",
    targetId: workspace.id,
    targetLabel: workspace.name,
    metadata: {
      slug: workspace.slug,
      name: workspace.name,
      source: "admin_console",
      ownerUserId: workspace.ownerUserId,
      planTier: workspace.subscription?.planTier || "pro",
      monthlyReviewLimit: workspace.subscription?.monthlyReviewLimit || 0,
      monthlyRunLimit: workspace.subscription?.monthlyRunLimit || 0
    }
  });

  return ok(serializeAdminWorkspace(workspace), 201);
}
