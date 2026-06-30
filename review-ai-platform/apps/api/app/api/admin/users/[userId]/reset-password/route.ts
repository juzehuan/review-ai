import { prisma } from "@review-ai/db";
import { DEFAULT_RESET_PASSWORD, hashPassword, requireSuperAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const { userId } = await context.params;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return fail("用户不存在", 404);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(DEFAULT_RESET_PASSWORD) }
    }),
    prisma.authSession.deleteMany({ where: { userId } })
  ]);

  return ok({ password: DEFAULT_RESET_PASSWORD });
}
