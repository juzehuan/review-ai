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
  csvTotal: number;
  droppedEmpty: number;
  droppedDuplicate: number;
  droppedByDb: number;
}

export interface AppendImportResponse {
  taskId: string;
  importId: string;
  totalRows: number;
  newRows: number;
  skippedRows: number;
  csvTotal: number;
  droppedEmpty: number;
  droppedExisting: number;
  droppedDuplicate: number;
  droppedByDb: number;
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
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "OPENAI_API_KEY"
  },
  {
    id: "volcengine",
    label: "火山引擎 ARK（豆包）",
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
    label: "阿里云百炼（通义千问）",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "DASHSCOPE_API_KEY"
  },
  {
    id: "zhipu",
    label: "智谱 ChatGLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-plus", "glm-4-air", "glm-4-flash", "glm-4-long"],
    apiKeyHint: "id.secret",
    apiKeyEnv: "ZHIPU_API_KEY"
  },
  {
    id: "anthropic",
    label: "Anthropic Claude（OpenAI 兼容代理）",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-5", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
    apiKeyHint: "sk-ant-...",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    notes: "需要 OpenAI 兼容代理（如 Anthropic SDK 兼容层）"
  },
  {
    id: "custom",
    label: "自定义（OpenAI 兼容）",
    baseUrl: "",
    models: [],
    apiKeyHint: "你的 API Key"
  }
];

export const DEFAULT_PROMPTS = {
  reviewPrompt: `你是电商商品评论分析助手，擅长处理泰文、英文和中文混合评论。
请优先理解原始评论语言，comment_tr 仅作为辅助参考；如果原文和翻译冲突，以原文语义为准。
你必须输出中文结果，且 topicLabels / painPoints / highlights 只能从以下标签中选择：
{{taxonomy}}
要求：
1. topicLabels 选择 1-5 个最核心主题。
2. painPoints 仅保留用户明确不满的问题主题；正向评论可以为空数组。
3. highlights 仅保留用户明确认可的亮点主题；负向评论可以为空数组。
4. keywords 输出 4-10 个中文或英文短词，用于后续检索和词云，不要输出句子。
5. summary 用一句中文概括评论重点和情绪，不要超过 80 字。
6. suggestion 用一句中文给商品/运营/客服团队建议，不要超过 70 字。
7. sentimentScore 为 0 到 1，小数越高表示情感越强烈。

rating_star: {{rating_star}}
comment_original: {{comment_original}}
comment_translated: {{comment_translated}}`,

  summaryPrompt: `你是资深电商数据分析师，请根据以下评论分析数据，用100-150字的中文生成一段专业分析总结，包含核心洞察和具体运营建议，直接输出文字不要加标题：

评论总数：{{review_count}} 条
平均评分：{{avg_rating}} 星
NPS净推荐值：{{nps}}（推荐者{{promoters_pct}}%，批评者{{detractors_pct}}%）
情感分布：正向{{positive_pct}}%、中性{{neutral_pct}}%、负向{{negative_pct}}%
主要痛点：{{top_issues}}`,

  insightsPrompt: `你是资深电商产品分析师。基于以下用户评论数据，输出产品总结报告。

## 数据概览
- 评论总数：{{review_count}} 条
- 平均评分：{{avg_rating}} 星
- NPS：{{nps}}
- 主要痛点（按频次）：{{top_issues}}
- 主要规格分布：{{top_variants}}

## 正向评论样本
{{positive_samples}}

## 负向评论样本
{{negative_samples}}

## 中性评论样本
{{neutral_samples}}

## 输出要求
请严格输出 JSON 对象（不要任何额外文字、不要 markdown 代码块包裹），包含 6 个字符串字段，每个字段都是 markdown 文本：

1. **userPersonas**（用户画像）：使用 \`### **N. 子标题**\` 分 2-3 类用户群体，每类下用 \`- **关键标签**：描述\` 列出特征。
2. **usageScenarios**（使用场景）：与用户画像同样格式，分 2-3 类典型使用场景。
3. **sellingPoints**（吸引用户的卖点）：用数字列表 \`1. **卖点名**\` 列 5-6 条，可在每条后简短描述（一行内）。
4. **advantages**（产品优点）：同 sellingPoints 格式。
5. **improvements**（待改进点）：同上格式，列出用户反馈的不足。
6. **expectations**（用户期待）：同上格式，列出用户希望产品改进或增加的功能。

JSON 模板：
{"userPersonas":"...","usageScenarios":"...","sellingPoints":"...","advantages":"...","improvements":"...","expectations":"..."}`
};

export interface AiConfigDTO {
  provider: string;
  apiKey: string | null;        // returned masked from API; full when sending
  apiKeySet: boolean;            // true if backend has a non-empty key
  baseUrl: string | null;
  modelName: string;
  reviewPrompt: string;
  summaryPrompt: string;
  insightsPrompt: string;
  updatedAt: string;
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

export function buildDashboardSnapshot(
  taskId: string,
  analyses: DashboardReviewLike[],
  aiSummary: string | null = null
): DashboardDTO {
  const total = analyses.length;
  const negativeCount = analyses.filter((item) => item.review.ratingStar <= 3).length;
  const promoters = analyses.filter((item) => item.review.ratingStar === 5).length;
  const passives = analyses.filter((item) => item.review.ratingStar === 4).length;
  const detractors = analyses.filter((item) => item.review.ratingStar <= 3).length;
  const nps = total ? round(((promoters - detractors) / total) * 100) : 0;
  const avgRating = total ? round(analyses.reduce((s, a) => s + a.review.ratingStar, 0) / total) : 0;

  const npsBreakdown = [
    { label: "批评者 1-3 星", count: detractors, percent: total ? round((detractors / total) * 100) : 0 },
    { label: "中立者 4 星", count: passives, percent: total ? round((passives / total) * 100) : 0 },
    { label: "推荐者 5 星", count: promoters, percent: total ? round((promoters / total) * 100) : 0 }
  ];

  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: analyses.filter((a) => a.review.ratingStar === star).length
  }));

  const ratingSentiment = [1, 2, 3, 4, 5].map((ratingStar) => {
    const byStar = analyses.filter((item) => item.review.ratingStar === ratingStar);
    return {
      ratingStar,
      positive: byStar.filter((item) => item.sentiment === "positive").length,
      neutral: byStar.filter((item) => item.sentiment === "neutral").length,
      negative: byStar.filter((item) => item.sentiment === "negative").length
    };
  });

  const sentiments: Sentiment[] = ["positive", "neutral", "negative"];
  const sentimentDistribution = sentiments.map((sentiment) => {
    const count = analyses.filter((item) => item.sentiment === sentiment).length;
    return { sentiment, count, percent: total ? round((count / total) * 100) : 0 };
  });

  // Trend: group by month from commentTime
  const trendMap = new Map<string, { count: number; positive: number; neutral: number; negative: number }>();
  for (const analysis of analyses) {
    if (!analysis.review.commentTime) continue;
    const date = new Date(analysis.review.commentTime as string);
    if (isNaN(date.getTime())) continue;
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = trendMap.get(period) || { count: 0, positive: 0, neutral: 0, negative: 0 };
    existing.count += 1;
    existing[analysis.sentiment] += 1;
    trendMap.set(period, existing);
  }
  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({ period, ...data }));

  // Representative reviews: top 3 by sentiment score
  const positiveReviews: RepresentativeReview[] = analyses
    .filter((a) => a.sentiment === "positive")
    .sort((a, b) => b.sentimentScore - a.sentimentScore)
    .slice(0, 3)
    .map((a) => ({
      reviewId: a.reviewId,
      comment: a.review.comment,
      commentTr: a.review.commentTr,
      ratingStar: a.review.ratingStar,
      summary: a.summary,
      sentiment: a.sentiment
    }));

  const negativeReviews: RepresentativeReview[] = analyses
    .filter((a) => a.sentiment === "negative")
    .sort((a, b) => a.sentimentScore - b.sentimentScore)
    .slice(0, 3)
    .map((a) => ({
      reviewId: a.reviewId,
      comment: a.review.comment,
      commentTr: a.review.commentTr,
      ratingStar: a.review.ratingStar,
      summary: a.summary,
      sentiment: a.sentiment
    }));

  // User profile
  const withMedia = analyses.filter((a) => a.review.hasMedia).length;
  const mediaRate = total ? round((withMedia / total) * 100) : 0;

  const needsAttentionCount = analyses.filter((a) => a.needsAttention).length;
  const needsAttentionRate = total ? round((needsAttentionCount / total) * 100) : 0;

  const reviewDepth = [
    { label: "简短 <50字", count: analyses.filter((a) => a.review.comment.length < 50).length },
    { label: "适中 50-200字", count: analyses.filter((a) => { const l = a.review.comment.length; return l >= 50 && l <= 200; }).length },
    { label: "详尽 >200字", count: analyses.filter((a) => a.review.comment.length > 200).length }
  ];

  const intensityLabels = ["强烈好评", "温和好评", "中性评论", "温和差评", "强烈差评"];
  const intensityMap = new Map<string, number>(intensityLabels.map((l) => [l, 0]));
  for (const a of analyses) {
    if (a.sentiment === "positive") {
      intensityMap.set(a.sentimentScore > 0.8 ? "强烈好评" : "温和好评", (intensityMap.get(a.sentimentScore > 0.8 ? "强烈好评" : "温和好评") || 0) + 1);
    } else if (a.sentiment === "negative") {
      intensityMap.set(a.sentimentScore < 0.2 ? "强烈差评" : "温和差评", (intensityMap.get(a.sentimentScore < 0.2 ? "强烈差评" : "温和差评") || 0) + 1);
    } else {
      intensityMap.set("中性评论", (intensityMap.get("中性评论") || 0) + 1);
    }
  }
  const sentimentIntensity = intensityLabels.map((label) => ({ label, count: intensityMap.get(label) || 0 }));

  const variantMap = new Map<string, number>();
  for (const a of analyses) {
    const v = a.review.modelName;
    if (v) variantMap.set(v, (variantMap.get(v) || 0) + 1);
  }
  const variantDistribution = [...variantMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([variant, count]) => ({ variant, count }));

  const hourMap = new Map<number, number>();
  for (const a of analyses) {
    if (!a.review.commentTime) continue;
    const d = new Date(a.review.commentTime as string);
    if (isNaN(d.getTime())) continue;
    hourMap.set(d.getHours(), (hourMap.get(d.getHours()) || 0) + 1);
  }
  const hourDistribution = Array.from({ length: 24 }, (_, hour) => ({ hour, count: hourMap.get(hour) || 0 }));

  const userProfile: UserProfileDTO = {
    mediaRate,
    needsAttentionCount,
    needsAttentionRate,
    reviewDepth,
    sentimentIntensity,
    variantDistribution,
    hourDistribution
  };

  const sourceMap = new Map<string, number>();
  const keywordMap = new Map<string, number>();
  const issueMap = new Map<string, { count: number; samples: string[] }>();

  for (const analysis of analyses) {
    sourceMap.set(analysis.review.sourceChannel, (sourceMap.get(analysis.review.sourceChannel) || 0) + 1);

    for (const word of [...analysis.topicLabels, ...analysis.keywords]) {
      const trimmed = word.trim();
      if (!trimmed) continue;
      keywordMap.set(trimmed, (keywordMap.get(trimmed) || 0) + 1);
    }

    for (const issue of analysis.painPoints) {
      const trimmed = issue.trim();
      if (!trimmed) continue;
      const existing = issueMap.get(trimmed) || { count: 0, samples: [] };
      existing.count += 1;
      if (existing.samples.length < 3) existing.samples.push(analysis.reviewId);
      issueMap.set(trimmed, existing);
    }
  }

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
    trend,
    userProfile,
    productInsights: null,
    aiSummary
  };
}
