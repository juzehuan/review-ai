import type {
  AdminUserDTO,
  AdminWorkspaceDTO,
  AnalysisType,
  AuditLogDTO,
  AnalysisRunLogDTO,
  AnalysisRunDTO,
  CrawlJobDTO,
  CrawlMonitorDTO,
  MyWorkspaceDTO,
  ReportShareDTO,
  ReviewCorrectionDTO,
  ReviewActionItemDTO,
  ReviewRowDTO,
  SavedReviewViewDTO,
  TaskListItem,
  UserDTO,
  WorkspaceDTO,
  WorkspaceMemberDTO
} from "@review-ai/shared";
import type {
  AnalysisRun,
  AnalysisRunLog,
  AuditLog,
  CrawlJob,
  CrawlMonitor,
  ReportShare,
  Review,
  ReviewActionItem,
  ReviewAnalysis,
  ReviewCorrection,
  SavedReviewView,
  Subscription,
  Task,
  User,
  Workspace,
  WorkspaceMember
} from "@review-ai/db";
import type { InviteCode } from "@review-ai/db";
import { parseCrawlerChannels } from "@/lib/crawler-settings";

function rawObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function elapsedSeconds(start: Date | null | undefined, end: Date) {
  if (!start) {
    return null;
  }
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

type LatestRunForTask = AnalysisRun & { logs?: Array<Pick<AnalysisRunLog, "createdAt">> };

function latestRunSummary(run: LatestRunForTask | null) {
  if (!run) {
    return {
      latestRunId: null,
      latestRunStatus: null,
      latestRunReviewCount: 0,
      latestRunProcessedCount: 0,
      latestRunSuccessCount: 0,
      latestRunFailedCount: 0,
      latestRunProgressPercent: 0,
      latestRunFailureRatePercent: 0,
      latestRunLastActivityAt: null,
      latestRunLastActivityAgoSeconds: null,
      latestRunStalled: false,
      latestRunFinishedAt: null,
      latestRunLastError: null
    };
  }

  const now = new Date();
  const processedCount = run.successCount + run.failedCount;
  const lastActivityAt = run.logs?.[0]?.createdAt || run.finishedAt || run.startedAt || run.createdAt;
  const lastActivityAgoSeconds = Math.max(0, Math.floor((now.getTime() - lastActivityAt.getTime()) / 1000));
  return {
    latestRunId: run.id,
    latestRunStatus: run.status,
    latestRunReviewCount: run.reviewCount,
    latestRunProcessedCount: processedCount,
    latestRunSuccessCount: run.successCount,
    latestRunFailedCount: run.failedCount,
    latestRunProgressPercent: run.reviewCount ? Math.min(100, Math.round((processedCount / run.reviewCount) * 100)) : 0,
    latestRunFailureRatePercent: processedCount ? Math.round((run.failedCount / processedCount) * 100) : 0,
    latestRunLastActivityAt: lastActivityAt.toISOString(),
    latestRunLastActivityAgoSeconds: lastActivityAgoSeconds,
    latestRunStalled: ["queued", "running"].includes(run.status) && lastActivityAgoSeconds >= 300,
    latestRunFinishedAt: run.finishedAt?.toISOString() || null,
    latestRunLastError: run.lastError || null
  };
}

export function serializeTask(
  task: Task & {
    analysisRuns?: LatestRunForTask[];
    workspace?: (Workspace & { memberships?: Array<WorkspaceMember & { user: User }> }) | null;
  }
): TaskListItem {
  const latestRun = task.analysisRuns?.[0] || null;
  const runSummary = latestRunSummary(latestRun);
  const ownerMember = task.workspace?.memberships?.find((member) => member.role === "owner") || task.workspace?.memberships?.[0] || null;
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    workspaceName: task.workspace?.name || null,
    workspaceSlug: task.workspace?.slug || null,
    workspaceOwnerName: ownerMember?.user.name || null,
    workspaceOwnerEmail: ownerMember?.user.email || null,
    name: task.name,
    productName: task.productName,
    shopId: task.shopId,
    itemId: task.itemId,
    sourceChannel: task.sourceChannel,
    analysisType: task.analysisType as AnalysisType,
    status: task.status,
    ...runSummary,
    createdAt: task.createdAt.toISOString()
  };
}

export function serializeWorkspace(workspace: Workspace & { subscription?: Subscription | null }): WorkspaceDTO {
  const subscription = workspace.subscription;
  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    planTier: subscription?.planTier || "free",
    monthlyReviewLimit: subscription?.monthlyReviewLimit || 0,
    monthlyRunLimit: subscription?.monthlyRunLimit || 0,
    currentPeriodReviewCount: subscription?.currentPeriodReviewCount || 0,
    currentPeriodRunCount: subscription?.currentPeriodRunCount || 0
  };
}

export function serializeAuditLog(log: AuditLog): AuditLogDTO {
  return {
    id: log.id,
    workspaceId: log.workspaceId,
    actorUserId: log.actorUserId,
    actorEmail: log.actorEmail,
    actorName: log.actorName,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    targetLabel: log.targetLabel,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString()
  };
}

export function serializeMyWorkspace(
  member: WorkspaceMember & { workspace: Workspace & { subscription?: Subscription | null } }
): MyWorkspaceDTO {
  return {
    ...serializeWorkspace(member.workspace),
    role: member.role
  };
}

export function serializeUser(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isSuperAdmin: user.isSuperAdmin,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString()
  };
}

export function serializeInviteCode(
  inviteCode: InviteCode & { createdBy: User; usedBy?: User | null }
) {
  return {
    id: inviteCode.id,
    code: inviteCode.code,
    note: inviteCode.note,
    monthlyReviewLimit: inviteCode.monthlyReviewLimit,
    monthlyRunLimit: inviteCode.monthlyRunLimit,
    usedAt: inviteCode.usedAt?.toISOString() || null,
    expiresAt: inviteCode.expiresAt?.toISOString() || null,
    createdAt: inviteCode.createdAt.toISOString(),
    createdBy: serializeUser(inviteCode.createdBy),
    usedBy: inviteCode.usedBy ? serializeUser(inviteCode.usedBy) : null
  };
}

export function serializeAdminUser(
  user: User & {
    memberships?: Array<WorkspaceMember & { workspace: Workspace & { subscription?: Subscription | null } }>;
    usedInviteCode?: InviteCode | null;
  }
): AdminUserDTO {
  const primaryWorkspace = user.memberships?.find((member) => member.role === "owner")?.workspace || user.memberships?.[0]?.workspace || null;
  const subscription = primaryWorkspace?.subscription || null;
  return {
    ...serializeUser(user),
    workspaceId: primaryWorkspace?.id || null,
    monthlyReviewLimit: subscription?.monthlyReviewLimit || 0,
    monthlyRunLimit: subscription?.monthlyRunLimit || 0,
    currentPeriodReviewCount: subscription?.currentPeriodReviewCount || 0,
    currentPeriodRunCount: subscription?.currentPeriodRunCount || 0,
    inviteCode: user.usedInviteCode?.code || null
  };
}

export function serializeMember(member: WorkspaceMember & { user: User }): WorkspaceMemberDTO {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    user: serializeUser(member.user)
  };
}

export function serializeAdminWorkspace(
  workspace: Workspace & {
    subscription?: Subscription | null;
    _count?: { tasks: number; memberships: number };
  }
): AdminWorkspaceDTO {
  return {
    ...serializeWorkspace(workspace),
    taskCount: workspace._count?.tasks || 0,
    memberCount: workspace._count?.memberships || 0,
    createdAt: workspace.createdAt.toISOString()
  };
}

type SerializableAnalysisRun = AnalysisRun & {
  logs?: Array<Pick<AnalysisRunLog, "createdAt">>;
  queuePosition?: number | null;
};

export function serializeRun(run: SerializableAnalysisRun): AnalysisRunDTO {
  const now = new Date();
  const processedCount = run.successCount + run.failedCount;
  const progressPercent = run.reviewCount ? Math.min(100, Math.round((processedCount / run.reviewCount) * 100)) : 0;
  const failureRatePercent = processedCount ? Math.round((run.failedCount / processedCount) * 100) : 0;
  const durationStart = run.startedAt || run.createdAt;
  const durationEnd = run.finishedAt || now;
  const durationSeconds = elapsedSeconds(durationStart, durationEnd) || 0;
  const throughputPerMinute = durationSeconds > 0 && processedCount > 0 ? roundOne((processedCount / durationSeconds) * 60) : null;
  const remainingCount = Math.max(run.reviewCount - processedCount, 0);
  const estimatedRemainingSeconds =
    throughputPerMinute && throughputPerMinute > 0 && ["queued", "running"].includes(run.status)
      ? Math.ceil((remainingCount / throughputPerMinute) * 60)
      : null;
  const lastActivityAt = run.logs?.[0]?.createdAt || run.finishedAt || run.startedAt || run.createdAt;
  const lastActivityAgoSeconds = Math.max(0, Math.floor((now.getTime() - lastActivityAt.getTime()) / 1000));
  return {
    id: run.id,
    taskId: run.taskId,
    provider: run.provider,
    modelName: run.modelName,
    promptVersion: run.promptVersion,
    status: run.status,
    queuePosition: run.queuePosition ?? null,
    reviewCount: run.reviewCount,
    successCount: run.successCount,
    failedCount: run.failedCount,
    processedCount,
    progressPercent,
    failureRatePercent,
    durationSeconds,
    throughputPerMinute,
    estimatedRemainingSeconds,
    lastActivityAt: lastActivityAt.toISOString(),
    lastActivityAgoSeconds,
    stalled: ["queued", "running"].includes(run.status) && lastActivityAgoSeconds >= 300,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() || null,
    finishedAt: run.finishedAt?.toISOString() || null,
    lastError: run.lastError || null
  };
}

export function serializeRunLog(log: AnalysisRunLog): AnalysisRunLogDTO {
  return {
    id: log.id,
    runId: log.runId,
    level: log.level,
    message: log.message,
    meta: log.meta,
    createdAt: log.createdAt.toISOString()
  };
}

type CrawlJobWithWorkspace = CrawlJob & {
  workspace?: Pick<Workspace, "name" | "slug"> | null;
  task?: { analysisRuns?: Array<Pick<AnalysisRun, "id">> } | null;
  queuePosition?: number | null;
};

export function serializeCrawlJob(job: CrawlJobWithWorkspace): CrawlJobDTO {
  const rawResult = rawObject(job.rawResult);
  const now = new Date();
  const isActive = job.status === "queued" || job.status === "running";
  const durationEnd = job.finishedAt || (isActive ? now : job.updatedAt);
  const durationSeconds = elapsedSeconds(job.startedAt, durationEnd);
  const updatedAgoSeconds = Math.max(0, Math.floor((now.getTime() - job.updatedAt.getTime()) / 1000));
  const totalComments = readCrawlTotalComments(rawResult);
  const coveragePercent = job.maxReviews > 0 ? Math.min(100, Math.round((job.fetchedRows / job.maxReviews) * 100)) : null;
  const platformCoveragePercent =
    totalComments !== null && totalComments > 0 ? Math.min(100, Math.round((job.fetchedRows / totalComments) * 100)) : null;
  const platformRemainingRows = totalComments !== null && totalComments > 0 ? Math.max(0, totalComments - job.fetchedRows) : null;
  const fetchRatePerMinute =
    durationSeconds && durationSeconds > 0 && job.fetchedRows > 0 ? roundOne((job.fetchedRows / durationSeconds) * 60) : null;
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    workspaceName: job.workspace?.name || null,
    workspaceSlug: job.workspace?.slug || null,
    taskId: job.taskId,
    latestRunId: job.task?.analysisRuns?.[0]?.id || null,
    name: job.name,
    productName: job.productName,
    sourceChannel: job.sourceChannel,
    analysisType: job.analysisType as CrawlJobDTO["analysisType"],
    productUrl: job.productUrl,
    normalizedUrl: job.normalizedUrl,
    platform: job.platform,
    maxReviews: job.maxReviews,
    crawlChannels: parseCrawlerChannels(job.crawlChannels),
    status: job.status,
    queuePosition: job.queuePosition ?? null,
    progress: job.progress,
    fetchedRows: job.fetchedRows,
    importedRows: job.importedRows,
    skippedDuplicate: job.skippedDuplicate,
    coveragePercent,
    platformCoveragePercent,
    platformRemainingRows,
    durationSeconds,
    updatedAgoSeconds,
    fetchRatePerMinute,
    stalled: isActive && updatedAgoSeconds >= 180,
    crawlChannel: job.crawlChannel,
    crawlChannelLabel: job.crawlChannelLabel,
    stopReason: readOptionalString(rawResult?.stopReason),
    partialDueToTimeout: readOptionalBoolean(rawResult?.partialDueToTimeout),
    commentSortAttempted: readOptionalBoolean(rawResult?.commentSortAttempted),
    commentSortSwitched: readOptionalBoolean(rawResult?.commentSortSwitched),
    nextRequests: readOptionalNumber(rawResult?.nextRequests),
    payloadComments: readOptionalNumber(rawResult?.payloadComments),
    domCommentCount: readOptionalNumber(rawResult?.domCommentCount),
    domContentTextCount: readOptionalNumber(rawResult?.domContentTextCount),
    loadMoreClicks: readOptionalNumber(rawResult?.loadMoreClicks),
    cursor: readOptionalScalarString(rawResult?.cursor),
    hasMore: readOptionalBoolean(rawResult?.hasMore),
    totalComments,
    remainingSeconds: readOptionalNumber(rawResult?.remainingSeconds),
    progressEventAt: readOptionalString(rawResult?.progressEventAt),
    endReached: readOptionalBoolean(rawResult?.endReached),
    channelErrors: readStringArray(rawResult?.channelErrors),
    lastError: job.lastError,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    startedAt: job.startedAt?.toISOString() || null,
    finishedAt: job.finishedAt?.toISOString() || null
  };
}

type CrawlMonitorWithWorkspace = CrawlMonitor & {
  workspace?: Pick<Workspace, "name" | "slug"> | null;
  task?: { analysisRuns?: Array<Pick<AnalysisRun, "id">> } | null;
};

export function serializeCrawlMonitor(monitor: CrawlMonitorWithWorkspace): CrawlMonitorDTO {
  return {
    id: monitor.id,
    workspaceId: monitor.workspaceId,
    workspaceName: monitor.workspace?.name || null,
    workspaceSlug: monitor.workspace?.slug || null,
    taskId: monitor.taskId,
    latestRunId: monitor.task?.analysisRuns?.[0]?.id || null,
    name: monitor.name,
    productName: monitor.productName,
    sourceChannel: monitor.sourceChannel,
    analysisType: monitor.analysisType as CrawlMonitorDTO["analysisType"],
    productUrl: monitor.productUrl,
    normalizedUrl: monitor.normalizedUrl,
    platform: monitor.platform,
    maxReviews: monitor.maxReviews,
    intervalMinutes: monitor.intervalMinutes,
    autoAnalyze: monitor.autoAnalyze,
    enabled: monitor.enabled,
    lastRunAt: monitor.lastRunAt?.toISOString() || null,
    nextRunAt: monitor.nextRunAt.toISOString(),
    lastCrawlJobId: monitor.lastCrawlJobId,
    lastError: monitor.lastError,
    createdAt: monitor.createdAt.toISOString(),
    updatedAt: monitor.updatedAt.toISOString()
  };
}

export function serializeReportShare(share: ReportShare, shareUrl: string): ReportShareDTO {
  return {
    id: share.id,
    taskId: share.taskId,
    token: share.token,
    title: share.title,
    enabled: share.enabled,
    viewCount: share.viewCount,
    lastViewedAt: share.lastViewedAt?.toISOString() || null,
    expiresAt: share.expiresAt?.toISOString() || null,
    revokedAt: share.revokedAt?.toISOString() || null,
    snapshotMode: share.dashboardSnapshot ? "snapshot" : "live",
    snapshotCreatedAt: share.snapshotCreatedAt?.toISOString() || null,
    shareUrl,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString()
  };
}

export function serializeSavedView(view: SavedReviewView): SavedReviewViewDTO {
  return {
    id: view.id,
    taskId: view.taskId,
    name: view.name,
    filters: view.filters as Record<string, unknown>,
    groupBy: view.groupBy,
    viewMode: view.viewMode,
    sortBy: view.sortBy,
    sortOrder: view.sortOrder,
    visibleColumnKeys: view.visibleColumnKeys,
    isDefault: view.isDefault,
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString()
  };
}

export function serializeActionItem(item: ReviewActionItem & { assignee?: User | null }): ReviewActionItemDTO {
  return {
    id: item.id,
    taskId: item.taskId,
    runId: item.runId,
    assigneeUserId: item.assigneeUserId,
    assignee: item.assignee
      ? {
          id: item.assignee.id,
          name: item.assignee.name,
          email: item.assignee.email
        }
      : null,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    source: item.source,
    relatedReviewIds: item.relatedReviewIds,
    dueAt: item.dueAt?.toISOString() || null,
    completedAt: item.completedAt?.toISOString() || null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeCorrection(correction: ReviewCorrection & { createdBy: User }): ReviewCorrectionDTO {
  return {
    id: correction.id,
    taskId: correction.taskId,
    reviewId: correction.reviewId,
    runId: correction.runId,
    sentiment: correction.sentiment,
    topicLabels: correction.topicLabels,
    painPoints: correction.painPoints,
    highlights: correction.highlights,
    summary: correction.summary,
    suggestion: correction.suggestion,
    note: correction.note,
    createdAt: correction.createdAt.toISOString(),
    createdBy: serializeUser(correction.createdBy)
  };
}

export function serializeReviewRow(
  review: Review & { analyses?: (ReviewAnalysis & { runId: string })[]; task?: Task }
): ReviewRowDTO {
  const latest = review.analyses?.[0];
  return {
    id: review.id,
    cmtId: review.cmtId,
    productName: review.task?.productName || review.itemId,
    variantName: review.modelName || "",
    comment: review.comment,
    commentTr: review.commentTr,
    ratingStar: review.ratingStar,
    commentTime: review.commentTime?.toISOString() || null,
    sourceChannel: review.sourceChannel,
    hasMedia: review.hasMedia,
    analysisTags: latest?.topicLabels || [],
    intentLabels: latest?.intentLabels || [],
    sentiment: latest?.sentiment || null,
    sentimentScore: latest?.sentimentScore || null,
    summary: latest?.summary || null,
    painPoints: latest?.painPoints || [],
    highlights: latest?.highlights || [],
    keywords: latest?.keywords || [],
    suggestion: latest?.suggestion || null,
    needsAttention: latest?.needsAttention || false
  };
}
