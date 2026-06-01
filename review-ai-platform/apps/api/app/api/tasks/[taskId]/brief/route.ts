import { prisma } from "@review-ai/db";
import type { DailyBriefAlertDTO, DailyBriefDTO } from "@review-ai/shared";
import { buildDashboardForTask } from "@/lib/dashboard";
import { fail, ok } from "@/lib/http";
import { getWorkspaceContext, requireScopedTask } from "@/lib/workspace";

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function alertLevel(value: number): DailyBriefAlertDTO["level"] {
  if (value >= 50) {
    return "critical";
  }
  if (value >= 30) {
    return "warning";
  }
  return "info";
}

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id);
  if (scoped.response || !scoped.task) {
    return scoped.response;
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [reviewsToday, reviews7d] = await Promise.all([
    prisma.review.count({ where: { taskId, createdAt: { gte: oneDayAgo } } }),
    prisma.review.count({ where: { taskId, createdAt: { gte: sevenDaysAgo } } })
  ]);

  let dashboard;
  try {
    dashboard = await buildDashboardForTask(taskId);
  } catch {
    return fail("当前任务还没有可用的分析结果，请先完成一次 AI 分析。", 409);
  }

  const negativePercent = dashboard.reviewCount ? round((dashboard.negativeCount / dashboard.reviewCount) * 100, 1) : 0;
  const dailyBaseline = round(reviews7d / 7, 1);
  const alerts: DailyBriefAlertDTO[] = [];

  if (negativePercent >= 30) {
    alerts.push({
      id: "negative-rate",
      level: alertLevel(negativePercent),
      title: "负面评论占比异常",
      detail: `当前负面占比 ${negativePercent}%，需要优先查看差评原因和高频痛点。`,
      metric: "negativePercent",
      current: negativePercent,
      baseline: 30
    });
  }

  if (reviewsToday > Math.max(dailyBaseline * 1.8, 10)) {
    alerts.push({
      id: "volume-spike",
      level: reviewsToday > Math.max(dailyBaseline * 2.5, 20) ? "critical" : "warning",
      title: "评论量突增",
      detail: `近 24 小时新增 ${reviewsToday} 条，高于 7 日日均 ${dailyBaseline} 条。`,
      metric: "reviewsToday",
      current: reviewsToday,
      baseline: dailyBaseline
    });
  }

  const topIssue = dashboard.issues[0];
  if (topIssue && topIssue.count >= 3) {
    alerts.push({
      id: "top-issue",
      level: topIssue.count >= 10 ? "critical" : "warning",
      title: `高频问题：${topIssue.issueName}`,
      detail: `${topIssue.issueName} 被提及 ${topIssue.count} 次，建议进入评论明细查看证据样本。`,
      metric: "topIssueCount",
      current: topIssue.count,
      baseline: 3
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "stable",
      level: "info",
      title: "今天暂无明显异常",
      detail: "评论量、负面率和高频问题都处在可控范围，可以继续观察趋势。",
      metric: "health",
      current: 1,
      baseline: 1
    });
  }

  const actions = alerts.slice(0, 3).map((alert) => ({
    title: alert.level === "critical" ? "今天必须处理" : alert.level === "warning" ? "建议排查" : "持续观察",
    detail: alert.detail,
    priority: alert.level === "critical" ? ("high" as const) : alert.level === "warning" ? ("medium" as const) : ("low" as const)
  }));

  const dto: DailyBriefDTO = {
    taskId,
    taskName: scoped.task.name,
    productName: scoped.task.productName,
    generatedAt: now.toISOString(),
    runId: dashboard.runId,
    summary: `${scoped.task.productName || scoped.task.name} 今日新增 ${reviewsToday} 条评论，负面占比 ${negativePercent}%，NPS ${dashboard.nps}。`,
    metrics: {
      totalReviews: dashboard.reviewCount,
      reviewsToday,
      reviews7d,
      negativeCount: dashboard.negativeCount,
      negativePercent,
      avgRating: dashboard.avgRating,
      nps: dashboard.nps
    },
    alerts,
    topIssues: dashboard.issues.slice(0, 5),
    actions
  };

  return ok(dto);
}
