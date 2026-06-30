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

function readForwardedIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip") || null;
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
        metadata: input.metadata ?? undefined
      }
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
