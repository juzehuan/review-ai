import type {
  AdminWorkspaceDTO,
  AnalysisRunDTO,
  MyWorkspaceDTO,
  ReviewRowDTO,
  TaskListItem,
  UserDTO,
  WorkspaceDTO,
  WorkspaceMemberDTO
} from "@review-ai/shared";
import type { AnalysisRun, Review, ReviewAnalysis, Subscription, Task, User, Workspace, WorkspaceMember } from "@review-ai/db";

export function serializeTask(task: Task & { analysisRuns?: AnalysisRun[] }): TaskListItem {
  const latestRun = task.analysisRuns?.[0] || null;
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    name: task.name,
    productName: task.productName,
    shopId: task.shopId,
    itemId: task.itemId,
    sourceChannel: task.sourceChannel,
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
    createdAt: user.createdAt.toISOString()
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
