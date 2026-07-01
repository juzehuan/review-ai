import type { MemberRole } from "@review-ai/shared";
import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { serializeMember } from "@/lib/serializers";
import { getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

const roles: MemberRole[] = ["owner", "admin", "analyst", "viewer"];

export async function PATCH(request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin"]);
  if (roleResponse) {
    return roleResponse;
  }
  const { workspace } = workspaceContext;
  const body = await request.json().catch(() => ({}));

  if (!roles.includes(body.role)) {
    return fail("无效角色");
  }

  if (body.role === "owner" && workspaceContext.membership?.role !== "owner" && !workspaceContext.user?.isSuperAdmin) {
    return fail("只有所有者可以授予所有者角色", 403);
  }

  const existingMember = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: workspace.id },
    include: { user: true }
  });
  if (!existingMember) {
    return fail("成员不存在或不属于当前工作空间", 404);
  }
  if (existingMember.role === "owner" && body.role !== "owner") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId: workspace.id, role: "owner" }
    });
    if (ownerCount <= 1) {
      return fail("至少需要保留一名所有者", 400);
    }
  }

  const member = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: {
      role: body.role
    },
    include: { user: true }
  });

  await writeAuditLog(request, {
    workspaceId: workspace.id,
    actor: workspaceContext.user,
    action: "workspace_member.update",
    targetType: "workspace_member",
    targetId: member.id,
    targetLabel: member.user.email || member.user.name,
    metadata: {
      userId: member.userId,
      email: member.user.email,
      name: member.user.name,
      previousRole: existingMember.role,
      role: member.role
    }
  });

  return ok(serializeMember(member));
}

export async function DELETE(request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin"]);
  if (roleResponse) {
    return roleResponse;
  }
  const { workspace } = workspaceContext;

  const existingMember = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: workspace.id },
    include: { user: true }
  });
  if (!existingMember) {
    return fail("成员不存在或不属于当前工作空间", 404);
  }
  if (existingMember.role === "owner") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId: workspace.id, role: "owner" }
    });
    if (ownerCount <= 1) {
      return fail("至少需要保留一名所有者", 400);
    }
  }

  await prisma.workspaceMember.delete({
    where: { id: memberId }
  });

  await writeAuditLog(request, {
    workspaceId: workspace.id,
    actor: workspaceContext.user,
    action: "workspace_member.delete",
    targetType: "workspace_member",
    targetId: existingMember.id,
    targetLabel: existingMember.user.email || existingMember.user.name,
    metadata: {
      userId: existingMember.userId,
      email: existingMember.user.email,
      name: existingMember.user.name,
      role: existingMember.role
    }
  });

  return ok({ success: true });
}
