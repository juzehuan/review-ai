import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { DEFAULT_RESET_PASSWORD, hashPassword, requireSuperAdmin } from "@/lib/auth";
import { ensurePersonalWorkspace } from "@/lib/personal-workspace";
import { serializeAdminUser } from "@/lib/serializers";

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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

  return ok(users.map(serializeAdminUser));
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const isSuperAdmin = Boolean(body.isSuperAdmin);

  if (!email || !name) {
    return fail("邮箱和姓名不能为空");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, isSuperAdmin },
    create: { email, name, isSuperAdmin, isActive: true, passwordHash: hashPassword(DEFAULT_RESET_PASSWORD) }
  });
  await ensurePersonalWorkspace(prisma, user);

  const withQuota = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
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

  return ok(serializeAdminUser(withQuota), 201);
}
