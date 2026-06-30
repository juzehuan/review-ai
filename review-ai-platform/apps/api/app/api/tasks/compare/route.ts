import { prisma } from "@review-ai/db";
import type { TaskCompareDTO, TaskCompareItemDTO } from "@review-ai/shared";
import { buildDashboardForTask } from "@/lib/dashboard";
import { fail, ok } from "@/lib/http";
import { canAccessAllWorkspaces, getWorkspaceContext } from "@/lib/workspace";

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export async function POST(request: Request) {
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }

  const body = (await request.json().catch(() => ({}))) as { taskIds?: unknown };
  const taskIds = Array.isArray(body.taskIds) ? body.taskIds.map(String).filter(Boolean).slice(0, 8) : [];
  if (taskIds.length < 2) {
    return fail("请至少选择 2 个任务进行对比。");
  }

  const tasks = await prisma.task.findMany({
    where: canAccessAllWorkspaces(workspaceContext)
      ? { id: { in: taskIds } }
      : { id: { in: taskIds }, workspaceId: workspaceContext.workspace.id },
    include: { analysisRuns: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  if (tasks.length < 2) {
    return fail("可对比任务不足，请确认任务属于当前账号。", 404);
  }

  const items: TaskCompareItemDTO[] = [];
  for (const task of tasks) {
    const dashboard = await buildDashboardForTask(task.id).catch(() => null);
    const latestRun = task.analysisRuns[0] || null;
    items.push({
      taskId: task.id,
      taskName: task.name,
      productName: task.productName,
      sourceChannel: task.sourceChannel,
      runId: dashboard?.runId || null,
      reviewCount: dashboard?.reviewCount || 0,
      negativeCount: dashboard?.negativeCount || 0,
      negativePercent: dashboard?.reviewCount ? round((dashboard.negativeCount / dashboard.reviewCount) * 100, 1) : 0,
      avgRating: dashboard?.avgRating || 0,
      nps: dashboard?.nps || 0,
      topIssue: dashboard?.issues[0]?.issueName || null,
      latestRunStatus: latestRun?.status || null,
      latestRunFinishedAt: latestRun?.finishedAt?.toISOString() || null
    });
  }

  const completedItems = items.filter((item) => item.runId);
  const winner =
    completedItems
      .slice()
      .sort((a, b) => b.nps - a.nps || a.negativePercent - b.negativePercent || b.avgRating - a.avgRating)[0] || null;

  const risks = items
    .filter((item) => item.negativePercent >= 30 || item.latestRunStatus === "failed" || !item.runId)
    .map((item) => ({
      taskId: item.taskId,
      label: item.productName || item.taskName,
      reason: !item.runId
        ? "还没有可用分析结果"
        : item.latestRunStatus === "failed"
          ? "最近一次分析失败"
          : `负面占比 ${item.negativePercent}% 偏高`
    }));

  const dto: TaskCompareDTO = {
    generatedAt: new Date().toISOString(),
    items,
    winner: winner
      ? {
          taskId: winner.taskId,
          label: winner.productName || winner.taskName,
          reason: `NPS ${winner.nps}，负面占比 ${winner.negativePercent}%`
        }
      : null,
    risks
  };

  return ok(dto);
}
