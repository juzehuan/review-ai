import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function loadWorkspaceEnv() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    const envPath = path.join(current, ".env");
    if (existsSync(envPath)) {
      for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#") || !line.includes("=")) {
          continue;
        }
        const [rawName, ...rawValueParts] = line.split("=");
        const name = rawName.trim();
        let value = rawValueParts.join("=").trim();
        if (
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (name && process.env[name] === undefined) {
          process.env[name] = value;
        }
      }
      return;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return;
    }
    current = parent;
  }
}

loadWorkspaceEnv();

const ENCRYPTED_SECRET_PREFIX = "enc:v1:";

function secretKeyBuffer() {
  const secret = process.env.REVIEW_AI_SECRET_KEY?.trim() || "";
  if (!secret) {
    return null;
  }
  return createHash("sha256").update(secret).digest();
}

export function isEncryptedSecret(value: string | null | undefined) {
  return Boolean(value?.startsWith(ENCRYPTED_SECRET_PREFIX));
}

export function encryptSecret(value: string | null | undefined) {
  if (!value || isEncryptedSecret(value)) {
    return value || null;
  }
  const key = secretKeyBuffer();
  if (!key) {
    return value;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_SECRET_PREFIX}${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  if (!isEncryptedSecret(value)) {
    return value;
  }
  const key = secretKeyBuffer();
  if (!key) {
    return null;
  }
  const payload = value.slice(ENCRYPTED_SECRET_PREFIX.length);
  const [ivPart, authTagPart, encryptedPart] = payload.split(".");
  if (!ivPart || !authTagPart || !encryptedPart) {
    return null;
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __reviewAiPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__reviewAiPrisma__ ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__reviewAiPrisma__ = prisma;
}

export * from "@prisma/client";
