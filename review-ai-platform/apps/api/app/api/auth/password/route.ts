import { prisma } from "@review-ai/db";
import { hashPassword, requireAuthenticated, verifyPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";

export async function PATCH(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const oldPassword = String(body.oldPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!oldPassword || !newPassword) {
    return fail("请输入旧密码和新密码");
  }
  if (newPassword.length < 6) {
    return fail("新密码至少需要 6 位");
  }
  if (!verifyPassword(oldPassword, auth.user.passwordHash)) {
    return fail("旧密码不正确", 400);
  }
  if (verifyPassword(newPassword, auth.user.passwordHash)) {
    return fail("新密码不能与旧密码相同", 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: auth.user.id },
      data: { passwordHash: hashPassword(newPassword) },
    }),
    prisma.authSession.deleteMany({
      where: { userId: auth.user.id },
    }),
  ]);

  await writeAuditLog(request, {
    workspaceId: null,
    actor: auth.user,
    action: "auth.password.change",
    targetType: "user",
    targetId: auth.user.id,
    targetLabel: auth.user.email || auth.user.name,
    metadata: {
      userId: auth.user.id,
      email: auth.user.email,
      isSuperAdmin: auth.user.isSuperAdmin
    }
  });

  return ok({ success: true });
}
