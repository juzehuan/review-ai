import { prisma } from "@review-ai/db";
import type { DashboardDTO, SharedReportDTO, TaskListItem } from "@review-ai/shared";
import { fail, ok } from "@/lib/http";
import { buildDashboardForTask } from "@/lib/dashboard";
import { serializeTask } from "@/lib/serializers";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const share = await prisma.reportShare.findUnique({
    where: { token },
    include: {
      task: {
        include: {
          analysisRuns: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }
    }
  });

  if (!share || !share.enabled || share.revokedAt) {
    return fail("分享链接不存在或已失效。", 404);
  }
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return fail("分享链接已过期。", 410);
  }

  const updatedShare = await prisma.reportShare.update({
    where: { id: share.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date()
    }
  });

  try {
    const dashboard = (share.dashboardSnapshot as DashboardDTO | null) || (await buildDashboardForTask(share.taskId));
    const task = (share.taskSnapshot as TaskListItem | null) || serializeTask(share.task);
    return ok({
      share: {
        id: updatedShare.id,
        token: updatedShare.token,
        title: updatedShare.title,
        viewCount: updatedShare.viewCount,
        createdAt: updatedShare.createdAt.toISOString(),
        expiresAt: updatedShare.expiresAt?.toISOString() || null,
        snapshotMode: share.dashboardSnapshot ? "snapshot" : "live",
        snapshotCreatedAt: share.snapshotCreatedAt?.toISOString() || null
      },
      task,
      dashboard
    } satisfies SharedReportDTO);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "当前分析结果为空", 404);
  }
}
