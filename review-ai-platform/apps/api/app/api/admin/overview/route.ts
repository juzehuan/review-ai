import type { AdminOverviewDTO } from "@review-ai/shared";
import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const [userCount, workspaceCount, taskCount, analysisRunCount, inviteCodeCount, availableInviteCodeCount] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.task.count(),
    prisma.analysisRun.count(),
    prisma.inviteCode.count(),
    prisma.inviteCode.count({ where: { usedAt: null, usedByUserId: null } })
  ]);

  return ok({
    userCount,
    workspaceCount,
    taskCount,
    analysisRunCount,
    inviteCodeCount,
    availableInviteCodeCount
  } satisfies AdminOverviewDTO);
}
