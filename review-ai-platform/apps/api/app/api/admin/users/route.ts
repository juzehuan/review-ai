import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { requireSuperAdmin } from "@/lib/auth";
import { serializeUser } from "@/lib/serializers";

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" }
  });

  return ok(users.map(serializeUser));
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
    create: { email, name, isSuperAdmin }
  });

  return ok(serializeUser(user), 201);
}
