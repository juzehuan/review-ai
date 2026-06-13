import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function DELETE(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const job = await prisma.crawlJob.findFirst({
    where: { id: jobId, workspaceId: workspaceContext.workspace.id }
  });
  if (!job) {
    return fail("采集任务不存在或不属于当前空间", 404);
  }
  if (["queued", "running"].includes(job.status)) {
    return fail("采集任务仍在排队或运行中，暂不能删除", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.crawlMonitor.updateMany({
      where: { workspaceId: workspaceContext.workspace!.id, lastCrawlJobId: job.id },
      data: { lastCrawlJobId: null }
    });
    await tx.crawlJob.delete({
      where: { id: job.id }
    });
  });

  return ok({ deleted: true });
}
