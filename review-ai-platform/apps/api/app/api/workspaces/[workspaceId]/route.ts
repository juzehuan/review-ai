import { prisma } from "@review-ai/db";
import { requireAuthenticated } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function DELETE(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const auth = await requireAuthenticated(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { workspaceId } = await params;
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: auth.user.id
      }
    },
    include: { workspace: true }
  });

  if (!membership) {
    return fail("工作空间不存在或你不属于该工作空间", 404);
  }

  if (!auth.user.isSuperAdmin && membership.role !== "owner") {
    return fail("只有空间所有者或超管可以删除工作空间", 403);
  }

  const userWorkspaceCount = await prisma.workspaceMember.count({
    where: { userId: auth.user.id }
  });
  if (userWorkspaceCount <= 1) {
    return fail("至少需要保留一个工作空间", 400);
  }

  await prisma.workspace.delete({
    where: { id: workspaceId }
  });

  return ok({ success: true });
}

