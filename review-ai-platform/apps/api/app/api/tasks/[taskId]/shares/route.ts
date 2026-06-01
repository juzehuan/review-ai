import { randomBytes } from "node:crypto";
import { prisma } from "@review-ai/db";
import type { ReportShareDTO } from "@review-ai/shared";
import { ok } from "@/lib/http";
import { serializeReportShare } from "@/lib/serializers";
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

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id);
  if (scoped.response) {
    return scoped.response;
  }

  const shares = await prisma.reportShare.findMany({
    where: { workspaceId: workspaceContext.workspace.id, taskId },
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

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id);
  if (scoped.response || !scoped.task) {
    return scoped.response;
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || scoped.task.productName || scoped.task.name || "").trim();
  const existing = await prisma.reportShare.findFirst({
    where: {
      workspaceId: workspaceContext.workspace.id,
      taskId,
      enabled: true,
      revokedAt: null
    },
    orderBy: { createdAt: "desc" }
  });

  const share =
    existing ||
    (await prisma.reportShare.create({
      data: {
        workspaceId: workspaceContext.workspace.id,
        taskId,
        token: await createUniqueToken(),
        title,
        expiresAt: parseExpiresAt(body.expiresAt),
        createdByUserId: workspaceContext.user.id
      }
    }));

  return ok(serializeReportShare(share, buildPublicShareUrl(request, share.token)), existing ? 200 : 201);
}
