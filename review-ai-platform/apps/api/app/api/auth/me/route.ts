import { prisma } from "@review-ai/db";
import type { AuthResponseDTO } from "@review-ai/shared";
import { createSession, requireAuthenticated } from "@/lib/auth";
import { ok } from "@/lib/http";
import { serializeUser, serializeWorkspace } from "@/lib/serializers";

export async function GET(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        include: { subscription: true }
      }
    }
  });

  const workspace =
    membership?.workspace ||
    (await prisma.workspace.create({
      data: {
        name: `${auth.user.name} Team`,
        slug: `workspace-${Date.now().toString(36)}`,
        ownerUserId: auth.user.id,
        subscription: { create: {} },
        memberships: {
          create: {
            userId: auth.user.id,
            role: "owner"
          }
        }
      },
      include: { subscription: true }
    }));

  return ok({
    token: await createSession(auth.user.id),
    user: serializeUser(auth.user),
    workspace: serializeWorkspace(workspace)
  } satisfies AuthResponseDTO);
}
