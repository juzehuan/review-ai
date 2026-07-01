import type { MemberRole } from "@review-ai/shared";
import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { serializeMember } from "@/lib/serializers";
import { getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

const roles: MemberRole[] = ["owner", "admin", "analyst", "viewer"];

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }
  const { workspace } = context;
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    include: { user: true }
  });

  return ok(members.map(serializeMember));
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }
  const roleResponse = requireWorkspaceRole(context, ["owner", "admin"]);
  if (roleResponse) {
    return roleResponse;
  }
  const { workspace } = context;
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const role = roles.includes(body.role) ? body.role : "analyst";

  if (role === "owner" && context.membership?.role !== "owner" && !context.user?.isSuperAdmin) {
    return fail("只有所有者可以授予所有者角色", 403);
  }

  if (!email || !name) {
    return fail("邮箱和姓名不能为空");
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: { name },
      create: { email, name }
    });

    const existingMember = await tx.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id
        }
      },
      select: { id: true, role: true }
    });

    const member = await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id
        }
      },
      update: { role },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role
      },
      include: { user: true }
    });

    return {
      member,
      created: !existingMember,
      previousRole: existingMember?.role || null
    };
  });

  await writeAuditLog(request, {
    workspaceId: workspace.id,
    actor: context.user,
    action: "workspace_member.upsert",
    targetType: "workspace_member",
    targetId: result.member.id,
    targetLabel: result.member.user.email || result.member.user.name,
    metadata: {
      userId: result.member.userId,
      email: result.member.user.email,
      name: result.member.user.name,
      role: result.member.role,
      previousRole: result.previousRole,
      created: result.created
    }
  });

  return ok(serializeMember(result.member), 201);
}
