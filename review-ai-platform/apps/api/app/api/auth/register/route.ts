import { prisma } from "@review-ai/db";
import type { AuthResponseDTO } from "@review-ai/shared";
import { createSession, hashPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { ensurePersonalWorkspace } from "@/lib/personal-workspace";
import { serializeUser, serializeWorkspace } from "@/lib/serializers";

const INVITE_ERRORS = new Set(["INVITE_NOT_FOUND", "INVITE_USED", "INVITE_EXPIRED"]);

function inviteErrorMessage(code: string) {
  if (code === "INVITE_NOT_FOUND") {
    return "邀请码不存在";
  }
  if (code === "INVITE_USED") {
    return "邀请码已被使用";
  }
  if (code === "INVITE_EXPIRED") {
    return "邀请码已过期";
  }
  return "邀请码不可用";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const inviteCodeValue = String(body.inviteCode || "").trim().toUpperCase();

  if (!name || !email || password.length < 6) {
    return fail("请填写姓名、邮箱和至少 6 位密码");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return fail("该邮箱已注册", 409);
  }

  if (!inviteCodeValue) {
    return fail("普通用户注册需要填写超管生成的邀请码", 400);
  }

  const passwordHash = hashPassword(password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const inviteCode = await tx.inviteCode.findUnique({
        where: { code: inviteCodeValue }
      });

      if (!inviteCode) {
        throw new Error("INVITE_NOT_FOUND");
      }
      if (inviteCode.usedAt || inviteCode.usedByUserId) {
        throw new Error("INVITE_USED");
      }
      if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() < Date.now()) {
        throw new Error("INVITE_EXPIRED");
      }

      const user = await tx.user.upsert({
        where: { email },
        update: {
          name,
          passwordHash,
          isSuperAdmin: false
        },
        create: {
          name,
          email,
          passwordHash,
          isSuperAdmin: false
        }
      });

      const workspace = await ensurePersonalWorkspace(tx, user, {
        monthlyReviewLimit: inviteCode?.monthlyReviewLimit,
        monthlyRunLimit: inviteCode?.monthlyRunLimit
      });

      if (inviteCode) {
        await tx.inviteCode.update({
          where: { id: inviteCode.id },
          data: {
            usedAt: new Date(),
            usedByUserId: user.id
          }
        });
        await tx.subscription.update({
          where: { workspaceId: workspace.id },
          data: {
            monthlyReviewLimit: inviteCode.monthlyReviewLimit,
            monthlyRunLimit: inviteCode.monthlyRunLimit
          }
        });
      }

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
  } catch (error) {
    if (error instanceof Error && INVITE_ERRORS.has(error.message)) {
      return fail(inviteErrorMessage(error.message), 400);
    }
    throw error;
  }
}
