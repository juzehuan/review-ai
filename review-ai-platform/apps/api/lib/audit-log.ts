import type { Prisma, User } from "@review-ai/db";
import { prisma } from "@review-ai/db";

type AuditActor = Pick<User, "id" | "email" | "name"> | null | undefined;

type AuditInput = {
  workspaceId?: string | null;
  actor?: AuditActor;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

type SanitizedJsonValue = string | number | boolean | null | SanitizedJsonValue[] | { [key: string]: SanitizedJsonValue };

const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_METADATA_KEY = /api.?key|token|secret|password|cookie|authorization|credential|proxy.?url|base.?url|ms.?token|x.?bogus|x.?gnarly/i;

function readForwardedIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip") || null;
}

function shouldRedactMetadataField(key: string | undefined, value: unknown) {
  if (!key || !SENSITIVE_METADATA_KEY.test(key)) {
    return false;
  }
  if (value === null || value === undefined || typeof value === "boolean") {
    return false;
  }
  return true;
}

function sanitizeAuditMetadataValue(value: unknown, key?: string): SanitizedJsonValue | undefined {
  if (shouldRedactMetadataField(key, value)) {
    return REDACTED_VALUE;
  }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const sanitizedItems: SanitizedJsonValue[] = [];
    for (const item of value) {
      const sanitizedItem = sanitizeAuditMetadataValue(item);
      if (sanitizedItem !== undefined) {
        sanitizedItems.push(sanitizedItem);
      }
    }
    return sanitizedItems;
  }
  if (typeof value === "object") {
    const sanitizedObject: { [key: string]: SanitizedJsonValue } = {};
    for (const [fieldKey, fieldValue] of Object.entries(value as Record<string, unknown>)) {
      const sanitizedFieldValue = sanitizeAuditMetadataValue(fieldValue, fieldKey);
      if (sanitizedFieldValue !== undefined) {
        sanitizedObject[fieldKey] = sanitizedFieldValue;
      }
    }
    return sanitizedObject;
  }
  return undefined;
}

export function sanitizeAuditMetadata(metadata: Prisma.InputJsonValue | null | undefined) {
  if (metadata === null || metadata === undefined) {
    return undefined;
  }
  const sanitized = sanitizeAuditMetadataValue(metadata);
  return sanitized === undefined ? undefined : (sanitized as Prisma.InputJsonValue);
}

export async function writeAuditLog(request: Request, input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId || null,
        actorUserId: input.actor?.id || null,
        actorEmail: input.actor?.email || null,
        actorName: input.actor?.name || null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || null,
        targetLabel: input.targetLabel || null,
        ipAddress: readForwardedIp(request),
        userAgent: request.headers.get("user-agent"),
        metadata: sanitizeAuditMetadata(input.metadata)
      }
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
