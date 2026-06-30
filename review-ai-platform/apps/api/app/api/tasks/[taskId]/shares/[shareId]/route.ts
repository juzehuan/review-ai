import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { serializeReportShare } from "@/lib/serializers";
import { buildPublicShareUrl } from "@/lib/share-url";
import { getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

export async function DELETE(request: Request, context: { params: Promise<{ taskId: string; shareId: string }> }) {
  const { taskId, shareId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
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

  const existing = await prisma.reportShare.findFirst({
    where: { id: shareId, taskId, workspaceId: taskWorkspaceId }
  });
  if (!existing) {
    return fail("分享链接不存在或不属于当前任务。", 404);
  }

  const share = await prisma.reportShare.update({
    where: { id: existing.id },
    data: { enabled: false, revokedAt: new Date() }
  });
  await writeAuditLog(request, {
    workspaceId: taskWorkspaceId,
    actor: workspaceContext.user,
    action: "report_share.revoke",
    targetType: "report_share",
    targetId: share.id,
    targetLabel: share.title,
    metadata: { taskId }
  });

  return ok(serializeReportShare(share, buildPublicShareUrl(request, share.token)));
}
