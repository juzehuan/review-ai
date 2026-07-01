import { randomBytes } from "node:crypto";
import { prisma } from "@review-ai/db";
import type { ReportShareDTO } from "@review-ai/shared";
import { writeAuditLog } from "@/lib/audit-log";
import { buildDashboardForTask } from "@/lib/dashboard";
import { ok } from "@/lib/http";
import { serializeReportShare, serializeTask } from "@/lib/serializers";
import { buildPublicShareUrl } from "@/lib/share-url";
import { getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

function parseExpiresAt(value: unknown) {
  if (!value) {
    return null;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function createUniqueToken() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(24).toString("base64url");
    const existing = await prisma.reportShare.findUnique({ where: { token } });
    if (!existing) {
      return token;
    }
  }
  return randomBytes(32).toString("base64url");
}

function jsonSnapshot<T>(value: T | null) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined;
}

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response || !scoped.task) {
    return scoped.response;
  }
  const taskWorkspaceId = scoped.task.workspaceId || workspaceContext.workspace.id;

  const shares = await prisma.reportShare.findMany({
    where: { workspaceId: taskWorkspaceId, taskId },
    orderBy: { createdAt: "desc" }
  });

  return ok<ReportShareDTO[]>(shares.map((share) => serializeReportShare(share, buildPublicShareUrl(request, share.token))));
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace || !workspaceContext.user) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response || !scoped.task) {
    return scoped.response;
  }
  const taskWorkspaceId = scoped.task.workspaceId || workspaceContext.workspace.id;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || scoped.task.productName || scoped.task.name || "").trim();
  const requestedSnapshotMode = body.snapshotMode === "live" ? "live" : "snapshot";
  const shouldSnapshot = requestedSnapshotMode === "snapshot";
  const dashboardSnapshot = shouldSnapshot ? await buildDashboardForTask(taskId).catch(() => null) : null;
  const taskSnapshot = shouldSnapshot ? jsonSnapshot(serializeTask(scoped.task)) : undefined;
  const dashboardSnapshotJson = shouldSnapshot ? jsonSnapshot(dashboardSnapshot) : undefined;
  const snapshotCreatedAt = dashboardSnapshot ? new Date() : null;
  const actualSnapshotMode = dashboardSnapshot ? "snapshot" : "live";
  const activeShares = await prisma.reportShare.findMany({
    where: {
      workspaceId: taskWorkspaceId,
      taskId,
      enabled: true,
      revokedAt: null
    },
    orderBy: { createdAt: "desc" }
  });
  const existing = activeShares.find((share) => (share.dashboardSnapshot ? "snapshot" : "live") === actualSnapshotMode);

  const share = existing
    ? existing
    : await prisma.reportShare.create({
        data: {
          workspaceId: taskWorkspaceId,
          taskId,
          token: await createUniqueToken(),
          title,
          expiresAt: parseExpiresAt(body.expiresAt),
          createdByUserId: workspaceContext.user.id,
          dashboardSnapshot: dashboardSnapshotJson,
          taskSnapshot,
          snapshotCreatedAt
        }
      });
  if (!existing) {
    await writeAuditLog(request, {
      workspaceId: taskWorkspaceId,
      actor: workspaceContext.user,
      action: "report_share.create",
      targetType: "report_share",
      targetId: share.id,
      targetLabel: title,
      metadata: {
        taskId,
        expiresAt: share.expiresAt?.toISOString() || null,
        requestedSnapshotMode,
        snapshotMode: actualSnapshotMode
      }
    });
  }

  return ok(serializeReportShare(share, buildPublicShareUrl(request, share.token)), existing ? 200 : 201);
}
