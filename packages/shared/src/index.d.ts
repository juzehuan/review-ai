export type TaskStatus = "draft" | "imported" | "analyzing" | "completed" | "failed";
export type RunStatus = "queued" | "running" | "completed" | "partial_failed" | "failed";
export type Sentiment = "positive" | "neutral" | "negative";
export interface TaskListItem {
    id: string;
    name: string;
    productName: string;
    shopId: string;
    itemId: string;
    sourceChannel: string;
    status: TaskStatus;
    latestRunStatus: RunStatus | null;
    latestRunFinishedAt: string | null;
    createdAt: string;
}
export interface ReviewRowDTO {
    id: string;
    cmtId: string;
    productName: string;
    variantName: string;
    comment: string;
    commentTr: string | null;
    ratingStar: number;
    commentTime: string | null;
    sourceChannel: string;
    hasMedia: boolean;
    analysisTags: string[];
    sentiment: Sentiment | null;
    sentimentScore: number | null;
    summary: string | null;
    painPoints: string[];
    keywords: string[];
}
export interface DashboardDTO {
    taskId: string;
    runId: string | null;
    reviewCount: number;
    negativeCount: number;
    nps: number;
    npsBreakdown: Array<{
        label: string;
        percent: number;
        count: number;
    }>;
    ratingSentiment: Array<{
        ratingStar: number;
        positive: number;
        neutral: number;
        negative: number;
    }>;
    sentimentDistribution: Array<{
        sentiment: Sentiment;
        count: number;
        percent: number;
    }>;
    sourceDistribution: Array<{
        source: string;
        count: number;
    }>;
    wordCloud: WordCloudItemDTO[];
    issues: IssueStatDTO[];
}
export interface ReviewAnalysisDTO {
    reviewId: string;
    runId: string;
    sentiment: Sentiment;
    sentimentScore: number;
    topicLabels: string[];
    keywords: string[];
    summary: string;
    painPoints: string[];
    highlights: string[];
    suggestion: string;
    needsAttention: boolean;
    rawModelOutput: string;
}
export interface IssueStatDTO {
    issueName: string;
    count: number;
    sampleReviewIds: string[];
}
export interface WordCloudItemDTO {
    name: string;
    value: number;
}
export interface AnalysisRunDTO {
    id: string;
    taskId: string;
    provider: string;
    modelName: string;
    promptVersion: string;
    status: RunStatus;
    reviewCount: number;
    successCount: number;
    failedCount: number;
    startedAt: string | null;
    finishedAt: string | null;
}
export interface ImportTaskResponse {
    taskId: string;
    importId: string;
    reviewCount: number;
}
type DashboardReviewLike = {
    runId: string;
    reviewId: string;
    sentiment: Sentiment;
    topicLabels: string[];
    keywords: string[];
    painPoints: string[];
    review: {
        ratingStar: number;
        sourceChannel: string;
    };
};
export declare function buildDashboardSnapshot(taskId: string, analyses: DashboardReviewLike[]): DashboardDTO;
export {};
