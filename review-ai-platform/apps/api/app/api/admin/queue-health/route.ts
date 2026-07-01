import type { JobType, Queue } from "bullmq";
import type {
  QueueFailureDTO,
  QueueHealthDTO,
  QueueIntegrityAlertDTO,
  QueueSnapshotDTO,
  QueueStalledDTO,
  WorkloadHealthSnapshotDTO
} from "@review-ai/shared";
import { prisma } from "@review-ai/db";
import { requireSuperAdmin } from "@/lib/auth";
import { ok } from "@/lib/http";
import { getAnalysisQueue, getCrawlQueue } from "@/lib/queue";

const CRAWL_STALL_SECONDS = 180;
const ANALYSIS_STALL_SECONDS = 300;
const QUEUE_INTEGRITY_GRACE_SECONDS = 60;
const QUEUE_INTEGRITY_SCAN_LIMIT = 1000;
const PENDING_QUEUE_JOB_TYPES: JobType[] = ["waiting", "active", "delayed", "prioritized", "waiting-children", "paused"];

async function readQueueSnapshot(name: string, label: string, queue: Queue): Promise<QueueSnapshotDTO> {
  try {
    const counts = await queue.getJobCounts("waiting", "active", "delayed", "failed", "completed", "paused", "waiting-children");
    const isPaused = await queue.isPaused();
    const waiting = counts.waiting || 0;
    const active = counts.active || 0;
    const delayed = counts.delayed || 0;
    const failed = counts.failed || 0;
    const paused = counts.paused || 0;
    const waitingChildren = counts["waiting-children"] || 0;
    return {
      name,
      label,
      waiting,
      active,
      delayed,
      failed,
      completed: counts.completed || 0,
      paused,
      waitingChildren,
      pending: waiting + active + delayed + paused + waitingChildren,
      isPaused,
      error: null
    };
  } catch (error) {
    return {
      name,
      label,
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0,
      completed: 0,
      paused: 0,
      waitingChildren: 0,
      pending: 0,
      isPaused: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function readQueueDataValues(queue: Queue, dataKey: string) {
  try {
    const jobs = await queue.getJobs(PENDING_QUEUE_JOB_TYPES, 0, QUEUE_INTEGRITY_SCAN_LIMIT - 1, true);
    const values = new Set<string>();
    for (const job of jobs) {
      const data = job.data as Record<string, unknown>;
      const value = String(data[dataKey] || "").trim();
      if (value) {
        values.add(value);
      }
    }
    return values;
  } catch {
    return null;
  }
}

function secondsAgo(seconds: number) {
  return new Date(Date.now() - seconds * 1000);
}

function ageSeconds(date: Date, now = Date.now()) {
  return Math.max(0, Math.floor((now - date.getTime()) / 1000));
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function rawObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function readOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(/,/g, "");
    if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

function readOptionalScalarString(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function readCrawlTotalComments(rawResult: Record<string, unknown> | null) {
  const directTotal = readOptionalNumber(rawResult?.totalComments);
  if (directTotal !== null) {
    return directTotal;
  }

  const summary = rawObject(rawResult?.summary);
  const summaryCandidates = [
    summary?.rcount_with_context,
    summary?.rcountWithContext,
    summary?.rating_count_with_context,
    summary?.review_count_with_context,
    summary?.comment_count,
    summary?.commentCount,
    summary?.rating_total,
    summary?.ratingTotal,
    summary?.total,
    summary?.total_count,
    summary?.totalCount
  ];
  for (const candidate of summaryCandidates) {
    const value = readOptionalNumber(candidate);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function truncateText(value: string | null | undefined, maxLength = 80) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildMetricSummary(parts: Array<string | null | undefined>) {
  const values = parts.filter((item): item is string => Boolean(item));
  return values.length ? values.join(" · ") : null;
}

function buildRequestStatusInsight(status: number | null) {
  if (status === null || status < 400) {
    return null;
  }
  if (status === 401 || status === 403) {
    return {
      diagnosis: `平台接口返回 ${status}，疑似登录态失效、权限不足或评论区不可公开访问`,
      nextAction: "检查平台账号登录态、Cookie/会话、目标链接权限和代理出口地区"
    };
  }
  if (status === 429) {
    return {
      diagnosis: "平台接口返回 429，疑似请求过快或代理出口被限流",
      nextAction: "降低单次最大采集数或采集频率，更换代理出口后重试"
    };
  }
  if (status >= 500) {
    return {
      diagnosis: `平台接口返回 ${status}，疑似平台服务异常、代理链路异常或临时风控`,
      nextAction: "稍后重试；若持续出现，检查代理稳定性和目标平台可访问性"
    };
  }
  return {
    diagnosis: `平台接口返回 ${status}，请求已被平台拒绝或参数不被接受`,
    nextAction: "检查目标链接是否有效、接口签名/浏览器环境是否过期，以及是否需要登录态"
  };
}

function buildCrawlStalledInsight(job: {
  status: string;
  fetchedRows: number;
  importedRows: number;
  maxReviews: number;
  rawResult: unknown;
  lastError: string | null;
}) {
  const rawResult = rawObject(job.rawResult);
  const maxReviewsLabel = job.maxReviews > 0 ? String(job.maxReviews) : "不限";
  const stopReason = readOptionalString(rawResult?.stopReason);
  const progressEventAt = readOptionalString(rawResult?.progressEventAt);
  const partialDueToTimeout = readOptionalBoolean(rawResult?.partialDueToTimeout);
  const commentSortAttempted = readOptionalBoolean(rawResult?.commentSortAttempted);
  const commentSortSwitched = readOptionalBoolean(rawResult?.commentSortSwitched);
  const totalComments = readCrawlTotalComments(rawResult);
  const nextRequests = readOptionalNumber(rawResult?.nextRequests);
  const payloadComments = readOptionalNumber(rawResult?.payloadComments);
  const domCommentCount = readOptionalNumber(rawResult?.domCommentCount);
  const domContentTextCount = readOptionalNumber(rawResult?.domContentTextCount);
  const loadMoreClicks = readOptionalNumber(rawResult?.loadMoreClicks);
  const cursor = readOptionalScalarString(rawResult?.cursor);
  const hasMore = readOptionalBoolean(rawResult?.hasMore);
  const lastRequestStatus = readOptionalNumber(rawResult?.lastRequestStatus);
  const metricSummary = buildMetricSummary([
    totalComments !== null ? `平台总量 ${totalComments}` : null,
    nextRequests !== null ? `接口请求 ${nextRequests}` : null,
    payloadComments !== null ? `接口评论 ${payloadComments}` : null,
    domCommentCount !== null ? `DOM 评论 ${domCommentCount}` : null,
    domContentTextCount !== null ? `DOM 文本 ${domContentTextCount}` : null,
    loadMoreClicks !== null ? `加载更多 ${loadMoreClicks}` : null,
    cursor ? `游标 ${cursor}` : null,
    hasMore !== null ? `还有更多 ${hasMore ? "是" : "否"}` : null,
    lastRequestStatus !== null ? `请求状态 ${lastRequestStatus}` : null,
    progressEventAt ? `进度回传 ${progressEventAt}` : null,
    partialDueToTimeout ? "部分结果超时" : null,
    stopReason ? `停止原因 ${stopReason}` : null
  ]);

  if (job.status === "queued") {
    return {
      detail: `已抓取 ${job.fetchedRows}/${maxReviewsLabel}，导入 ${job.importedRows}`,
      diagnosis: "排队超过阈值，疑似 worker 未消费或队列阻塞",
      nextAction: "检查 crawl-jobs 队列 active/waiting 数、worker 进程和 Redis 连接",
      metricSummary,
      lastError: truncateText(job.lastError) || null
    };
  }
  const requestStatusInsight = buildRequestStatusInsight(lastRequestStatus);
  if (requestStatusInsight) {
    return {
      detail: `已抓取 ${job.fetchedRows}/${maxReviewsLabel}，导入 ${job.importedRows}`,
      ...requestStatusInsight,
      metricSummary,
      lastError: truncateText(job.lastError) || null
    };
  }
  if (job.lastError) {
    return {
      detail: `已抓取 ${job.fetchedRows}/${maxReviewsLabel}，导入 ${job.importedRows}`,
      diagnosis: "任务仍在运行态但已有最近错误",
      nextAction: "先查看错误摘要，确认代理、登录态、平台限制或 Python 浏览器依赖",
      metricSummary,
      lastError: truncateText(job.lastError) || null
    };
  }
  if (stopReason === "timeout") {
    return {
      detail: `已抓取 ${job.fetchedRows}/${maxReviewsLabel}，导入 ${job.importedRows}`,
      diagnosis: "采集器接近或达到超时，任务未正常收尾",
      nextAction: "降低单次最大采集数或检查平台加载速度，必要时重试",
      metricSummary,
      lastError: null
    };
  }
  if (commentSortAttempted && commentSortSwitched === false) {
    return {
      detail: `已抓取 ${job.fetchedRows}/${maxReviewsLabel}，导入 ${job.importedRows}`,
      diagnosis: "评论排序未确认切换到全部评论",
      nextAction: "检查平台登录态、页面语言和排序按钮文案，避免只抓到相关评论",
      metricSummary,
      lastError: null
    };
  }
  if (job.fetchedRows > 0) {
    return {
      detail: `已抓取 ${job.fetchedRows}/${maxReviewsLabel}，导入 ${job.importedRows}`,
      diagnosis: "已有评论入缓存，疑似导入或收尾阶段静默",
      nextAction: "等待短时间自动收尾；若持续静默，查看 worker 日志后重试",
      metricSummary,
      lastError: null
    };
  }
  if (progressEventAt || nextRequests !== null || domCommentCount !== null || loadMoreClicks !== null) {
    return {
      detail: `已抓取 ${job.fetchedRows}/${maxReviewsLabel}，导入 ${job.importedRows}`,
      diagnosis: "采集器仍有过程指标，但暂未形成有效评论",
      nextAction: "检查平台是否需要登录、评论区是否受限、代理是否触发风控",
      metricSummary,
      lastError: null
    };
  }
  return {
    detail: `已抓取 ${job.fetchedRows}/${maxReviewsLabel}，导入 ${job.importedRows}`,
    diagnosis: "运行超过阈值且没有采集器进度回传",
    nextAction: "优先检查 Python/浏览器依赖、worker 进程、代理和目标链接可访问性",
    metricSummary,
    lastError: null
  };
}

function buildAnalysisStalledInsight(run: { status: string; reviewCount: number; successCount: number; failedCount: number; lastError: string | null }) {
  const processed = run.successCount + run.failedCount;
  const detail = `已处理 ${processed}/${run.reviewCount}，失败 ${run.failedCount}`;
  if (run.status === "queued") {
    return {
      detail,
      diagnosis: "分析批次排队超过阈值，疑似 AI worker 未消费",
      nextAction: "检查 analysis-runs 队列、worker 并发和 Redis 连接",
      metricSummary: null,
      lastError: truncateText(run.lastError) || null
    };
  }
  if (run.lastError) {
    return {
      detail,
      diagnosis: "分析批次运行中但已有最近错误",
      nextAction: "检查 AI 配置、模型额度、网络超时和最近失败样本",
      metricSummary: null,
      lastError: truncateText(run.lastError) || null
    };
  }
  if (processed > 0) {
    return {
      detail,
      diagnosis: "已有部分评论处理完成，但最近无进度日志",
      nextAction: "查看 worker 日志和当前批次大小，必要时降低并发或重试",
      metricSummary: null,
      lastError: null
    };
  }
  return {
    detail,
    diagnosis: "分析批次运行超过阈值且没有处理进度",
    nextAction: "检查 AI worker 是否在线、模型接口是否可用、任务是否被长请求占用",
    metricSummary: null,
    lastError: null
  };
}

async function readCrawlWorkloadSnapshot(): Promise<WorkloadHealthSnapshotDTO> {
  const activeStatuses = ["queued", "running"] as const;
  const stalledBefore = secondsAgo(CRAWL_STALL_SECONDS);
  const [queued, running, failed, stalled, oldestActive, lastFailure] = await Promise.all([
    prisma.crawlJob.count({ where: { status: "queued" } }),
    prisma.crawlJob.count({ where: { status: "running" } }),
    prisma.crawlJob.count({ where: { status: "failed" } }),
    prisma.crawlJob.count({
      where: {
        status: { in: [...activeStatuses] },
        updatedAt: { lt: stalledBefore }
      }
    }),
    prisma.crawlJob.findFirst({
      where: { status: { in: [...activeStatuses] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true }
    }),
    prisma.crawlJob.findFirst({
      where: { status: "failed" },
      orderBy: [{ finishedAt: "desc" }, { updatedAt: "desc" }],
      select: { finishedAt: true, updatedAt: true }
    })
  ]);

  return {
    name: "crawl-jobs",
    label: "采集任务库",
    queued,
    running,
    failed,
    stalled,
    oldestActiveCreatedAt: oldestActive?.createdAt.toISOString() || null,
    lastFailureAt: (lastFailure?.finishedAt || lastFailure?.updatedAt)?.toISOString() || null
  };
}

async function readAnalysisWorkloadSnapshot(): Promise<WorkloadHealthSnapshotDTO> {
  const activeStatuses = ["queued", "running"] as const;
  const failedStatuses = ["failed", "partial_failed"] as const;
  const stalledBefore = secondsAgo(ANALYSIS_STALL_SECONDS);
  const [queued, running, failed, stalled, oldestActive, lastFailure] = await Promise.all([
    prisma.analysisRun.count({ where: { status: "queued" } }),
    prisma.analysisRun.count({ where: { status: "running" } }),
    prisma.analysisRun.count({ where: { status: { in: [...failedStatuses] } } }),
    prisma.analysisRun.count({
      where: {
        status: { in: [...activeStatuses] },
        createdAt: { lt: stalledBefore },
        logs: { none: { createdAt: { gte: stalledBefore } } }
      }
    }),
    prisma.analysisRun.findFirst({
      where: { status: { in: [...activeStatuses] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true }
    }),
    prisma.analysisRun.findFirst({
      where: { status: { in: [...failedStatuses] } },
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      select: { finishedAt: true, createdAt: true }
    })
  ]);

  return {
    name: "analysis-runs",
    label: "AI 分析批次库",
    queued,
    running,
    failed,
    stalled,
    oldestActiveCreatedAt: oldestActive?.createdAt.toISOString() || null,
    lastFailureAt: (lastFailure?.finishedAt || lastFailure?.createdAt)?.toISOString() || null
  };
}

async function readStalledItems(limit = 12): Promise<QueueStalledDTO[]> {
  const crawlStalledBefore = secondsAgo(CRAWL_STALL_SECONDS);
  const analysisStalledBefore = secondsAgo(ANALYSIS_STALL_SECONDS);
  const [crawlJobs, analysisRuns] = await Promise.all([
    prisma.crawlJob.findMany({
      where: {
        status: { in: ["queued", "running"] },
        updatedAt: { lt: crawlStalledBefore }
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        task: { select: { id: true, name: true, productName: true } }
      }
    }),
    prisma.analysisRun.findMany({
      where: {
        status: { in: ["queued", "running"] },
        createdAt: { lt: analysisStalledBefore },
        logs: { none: { createdAt: { gte: analysisStalledBefore } } }
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true }
        },
        task: {
          select: {
            id: true,
            name: true,
            productName: true,
            sourceChannel: true,
            workspaceId: true,
            workspace: { select: { id: true, name: true, slug: true } }
          }
        }
      }
    })
  ]);

  const now = Date.now();
  const crawlItems: QueueStalledDTO[] = crawlJobs.map((job) => {
    const progressPercent = job.progress || (job.maxReviews > 0 ? (job.fetchedRows / job.maxReviews) * 100 : 0);
    const insight = buildCrawlStalledInsight(job);
    return {
      id: job.id,
      kind: "crawl",
      status: job.status,
      label: job.name || job.productName || job.normalizedUrl,
      workspaceId: job.workspaceId,
      workspaceName: job.workspace.name,
      workspaceSlug: job.workspace.slug,
      taskId: job.taskId,
      taskName: job.task?.name || job.task?.productName || null,
      sourceChannel: job.sourceChannel || job.platform || null,
      modelName: null,
      lastActivityAt: job.updatedAt.toISOString(),
      ageSeconds: ageSeconds(job.updatedAt, now),
      progressPercent: clampPercent(progressPercent),
      detail: insight.detail,
      diagnosis: insight.diagnosis,
      nextAction: insight.nextAction,
      metricSummary: insight.metricSummary,
      lastError: insight.lastError
    };
  });

  const analysisItems: QueueStalledDTO[] = analysisRuns.map((run) => {
    const workspace = run.task.workspace;
    const lastActivityAt = run.logs[0]?.createdAt || run.startedAt || run.createdAt;
    const processed = run.successCount + run.failedCount;
    const progressPercent = run.reviewCount > 0 ? (processed / run.reviewCount) * 100 : run.status === "running" ? 1 : 0;
    const insight = buildAnalysisStalledInsight(run);
    return {
      id: run.id,
      kind: "analysis",
      status: run.status,
      label: run.task.name || run.task.productName || run.id,
      workspaceId: run.task.workspaceId,
      workspaceName: workspace?.name || null,
      workspaceSlug: workspace?.slug || null,
      taskId: run.taskId,
      taskName: run.task.name || run.task.productName || null,
      sourceChannel: run.task.sourceChannel || null,
      modelName: run.modelName,
      lastActivityAt: lastActivityAt.toISOString(),
      ageSeconds: ageSeconds(lastActivityAt, now),
      progressPercent: clampPercent(progressPercent),
      detail: insight.detail,
      diagnosis: insight.diagnosis,
      nextAction: insight.nextAction,
      metricSummary: insight.metricSummary,
      lastError: insight.lastError
    };
  });

  return [...crawlItems, ...analysisItems].sort((a, b) => b.ageSeconds - a.ageSeconds).slice(0, limit);
}

async function readQueueIntegrityAlerts(limit = 12): Promise<QueueIntegrityAlertDTO[]> {
  const integrityBefore = secondsAgo(QUEUE_INTEGRITY_GRACE_SECONDS);
  const now = Date.now();
  const [analysisQueueRunIds, crawlQueueJobIds, queuedCrawlJobs, queuedAnalysisRuns] = await Promise.all([
    readQueueDataValues(getAnalysisQueue(), "runId"),
    readQueueDataValues(getCrawlQueue(), "crawlJobId"),
    prisma.crawlJob.findMany({
      where: {
        status: "queued",
        updatedAt: { lt: integrityBefore }
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        task: { select: { id: true, name: true, productName: true } }
      }
    }),
    prisma.analysisRun.findMany({
      where: {
        status: "queued",
        createdAt: { lt: integrityBefore }
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        task: {
          select: {
            id: true,
            name: true,
            productName: true,
            sourceChannel: true,
            workspaceId: true,
            workspace: { select: { id: true, name: true, slug: true } }
          }
        }
      }
    })
  ]);

  const crawlAlerts: QueueIntegrityAlertDTO[] =
    crawlQueueJobIds === null
      ? []
      : queuedCrawlJobs
          .filter((job) => !crawlQueueJobIds.has(job.id))
          .map((job) => ({
            id: job.id,
            kind: "crawl" as const,
            status: job.status,
            label: job.name || job.productName || job.normalizedUrl,
            workspaceId: job.workspaceId,
            workspaceName: job.workspace.name,
            workspaceSlug: job.workspace.slug,
            taskId: job.taskId,
            taskName: job.task?.name || job.task?.productName || null,
            sourceChannel: job.sourceChannel || job.platform || null,
            modelName: null,
            queueName: "crawl-jobs",
            queueDataKey: "crawlJobId",
            lastActivityAt: job.updatedAt.toISOString(),
            ageSeconds: ageSeconds(job.updatedAt, now),
            diagnosis: "数据库仍是排队中，但 BullMQ 待处理队列里没有对应采集 job",
            nextAction: "优先检查任务是否曾入队失败；确认后可在采集记录里重试，或停止该记录再重新采集"
          }));

  const analysisAlerts: QueueIntegrityAlertDTO[] =
    analysisQueueRunIds === null
      ? []
      : queuedAnalysisRuns
          .filter((run) => !analysisQueueRunIds.has(run.id))
          .map((run) => {
            const workspace = run.task.workspace;
            return {
              id: run.id,
              kind: "analysis" as const,
              status: run.status,
              label: run.task.name || run.task.productName || run.id,
              workspaceId: run.task.workspaceId,
              workspaceName: workspace?.name || null,
              workspaceSlug: workspace?.slug || null,
              taskId: run.taskId,
              taskName: run.task.name || run.task.productName || null,
              sourceChannel: run.task.sourceChannel || null,
              modelName: run.modelName,
              queueName: "analysis-runs",
              queueDataKey: "runId",
              lastActivityAt: run.createdAt.toISOString(),
              ageSeconds: ageSeconds(run.createdAt, now),
              diagnosis: "数据库仍是排队中，但 BullMQ 待处理队列里没有对应分析 job",
              nextAction: "优先取消该分析批次，再重新发起分析，避免一直显示排队但 worker 无法消费"
            };
          });

  return [...crawlAlerts, ...analysisAlerts].sort((a, b) => b.ageSeconds - a.ageSeconds).slice(0, limit);
}

type FailureRecovery = Pick<QueueFailureDTO, "recoveryStatus" | "recoveryId" | "recoveryLabel" | "recoveryAt">;

const NO_FAILURE_RECOVERY: FailureRecovery = {
  recoveryStatus: null,
  recoveryId: null,
  recoveryLabel: null,
  recoveryAt: null
};

function buildFailureRecovery(input: { id: string; status: string; label: string; at: Date | null }): FailureRecovery {
  return {
    recoveryStatus: input.status,
    recoveryId: input.id,
    recoveryLabel: input.label,
    recoveryAt: input.at?.toISOString() || null
  };
}

function buildAnalysisFailureInsight(run: { reviewCount: number; successCount: number; failedCount: number; lastError: string | null }) {
  const processed = run.successCount + run.failedCount;
  const failureRate = processed > 0 ? Math.round((run.failedCount / processed) * 100) : null;
  return {
    diagnosis:
      run.successCount > 0
        ? "分析批次部分失败，已成功结果仍可用于报告，但失败样本需要复核"
        : "分析批次失败，通常与模型额度、API Key、网络超时或提示词返回格式有关",
    nextAction:
      run.successCount > 0
        ? "抽查失败样本和错误日志，必要时降低批次大小或更换稳定模型后重试"
        : "确认模型配置、额度、网络和提示词 JSON 输出格式后再重试",
    metricSummary: buildMetricSummary([
      `已处理 ${processed}/${run.reviewCount}`,
      `失败 ${run.failedCount}`,
      failureRate !== null ? `失败率 ${failureRate}%` : null
    ]),
    lastError: truncateText(run.lastError) || null
  };
}

async function readRecentFailures(limit = 12): Promise<QueueFailureDTO[]> {
  const [crawlFailures, analysisFailures] = await Promise.all([
    prisma.crawlJob.findMany({
      where: { status: "failed" },
      orderBy: [{ finishedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        task: { select: { id: true, name: true, productName: true } }
      }
    }),
    prisma.analysisRun.findMany({
      where: { status: { in: ["failed", "partial_failed"] } },
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        task: {
          select: {
            id: true,
            name: true,
            productName: true,
            sourceChannel: true,
            workspaceId: true,
            workspace: { select: { id: true, name: true, slug: true } }
          }
        }
      }
    })
  ]);

  const crawlRecoveries = await Promise.all(
    crawlFailures.map(async (job) => {
      const recovered = await prisma.crawlJob.findFirst({
        where: {
          id: { not: job.id },
          workspaceId: job.workspaceId,
          status: { not: "failed" },
          createdAt: { gt: job.createdAt },
          ...(job.monitorId ? { monitorId: job.monitorId } : { normalizedUrl: job.normalizedUrl })
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, name: true, productName: true, normalizedUrl: true, updatedAt: true, finishedAt: true }
      });
      return [
        job.id,
        recovered
          ? buildFailureRecovery({
              id: recovered.id,
              status: recovered.status,
              label: recovered.name || recovered.productName || recovered.normalizedUrl,
              at: recovered.finishedAt || recovered.updatedAt
            })
          : NO_FAILURE_RECOVERY
      ] as const;
    })
  );

  const analysisRecoveries = await Promise.all(
    analysisFailures.map(async (run) => {
      const recovered = await prisma.analysisRun.findFirst({
        where: {
          id: { not: run.id },
          taskId: run.taskId,
          status: { notIn: ["failed", "partial_failed"] },
          createdAt: { gt: run.createdAt }
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true, finishedAt: true, task: { select: { name: true, productName: true } } }
      });
      return [
        run.id,
        recovered
          ? buildFailureRecovery({
              id: recovered.id,
              status: recovered.status,
              label: recovered.task.name || recovered.task.productName || recovered.id,
              at: recovered.finishedAt || recovered.createdAt
            })
          : NO_FAILURE_RECOVERY
      ] as const;
    })
  );

  const recoveryById = new Map<string, FailureRecovery>([...crawlRecoveries, ...analysisRecoveries]);

  return [
    ...crawlFailures.map((job) => {
      const insight = buildCrawlStalledInsight(job);
      return {
        id: job.id,
        kind: "crawl" as const,
        status: job.status,
        label: job.name || job.productName || job.normalizedUrl,
        workspaceId: job.workspaceId,
        workspaceName: job.workspace.name,
        workspaceSlug: job.workspace.slug,
        taskId: job.taskId,
        taskName: job.task?.name || job.task?.productName || null,
        sourceChannel: job.sourceChannel || job.platform || null,
        modelName: null,
        error: job.lastError,
        diagnosis: insight.diagnosis,
        nextAction: insight.nextAction,
        metricSummary: insight.metricSummary,
        failedAt: (job.finishedAt || job.updatedAt).toISOString(),
        ...(recoveryById.get(job.id) || NO_FAILURE_RECOVERY)
      };
    }),
    ...analysisFailures.map((run) => {
      const insight = buildAnalysisFailureInsight(run);
      return {
        id: run.id,
        kind: "analysis" as const,
        status: run.status,
        label: run.task?.name || run.task?.productName || run.id,
        workspaceId: run.task?.workspaceId || null,
        workspaceName: run.task?.workspace?.name || null,
        workspaceSlug: run.task?.workspace?.slug || null,
        taskId: run.taskId,
        taskName: run.task?.name || run.task?.productName || null,
        sourceChannel: run.task?.sourceChannel || null,
        modelName: run.modelName,
        error: run.lastError,
        diagnosis: insight.diagnosis,
        nextAction: insight.nextAction,
        metricSummary: insight.metricSummary,
        failedAt: (run.finishedAt || run.createdAt).toISOString(),
        ...(recoveryById.get(run.id) || NO_FAILURE_RECOVERY)
      };
    })
  ]
    .sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime())
    .slice(0, limit);
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) {
    return auth.response;
  }

  const workloadPromise = Promise.all([readAnalysisWorkloadSnapshot(), readCrawlWorkloadSnapshot()]);
  const recentFailuresPromise = readRecentFailures();
  const integrityAlertsPromise = readQueueIntegrityAlerts();
  const stalledItemsPromise = readStalledItems();
  const queues = await Promise.all([
    readQueueSnapshot("analysis-runs", "AI 分析队列", getAnalysisQueue()),
    readQueueSnapshot("crawl-jobs", "评论采集队列", getCrawlQueue())
  ]);

  const workloads = await workloadPromise;
  const recentFailures = await recentFailuresPromise;
  const integrityAlerts = await integrityAlertsPromise;
  const stalledItems = await stalledItemsPromise;

  return ok<QueueHealthDTO>({
    queues,
    workloads,
    integrityAlerts,
    stalledItems,
    recentFailures,
    updatedAt: new Date().toISOString()
  });
}
