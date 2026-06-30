import type {
  AdminUserDTO,
  AdminWorkspaceDTO,
  AnalysisType,
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

export function serializeTask(
  task: Task & {
    analysisRuns?: AnalysisRun[];
    workspace?: (Workspace & { memberships?: Array<WorkspaceMember & { user: User }> }) | null;
  }
): TaskListItem {
  const latestRun = task.analysisRuns?.[0] || null;
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
    latestRunStatus: latestRun?.status || null,
    latestRunFinishedAt: latestRun?.finishedAt?.toISOString() || null,
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

export function serializeRun(run: AnalysisRun): AnalysisRunDTO {
  return {
    id: run.id,
    taskId: run.taskId,
    provider: run.provider,
    modelName: run.modelName,
    promptVersion: run.promptVersion,
    status: run.status,
    reviewCount: run.reviewCount,
    successCount: run.successCount,
    failedCount: run.failedCount,
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

export function serializeCrawlJob(job: CrawlJob): CrawlJobDTO {
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    taskId: job.taskId,
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
    progress: job.progress,
    fetchedRows: job.fetchedRows,
    importedRows: job.importedRows,
    skippedDuplicate: job.skippedDuplicate,
    crawlChannel: job.crawlChannel,
    crawlChannelLabel: job.crawlChannelLabel,
    lastError: job.lastError,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    startedAt: job.startedAt?.toISOString() || null,
    finishedAt: job.finishedAt?.toISOString() || null
  };
}

export function serializeCrawlMonitor(monitor: CrawlMonitor): CrawlMonitorDTO {
  return {
    id: monitor.id,
    workspaceId: monitor.workspaceId,
    taskId: monitor.taskId,
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
