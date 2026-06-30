export type TaskStatus = "draft" | "imported" | "analyzing" | "completed" | "failed";
export type RunStatus = "queued" | "running" | "completed" | "partial_failed" | "failed";
export type CrawlJobStatus = "queued" | "running" | "completed" | "failed" | "imported";
export type Sentiment = "positive" | "neutral" | "negative";
export type PlanTier = "free" | "pro" | "business";
export type MemberRole = "owner" | "admin" | "analyst" | "viewer";
export type AnalysisType = "product" | "video" | "tweet";
export type DashboardScoreKind = "nps" | "support_index" | "stance_index";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  isActive: boolean;
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
  workspaceName?: string | null;
  workspaceSlug?: string | null;
  workspaceOwnerName?: string | null;
  workspaceOwnerEmail?: string | null;
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

export interface AuditLogDTO {
  id: string;
  workspaceId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface QueueSnapshotDTO {
  name: string;
  label: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: number;
  waitingChildren: number;
  pending: number;
  isPaused: boolean;
  error: string | null;
}

export interface QueueHealthDTO {
  queues: QueueSnapshotDTO[];
  updatedAt: string;
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
  stopReason: string | null;
  commentSortAttempted: boolean | null;
  commentSortSwitched: boolean | null;
  nextRequests: number | null;
  payloadComments: number | null;
  domCommentCount: number | null;
  domContentTextCount: number | null;
  endReached: boolean | null;
  channelErrors: string[];
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

export const CRAWL_SOURCE_CHANNEL_VALUES = ["Shopee", "YouTube", "TikTok Video", "Facebook"] as const;
export type CrawlSourceChannel = (typeof CRAWL_SOURCE_CHANNEL_VALUES)[number];

const crawlSourceChannelSet = new Set<string>(CRAWL_SOURCE_CHANNEL_VALUES);

export const CRAWL_SOURCE_CHANNEL_PRESETS = SOURCE_CHANNEL_PRESETS.filter((channel) =>
  crawlSourceChannelSet.has(channel.value)
) as Array<{ label: string; value: CrawlSourceChannel }>;

export function isSupportedCrawlSourceChannel(value?: string | null): value is CrawlSourceChannel {
  return crawlSourceChannelSet.has(String(value || "").trim());
}

export function normalizeCrawlSourceChannel(value?: string | null, fallback: CrawlSourceChannel = "YouTube"): CrawlSourceChannel {
  const text = String(value || "").trim();
  return isSupportedCrawlSourceChannel(text) ? text : fallback;
}

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
  "你是严谨的多语言评论分析专家。必须先识别当前分析模式和原文语言，再严格按接口要求的 JSON 结构输出，不要添加额外说明。";

export const DEFAULT_USER_PROMPT_TEMPLATE = [
  "你是电商商品评论分析助手，擅长处理泰文、英文和中文混合评论。",
  "请优先理解原始评论语言，comment_tr 仅作为辅助参考；如果原文和翻译冲突，以原文语义为准。",
  "当前分析模式：{analysisMode}。{analysisModeDescription}",
  "评论语言：{commentLanguage}。{languageInstruction}",
  "评分规则：{ratingInstruction}",
  "你必须输出中文结果，topicLabels / painPoints / highlights 只能从以下标签中选择：",
  "{taxonomy}",
  "",
  "要求：",
  "1. topicLabels 选择 1-5 个最核心主题。",
  "2. intentLabels 选择 1-3 个评论意图，只能从以下意图中选择：{intentTaxonomy}。",
  "3. painPoints 仅保留用户明确不满的问题主题；正向评论可以为空数组。",
  "4. highlights 仅保留用户明确认可的亮点主题；负向评论可以为空数组。",
  "5. keywords 输出 4-10 个中文或英文短词，用于后续检索和词云，不要输出句子。",
  "6. summary 用一句中文概括评论重点和情绪，不要超过 80 字。",
  "7. suggestion 用一句中文给商品、运营或客服团队建议，不要超过 70 字。",
  "8. sentimentScore 为 0 到 1，小数越高表示情感越强烈。",
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
  "有效评论：{valuableCommentCount}",
  "低价值评论占比：{lowValueCommentRate}%",
  "主要内容类别：{primaryCategory}",
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
  "有效评论：{valuableCommentCount}",
  "低价值评论占比：{lowValueCommentRate}%",
  "主要内容类别：{primaryCategory}",
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
  "当前分析模式：{analysisMode}。{analysisModeDescription}",
  "评论语言：{commentLanguage}。{languageInstruction}",
  "评分规则：{ratingInstruction}",
  "你必须输出中文结果，topicLabels / painPoints / highlights 只能从以下标签中选择：",
  "{taxonomy}",
  "",
  "要求：",
  "1. topicLabels 选择 1-5 个最核心主题。",
  "2. intentLabels 选择 1-3 个评论意图，只能从以下意图中选择：{intentTaxonomy}。",
  "3. 普通提问、事实补充、玩梗互动、求后续不应直接判为负向；只有明确批评、反对、愤怒、不信任或风险提醒才判为负向。",
  "4. painPoints 表示观众明确质疑、反感、争议或需要澄清的点。",
  "5. highlights 表示观众认可、共鸣、赞赏或希望延展的点。",
  "6. keywords 输出 4-10 个中文或英文短词，用于后续检索和词云，只输出评论中真实出现或明确指向的人物、事件、观点、术语、梗、争议点；不要输出商品、电商、售后、物流等泛化标签。",
  "7. summary 用一句中文概括评论重点和情绪，不要超过 80 字。",
  "8. suggestion 给内容团队一条选题、标题、剪辑、澄清或互动建议，不要超过 70 字。",
  "9. sentimentScore 为 0 到 1，小数越高表示情感越强烈。",
  "",
  "comment_original: {comment}",
  "comment_translated: {commentTr}"
].join("\n");

export const TWEET_USER_PROMPT_TEMPLATE = [
  "你是社交媒体舆情评论分析助手，擅长分析推文/短帖评论中的立场、传播情绪、争议焦点和回应风险。",
  "请优先理解原始评论语言，comment_tr 仅作为辅助参考；如果原文和翻译冲突，以原文语义为准。",
  "当前分析模式：{analysisMode}。{analysisModeDescription}",
  "评论语言：{commentLanguage}。{languageInstruction}",
  "评分规则：{ratingInstruction}",
  "你必须输出中文结果，topicLabels / painPoints / highlights 只能从以下标签中选择：",
  "{taxonomy}",
  "",
  "要求：",
  "1. topicLabels 选择 1-5 个最核心主题。",
  "2. intentLabels 选择 1-3 个评论意图，只能从以下意图中选择：{intentTaxonomy}。",
  "3. painPoints 表示反对、质疑、误解、攻击、风险或需要回应的点。",
  "4. highlights 表示支持、共鸣、扩散理由或可放大的传播点。",
  "5. keywords 输出 4-10 个中文或英文短词，用于后续检索和词云，只输出真实话题、人物、事件、观点、风险点或传播梗。",
  "6. summary 用一句中文概括评论重点、立场和情绪，不要超过 80 字。",
  "7. suggestion 给社媒运营一条回应、澄清、控评或放大传播的建议，不要超过 70 字。",
  "8. sentimentScore 为 0 到 1，小数越高表示情感越强烈。",
  "",
  "comment_original: {comment}",
  "comment_translated: {commentTr}"
].join("\n");

export const VIDEO_SUMMARY_PROMPT = [
  "你是资深视频内容分析师，请根据以下评论分析数据，用 100-150 字中文生成视频评论总结。",
  "需要包含观众情绪、内容亮点、争议焦点和下一期内容建议，直接输出文字，不要加标题。",
  "",
  "评论总数：{reviewCount}",
  "核心指标：{scoreLabel} {scoreValue}",
  "主要内容类别：{primaryCategory}",
  "有效评论：{valuableCommentCount}",
  "低价值评论占比：{lowValueCommentRate}%",
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
  "核心指标：{scoreLabel} {scoreValue}",
  "主要内容类别：{primaryCategory}",
  "有效评论：{valuableCommentCount}",
  "低价值评论占比：{lowValueCommentRate}%",
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
  "核心指标：{scoreLabel} {scoreValue}",
  "主要内容类别：{primaryCategory}",
  "有效评论：{valuableCommentCount}",
  "低价值评论占比：{lowValueCommentRate}%",
  "主要争议/问题：{topIssues}",
  "主要洞察聚类：{topClusters}",
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
  "核心指标：{scoreLabel} {scoreValue}",
  "主要内容类别：{primaryCategory}",
  "有效评论：{valuableCommentCount}",
  "低价值评论占比：{lowValueCommentRate}%",
  "主要风险/争议：{topIssues}",
  "主要洞察聚类：{topClusters}",
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
  intentLabels: string[];
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
  scoreKind: DashboardScoreKind;
  scoreLabel: string;
  scoreDescription: string;
  npsBreakdown: Array<{ label: string; percent: number; count: number }>;
  ratingSentiment: Array<{ ratingStar: number; positive: number; neutral: number; negative: number }>;
  ratingDistribution: Array<{ star: number; count: number }>;
  sentimentDistribution: Array<{ sentiment: Sentiment; count: number; percent: number }>;
  sourceDistribution: Array<{ source: string; count: number }>;
  intentDistribution: Array<{ label: string; count: number; percent: number }>;
  insightClusters: InsightClusterDTO[];
  qualityAlerts: DashboardQualityAlertDTO[];
  contentProfile: ContentProfileDTO;
  dynamicContentTags: DynamicContentTagDTO[];
  duplicateProfile: DuplicateCommentProfileDTO;
  wordCloud: WordCloudItemDTO[];
  issues: IssueStatDTO[];
  representativeReviews: { positive: RepresentativeReview[]; negative: RepresentativeReview[] };
  trend: Array<{ period: string; count: number; positive: number; neutral: number; negative: number }>;
  userProfile: UserProfileDTO;
  productInsights: ProductInsightsDTO | null;
  aiSummary: string | null;
}

export type AlertLevel = "info" | "warning" | "critical";

export interface DailyBriefAlertDTO {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  metric: string;
  current: number;
  baseline: number;
}

export interface DailyBriefDTO {
  taskId: string;
  taskName: string;
  productName: string;
  generatedAt: string;
  runId: string | null;
  summary: string;
  metrics: {
    totalReviews: number;
    reviewsToday: number;
    reviews7d: number;
    negativeCount: number;
    negativePercent: number;
    avgRating: number;
    nps: number;
  };
  alerts: DailyBriefAlertDTO[];
  topIssues: IssueStatDTO[];
  actions: Array<{ title: string; detail: string; priority: "high" | "medium" | "low" }>;
}

export interface TaskCompareItemDTO {
  taskId: string;
  taskName: string;
  productName: string;
  sourceChannel: string;
  runId: string | null;
  reviewCount: number;
  negativeCount: number;
  negativePercent: number;
  avgRating: number;
  nps: number;
  topIssue: string | null;
  latestRunStatus: RunStatus | null;
  latestRunFinishedAt: string | null;
}

export interface TaskCompareDTO {
  generatedAt: string;
  items: TaskCompareItemDTO[];
  winner: {
    taskId: string;
    label: string;
    reason: string;
  } | null;
  risks: Array<{ taskId: string; label: string; reason: string }>;
}

export interface ReviewCorrectionDTO {
  id: string;
  taskId: string;
  reviewId: string;
  runId: string | null;
  sentiment: Sentiment | null;
  topicLabels: string[];
  painPoints: string[];
  highlights: string[];
  summary: string;
  suggestion: string;
  note: string;
  createdAt: string;
  createdBy: UserDTO;
}

export interface PromptEvalDTO {
  generatedAt: string;
  provider: string;
  modelName: string;
  promptVersion: string;
  score: number;
  checks: Array<{ key: string; label: string; passed: boolean; detail: string }>;
  sampleCount: number;
  recommendations: string[];
}

export interface ReviewAnalysisDTO {
  reviewId: string;
  runId: string;
  sentiment: Sentiment;
  sentimentScore: number;
  topicLabels: string[];
  intentLabels: string[];
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

export interface InsightClusterDTO {
  id: string;
  title: string;
  summary: string;
  sentiment: Sentiment;
  count: number;
  percent: number;
  topicLabels: string[];
  intentLabels: string[];
  keywords: string[];
  sampleReviewIds: string[];
  evidenceReviews: RepresentativeReview[];
}

export interface DashboardQualityAlertDTO {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  recommendation: string;
}

export type DynamicContentTagKind = "topic" | "entity" | "stance" | "question" | "meme" | "risk";

export interface DynamicContentTagDTO {
  label: string;
  kind: DynamicContentTagKind;
  count: number;
  percent: number;
  sentiment: Sentiment;
  sampleReviewIds: string[];
}

export interface DuplicateCommentGroupDTO {
  sampleText: string;
  count: number;
  percent: number;
  sentiment: Sentiment;
  sampleReviewIds: string[];
}

export interface DuplicateCommentProfileDTO {
  duplicateGroupCount: number;
  duplicateCommentCount: number;
  duplicateRate: number;
  largestGroupPercent: number;
  topGroups: DuplicateCommentGroupDTO[];
}

export interface ContentProfileDTO {
  primaryCategory: string;
  categoryDistribution: Array<{ label: string; count: number; percent: number }>;
  valuableCommentCount: number;
  lowValueCommentCount: number;
  lowValueCommentRate: number;
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
  intentLabels?: string[];
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

function getDashboardScoreMeta(analysisType: AnalysisType, hasRatingNps: boolean) {
  if (hasRatingNps && analysisType === "product") {
    return {
      scoreKind: "nps" as const,
      scoreLabel: "NPS",
      scoreDescription: "推荐者与批评者净差"
    };
  }
  if (analysisType === "video") {
    return {
      scoreKind: "support_index" as const,
      scoreLabel: "观众支持度",
      scoreDescription: "正向观众占比与负向争议占比的净差"
    };
  }
  if (analysisType === "tweet") {
    return {
      scoreKind: "stance_index" as const,
      scoreLabel: "舆情支持度",
      scoreDescription: "支持立场占比与反对/风险占比的净差"
    };
  }
  return {
    scoreKind: "support_index" as const,
    scoreLabel: "情绪支持度",
    scoreDescription: "正向评论占比与负向评论占比的净差"
  };
}

function normalizeDashboardKeyword(word: string, analysisType: AnalysisType) {
  const trimmed = word.trim();
  if (!trimmed) {
    return "";
  }
  if (analysisType !== "product") {
    const taxonomy = new Set(getAnalysisPromptProfile(analysisType).taxonomy);
    const genericNoise = new Set([
      "视频评论",
      "观众反馈",
      "社媒评论",
      "舆情反馈",
      "用户声音",
      "评论",
      "观点",
      "内容",
      "视频",
      "商品",
      "产品",
      "质量",
      "售后",
      "物流",
      "包装",
      "价格",
      "客服"
    ]);
    if (taxonomy.has(trimmed) || genericNoise.has(trimmed)) {
      return "";
    }
  }
  return trimmed;
}

function normalizeCommentText(item: DashboardReviewLike) {
  return `${item.review.commentTr || ""}\n${item.review.comment || ""}`.trim().toLowerCase();
}

function isLowValueComment(item: DashboardReviewLike, analysisType: AnalysisType) {
  const original = item.review.comment.trim();
  const text = normalizeCommentText(item);
  const compact = original.replace(/\s+/g, "");
  const asciiWords = text.replace(/https?:\/\/\S+/g, "").match(/[a-z0-9]+/gi) || [];
  const hasMostlyEmojiOrPunctuation = compact.length > 0 && !/[\p{L}\p{N}]/u.test(compact);
  const repeatedShortText = compact.length <= 12 && /^(.{1,3})\1{2,}$/u.test(compact);
  const genericShortWords = new Set([
    "first",
    "1st",
    "lol",
    "lmao",
    "haha",
    "nice",
    "ok",
    "yes",
    "no",
    "good",
    "wow",
    "cool",
    "thanks",
    "thankyou",
    "subscribe",
    "follow",
    "哈哈",
    "笑死",
    "不错",
    "支持",
    "第一",
    "沙发",
    "关注"
  ]);
  const genericShort = compact.length <= 16 && genericShortWords.has(compact.toLowerCase());
  const linkOrSubscribeSpam = /(subscribe|follow me|check my channel|whatsapp|telegram|http|www\.)/i.test(original);
  const tooShortWithoutSignal =
    analysisType !== "product" &&
    compact.length <= 4 &&
    !item.painPoints.length &&
    !item.highlights.length &&
    !item.keywords.some((word) => word.length > 3);

  return hasMostlyEmojiOrPunctuation || repeatedShortText || genericShort || linkOrSubscribeSpam || tooShortWithoutSignal || (asciiWords.length <= 1 && compact.length <= 3);
}

function normalizeDuplicateText(item: DashboardReviewLike) {
  return (item.review.commentTr || item.review.comment || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[@#＃＠][\p{L}\p{N}_-]+/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function duplicateFingerprint(text: string) {
  const compact = text.replace(/\s+/g, "");
  if (compact.length < 8) {
    return "";
  }
  if (compact.length <= 80) {
    return compact;
  }
  const tokens = text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token));
  const tokenFingerprint = [...new Set(tokens)].sort().slice(0, 18).join("|");
  if (tokenFingerprint.length >= 20) {
    return tokenFingerprint;
  }
  return compact.slice(0, 120);
}

function buildDuplicateCommentProfile(analyses: DashboardReviewLike[], totalBase = analyses.length) {
  const groups = new Map<string, DashboardReviewLike[]>();
  for (const analysis of analyses) {
    const text = normalizeDuplicateText(analysis);
    const fingerprint = duplicateFingerprint(text);
    if (!fingerprint) {
      continue;
    }
    const group = groups.get(fingerprint) || [];
    group.push(analysis);
    groups.set(fingerprint, group);
  }

  const duplicateReviewIds = new Set<string>();
  const duplicateGroups = [...groups.values()]
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length);
  for (const group of duplicateGroups) {
    for (const duplicate of group.slice(1)) {
      duplicateReviewIds.add(duplicate.reviewId);
    }
  }

  const topGroups = duplicateGroups.slice(0, 6).map((group) => {
    const representative = group
      .slice()
      .sort((a, b) => (b.review.commentTr || b.review.comment).length - (a.review.commentTr || a.review.comment).length)[0];
    return {
      sampleText: (representative.review.commentTr || representative.review.comment).slice(0, 140),
      count: group.length,
      percent: totalBase ? round((group.length / totalBase) * 100) : 0,
      sentiment: dominantSentiment(group),
      sampleReviewIds: group.slice(0, 5).map((item) => item.reviewId)
    } satisfies DuplicateCommentGroupDTO;
  });
  const duplicateCommentCount = duplicateGroups.reduce((sum, group) => sum + Math.max(group.length - 1, 0), 0);
  return {
    duplicateReviewIds,
    profile: {
      duplicateGroupCount: duplicateGroups.length,
      duplicateCommentCount,
      duplicateRate: totalBase ? round((duplicateCommentCount / totalBase) * 100) : 0,
      largestGroupPercent: topGroups[0]?.percent || 0,
      topGroups
    } satisfies DuplicateCommentProfileDTO
  };
}

function categoryHitScore(text: string, words: string[]) {
  return words.reduce((score, word) => score + (text.includes(word.toLowerCase()) ? 1 : 0), 0);
}

function inferContentCategory(item: DashboardReviewLike, analysisType: AnalysisType) {
  if (analysisType === "product") {
    if (item.painPoints.some((label) => ["物流速度", "包装保护", "售后服务", "客服响应"].includes(label))) {
      return "履约/售后体验";
    }
    if (item.topicLabels.some((label) => ["清洁效果", "吸力表现", "噪音控制", "续航表现", "建图导航", "APP连接"].includes(label))) {
      return "功能体验";
    }
    if (item.topicLabels.some((label) => ["性价比", "质量做工"].includes(label))) {
      return "价值与品质";
    }
    return "商品综合体验";
  }

  const text = normalizeCommentText(item);
  const candidates =
    analysisType === "video"
      ? [
          { label: "新闻/公共事件", words: ["news", "事件", "新闻", "警方", "法律", "案件", "政府", "社会", "公共"] },
          { label: "教程/知识科普", words: ["tutorial", "how to", "learn", "education", "教程", "教学", "科普", "知识", "解释"] },
          { label: "财经/商业", words: ["market", "stock", "money", "business", "finance", "经济", "股票", "投资", "金融", "商业"] },
          { label: "娱乐/影视", words: ["movie", "music", "show", "actor", "娱乐", "电影", "音乐", "剧情", "演员", "综艺"] },
          { label: "游戏/二创", words: ["game", "gaming", "stream", "游戏", "玩家", "直播", "二创"] },
          { label: "观点评论", words: ["opinion", "agree", "disagree", "观点", "立场", "认同", "反对", "评论"] },
          { label: "创作者/频道互动", words: ["channel", "creator", "subscribe", "reply", "频道", "博主", "作者", "订阅", "下期"] }
        ]
      : [
          { label: "品牌舆情", words: ["brand", "company", "customer", "品牌", "公司", "公关", "客服"] },
          { label: "公共议题", words: ["policy", "government", "public", "社会", "政策", "政府", "公共", "法律"] },
          { label: "传播扩散", words: ["share", "viral", "trend", "转发", "扩散", "传播", "热搜"] },
          { label: "风险争议", words: ["risk", "crisis", "fake", "rumor", "风险", "争议", "谣言", "误导"] },
          { label: "活动营销", words: ["campaign", "event", "launch", "活动", "营销", "发布", "新品"] },
          { label: "用户讨论", words: ["agree", "disagree", "why", "how", "赞同", "反对", "提问", "讨论"] }
        ];

  const topicText = [...item.topicLabels, ...(item.intentLabels || []), ...item.keywords].join(" ").toLowerCase();
  const scored = candidates
    .map((candidate) => ({
      label: candidate.label,
      score: categoryHitScore(text, candidate.words) + categoryHitScore(topicText, candidate.words)
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score) {
    return scored[0].label;
  }
  return analysisType === "video" ? "视频综合讨论" : "社媒综合讨论";
}

function buildContentProfile(analyses: DashboardReviewLike[], analysisType: AnalysisType, lowValueReviewIds: Set<string>): ContentProfileDTO {
  const total = analyses.length;
  const categoryMap = new Map<string, number>();
  for (const analysis of analyses) {
    addCount(categoryMap, inferContentCategory(analysis, analysisType));
  }
  const categoryDistribution = topEntries(categoryMap, 10).map(([label, count]) => ({
    label,
    count,
    percent: total ? round((count / total) * 100) : 0
  }));
  const lowValueCommentCount = lowValueReviewIds.size;
  return {
    primaryCategory: categoryDistribution[0]?.label || (analysisType === "video" ? "视频综合讨论" : analysisType === "tweet" ? "社媒综合讨论" : "商品综合体验"),
    categoryDistribution,
    valuableCommentCount: Math.max(total - lowValueCommentCount, 0),
    lowValueCommentCount,
    lowValueCommentRate: total ? round((lowValueCommentCount / total) * 100) : 0
  };
}

function normalizeDynamicTagLabel(label: string, analysisType: AnalysisType) {
  const trimmed = label
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[“”"‘’']/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[,，.。:：;；!！?？、\s]+|[,，.。:：;；!！?？、\s]+$/g, "")
    .trim();
  if (!trimmed) {
    return "";
  }
  const genericNoise = new Set([
    "评论",
    "用户",
    "用户声音",
    "视频",
    "视频评论",
    "观众反馈",
    "内容",
    "观点",
    "社媒评论",
    "舆情反馈",
    "商品",
    "产品",
    "质量",
    "售后",
    "物流",
    "包装",
    "价格",
    "客服",
    "good",
    "great",
    "nice",
    "thanks",
    "thank",
    "video",
    "comment",
    "people",
    "thing",
    "really",
    "just"
  ]);
  const taxonomy = new Set(getAnalysisPromptProfile(analysisType).taxonomy);
  const compact = trimmed.replace(/\s+/g, "");
  const lower = trimmed.toLowerCase();
  if (genericNoise.has(compact) || genericNoise.has(lower) || taxonomy.has(trimmed)) {
    return "";
  }
  if (compact.length < 2 || compact.length > 36 || /^\d+$/.test(compact)) {
    return "";
  }
  if (/^[#＃@＠]?$/.test(compact)) {
    return "";
  }
  return trimmed;
}

function extractDynamicTextTags(item: DashboardReviewLike) {
  const text = `${item.review.commentTr || ""}\n${item.review.comment || ""}`;
  const tags: string[] = [];
  for (const match of text.matchAll(/[#＃][\p{L}\p{N}_-]{2,40}/gu)) {
    tags.push(match[0]);
  }
  for (const match of text.matchAll(/[@＠][\p{L}\p{N}_-]{2,40}/gu)) {
    tags.push(match[0]);
  }
  for (const match of text.matchAll(/[《「『“"]([^《》「」『』“”"]{2,24})[》」』”"]/gu)) {
    tags.push(match[1]);
  }
  return tags;
}

function inferDynamicTagKind(label: string, item: DashboardReviewLike, analysisType: AnalysisType): DynamicContentTagKind {
  const intents = item.intentLabels || [];
  const text = normalizeCommentText(item);
  if (/^[#＃@＠]/.test(label)) {
    return "entity";
  }
  if (intents.some((intent) => /玩梗|调侃|讽刺/.test(intent)) || /\b(lol|haha|meme)\b/i.test(text) || /哈哈|笑死|梗/.test(text)) {
    return "meme";
  }
  if (intents.some((intent) => /提问|求解|核查|事实补充|中立观望/.test(intent)) || /[?？]|为什么|怎么|请问|来源|证据|资料/.test(text)) {
    return "question";
  }
  if (analysisType !== "product" && (item.sentiment === "negative" || intents.some((intent) => /质疑|反驳|纠错|风险|反对|批评|澄清/.test(intent)))) {
    return "risk";
  }
  if (analysisType !== "product" && (item.sentiment === "positive" || intents.some((intent) => /赞同|夸奖|支持|扩散/.test(intent)))) {
    return "stance";
  }
  return /^[A-Z][A-Za-z0-9_-]{2,}/.test(label) ? "entity" : "topic";
}

function buildDynamicContentTags(analyses: DashboardReviewLike[], analysisType: AnalysisType, totalBase = analyses.length): DynamicContentTagDTO[] {
  const tags = new Map<
    string,
    {
      label: string;
      count: number;
      samples: string[];
      kindMap: Map<DynamicContentTagKind, number>;
      sentimentMap: Map<Sentiment, number>;
    }
  >();

  for (const analysis of analyses) {
    const candidates: string[] = Array.from(new Set([...analysis.keywords, ...extractDynamicTextTags(analysis)]))
      .map((label) => normalizeDynamicTagLabel(label, analysisType))
      .filter((label): label is string => Boolean(label))
      .slice(0, 8);
    const seenInReview = new Set<string>();
    for (const label of candidates) {
      const key = label.toLowerCase();
      if (seenInReview.has(key)) {
        continue;
      }
      seenInReview.add(key);
      const kind = inferDynamicTagKind(label, analysis, analysisType);
      const entry =
        tags.get(key) ||
        ({
          label,
          count: 0,
          samples: [],
          kindMap: new Map<DynamicContentTagKind, number>(),
          sentimentMap: new Map<Sentiment, number>()
        } satisfies {
          label: string;
          count: number;
          samples: string[];
          kindMap: Map<DynamicContentTagKind, number>;
          sentimentMap: Map<Sentiment, number>;
        });
      entry.count += 1;
      if (entry.samples.length < 5) {
        entry.samples.push(analysis.reviewId);
      }
      entry.kindMap.set(kind, (entry.kindMap.get(kind) || 0) + 1);
      entry.sentimentMap.set(analysis.sentiment, (entry.sentimentMap.get(analysis.sentiment) || 0) + 1);
      tags.set(key, entry);
    }
  }

  const minCount = totalBase >= 100 ? 3 : totalBase >= 30 ? 2 : 1;
  const mapped = [...tags.values()]
    .filter((entry) => entry.count >= minCount)
    .map((entry) => ({
      label: entry.label,
      kind: topEntries(entry.kindMap, 1)[0]?.[0] || "topic",
      count: entry.count,
      percent: totalBase ? round((entry.count / totalBase) * 100) : 0,
      sentiment: topEntries(entry.sentimentMap, 1)[0]?.[0] || "neutral",
      sampleReviewIds: entry.samples
    }))
    .sort((a, b) => b.count - a.count || b.percent - a.percent);

  return (mapped.length ? mapped : [...tags.values()].map((entry) => ({
    label: entry.label,
    kind: topEntries(entry.kindMap, 1)[0]?.[0] || "topic",
    count: entry.count,
    percent: totalBase ? round((entry.count / totalBase) * 100) : 0,
    sentiment: topEntries(entry.sentimentMap, 1)[0]?.[0] || "neutral",
    sampleReviewIds: entry.samples
  }))).slice(0, 18);
}

function topEntries<T extends string>(map: Map<T, number>, limit: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function sentimentLabelZh(sentiment: Sentiment) {
  if (sentiment === "positive") {
    return "正向";
  }
  if (sentiment === "negative") {
    return "负向";
  }
  return "中性";
}

function toRepresentativeReview(item: DashboardReviewLike): RepresentativeReview {
  return {
    reviewId: item.reviewId,
    comment: item.review.comment,
    commentTr: item.review.commentTr,
    ratingStar: item.review.ratingStar,
    summary: item.summary,
    sentiment: item.sentiment
  };
}

function addCount(map: Map<string, number>, value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return;
  }
  map.set(trimmed, (map.get(trimmed) || 0) + 1);
}

function dominantSentiment(items: DashboardReviewLike[]): Sentiment {
  const counts = new Map<Sentiment, number>([
    ["positive", 0],
    ["neutral", 0],
    ["negative", 0]
  ]);
  for (const item of items) {
    counts.set(item.sentiment, (counts.get(item.sentiment) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
}

function buildInsightClusters(analyses: DashboardReviewLike[], analysisType: AnalysisType, totalBase = analyses.length): InsightClusterDTO[] {
  const total = analyses.length;
  if (!total) {
    return [];
  }

  const clusters = new Map<
    string,
    {
      sentiment: Sentiment;
      items: DashboardReviewLike[];
      topicMap: Map<string, number>;
      intentMap: Map<string, number>;
      keywordMap: Map<string, number>;
    }
  >();

  for (const analysis of analyses) {
    const topic =
      analysis.painPoints[0] ||
      analysis.highlights[0] ||
      analysis.topicLabels[0] ||
      (analysisType === "video" ? "观众综合反馈" : analysisType === "tweet" ? "舆情综合反馈" : "综合体验");
    const intent = analysis.intentLabels?.[0] || (analysis.sentiment === "positive" ? "正向反馈" : analysis.sentiment === "negative" ? "风险反馈" : "中性讨论");
    const key = `${analysis.sentiment}|${topic}|${intent}`;
    const cluster =
      clusters.get(key) ||
      ({
        sentiment: analysis.sentiment,
        items: [],
        topicMap: new Map<string, number>(),
        intentMap: new Map<string, number>(),
        keywordMap: new Map<string, number>()
      } satisfies {
        sentiment: Sentiment;
        items: DashboardReviewLike[];
        topicMap: Map<string, number>;
        intentMap: Map<string, number>;
        keywordMap: Map<string, number>;
      });

    cluster.items.push(analysis);
    for (const label of analysis.topicLabels) {
      addCount(cluster.topicMap, label);
    }
    for (const label of analysis.intentLabels || []) {
      addCount(cluster.intentMap, label);
    }
    for (const word of analysis.keywords) {
      const keyword = normalizeDashboardKeyword(word, analysisType);
      addCount(cluster.keywordMap, keyword);
    }
    clusters.set(key, cluster);
  }

  const minClusterCount = total >= 50 ? Math.max(3, Math.ceil(total * 0.02)) : 1;
  const mappedClusters = [...clusters.entries()]
    .map(([id, cluster]) => {
      const sentiment = dominantSentiment(cluster.items);
      const topicLabels = topEntries(cluster.topicMap, 4).map(([label]) => label);
      const intentLabels = topEntries(cluster.intentMap, 3).map(([label]) => label);
      const keywords = topEntries(cluster.keywordMap, 6).map(([label]) => label);
      const evidenceItems = [...cluster.items]
        .sort((a, b) => {
          if (sentiment === "negative") {
            return a.sentimentScore - b.sentimentScore;
          }
          if (sentiment === "positive") {
            return b.sentimentScore - a.sentimentScore;
          }
          return b.review.comment.length - a.review.comment.length;
        })
        .slice(0, 3);
      const topic = topicLabels[0] || "综合反馈";
      const intent = intentLabels[0] || "评论反馈";
      return {
        id: `cluster-${Math.abs([...id].reduce((sum, char) => sum + char.charCodeAt(0), 0))}`,
        title: topic === intent ? topic : `${topic} · ${intent}`,
        summary: `${cluster.items.length} 条评论集中在「${topic}」，主要意图为「${intent}」，情绪以${sentimentLabelZh(sentiment)}为主${keywords.length ? `，关键词：${keywords.slice(0, 4).join("、")}` : ""}。`,
        sentiment,
        count: cluster.items.length,
        percent: round((cluster.items.length / Math.max(totalBase, 1)) * 100),
        topicLabels,
        intentLabels,
        keywords,
        sampleReviewIds: evidenceItems.map((item) => item.reviewId),
        evidenceReviews: evidenceItems.map(toRepresentativeReview)
      } satisfies InsightClusterDTO;
    });
  const filteredClusters = mappedClusters.filter((cluster) => cluster.count >= minClusterCount);
  return (filteredClusters.length ? filteredClusters : mappedClusters).sort((a, b) => b.count - a.count).slice(0, 8);
}

function buildQualityAlerts(params: {
  analyses: DashboardReviewLike[];
  analysisType: AnalysisType;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  nps: number;
  keywordMap: Map<string, number>;
  topicMap: Map<string, number>;
  intentMap: Map<string, number>;
  contentProfile: ContentProfileDTO;
  dynamicContentTags: DynamicContentTagDTO[];
  duplicateProfile: DuplicateCommentProfileDTO;
}): DashboardQualityAlertDTO[] {
  const { analyses, analysisType, positiveCount, neutralCount, negativeCount, nps, keywordMap, topicMap, intentMap, contentProfile, dynamicContentTags, duplicateProfile } = params;
  const total = analyses.length;
  if (!total) {
    return [];
  }

  const alerts: DashboardQualityAlertDTO[] = [];
  const negativePercent = round((negativeCount / total) * 100);
  const sentimentEntries: Array<[Sentiment, number]> = [
    ["positive", positiveCount],
    ["neutral", neutralCount],
    ["negative", negativeCount]
  ];
  const [dominantMood, dominantMoodCount] = sentimentEntries.sort((a, b) => b[1] - a[1])[0] || ["neutral", 0];
  const dominantMoodPercent = total ? round((dominantMoodCount / total) * 100) : 0;
  const topTopic = topEntries(topicMap, 1)[0];
  const topIntent = topEntries(intentMap, 1)[0];
  const topDynamicTag = dynamicContentTags[0];
  const neutralSignalCount =
    analysisType === "product"
      ? 0
      : analyses.filter((item) => {
          const intents = item.intentLabels || [];
          const text = normalizeCommentText(item);
          return intents.some((intent) => /提问|求解|事实|补充|核查|玩梗|调侃|期待|后续|中立|观望/.test(intent)) || /[?？]|为什么|怎么|请问|来源|资料|链接|下期|哈哈|笑死/.test(text);
        }).length;
  const neutralSignalPercent = total ? round((neutralSignalCount / total) * 100) : 0;
  const commerceNoiseWords = ["质量", "售后", "物流", "包装", "价格", "客服", "发货", "快递", "退换", "保修"];
  const commerceNoiseCount =
    analysisType === "product"
      ? 0
      : analyses.filter((item) =>
          [...item.topicLabels, ...item.keywords].some((word) => commerceNoiseWords.some((noise) => word.includes(noise)))
        ).length;

  if (analysisType !== "product" && total >= 30 && negativePercent >= 70 && neutralSignalPercent >= 20) {
    alerts.push({
      id: "neutral-signal-negative-anomaly",
      level: "critical",
      title: "中性互动可能被误判负向",
      detail: `${negativePercent}% 的评论为负向，同时 ${neutralSignalPercent}% 评论包含提问、事实补充、玩梗或求后续信号。`,
      recommendation: "建议抽样复核负向评论，重点检查普通提问和互动评论是否被错误归入争议。"
    });
  }

  if (analysisType !== "product" && total >= 30 && positiveCount === 0 && neutralSignalCount > 0) {
    alerts.push({
      id: "positive-signal-missing",
      level: "warning",
      title: "正向信号缺失",
      detail: "本次没有识别到正向评论，但样本中存在互动、求后续或补充信息等非负向信号。",
      recommendation: "建议检查情绪提示词和模型输出，避免把非批评性评论统一判为负向。"
    });
  }

  if (total >= 50 && duplicateProfile.duplicateRate >= 25) {
    alerts.push({
      id: "duplicate-comment-rate",
      level: duplicateProfile.duplicateRate >= 45 ? "critical" : "warning",
      title: "重复/相似评论占比较高",
      detail: `${duplicateProfile.duplicateRate}% 的评论疑似为重复或高度相似内容，最大重复簇占 ${duplicateProfile.largestGroupPercent}%。`,
      recommendation: "建议优先查看去重后的动态标签和观点聚类，避免刷屏内容放大单一声音。"
    });
  }

  if (total >= 20 && negativePercent >= 85) {
    alerts.push({
      id: "negative-rate-anomaly",
      level: "critical",
      title: "负向占比异常偏高",
      detail: `本次 ${negativePercent}% 的评论被判为负向，明显高于常规评论分布。`,
      recommendation: "建议抽样复核负向评论，确认是否存在提示词偏置、数据源异常或真实舆情危机。"
    });
  }

  if (total >= 30 && dominantMoodPercent >= 90) {
    alerts.push({
      id: "sentiment-concentration",
      level: dominantMood === "negative" ? "critical" : "warning",
      title: "情感分布过度集中",
      detail: `${dominantMoodPercent}% 的评论被判为${sentimentLabelZh(dominantMood)}，可能存在分类口径过窄或评论样本单一。`,
      recommendation: "建议查看代表评论，确认提问、补充信息、玩梗互动是否被误归为同一情感。"
    });
  }

  if (topTopic && total >= 30) {
    const topTopicPercent = round((topTopic[1] / total) * 100);
    if (topTopicPercent >= 80) {
      alerts.push({
        id: "topic-concentration",
        level: "warning",
        title: "主题标签过度集中",
        detail: `「${topTopic[0]}」覆盖 ${topTopicPercent}% 的评论，洞察可能不够细分。`,
        recommendation: "建议结合评论意图和关键词查看，必要时补充更细的视频/社媒分类标签。"
      });
    }
  }

  if (topIntent && total >= 30) {
    const topIntentPercent = round((topIntent[1] / total) * 100);
    if (topIntentPercent >= 80) {
      alerts.push({
        id: "intent-concentration",
        level: "warning",
        title: "评论意图过度集中",
        detail: `「${topIntent[0]}」覆盖 ${topIntentPercent}% 的评论，可能漏掉提问、纠错、玩梗或求后续等细分意图。`,
        recommendation: "建议抽查不同情感下的评论意图，确认意图识别是否过粗。"
      });
    }
  }

  if (analysisType !== "product" && total >= 50 && dynamicContentTags.length < 3) {
    alerts.push({
      id: "dynamic-tag-diversity-low",
      level: "warning",
      title: "动态话题识别不足",
      detail: `本次仅形成 ${dynamicContentTags.length} 个动态内容标签，可能无法覆盖人物、事件、梗或观点阵营。`,
      recommendation: "建议抽查 AI keywords 输出，确认是否过度使用泛化词，必要时重跑分析。"
    });
  }

  if (topDynamicTag && total >= 50 && topDynamicTag.percent >= 70) {
    alerts.push({
      id: "dynamic-tag-concentration",
      level: "info",
      title: "动态话题过度集中",
      detail: `「${topDynamicTag.label}」覆盖 ${topDynamicTag.percent}% 的有效讨论，其他话题信号较弱。`,
      recommendation: "建议结合采集范围确认评论区是否集中讨论单一事件，或是否存在刷屏。"
    });
  }

  if (total >= 50 && keywordMap.size < 5) {
    alerts.push({
      id: "keyword-diversity-low",
      level: "warning",
      title: "用户声音词云过少",
      detail: `本次仅识别出 ${keywordMap.size} 个有效关键词，词云可能无法代表真实讨论。`,
      recommendation: "建议检查 AI 输出的 keywords 是否过于泛化，或评论是否包含大量无意义短句。"
    });
  }

  if (total >= 30 && contentProfile.lowValueCommentRate >= 35) {
    alerts.push({
      id: "low-value-comment-rate",
      level: "warning",
      title: "低价值评论占比较高",
      detail: `${contentProfile.lowValueCommentRate}% 的评论疑似为表情、刷屏、短口号或求订阅等低信息量内容。`,
      recommendation: "建议重点查看有效评论聚类，避免把互动噪音误解为主要用户声音。"
    });
  }

  if (total >= 30 && contentProfile.categoryDistribution.length <= 1 && analysisType !== "product") {
    alerts.push({
      id: "category-diversity-low",
      level: dynamicContentTags.length >= 6 ? "warning" : "info",
      title: "内容类别较单一",
      detail: `本次评论主要集中在「${contentProfile.primaryCategory}」${dynamicContentTags.length >= 6 ? `，但动态标签已识别到 ${dynamicContentTags.length} 个细分话题` : ""}。`,
      recommendation: dynamicContentTags.length >= 6 ? "建议优先查看动态内容标签和观点聚类，固定类别可能偏粗。" : "如果视频本身跨多个议题，建议检查评论采样是否覆盖完整讨论区。"
    });
  }

  if (total >= 20 && commerceNoiseCount / total >= 0.2) {
    alerts.push({
      id: "commerce-noise",
      level: "warning",
      title: "非商品评论出现电商词污染",
      detail: `${round((commerceNoiseCount / total) * 100)}% 的视频/社媒评论含有质量、物流、售后等电商词。`,
      recommendation: "建议复核任务类型和提示词配置，避免把视频评论误套商品评价框架。"
    });
  }

  if (analysisType !== "product" && total >= 30 && nps === 0 && positiveCount > 0 && negativeCount > 0) {
    alerts.push({
      id: "support-index-zero",
      level: "info",
      title: "支持度正负抵消",
      detail: "当前支持度为 0，通常表示正向认可与负向争议数量接近。",
      recommendation: "建议优先查看观点聚类，而不是只看总分，判断争议点是否集中在少数话题。"
    });
  }

  const levelPriority: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };
  return alerts
    .map((alert, index) => ({ alert, index }))
    .sort((a, b) => levelPriority[a.alert.level] - levelPriority[b.alert.level] || a.index - b.index)
    .slice(0, 8)
    .map((item) => item.alert);
}

export function buildDashboardSnapshot(taskId: string, analyses: DashboardReviewLike[], analysisType: AnalysisType = "product"): DashboardDTO {
  const total = analyses.length;
  const lowValueReviewIds = new Set(analyses.filter((item) => isLowValueComment(item, analysisType)).map((item) => item.reviewId));
  const duplicateCommentResult = buildDuplicateCommentProfile(analyses, total);
  const duplicateReviewIds = duplicateCommentResult.duplicateReviewIds;
  const duplicateProfile = duplicateCommentResult.profile;
  const valuableAnalyses = analyses.filter((item) => !lowValueReviewIds.has(item.reviewId) && !duplicateReviewIds.has(item.reviewId));
  const analysesForInsights = valuableAnalyses.length ? valuableAnalyses : analyses;
  const ratedAnalyses = analyses.filter((item) => item.review.ratingStar > 0);
  const ratingTotal = ratedAnalyses.length;
  const positiveCount = analyses.filter((item) => item.sentiment === "positive").length;
  const neutralCount = analyses.filter((item) => item.sentiment === "neutral").length;
  const negativeCount = analyses.filter((item) => item.sentiment === "negative").length;
  const hasRatingNps = ratingTotal > 0 && analysisType === "product";
  const promoters = hasRatingNps ? ratedAnalyses.filter((item) => item.review.ratingStar === 5).length : positiveCount;
  const passives = hasRatingNps ? ratedAnalyses.filter((item) => item.review.ratingStar === 4).length : neutralCount;
  const detractors = hasRatingNps ? ratedAnalyses.filter((item) => item.review.ratingStar <= 3).length : negativeCount;
  const npsTotal = hasRatingNps ? ratingTotal : total;
  const nps = npsTotal ? round(((promoters - detractors) / npsTotal) * 100) : 0;
  const scoreMeta = getDashboardScoreMeta(analysisType, hasRatingNps);
  const avgRating = ratingTotal ? round(ratedAnalyses.reduce((sum, item) => sum + item.review.ratingStar, 0) / ratingTotal) : 0;

  const npsBreakdown = [
    { label: "批评者 1-3 星", count: detractors, percent: ratingTotal ? round((detractors / ratingTotal) * 100) : 0 },
    { label: "中立者 4 星", count: passives, percent: ratingTotal ? round((passives / ratingTotal) * 100) : 0 },
    { label: "推荐者 5 星", count: promoters, percent: ratingTotal ? round((promoters / ratingTotal) * 100) : 0 }
  ];
  const effectiveNpsBreakdown = hasRatingNps
    ? npsBreakdown
    : [
        {
          label: analysisType === "tweet" ? "反对/风险评论" : analysisType === "video" ? "负向/争议观众" : "负向评论",
          count: detractors,
          percent: npsTotal ? round((detractors / npsTotal) * 100) : 0
        },
        {
          label: analysisType === "tweet" ? "中立/观望评论" : analysisType === "video" ? "中性/讨论观众" : "中性评论",
          count: passives,
          percent: npsTotal ? round((passives / npsTotal) * 100) : 0
        },
        {
          label: analysisType === "tweet" ? "支持/扩散评论" : analysisType === "video" ? "正向/认可观众" : "正向评论",
          count: promoters,
          percent: npsTotal ? round((promoters / npsTotal) * 100) : 0
        }
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
  const intentMap = new Map<string, number>();
  const topicMap = new Map<string, number>();
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

    for (const topic of analysis.topicLabels) {
      addCount(topicMap, topic);
    }

    if (!lowValueReviewIds.has(analysis.reviewId) && !duplicateReviewIds.has(analysis.reviewId)) {
      const wordCandidates = analysisType === "product" ? [...analysis.topicLabels, ...analysis.keywords] : analysis.keywords;
      for (const word of wordCandidates) {
        const trimmed = normalizeDashboardKeyword(word, analysisType);
        if (!trimmed) {
          continue;
        }
        keywordMap.set(trimmed, (keywordMap.get(trimmed) || 0) + 1);
      }
    }

    for (const intent of analysis.intentLabels || []) {
      const trimmed = intent.trim();
      if (!trimmed) {
        continue;
      }
      intentMap.set(trimmed, (intentMap.get(trimmed) || 0) + 1);
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
  const contentProfile = buildContentProfile(analyses, analysisType, lowValueReviewIds);
  const insightClusters = buildInsightClusters(analysesForInsights, analysisType, total);
  const dynamicContentTags = buildDynamicContentTags(analysesForInsights, analysisType, total);
  const qualityAlerts = buildQualityAlerts({
    analyses,
    analysisType,
    positiveCount,
    neutralCount,
    negativeCount,
    nps,
    keywordMap,
    topicMap,
    intentMap,
    contentProfile,
    dynamicContentTags,
    duplicateProfile
  });
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
    scoreKind: scoreMeta.scoreKind,
    scoreLabel: scoreMeta.scoreLabel,
    scoreDescription: scoreMeta.scoreDescription,
    npsBreakdown: effectiveNpsBreakdown,
    ratingSentiment,
    ratingDistribution,
    sentimentDistribution,
    sourceDistribution: [...sourceMap.entries()].map(([source, count]) => ({ source, count })),
    intentDistribution: [...intentMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([label, count]) => ({ label, count, percent: total ? round((count / total) * 100) : 0 })),
    insightClusters,
    qualityAlerts,
    contentProfile,
    dynamicContentTags,
    duplicateProfile,
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
