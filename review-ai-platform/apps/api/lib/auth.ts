import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { prisma } from "@review-ai/db";
import { fail } from "@/lib/http";

const SESSION_DAYS = 14;
export const DEFAULT_RESET_PASSWORD = "123456";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return header.slice(7).trim();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidate = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  return token;
}

export async function getCurrentUser(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

export async function deleteCurrentSession(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return;
  }

  await prisma.authSession.deleteMany({
    where: { tokenHash: hashToken(token) }
  });
}

export async function requireAuthenticated(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return { user: null, response: fail("请先登录", 401) };
  }
  return { user, response: null };
}

export async function requireSuperAdmin(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response || !auth.user) {
    return auth;
  }
  if (!auth.user.isSuperAdmin) {
    return { user: auth.user, response: fail("需要超管权限", 403) };
  }
  return { user: auth.user, response: null };
}
