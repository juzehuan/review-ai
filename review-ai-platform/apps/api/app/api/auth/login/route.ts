import type { AuthResponseDTO } from "@review-ai/shared";
import { prisma } from "@review-ai/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { serializeUser, serializeWorkspace } from "@/lib/serializers";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return fail("请输入邮箱和密码");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail("邮箱或密码错误", 401);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        include: { subscription: true }
      }
    }
  });

  const workspace =
    membership?.workspace ||
    (await prisma.workspace.create({
      data: {
        name: `${user.name} Team`,
        slug: `workspace-${Date.now().toString(36)}`,
        ownerUserId: user.id,
        subscription: { create: {} },
        memberships: {
          create: {
            userId: user.id,
            role: "owner"
          }
        }
      },
      include: { subscription: true }
    }));

  const token = await createSession(user.id);
  return ok({
    token,
    user: serializeUser(user),
    workspace: serializeWorkspace(workspace)
  } satisfies AuthResponseDTO);
}
