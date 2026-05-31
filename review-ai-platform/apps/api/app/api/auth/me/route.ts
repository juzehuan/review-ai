import { prisma } from "@review-ai/db";
import type { AuthResponseDTO } from "@review-ai/shared";
import { createSession, requireAuthenticated } from "@/lib/auth";
import { ok } from "@/lib/http";
import { ensurePersonalWorkspace } from "@/lib/personal-workspace";
import { serializeUser, serializeWorkspace } from "@/lib/serializers";

export async function GET(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const workspace = await ensurePersonalWorkspace(prisma, auth.user);

  return ok({
    token: await createSession(auth.user.id),
    user: serializeUser(auth.user),
    workspace: serializeWorkspace(workspace)
  } satisfies AuthResponseDTO);
}
