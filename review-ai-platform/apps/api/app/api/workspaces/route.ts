import { prisma } from "@review-ai/db";
import { requireAuthenticated } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { serializeMyWorkspace } from "@/lib/serializers";

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `workspace-${Date.now()}`;
}

export async function GET(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        include: { subscription: true }
      }
    }
  });

  return ok(memberships.map(serializeMyWorkspace));
}

export async function POST(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const slug = slugify(String(body.slug || name));

  if (!name) {
    return fail("空间名称不能为空");
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug: `${slug}-${Date.now().toString(36)}`,
      ownerUserId: auth.user.id,
      subscription: { create: {} },
      memberships: {
        create: {
          userId: auth.user.id,
          role: "owner"
        }
      }
    },
    include: {
      subscription: true,
      memberships: {
        where: { userId: auth.user.id },
        take: 1
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
      source: "self_service",
      ownerUserId: workspace.ownerUserId,
      planTier: workspace.subscription?.planTier || "free",
      monthlyReviewLimit: workspace.subscription?.monthlyReviewLimit || 0,
      monthlyRunLimit: workspace.subscription?.monthlyRunLimit || 0
    }
  });

  const membership = workspace.memberships[0];
  if (!membership) {
    return fail("空间成员创建失败", 500);
  }

  return ok(serializeMyWorkspace({ ...membership, workspace }), 201);
}
