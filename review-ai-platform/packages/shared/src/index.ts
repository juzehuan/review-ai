export type TaskStatus = "draft" | "imported" | "analyzing" | "completed" | "failed";
export type RunStatus = "queued" | "running" | "completed" | "partial_failed" | "failed";
export type Sentiment = "positive" | "neutral" | "negative";
export type PlanTier = "free" | "pro" | "business";
export type MemberRole = "owner" | "admin" | "analyst" | "viewer";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface AuthResponseDTO {
  token: string;
  user: UserDTO;
  workspace: WorkspaceDTO;
}

export interface TaskListItem {
  id: string;
  workspaceId: string | null;
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

export interface WorkspaceDTO {
  id: string;
  slug: string;
  name: string;
  planTier: PlanTier;
  monthlyReviewLimit: number;
  monthlyRunLimit: number;
  currentPeriodReviewCount: number;
  currentPeriodRunCount: number;
}

export interface MyWorkspaceDTO extends WorkspaceDTO {
  role: MemberRole;
}

export interface WorkspaceMemberDTO {
  id: string;
  workspaceId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  user: UserDTO;
}

export interface AdminWorkspaceDTO extends WorkspaceDTO {
  taskCount: number;
  memberCount: number;
  createdAt: string;
}

export interface AdminOverviewDTO {
  userCount: number;
  workspaceCount: number;
  taskCount: number;
  analysisRunCount: number;
}

export interface WorkspaceAiSettingDTO {
  provider: string;
  apiKey: string | null;
  apiKeySet: boolean;
  baseUrl: string | null;
  modelName: string;
  promptVersion: string;
  systemPrompt: string;
  userPromptTemplate: string;
  summaryPrompt: string;
  insightsPrompt: string;
  temperature: number;
  updatedAt: string | null;
}

export interface AiProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  models: string[];
  apiKeyHint: string;
  apiKeyEnv?: string;
  notes?: string;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-5.2", "gpt-5.1", "gpt-4.1-mini", "gpt-4.1"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "OPENAI_API_KEY"
  },
  {
    id: "volcengine",
    label: "Volcengine ARK",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: ["doubao-seed-2-0-code-preview-260215", "doubao-seed-1-6-250615", "doubao-pro-32k", "doubao-pro-128k"],
    apiKeyHint: "ark-...",
    apiKeyEnv: "VOLC_ARK_API_KEY"
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "DEEPSEEK_API_KEY"
  },
  {
    id: "moonshot",
    label: "Moonshot Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "MOONSHOT_API_KEY"
  },
  {
    id: "dashscope",
    label: "Alibaba DashScope",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "DASHSCOPE_API_KEY"
  },
  {
    id: "zhipu",
    label: "Zhipu ChatGLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-plus", "glm-4-air", "glm-4-flash", "glm-4-long"],
    apiKeyHint: "id.secret",
    apiKeyEnv: "ZHIPU_API_KEY"
  },
  {
    id: "custom",
    label: "Custom OpenAI Compatible",
    baseUrl: "",
    models: [],
    apiKeyHint: "API Key"
  }
];

export const DEFAULT_SYSTEM_PROMPT =
  "You are a precise multilingual ecommerce review analyst. Always follow the requested JSON schema exactly.";

export const DEFAULT_USER_PROMPT_TEMPLATE = [
  "你是电商商品评论分析助手，擅长处理泰文、英文和中文混合评论。",
  "请优先理解原始评论语言，comment_tr 仅作为辅助参考；如果原文和翻译冲突，以原文语义为准。",
  "你必须输出中文结果，topicLabels / painPoints / highlights 只能从以下标签中选择：",
  "{taxonomy}",
  "",
  "要求：",
  "1. topicLabels 选择 1-5 个最核心主题。",
  "2. painPoints 仅保留用户明确不满的问题主题；正向评论可以为空数组。",
  "3. highlights 仅保留用户明确认可的亮点主题；负向评论可以为空数组。",
  "4. keywords 输出 4-10 个中文或英文短词，用于后续检索和词云，不要输出句子。",
  "5. summary 用一句中文概括评论重点和情绪，不要超过 80 字。",
  "6. suggestion 用一句中文给商品、运营或客服团队建议，不要超过 70 字。",
  "7. sentimentScore 为 0 到 1，小数越高表示情感越强烈。",
  "",
  "rating_star: {ratingStar}",
  "comment_original: {comment}",
  "comment_translated: {commentTr}"
].join("\n");

export const DEFAULT_SUMMARY_PROMPT = [
  "你是资深电商数据分析师，请根据以下评论分析数据，用 100-150 字中文生成一段专业分析总结。",
  "需要包含核心洞察和具体运营建议，直接输出文字，不要加标题。",
  "",
  "评论总数：{reviewCount}",
  "平均评分：{avgRating}",
  "NPS：{nps}",
  "正向占比：{positivePercent}%",
  "中性占比：{neutralPercent}%",
  "负向占比：{negativePercent}%",
  "主要痛点：{topIssues}"
].join("\n");

export const DEFAULT_INSIGHTS_PROMPT = [
  "你是资深电商产品分析师。基于以下用户评论数据，输出产品总结报告。",
  "请严格输出 JSON，不要 markdown 代码块，包含 6 个字符串字段：",
  "userPersonas, usageScenarios, sellingPoints, advantages, improvements, expectations。",
  "",
  "评论总数：{reviewCount}",
  "平均评分：{avgRating}",
  "NPS：{nps}",
  "主要痛点：{topIssues}",
  "主要规格：{topVariants}",
  "",
  "正向评论样本：",
  "{positiveSamples}",
  "",
  "负向评论样本：",
  "{negativeSamples}",
  "",
  "中性评论样本：",
  "{neutralSamples}"
].join("\n");

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
  highlights: string[];
  keywords: string[];
  suggestion: string | null;
  needsAttention: boolean;
}

export interface ProductInsightsDTO {
  userPersonas: string;
  usageScenarios: string;
  sellingPoints: string;
  advantages: string;
  improvements: string;
  expectations: string;
}

export interface UserProfileDTO {
  mediaRate: number;
  needsAttentionCount: number;
  needsAttentionRate: number;
  reviewDepth: Array<{ label: string; count: number }>;
  sentimentIntensity: Array<{ label: string; count: number }>;
  variantDistribution: Array<{ variant: string; count: number }>;
  hourDistribution: Array<{ hour: number; count: number }>;
}

export interface RepresentativeReview {
  reviewId: string;
  comment: string;
  commentTr: string | null;
  ratingStar: number;
  summary: string;
  sentiment: Sentiment;
}

export interface DashboardDTO {
  taskId: string;
  runId: string | null;
  reviewCount: number;
  negativeCount: number;
  avgRating: number;
  nps: number;
  npsBreakdown: Array<{ label: string; percent: number; count: number }>;
  ratingSentiment: Array<{ ratingStar: number; positive: number; neutral: number; negative: number }>;
  ratingDistribution: Array<{ star: number; count: number }>;
  sentimentDistribution: Array<{ sentiment: Sentiment; count: number; percent: number }>;
  sourceDistribution: Array<{ source: string; count: number }>;
  wordCloud: WordCloudItemDTO[];
  issues: IssueStatDTO[];
  representativeReviews: { positive: RepresentativeReview[]; negative: RepresentativeReview[] };
  trend: Array<{ period: string; count: number; positive: number; neutral: number; negative: number }>;
  userProfile: UserProfileDTO;
  productInsights: ProductInsightsDTO | null;
  aiSummary: string | null;
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
  lastError: string | null;
}

export interface ImportTaskResponse {
  taskId: string;
  importId: string;
  reviewCount: number;
}

export interface AppendImportResponse {
  taskId: string;
  importId: string;
  totalRows: number;
  newRows: number;
  skippedRows: number;
  droppedExisting: number;
  droppedDuplicate: number;
  droppedByDb: number;
}

export interface CrawlTaskResponse extends ImportTaskResponse {
  productUrl: string;
  fetchedRows: number;
  skippedDuplicate: number;
}

type DashboardReviewLike = {
  runId: string;
  reviewId: string;
  sentiment: Sentiment;
  sentimentScore: number;
  topicLabels: string[];
  keywords: string[];
  painPoints: string[];
  highlights: string[];
  summary: string;
  needsAttention: boolean;
  review: {
    ratingStar: number;
    sourceChannel: string;
    comment: string;
    commentTr: string | null;
    commentTime: Date | string | null;
    hasMedia: boolean;
    modelName: string | null;
  };
};

function round(value: number) {
  return Number(value.toFixed(1));
}

export function buildDashboardSnapshot(taskId: string, analyses: DashboardReviewLike[]): DashboardDTO {
  const total = analyses.length;
  const negativeCount = analyses.filter((item) => item.review.ratingStar <= 3).length;
  const promoters = analyses.filter((item) => item.review.ratingStar === 5).length;
  const passives = analyses.filter((item) => item.review.ratingStar === 4).length;
  const detractors = analyses.filter((item) => item.review.ratingStar <= 3).length;
  const nps = total ? round(((promoters - detractors) / total) * 100) : 0;
  const avgRating = total ? round(analyses.reduce((sum, item) => sum + item.review.ratingStar, 0) / total) : 0;

  const npsBreakdown = [
    { label: "批评者 1-3 星", count: detractors, percent: total ? round((detractors / total) * 100) : 0 },
    { label: "中立者 4 星", count: passives, percent: total ? round((passives / total) * 100) : 0 },
    { label: "推荐者 5 星", count: promoters, percent: total ? round((promoters / total) * 100) : 0 }
  ];

  const ratingSentiment = [1, 2, 3, 4, 5].map((ratingStar) => {
    const byStar = analyses.filter((item) => item.review.ratingStar === ratingStar);
    return {
      ratingStar,
      positive: byStar.filter((item) => item.sentiment === "positive").length,
      neutral: byStar.filter((item) => item.sentiment === "neutral").length,
      negative: byStar.filter((item) => item.sentiment === "negative").length
    };
  });

  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: analyses.filter((item) => item.review.ratingStar === star).length
  }));

  const sentiments: Sentiment[] = ["positive", "neutral", "negative"];
  const sentimentDistribution = sentiments.map((sentiment) => {
    const count = analyses.filter((item) => item.sentiment === sentiment).length;
    return {
      sentiment,
      count,
      percent: total ? round((count / total) * 100) : 0
    };
  });

  const sourceMap = new Map<string, number>();
  const keywordMap = new Map<string, number>();
  const issueMap = new Map<string, { count: number; samples: string[] }>();
  const trendMap = new Map<string, { count: number; positive: number; neutral: number; negative: number }>();
  const variantMap = new Map<string, number>();
  const hourMap = new Map<number, number>();

  for (const analysis of analyses) {
    sourceMap.set(analysis.review.sourceChannel, (sourceMap.get(analysis.review.sourceChannel) || 0) + 1);
    if (analysis.review.modelName) {
      variantMap.set(analysis.review.modelName, (variantMap.get(analysis.review.modelName) || 0) + 1);
    }
    if (analysis.review.commentTime) {
      const date = new Date(analysis.review.commentTime);
      if (!Number.isNaN(date.getTime())) {
        const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const trend = trendMap.get(period) || { count: 0, positive: 0, neutral: 0, negative: 0 };
        trend.count += 1;
        trend[analysis.sentiment] += 1;
        trendMap.set(period, trend);
        hourMap.set(date.getHours(), (hourMap.get(date.getHours()) || 0) + 1);
      }
    }

    for (const word of [...analysis.topicLabels, ...analysis.keywords]) {
      const trimmed = word.trim();
      if (!trimmed) {
        continue;
      }
      keywordMap.set(trimmed, (keywordMap.get(trimmed) || 0) + 1);
    }

    for (const issue of analysis.painPoints) {
      const trimmed = issue.trim();
      if (!trimmed) {
        continue;
      }
      const existing = issueMap.get(trimmed) || { count: 0, samples: [] };
      existing.count += 1;
      if (existing.samples.length < 3) {
        existing.samples.push(analysis.reviewId);
      }
      issueMap.set(trimmed, existing);
    }
  }

  const positiveReviews = analyses
    .filter((item) => item.sentiment === "positive")
    .sort((a, b) => b.sentimentScore - a.sentimentScore)
    .slice(0, 3)
    .map((item) => ({
      reviewId: item.reviewId,
      comment: item.review.comment,
      commentTr: item.review.commentTr,
      ratingStar: item.review.ratingStar,
      summary: item.summary,
      sentiment: item.sentiment
    }));

  const negativeReviews = analyses
    .filter((item) => item.sentiment === "negative")
    .sort((a, b) => a.sentimentScore - b.sentimentScore)
    .slice(0, 3)
    .map((item) => ({
      reviewId: item.reviewId,
      comment: item.review.comment,
      commentTr: item.review.commentTr,
      ratingStar: item.review.ratingStar,
      summary: item.summary,
      sentiment: item.sentiment
    }));

  const withMedia = analyses.filter((item) => item.review.hasMedia).length;
  const needsAttentionCount = analyses.filter((item) => item.needsAttention).length;
  const userProfile: UserProfileDTO = {
    mediaRate: total ? round((withMedia / total) * 100) : 0,
    needsAttentionCount,
    needsAttentionRate: total ? round((needsAttentionCount / total) * 100) : 0,
    reviewDepth: [
      { label: "short", count: analyses.filter((item) => item.review.comment.length < 50).length },
      {
        label: "medium",
        count: analyses.filter((item) => item.review.comment.length >= 50 && item.review.comment.length <= 200).length
      },
      { label: "long", count: analyses.filter((item) => item.review.comment.length > 200).length }
    ],
    sentimentIntensity: [
      { label: "strong positive", count: analyses.filter((item) => item.sentiment === "positive" && item.sentimentScore > 0.8).length },
      { label: "mild positive", count: analyses.filter((item) => item.sentiment === "positive" && item.sentimentScore <= 0.8).length },
      { label: "neutral", count: analyses.filter((item) => item.sentiment === "neutral").length },
      { label: "mild negative", count: analyses.filter((item) => item.sentiment === "negative" && item.sentimentScore >= 0.2).length },
      { label: "strong negative", count: analyses.filter((item) => item.sentiment === "negative" && item.sentimentScore < 0.2).length }
    ],
    variantDistribution: [...variantMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([variant, count]) => ({ variant, count })),
    hourDistribution: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hourMap.get(hour) || 0 }))
  };

  return {
    taskId,
    runId: analyses[0]?.runId || null,
    reviewCount: total,
    negativeCount,
    avgRating,
    nps,
    npsBreakdown,
    ratingSentiment,
    ratingDistribution,
    sentimentDistribution,
    sourceDistribution: [...sourceMap.entries()].map(([source, count]) => ({ source, count })),
    wordCloud: [...keywordMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([name, value]) => ({ name, value })),
    issues: [...issueMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([issueName, value]) => ({
        issueName,
        count: value.count,
        sampleReviewIds: value.samples
      })),
    representativeReviews: { positive: positiveReviews, negative: negativeReviews },
    trend: [...trendMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, value]) => ({ period, ...value })),
    userProfile,
    productInsights: null,
    aiSummary: null
  };
}
