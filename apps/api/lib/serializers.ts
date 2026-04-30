import type { AnalysisRunDTO, ReviewRowDTO, TaskListItem } from "@review-ai/shared";
import type { AnalysisRun, Review, ReviewAnalysis, Task } from "@review-ai/db";

export function serializeTask(task: Task & { analysisRuns?: AnalysisRun[] }): TaskListItem {
  const latestRun = task.analysisRuns?.[0] || null;
  return {
    id: task.id,
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
