export type TaskStatus = "draft" | "imported" | "analyzing" | "completed" | "failed";
export type RunStatus = "queued" | "running" | "completed" | "partial_failed" | "failed";
export type CrawlJobStatus = "queued" | "running" | "completed" | "failed" | "imported";
export type Sentiment = "positive" | "neutral" | "negative";
export type PlanTier = "free" | "pro" | "business";
export type MemberRole = "owner" | "admin" | "analyst" | "viewer";
export type AnalysisType = "product" | "video" | "tweet";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface AdminUserDTO extends UserDTO {
  workspaceId: string | null;
  monthlyReviewLimit: number;
  monthlyRunLimit: number;
  currentPeriodReviewCount: number;
  currentPeriodRunCount: number;
  inviteCode: string | null;
}

export interface InviteCodeDTO {
  id: string;
  code: string;
  note: string;
  monthlyReviewLimit: number;
  monthlyRunLimit: number;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: UserDTO;
  usedBy: UserDTO | null;
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
  analysisType: AnalysisType;
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
  inviteCodeCount: number;
  availableInviteCodeCount: number;
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
  videoUserPromptTemplate: string;
  videoSummaryPrompt: string;
  videoInsightsPrompt: string;
  tweetUserPromptTemplate: string;
  tweetSummaryPrompt: string;
  tweetInsightsPrompt: string;
  temperature: number;
  updatedAt: string | null;
}

export interface WorkspaceCrawlerSettingDTO {
  enabled: boolean;
  pythonBin: string;
  proxyUrl: string | null;
  shopeeCookie: string | null;
  shopeeCookieSet: boolean;
  crawlChannels: CrawlerChannel[];
  defaultSourceChannel: string;
  defaultMaxReviews: number;
  requestTimeoutSec: number;
  updatedAt: string | null;
}

export interface CrawlJobDTO {
  id: string;
  workspaceId: string;
  taskId: string | null;
  name: string;
  productName: string;
  sourceChannel: string;
  analysisType: AnalysisType;
  productUrl: string;
  normalizedUrl: string;
  platform: string;
  maxReviews: number;
  crawlChannels: CrawlerChannel[];
  status: CrawlJobStatus;
  progress: number;
  fetchedRows: number;
  importedRows: number;
  skippedDuplicate: number;
  crawlChannel: CrawlerChannel | string | null;
  crawlChannelLabel: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface CrawlMonitorDTO {
  id: string;
  workspaceId: string;
  taskId: string | null;
  name: string;
  productName: string;
  sourceChannel: string;
  analysisType: AnalysisType;
  productUrl: string;
  normalizedUrl: string;
  platform: string;
  maxReviews: number;
  intervalMinutes: number;
  autoAnalyze: boolean;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  lastCrawlJobId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportShareDTO {
  id: string;
  taskId: string;
  token: string;
  title: string;
  enabled: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedReportDTO {
  share: {
    id: string;
    token: string;
    title: string;
    viewCount: number;
    createdAt: string;
    expiresAt: string | null;
  };
  task: TaskListItem;
  dashboard: DashboardDTO;
}

export interface CreateCrawlJobResponse {
  job: CrawlJobDTO;
}

export interface CreateCrawlMonitorResponse {
  monitor: CrawlMonitorDTO;
}

export interface StartCrawlAnalysisResponse {
  taskId: string;
  importId: string;
  reviewCount: number;
  skippedDuplicate: number;
  run: AnalysisRunDTO;
}

export const SOURCE_CHANNEL_PRESETS = [
  { label: "Shopee TH", value: "Shopee" },
  { label: "Lazada TH", value: "Lazada" },
  { label: "TikTok Shop TH", value: "TikTok Shop" },
  { label: "TikTok Video", value: "TikTok Video" },
  { label: "YouTube", value: "YouTube" },
  { label: "Facebook", value: "Facebook" }
] as const;

export const ANALYSIS_TYPE_PRESETS: Array<{ label: string; value: AnalysisType; description: string }> = [
  { label: "商品类评论", value: "product", description: "关注评分、卖点、痛点、售后、物流和商品改进。" },
  { label: "视频类评论", value: "video", description: "关注内容反馈、观点共鸣、争议、选题和受众互动。" },
  { label: "推文类评论", value: "tweet", description: "关注舆情立场、传播情绪、争议焦点和回应策略。" }
];

export function inferAnalysisType(sourceChannel?: string | null): AnalysisType {
  const channel = String(sourceChannel || "").toLowerCase();
  if (channel.includes("youtube") || channel.includes("video") || channel.includes("bilibili")) {
    return "video";
  }
  if (
    channel.includes("tweet") ||
    channel.includes("twitter") ||
    channel.includes("facebook") ||
    channel === "x" ||
    channel.includes("weibo") ||
    channel.includes("threads")
  ) {
    return "tweet";
  }
  return "product";
}

export type CrawlerChannel = "api_exporter" | "api_basic" | "browser_intercept";

export interface CrawlerChannelPreset {
  id: CrawlerChannel;
  label: string;
  description: string;
}

export const CRAWLER_CHANNEL_PRESETS: CrawlerChannelPreset[] = [
  {
    id: "api_exporter",
    label: "增强接口",
    description: "复用 shopee-th-review-exporter 的评论接口参数，速度快，默认优先使用。"
  },
  {
    id: "api_basic",
    label: "基础接口",
    description: "使用最小 get_ratings 参数，作为增强接口失败后的轻量回退。"
  },
  {
    id: "browser_intercept",
    label: "浏览器拦截",
    description: "启动 Scrapling 浏览器，监听页面 fetch/xhr 并点击分页，最接近扩展抓取方式。"
  }
];

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
    models: ["gpt-5.4-mini", "gpt-5.5", "gpt-5.4", "gpt-5.4-nano", "gpt-5.2", "gpt-5.1", "gpt-4.1"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "OPENAI_API_KEY",
    notes: "gpt-5.4-mini is the default balanced model for high-volume review analysis; gpt-5.5 is listed for flagship-quality runs."
  },
  {
    id: "volcengine",
    label: "火山方舟 Volcengine ARK",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: [
      "doubao-seed-1-6-251015",
      "doubao-seed-1-6-flash-250828",
      "doubao-seed-1-6-250615",
      "doubao-seed-1-6-flash-250615",
      "doubao-1-5-pro-32k-250115",
      "doubao-pro-128k"
    ],
    apiKeyHint: "ark-...",
    apiKeyEnv: "VOLC_ARK_API_KEY"
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    notes: "deepseek-chat / deepseek-reasoner are legacy aliases for deepseek-v4-flash non-thinking / thinking compatibility modes."
  },
  {
    id: "moonshot",
    label: "Moonshot Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["kimi-k2.6", "kimi-k2.5", "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
    apiKeyHint: "sk-...",
    apiKeyEnv: "MOONSHOT_API_KEY"
  },
  {
    id: "dashscope",
    label: "阿里云百炼 DashScope",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.6-flash",
      "qwen3.5-plus",
      "qwen3.5-flash",
      "qwen-max",
      "qwen-plus",
      "qwen-turbo",
      "qwen-long"
    ],
    apiKeyHint: "sk-...",
    apiKeyEnv: "DASHSCOPE_API_KEY"
  },
  {
    id: "zhipu",
    label: "智谱 ChatGLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-5.1", "glm-5", "glm-4.7", "glm-4.6", "glm-4.5", "glm-4.5-air", "glm-4-plus", "glm-4-air", "glm-4-flash"],
    apiKeyHint: "id.secret",
    apiKeyEnv: "ZHIPU_API_KEY"
  },
  {
    id: "custom",
    label: "自定义 OpenAI 兼容接口",
    baseUrl: "",
    models: [],
    apiKeyHint: "API Key"
  }
];

export const DEFAULT_SYSTEM_PROMPT =
  "你是严谨的多语言电商评论分析专家。必须严格按接口要求的 JSON 结构输出，不要添加额外说明。";

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

export const VIDEO_USER_PROMPT_TEMPLATE = [
  "你是视频内容评论分析助手，擅长识别观众对视频选题、叙事、观点、证据、情绪和互动的反馈。",
  "请优先理解原始评论语言，comment_tr 仅作为辅助参考；如果原文和翻译冲突，以原文语义为准。",
  "你必须输出中文结果，topicLabels / painPoints / highlights 只能从以下标签中选择：",
  "{taxonomy}",
  "",
  "要求：",
  "1. topicLabels 选择 1-5 个最核心主题。",
  "2. painPoints 表示观众明确质疑、反感、争议或需要澄清的点。",
  "3. highlights 表示观众认可、共鸣、赞赏或希望延展的点。",
  "4. keywords 输出 4-10 个中文或英文短词，用于后续检索和词云。",
  "5. summary 用一句中文概括评论重点和情绪，不要超过 80 字。",
  "6. suggestion 给内容团队一条选题、标题、剪辑、澄清或互动建议，不要超过 70 字。",
  "7. sentimentScore 为 0 到 1，小数越高表示情感越强烈。",
  "",
  "comment_original: {comment}",
  "comment_translated: {commentTr}"
].join("\n");

export const TWEET_USER_PROMPT_TEMPLATE = [
  "你是社交媒体舆情评论分析助手，擅长分析推文/短帖评论中的立场、传播情绪、争议焦点和回应风险。",
  "请优先理解原始评论语言，comment_tr 仅作为辅助参考；如果原文和翻译冲突，以原文语义为准。",
  "你必须输出中文结果，topicLabels / painPoints / highlights 只能从以下标签中选择：",
  "{taxonomy}",
  "",
  "要求：",
  "1. topicLabels 选择 1-5 个最核心主题。",
  "2. painPoints 表示反对、质疑、误解、攻击、风险或需要回应的点。",
  "3. highlights 表示支持、共鸣、扩散理由或可放大的传播点。",
  "4. keywords 输出 4-10 个中文或英文短词，用于后续检索和词云。",
  "5. summary 用一句中文概括评论重点、立场和情绪，不要超过 80 字。",
  "6. suggestion 给社媒运营一条回应、澄清、控评或放大传播的建议，不要超过 70 字。",
  "7. sentimentScore 为 0 到 1，小数越高表示情感越强烈。",
  "",
  "comment_original: {comment}",
  "comment_translated: {commentTr}"
].join("\n");

export const VIDEO_SUMMARY_PROMPT = [
  "你是资深视频内容分析师，请根据以下评论分析数据，用 100-150 字中文生成视频评论总结。",
  "需要包含观众情绪、内容亮点、争议焦点和下一期内容建议，直接输出文字，不要加标题。",
  "",
  "评论总数：{reviewCount}",
  "正向占比：{positivePercent}%",
  "中性占比：{neutralPercent}%",
  "负向占比：{negativePercent}%",
  "主要争议/问题：{topIssues}"
].join("\n");

export const TWEET_SUMMARY_PROMPT = [
  "你是资深社交媒体舆情分析师，请根据以下评论分析数据，用 100-150 字中文生成推文/短帖舆情总结。",
  "需要包含整体立场、传播情绪、风险点和回应建议，直接输出文字，不要加标题。",
  "",
  "评论总数：{reviewCount}",
  "正向占比：{positivePercent}%",
  "中性占比：{neutralPercent}%",
  "负向占比：{negativePercent}%",
  "主要风险/争议：{topIssues}"
].join("\n");

export const VIDEO_INSIGHTS_PROMPT = [
  "你是资深视频内容策略分析师。基于以下观众评论数据，输出视频内容反馈报告。",
  "请严格输出 JSON，不要 markdown 代码块，包含 6 个字符串字段：",
  "userPersonas, usageScenarios, sellingPoints, advantages, improvements, expectations。",
  "字段含义分别对应：观众画像、观看场景、传播/推荐理由、内容优势、待优化点、观众期待。",
  "",
  "评论总数：{reviewCount}",
  "主要争议/问题：{topIssues}",
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

export const TWEET_INSIGHTS_PROMPT = [
  "你是资深社交媒体舆情策略分析师。基于以下评论数据，输出推文/短帖舆情报告。",
  "请严格输出 JSON，不要 markdown 代码块，包含 6 个字符串字段：",
  "userPersonas, usageScenarios, sellingPoints, advantages, improvements, expectations。",
  "字段含义分别对应：参与人群、讨论场景、支持/扩散理由、传播优势、风险与误解、后续回应期待。",
  "",
  "评论总数：{reviewCount}",
  "主要风险/争议：{topIssues}",
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

export function getAnalysisPromptProfile(analysisType?: AnalysisType | string | null) {
  if (analysisType === "video") {
    return {
      userPromptTemplate: VIDEO_USER_PROMPT_TEMPLATE,
      summaryPrompt: VIDEO_SUMMARY_PROMPT,
      insightsPrompt: VIDEO_INSIGHTS_PROMPT,
      taxonomy: ["内容选题", "叙事结构", "观点立场", "事实证据", "情绪共鸣", "表达节奏", "标题封面", "剪辑包装", "争议澄清", "互动引导", "受众期待", "账号信任"]
    };
  }
  if (analysisType === "tweet") {
    return {
      userPromptTemplate: TWEET_USER_PROMPT_TEMPLATE,
      summaryPrompt: TWEET_SUMMARY_PROMPT,
      insightsPrompt: TWEET_INSIGHTS_PROMPT,
      taxonomy: ["支持立场", "反对立场", "中立观望", "事实质疑", "情绪宣泄", "讽刺调侃", "传播扩散", "误解谣言", "品牌风险", "回应诉求", "行动号召", "受众期待"]
    };
  }
  return {
    userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
    summaryPrompt: DEFAULT_SUMMARY_PROMPT,
    insightsPrompt: DEFAULT_INSIGHTS_PROMPT,
    taxonomy: ["综合体验", "物流速度", "包装保护", "清洁效果", "吸力表现", "噪音控制", "续航表现", "建图导航", "APP连接", "越障爬坡", "质量做工", "性价比", "售后服务", "客服响应"]
  };
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

export interface AnalysisRunLogDTO {
  id: string;
  runId: string;
  level: string;
  message: string;
  meta: unknown | null;
  createdAt: string;
}

export interface SavedReviewViewDTO {
  id: string;
  taskId: string;
  name: string;
  filters: Record<string, unknown>;
  groupBy: string;
  viewMode: string;
  sortBy: string;
  sortOrder: string;
  visibleColumnKeys: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewActionItemDTO {
  id: string;
  taskId: string;
  runId: string | null;
  assigneeUserId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  source: string;
  relatedReviewIds: string[];
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  crawlChannel: CrawlerChannel | string | null;
  crawlChannelLabel: string | null;
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
  const ratedAnalyses = analyses.filter((item) => item.review.ratingStar > 0);
  const ratingTotal = ratedAnalyses.length;
  const negativeCount = analyses.filter((item) => item.sentiment === "negative").length;
  const promoters = ratedAnalyses.filter((item) => item.review.ratingStar === 5).length;
  const passives = ratedAnalyses.filter((item) => item.review.ratingStar === 4).length;
  const detractors = ratedAnalyses.filter((item) => item.review.ratingStar <= 3).length;
  const nps = ratingTotal ? round(((promoters - detractors) / ratingTotal) * 100) : 0;
  const avgRating = ratingTotal ? round(ratedAnalyses.reduce((sum, item) => sum + item.review.ratingStar, 0) / ratingTotal) : 0;

  const npsBreakdown = [
    { label: "批评者 1-3 星", count: detractors, percent: ratingTotal ? round((detractors / ratingTotal) * 100) : 0 },
    { label: "中立者 4 星", count: passives, percent: ratingTotal ? round((passives / ratingTotal) * 100) : 0 },
    { label: "推荐者 5 星", count: promoters, percent: ratingTotal ? round((promoters / ratingTotal) * 100) : 0 }
  ];

  const ratingSentiment = [1, 2, 3, 4, 5].map((ratingStar) => {
    const byStar = ratedAnalyses.filter((item) => item.review.ratingStar === ratingStar);
    return {
      ratingStar,
      positive: byStar.filter((item) => item.sentiment === "positive").length,
      neutral: byStar.filter((item) => item.sentiment === "neutral").length,
      negative: byStar.filter((item) => item.sentiment === "negative").length
    };
  });

  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: ratedAnalyses.filter((item) => item.review.ratingStar === star).length
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
