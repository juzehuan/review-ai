import { prisma } from "@review-ai/db";
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

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id);
  if (scoped.response) {
    return scoped.response;
  }

  const existing = await prisma.reportShare.findFirst({
    where: { id: shareId, taskId, workspaceId: workspaceContext.workspace.id }
  });
  if (!existing) {
    return fail("分享链接不存在或不属于当前任务。", 404);
  }

  const share = await prisma.reportShare.update({
    where: { id: existing.id },
    data: { enabled: false, revokedAt: new Date() }
  });

  return ok(serializeReportShare(share, buildPublicShareUrl(request, share.token)));
}
