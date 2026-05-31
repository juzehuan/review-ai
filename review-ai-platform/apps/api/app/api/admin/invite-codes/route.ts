import { randomBytes } from "node:crypto";
import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { requireSuperAdmin } from "@/lib/auth";
import { serializeInviteCode } from "@/lib/serializers";

function makeCode() {
  return `RI-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function toPositiveInt(value: unknown, fallback: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return fallback;
  }
  return Math.floor(numberValue);
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: true,
      usedBy: true
    }
  });

  return ok(codes.map(serializeInviteCode));
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({}));
  const note = String(body.note || "").trim();
  const monthlyReviewLimit = toPositiveInt(body.monthlyReviewLimit, 20000);
  const monthlyRunLimit = toPositiveInt(body.monthlyRunLimit, 200);
  const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return fail("过期时间格式不正确", 400);
  }

  let code = makeCode();
  for (let i = 0; i < 4; i += 1) {
    const existing = await prisma.inviteCode.findUnique({ where: { code } });
    if (!existing) {
      break;
    }
    code = makeCode();
  }

  const inviteCode = await prisma.inviteCode.create({
    data: {
      code,
      note,
      monthlyReviewLimit,
      monthlyRunLimit,
      expiresAt,
      createdByUserId: auth.user.id
    },
    include: {
      createdBy: true,
      usedBy: true
    }
  });

  return ok(serializeInviteCode(inviteCode), 201);
}
