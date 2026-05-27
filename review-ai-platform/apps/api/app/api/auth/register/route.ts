import { prisma } from "@review-ai/db";
import type { AuthResponseDTO } from "@review-ai/shared";
import { createSession, hashPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { serializeUser, serializeWorkspace } from "@/lib/serializers";

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `workspace-${Date.now()}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const workspaceName = String(body.workspaceName || `${name || "My"} Team`).trim();

  if (!name || !email || password.length < 6) {
    return fail("请填写姓名、邮箱和至少 6 位密码");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return fail("该邮箱已注册", 409);
  }

  const usersWithPassword = await prisma.user.count({
    where: {
      passwordHash: {
        not: null
      }
    }
  });
  const shouldBeSuperAdmin = usersWithPassword === 0;
  const passwordHash = hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        isSuperAdmin: shouldBeSuperAdmin || existing?.isSuperAdmin || false
      },
      create: {
        name,
        email,
        passwordHash,
        isSuperAdmin: shouldBeSuperAdmin
      }
    });

    const baseSlug = slugify(workspaceName);
    const workspace = await tx.workspace.create({
      data: {
        name: workspaceName,
        slug: `${baseSlug}-${Date.now().toString(36)}`,
        ownerUserId: user.id,
        subscription: {
          create: {
            planTier: "pro",
            monthlyReviewLimit: 20000,
            monthlyRunLimit: 200
          }
        },
        memberships: {
          create: {
            userId: user.id,
            role: "owner"
          }
        }
      },
      include: { subscription: true }
    });

    return { user, workspace };
  });

  const token = await createSession(result.user.id);
  return ok(
    {
      token,
      user: serializeUser(result.user),
      workspace: serializeWorkspace(result.workspace)
    } satisfies AuthResponseDTO,
    201
  );
}
