import type { Prisma } from "@review-ai/db";
import type { AuditLogDTO } from "@review-ai/shared";
import { prisma } from "@review-ai/db";
import { requireSuperAdmin } from "@/lib/auth";
import { ok } from "@/lib/http";
import { serializeAuditLog } from "@/lib/serializers";

function readPositiveLimit(value: string | null) {
  const parsed = Number(value || 100);
  if (!Number.isFinite(parsed)) {
    return 100;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 300);
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const where: Prisma.AuditLogWhereInput = {
    ...(url.searchParams.get("action") ? { action: url.searchParams.get("action") || undefined } : {}),
    ...(url.searchParams.get("targetType") ? { targetType: url.searchParams.get("targetType") || undefined } : {}),
    ...(url.searchParams.get("actorUserId") ? { actorUserId: url.searchParams.get("actorUserId") || undefined } : {}),
    ...(workspaceId ? { workspaceId: workspaceId === "__platform" ? null : workspaceId } : {})
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: readPositiveLimit(url.searchParams.get("limit"))
  });

  return ok<AuditLogDTO[]>(logs.map(serializeAuditLog));
}
