import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Queue, Worker } from "bullmq";
import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Prisma, prisma } from "@review-ai/db";
import {
  buildDashboardSnapshot,
  DEFAULT_INSIGHTS_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE,
  getAnalysisPromptProfile,
  type CrawlerChannel,
  type AnalysisType,
  type DashboardDTO,
  type ProductInsightsDTO
} from "@review-ai/shared";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const analysisQueue = new Queue("analysis-runs", { connection });
const crawlQueue = new Queue("crawl-jobs", { connection });
const CRAWLER_CHANNELS = new Set<CrawlerChannel>(["api_exporter", "api_basic", "browser_intercept"]);

function readPositiveIntEnv(name: string, fallback: number, options: { min?: number; max?: number } = {}) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const min = options.min ?? 1;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

const ANALYSIS_BATCH_SIZE = readPositiveIntEnv("ANALYSIS_BATCH_SIZE", 50, { min: 1, max: 100 });
const ANALYSIS_BATCH_CONCURRENCY = readPositiveIntEnv("ANALYSIS_BATCH_CONCURRENCY", 2, { min: 1, max: 6 });
const ANALYSIS_SINGLE_CONCURRENCY = readPositiveIntEnv("ANALYSIS_SINGLE_CONCURRENCY", 6, { min: 1, max: 20 });
const ANALYSIS_REQUEST_TIMEOUT_MS = readPositiveIntEnv("ANALYSIS_REQUEST_TIMEOUT_MS", 180000, { min: 30000, max: 600000 });
const ANALYSIS_BATCH_PAUSE_MS = readPositiveIntEnv("ANALYSIS_BATCH_PAUSE_MS", 0, { min: 0, max: 30000 });
const ANALYSIS_WORKER_CONCURRENCY = readPositiveIntEnv("ANALYSIS_WORKER_CONCURRENCY", 2, { min: 1, max: 10 });
const ANALYSIS_SPLIT_BATCH_SIZE = readPositiveIntEnv("ANALYSIS_SPLIT_BATCH_SIZE", 10, { min: 2, max: 50 });

type CrawlResult = {
  source: string;
  crawlChannel?: string;
  crawlChannelLabel?: string;
  productUrl: string;
  productName: string;
  shopId: string;
  itemId: string;
  rows: Array<Record<string, unknown>>;
  nextRequests?: number;
  payloadComments?: number;
  domCommentCount?: number;
  domContentTextCount?: number;
  endReached?: boolean;
};

type ResolvedCrawlerSetting = {
  pythonBin: string;
  proxyUrl: string | null;
  shopeeCookie: string | null;
  crawlChannels: CrawlerChannel[];
  requestTimeoutSec: number;
};

type CrawlerProgress = {
  elapsedSec: number;
  timeoutSec: number;
  stderr: string;
};

function isCrawlResult(value: unknown): value is CrawlResult {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as { rows?: unknown }).rows));
}

function parseCrawlerOutput(stdout: string) {
  const parsed = JSON.parse(stdout) as unknown;
  if (!isCrawlResult(parsed)) {
    throw new Error("Scrapling crawler returned an invalid result: missing rows array");
  }
  return parsed;
}

function parseCrawlerChannels(value: string | null | undefined): CrawlerChannel[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is CrawlerChannel => CRAWLER_CHANNELS.has(item as CrawlerChannel));
}

function parseCrawlerProcessError(stderr: string, fallback: string) {
  const text = stderr.trim();
  if (!text) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(text) as { error?: string; detail?: string };
    return [parsed.error, parsed.detail].filter(Boolean).join(" - ") || fallback;
  } catch {
    return text;
  }
}

function stderrTail(stderr: string) {
  const text = stderr.trim();
  if (!text) {
    return "";
  }
  return text.split(/\r?\n/).slice(-8).join("\n");
}

function formatCrawlerSpawnError(error: unknown, pythonBin: string) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
  const message = error instanceof Error ? error.message : String(error);
  if (code === "ENOENT") {
    return new Error(
      `Python command not found: ${pythonBin}. Please set SCRAPLING_PYTHON_BIN or update crawler settings to a valid Python executable.`
    );
  }
  return error instanceof Error ? error : new Error(message);
}

function runScraplingCrawler(
  productUrl: string,
  maxReviews: number,
  setting: ResolvedCrawlerSetting,
  onProgress?: (progress: CrawlerProgress) => void | Promise<void>
) {
  return new Promise<CrawlResult>((resolve, reject) => {
    const scriptPath = resolveCrawlerScriptPath();
    const args = [
      scriptPath,
      "--url",
      productUrl,
      "--max-reviews",
      String(maxReviews),
      "--timeout",
      String(setting.requestTimeoutSec)
    ];
    if (setting.proxyUrl) {
      args.push("--proxy", setting.proxyUrl);
    }
    if (setting.crawlChannels.length) {
      args.push("--channels", setting.crawlChannels.join(","));
    }
    const child = spawn(setting.pythonBin, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        ...(setting.shopeeCookie ? { SHOPEE_COOKIE: setting.shopeeCookie } : {})
      },
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    const startedAt = Date.now();
    const cleanup = () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
    const timer = setTimeout(() => {
      child.kill();
      const detail = stderrTail(stderr);
      reject(new Error(detail ? `Scrapling crawler timed out. Recent crawler log:\n${detail}` : "Scrapling crawler timed out"));
    }, (setting.requestTimeoutSec + 45) * 1000);
    const progressTimer = setInterval(() => {
      void onProgress?.({
        elapsedSec: Math.floor((Date.now() - startedAt) / 1000),
        timeoutSec: setting.requestTimeoutSec,
        stderr
      });
    }, 10000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      cleanup();
      reject(formatCrawlerSpawnError(error, setting.pythonBin));
    });
    child.on("close", (code) => {
      cleanup();
      if (code !== 0) {
        reject(new Error(parseCrawlerProcessError(stderr, `Scrapling crawler exited with code ${code}`)));
        return;
      }
      try {
        resolve(parseCrawlerOutput(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function resolveCrawlerScriptPath() {
  const candidates = [
    path.resolve(process.cwd(), "apps/crawler/scrapling_reviews.py"),
    path.resolve(process.cwd(), "../../apps/crawler/scrapling_reviews.py"),
    path.resolve(process.cwd(), "../crawler/scrapling_reviews.py")
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function resolveCrawlerPythonBin(storedPythonBin: string | null | undefined) {
  const configuredPythonBin = storedPythonBin?.trim();
  const envPythonBin = process.env.SCRAPLING_PYTHON_BIN?.trim();
  if (configuredPythonBin && configuredPythonBin !== "python") {
    return configuredPythonBin;
  }
  return envPythonBin || configuredPythonBin || "python";
}

function buildEmptyCrawlError(result: CrawlResult) {
  const diagnostics = [
    result.nextRequests === undefined ? null : `nextRequests=${result.nextRequests}`,
    result.payloadComments === undefined ? null : `payloadComments=${result.payloadComments}`,
    result.domCommentCount === undefined ? null : `domCommentCount=${result.domCommentCount}`,
    result.domContentTextCount === undefined ? null : `domContentTextCount=${result.domContentTextCount}`,
    result.endReached === undefined ? null : `endReached=${result.endReached}`
  ].filter(Boolean);
  const suffix = diagnostics.length ? ` (${diagnostics.join(", ")})` : "";
  return `Crawler finished but collected 0 comments${suffix}. The page may require login, be rate-limited, have comments disabled, or need another crawl retry.`;
}

const TOPIC_TAXONOMY = [
  "综合体验",
  "物流速度",
  "包装保护",
  "清洁效果",
  "吸力表现",
  "噪音控制",
  "续航表现",
  "建图导航",
  "APP连接",
  "越障爬坡",
  "质量做工",
  "性价比",
  "售后服务",
  "客服响应"
] as const;
const ALL_TOPIC_TAXONOMY = [
  ...TOPIC_TAXONOMY,
  "内容选题", "叙事结构", "观点立场", "事实证据", "情绪共鸣", "表达节奏", "标题封面", "剪辑包装", "争议澄清", "互动引导", "受众期待", "账号信任",
  "支持立场", "反对立场", "中立观望", "事实质疑", "情绪宣泄", "讽刺调侃", "传播扩散", "误解谣言", "品牌风险", "回应诉求", "行动号召"
] as const;

function normalizeSentimentValue(value: unknown) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) {
    return "neutral";
  }
  if (
    ["positive", "pos", "good", "support", "like", "praise", "正面", "正向", "积极", "支持", "赞同", "喜爱"].some((item) =>
      text.includes(item)
    )
  ) {
    return "positive";
  }
  if (
    ["negative", "neg", "bad", "critical", "oppose", "question", "skeptic", "质疑", "负面", "负向", "消极", "反对", "批评"].some(
      (item) => text.includes(item)
    )
  ) {
    return "negative";
  }
  if (["neutral", "mixed", "中性", "中立", "观望", "普通", "一般"].some((item) => text.includes(item))) {
    return "neutral";
  }
  return "neutral";
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,，、;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  const text = String(value || "").trim().toLowerCase();
  if (["true", "yes", "1", "需要", "是", "高", "关注"].includes(text)) {
    return true;
  }
  return false;
}

function normalizeAnalysisPayload(value: unknown) {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sentiment = normalizeSentimentValue(raw.sentiment);
  const sentimentScore = Number(raw.sentimentScore ?? raw.sentiment_score);
  return {
    sentiment,
    sentimentScore: Number.isFinite(sentimentScore)
      ? Math.min(Math.max(sentimentScore, 0), 1)
      : sentiment === "positive"
        ? 0.82
        : sentiment === "negative"
          ? 0.18
          : 0.55,
    topicLabels: normalizeStringList(raw.topicLabels ?? raw.topic_labels),
    keywords: normalizeStringList(raw.keywords),
    summary: String(raw.summary || "").slice(0, 200),
    painPoints: normalizeStringList(raw.painPoints ?? raw.pain_points),
    highlights: normalizeStringList(raw.highlights),
    suggestion: String(raw.suggestion || "").slice(0, 160),
    needsAttention: normalizeBooleanValue(raw.needsAttention ?? raw.needs_attention)
  };
}

const analysisSchema = z.preprocess(
  normalizeAnalysisPayload,
  z.object({
    sentiment: z.enum(["positive", "neutral", "negative"]),
    sentimentScore: z.number().min(0).max(1),
    topicLabels: z.array(z.string()).max(6),
    keywords: z.array(z.string()).max(12),
    summary: z.string().max(200),
    painPoints: z.array(z.string()).max(5),
    highlights: z.array(z.string()).max(5),
    suggestion: z.string().max(160),
    needsAttention: z.boolean()
  })
);
const batchAnalysisSchema = z.object({ analyses: z.array(analysisSchema) });

type AnalysisResult = z.infer<typeof analysisSchema>;
type BatchInput = { comment: string; commentTr: string | null; ratingStar: number };
type ResolvedAiSetting = {
  provider: string;
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
  promptVersion: string;
  systemPrompt: string;
  userPromptTemplate: string;
  summaryPrompt: string;
  insightsPrompt: string;
  temperature: number;
  analysisType: AnalysisType;
  taxonomy: string[];
};

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; envKeys: string[] }> = {
  openai: { baseUrl: "https://api.openai.com/v1", envKeys: ["OPENAI_API_KEY"] },
  volcengine: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3", envKeys: ["VOLC_ARK_API_KEY"] },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", envKeys: ["DEEPSEEK_API_KEY"] },
  moonshot: { baseUrl: "https://api.moonshot.cn/v1", envKeys: ["MOONSHOT_API_KEY"] },
  dashscope: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", envKeys: ["DASHSCOPE_API_KEY"] },
  zhipu: { baseUrl: "https://open.bigmodel.cn/api/paas/v4", envKeys: ["ZHIPU_API_KEY"] }
};

type TopicRule = {
  label: (typeof ALL_TOPIC_TAXONOMY)[number];
  keywords: string[];
  kind: "issue" | "highlight" | "mixed";
};

type RuntimeTopicRule = {
  label: string;
  keywords: string[];
  kind: "issue" | "highlight" | "mixed";
};

const TOPIC_RULES: TopicRule[] = [
  { label: "物流速度", keywords: ["delivery", "shipping", "arrive", "ส่ง", "จัดส่ง", "เร็ว", "快递", "发货", "到货"], kind: "mixed" },
  { label: "包装保护", keywords: ["package", "packaging", "boxed", "แพค", "กล่อง", "包装", "外包装"], kind: "mixed" },
  { label: "清洁效果", keywords: ["clean", "cleaning", "dust", "vacuum", "mop", "ทำความสะอาด", "ดูดฝุ่น", "ถูพื้น", "清洁", "打扫", "吸尘", "拖地"], kind: "mixed" },
  { label: "吸力表现", keywords: ["suction", "powerful", "แรงดูด", "吸力", "强力"], kind: "mixed" },
  { label: "噪音控制", keywords: ["noise", "loud", "quiet", "เสียง", "噪音", "声音", "安静"], kind: "mixed" },
  { label: "续航表现", keywords: ["battery", "charge", "charging", "แบต", "ชาร์จ", "电池", "续航", "充电"], kind: "mixed" },
  { label: "建图导航", keywords: ["map", "lidar", "navigation", "mapped", "แผนที่", "นำทาง", "建图", "导航", "地图"], kind: "mixed" },
  { label: "APP连接", keywords: ["app", "wifi", "application", "แอป", "连接", "手机", "配对"], kind: "mixed" },
  { label: "越障爬坡", keywords: ["carpet", "stairs", "climb", "พรม", "บันได", "地毯", "越障", "台阶", "爬坡"], kind: "issue" },
  { label: "质量做工", keywords: ["quality", "material", "premium", "คุณภาพ", "วัสดุ", "质量", "做工", "材质", "品质"], kind: "mixed" },
  { label: "性价比", keywords: ["value", "worth", "price", "cheap", "คุ้ม", "ราคา", "性价比", "划算", "便宜", "值得"], kind: "highlight" },
  { label: "售后服务", keywords: ["service", "support", "repair", "after-sales", "ซ่อม", "ประกัน", "售后", "维修", "保修", "退换"], kind: "mixed" },
  { label: "客服响应", keywords: ["customer service", "chat", "reply", "客服", "แชท", "ตอบ", "回复", "响应", "处理"], kind: "mixed" }
];

const POSITIVE_HINTS = ["good", "great", "excellent", "fast", "worth", "recommend", "clean", "easy", "ดี", "คุ้ม", "เร็ว", "好", "不错", "满意", "推荐", "喜欢", "完美"];
const NEGATIVE_HINTS = ["bad", "broken", "problem", "issue", "slow", "difficult", "hard", "cannot", "failed", "เสีย", "ยาก", "ช้า", "差", "坏", "问题", "故障", "难用", "失望"];

const AUDIENCE_POSITIVE_HINTS = [
  "love",
  "like",
  "thanks",
  "thank",
  "agree",
  "support",
  "helpful",
  "useful",
  "insightful",
  "interesting",
  "amazing",
  "great video",
  "well said",
  "赞",
  "支持",
  "喜欢",
  "感谢",
  "有道理",
  "精彩",
  "认同"
];
const AUDIENCE_NEGATIVE_HINTS = [
  "fake",
  "lie",
  "wrong",
  "bias",
  "biased",
  "disagree",
  "trash",
  "scam",
  "misleading",
  "clickbait",
  "nonsense",
  "反对",
  "造假",
  "错误",
  "不认同",
  "偏见",
  "标题党",
  "误导",
  "离谱"
];

function topicLabel(setting: ResolvedAiSetting, index: number, fallback: string) {
  return setting.taxonomy[index] || fallback;
}

function buildContextTopicRules(setting: ResolvedAiSetting): RuntimeTopicRule[] {
  if (setting.analysisType === "video") {
    return [
      { label: topicLabel(setting, 0, "内容选题"), keywords: ["topic", "subject", "story", "内容", "选题", "主题", "题材"], kind: "mixed" },
      { label: topicLabel(setting, 1, "叙事结构"), keywords: ["storytelling", "structure", "pace", "节奏", "叙事", "结构", "逻辑"], kind: "mixed" },
      { label: topicLabel(setting, 2, "观点立场"), keywords: ["opinion", "view", "stance", "agree", "disagree", "观点", "立场", "认同", "反对"], kind: "mixed" },
      { label: topicLabel(setting, 3, "事实证据"), keywords: ["source", "evidence", "fact", "data", "proof", "证据", "事实", "数据", "来源"], kind: "mixed" },
      { label: topicLabel(setting, 4, "情绪共鸣"), keywords: ["love", "moved", "touching", "angry", "sad", "共鸣", "感动", "愤怒", "情绪"], kind: "mixed" },
      { label: topicLabel(setting, 5, "表达节奏"), keywords: ["editing", "voice", "pace", "剪辑", "表达", "语速", "节奏"], kind: "mixed" },
      { label: topicLabel(setting, 6, "标题封面"), keywords: ["title", "thumbnail", "clickbait", "标题", "封面", "标题党"], kind: "issue" },
      { label: topicLabel(setting, 8, "争议澄清"), keywords: ["fake", "wrong", "misleading", "clarify", "造假", "错误", "误导", "澄清", "争议"], kind: "issue" },
      { label: topicLabel(setting, 9, "互动引导"), keywords: ["subscribe", "comment", "reply", "互动", "回复", "订阅", "点赞"], kind: "highlight" },
      { label: topicLabel(setting, 10, "受众期待"), keywords: ["next", "more", "episode", "希望", "期待", "下期", "继续"], kind: "highlight" },
      { label: topicLabel(setting, 11, "账号信任"), keywords: ["trust", "credible", "channel", "可信", "信任", "账号", "频道"], kind: "mixed" }
    ];
  }
  if (setting.analysisType === "tweet") {
    return [
      { label: topicLabel(setting, 0, "支持立场"), keywords: ["support", "agree", "yes", "支持", "赞同", "认同"], kind: "highlight" },
      { label: topicLabel(setting, 1, "反对立场"), keywords: ["oppose", "disagree", "no", "反对", "不认同", "不同意"], kind: "issue" },
      { label: topicLabel(setting, 2, "中立观望"), keywords: ["wait", "watch", "neutral", "观望", "中立", "等等看"], kind: "mixed" },
      { label: topicLabel(setting, 3, "事实质疑"), keywords: ["fake", "source", "proof", "fact", "造假", "来源", "证据", "事实"], kind: "issue" },
      { label: topicLabel(setting, 6, "传播扩散"), keywords: ["share", "viral", "spread", "转发", "传播", "扩散"], kind: "highlight" },
      { label: topicLabel(setting, 7, "误解谣言"), keywords: ["rumor", "misleading", "误解", "谣言", "误导"], kind: "issue" },
      { label: topicLabel(setting, 9, "回应诉求"), keywords: ["respond", "answer", "回应", "解释", "诉求"], kind: "mixed" }
    ];
  }
  return TOPIC_RULES;
}

function resolveEnvKey(provider: string) {
  for (const name of PROVIDER_DEFAULTS[provider]?.envKeys || ["OPENAI_API_KEY"]) {
    if (process.env[name]) {
      return process.env[name] as string;
    }
  }
  return null;
}

function resolveBaseUrl(provider: string, storedBaseUrl?: string | null) {
  if (provider === "custom") {
    return storedBaseUrl || null;
  }
  const providerDefault = PROVIDER_DEFAULTS[provider]?.baseUrl || null;
  if (!providerDefault) {
    return storedBaseUrl || null;
  }
  const knownProviderBaseUrls = Object.values(PROVIDER_DEFAULTS).map((item) => item.baseUrl);
  if (!storedBaseUrl || (knownProviderBaseUrls.includes(storedBaseUrl) && storedBaseUrl !== providerDefault)) {
    return providerDefault;
  }
  return storedBaseUrl;
}

async function getPlatformAiSetting() {
  return prisma.workspaceAiSetting.findFirst({
    where: {
      workspace: {
        memberships: {
          some: {
            user: { isSuperAdmin: true }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

async function getPlatformCrawlerSetting() {
  return prisma.workspaceCrawlerSetting.findFirst({
    where: {
      workspace: {
        memberships: {
          some: {
            user: { isSuperAdmin: true }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

async function loadAiSetting(taskId: string): Promise<ResolvedAiSetting> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { analysisType: true }
  });
  return resolveAiSetting(await getPlatformAiSetting(), ((task?.analysisType as AnalysisType | null) || "product"));
}

async function loadAiSettingForWorkspace(workspaceId: string, analysisType: AnalysisType): Promise<ResolvedAiSetting> {
  void workspaceId;
  return resolveAiSetting(await getPlatformAiSetting(), analysisType);
}

function resolveAiSetting(
  setting: {
    provider: string;
    apiKey: string | null;
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
  } | null,
  analysisType: AnalysisType
): ResolvedAiSetting {
  const profile = getAnalysisPromptProfile(analysisType);
  const provider = setting?.provider || process.env.AI_PROVIDER || "openai";
  const promptProfile =
    analysisType === "video"
      ? {
          userPromptTemplate: setting?.videoUserPromptTemplate || profile.userPromptTemplate,
          summaryPrompt: setting?.videoSummaryPrompt || profile.summaryPrompt,
          insightsPrompt: setting?.videoInsightsPrompt || profile.insightsPrompt
        }
      : analysisType === "tweet"
        ? {
            userPromptTemplate: setting?.tweetUserPromptTemplate || profile.userPromptTemplate,
            summaryPrompt: setting?.tweetSummaryPrompt || profile.summaryPrompt,
            insightsPrompt: setting?.tweetInsightsPrompt || profile.insightsPrompt
          }
        : {
            userPromptTemplate: setting?.userPromptTemplate || DEFAULT_USER_PROMPT_TEMPLATE,
            summaryPrompt: setting?.summaryPrompt || DEFAULT_SUMMARY_PROMPT,
            insightsPrompt: setting?.insightsPrompt || DEFAULT_INSIGHTS_PROMPT
          };
  return {
    provider,
    apiKey: setting?.apiKey || resolveEnvKey(provider),
    baseUrl: resolveBaseUrl(provider, setting?.baseUrl),
    modelName: setting?.modelName || process.env.OPENAI_MODEL || "gpt-5.4-mini",
    promptVersion: setting?.promptVersion || "v2-thai",
    systemPrompt: setting?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: promptProfile.userPromptTemplate,
    summaryPrompt: promptProfile.summaryPrompt,
    insightsPrompt: promptProfile.insightsPrompt,
    temperature: setting?.temperature ?? 0.2,
    analysisType,
    taxonomy: profile.taxonomy
  };
}

function buildClient(setting: ResolvedAiSetting) {
  if (!setting.apiKey) {
    return null;
  }
  return new OpenAI({
    apiKey: setting.apiKey,
    ...(setting.baseUrl ? { baseURL: setting.baseUrl } : {})
  });
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function mapTopicAlias(label: string, analysisType: AnalysisType) {
  const normalized = label.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const rules: Array<{ patterns: string[]; product: string; video: string; tweet: string }> = [
    {
      patterns: ["贴牌", "真实性", "真假", "造假", "虚假", "冒牌"],
      product: "质量做工",
      video: "事实证据",
      tweet: "事实质疑"
    },
    {
      patterns: ["司法", "警察", "扣留", "判决", "法律", "执法", "不公", "案件"],
      product: "综合体验",
      video: "事实证据",
      tweet: "事实质疑"
    },
    {
      patterns: ["花钱", "收费", "价格", "贵", "便宜", "成本"],
      product: "性价比",
      video: "受众期待",
      tweet: "回应诉求"
    },
    {
      patterns: ["品牌", "口碑", "信任", "可信"],
      product: "综合体验",
      video: "账号信任",
      tweet: "品牌风险"
    },
    {
      patterns: ["争议", "质疑", "澄清", "解释"],
      product: "综合体验",
      video: "争议澄清",
      tweet: "事实质疑"
    },
    {
      patterns: ["支持", "赞同", "认可"],
      product: "综合体验",
      video: "情绪共鸣",
      tweet: "支持立场"
    },
    {
      patterns: ["反对", "不满", "愤怒", "批评"],
      product: "综合体验",
      video: "观点立场",
      tweet: "反对立场"
    }
  ];
  const matched = rules.find((rule) => rule.patterns.some((pattern) => normalized.includes(pattern.toLowerCase())));
  return matched ? matched[analysisType] : null;
}

function normalizeTopicList(
  labels: string[],
  setting: ResolvedAiSetting,
  fallbackLabel: string,
  maxItems: number
) {
  const allowed = new Set(setting.taxonomy);
  const allAllowed = new Set<string>(ALL_TOPIC_TAXONOMY);
  const normalized = labels
    .map((label) => label.trim())
    .filter(Boolean)
    .flatMap((label) => {
      if (allowed.has(label)) {
        return [label];
      }
      const exactKnown = allAllowed.has(label) ? label : null;
      if (exactKnown && allowed.has(exactKnown)) {
        return [exactKnown];
      }
      const fuzzyKnown = setting.taxonomy.find((topic) => label.includes(topic) || topic.includes(label));
      if (fuzzyKnown) {
        return [fuzzyKnown];
      }
      const alias = mapTopicAlias(label, setting.analysisType);
      return alias && allowed.has(alias) ? [alias] : [];
    });
  const result = unique(normalized).slice(0, maxItems);
  return result.length ? result : [fallbackLabel].filter(Boolean).slice(0, maxItems);
}

function sanitizeAnalysisResult(result: AnalysisResult, setting: ResolvedAiSetting): AnalysisResult {
  const fallbackTopic = setting.taxonomy[0] || ALL_TOPIC_TAXONOMY[0];
  const invalidLabels = unique([...result.topicLabels, ...result.painPoints, ...result.highlights].map((label) => label.trim()).filter(Boolean)).filter(
    (label) => !setting.taxonomy.includes(label)
  );
  const topicLabels = normalizeTopicList(result.topicLabels, setting, fallbackTopic, 6);
  const painPoints =
    result.painPoints.length > 0 ? normalizeTopicList(result.painPoints, setting, topicLabels[0] || fallbackTopic, 5) : [];
  const highlights =
    result.highlights.length > 0 ? normalizeTopicList(result.highlights, setting, topicLabels[0] || fallbackTopic, 5) : [];
  return {
    ...result,
    topicLabels,
    painPoints,
    highlights,
    keywords: unique([...result.keywords.map((item) => item.trim()).filter(Boolean), ...invalidLabels]).slice(0, 12)
  };
}

function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>) {
  return template
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => String(vars[name] ?? ""))
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => String(vars[name] ?? ""));
}

function stripJsonFence(content: string) {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseJsonObject(content: string) {
  const stripped = stripJsonFence(content);
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error("AI response did not contain valid JSON");
  }
}

function shouldUseResponsesApi(setting: ResolvedAiSetting) {
  return setting.provider === "openai";
}

function buildSystemPrompt(setting: ResolvedAiSetting) {
  const domainGuard =
    setting.analysisType === "video"
      ? [
          "This is a video-comment analysis task, not necessarily an e-commerce or product-review task.",
          "YouTube/TikTok video comments may discuss news, education, entertainment, politics, finance, creators, arguments, evidence, emotions, or community interaction.",
          "Do not assume logistics, packaging, after-sales service, price, product quality, or other shopping topics unless the comment explicitly mentions them.",
          "Video comments usually have rating_star 0 or missing. Treat rating_star 0 as no rating, not as a negative rating.",
          "Classify sentiment from the comment text itself: praise/support/thanks is positive; questions or factual additions can be neutral; only explicit criticism, anger, distrust, or disagreement is negative."
        ].join("\n")
      : setting.analysisType === "tweet"
        ? [
            "This is a social-media discussion analysis task, not necessarily an e-commerce or product-review task.",
            "Do not assume shopping topics unless the text explicitly mentions them.",
            "Classify sentiment from stance, support, opposition, skepticism, risk, and discussion context."
          ].join("\n")
        : "";
  return [setting.systemPrompt, domainGuard].filter(Boolean).join("\n\n");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function scoreHits(text: string, words: string[]) {
  return words.filter((word) => text.includes(word.toLowerCase())).length;
}

function inferTopics(text: string, setting: ResolvedAiSetting) {
  return buildContextTopicRules(setting).filter((rule) => rule.keywords.some((keyword) => text.includes(keyword.toLowerCase())));
}

function inferKeywords(text: string, matchedTopics: RuntimeTopicRule[], setting: ResolvedAiSetting) {
  const englishWords = text
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => /^[a-z][a-z0-9-]{2,}$/i.test(word))
    .slice(0, 6);
  const baseKeywords = unique([...matchedTopics.map((item) => item.label), ...englishWords]).slice(0, 10);
  if (baseKeywords.length) {
    return baseKeywords;
  }
  return setting.analysisType === "video" ? ["观众反馈", "视频评论"] : setting.analysisType === "tweet" ? ["舆情反馈", "社媒评论"] : [];
}

function inferSentiment(text: string, ratingStar: number) {
  const positiveHits = scoreHits(text, [...POSITIVE_HINTS, ...AUDIENCE_POSITIVE_HINTS]);
  const negativeHits = scoreHits(text, [...NEGATIVE_HINTS, ...AUDIENCE_NEGATIVE_HINTS]);
  if (ratingStar > 0 && ratingStar <= 3) {
    return { sentiment: "negative" as const, sentimentScore: ratingStar <= 2 ? 0.14 : 0.22 };
  }
  if (negativeHits >= positiveHits + 1) {
    return { sentiment: "negative" as const, sentimentScore: ratingStar <= 2 ? 0.14 : 0.22 };
  }
  if (ratingStar === 4 || negativeHits > 0 || (ratingStar <= 0 && positiveHits === 0)) {
    return { sentiment: "neutral" as const, sentimentScore: 0.56 };
  }
  return { sentiment: "positive" as const, sentimentScore: positiveHits >= 2 ? 0.92 : 0.84 };
}

function mockAnalyze(comment: string, commentTr: string | null, ratingStar: number, setting: ResolvedAiSetting): AnalysisResult {
  const original = comment.trim();
  const translated = (commentTr || "").trim();
  const combined = `${translated}\n${original}`.toLowerCase();
  const matchedTopics = inferTopics(combined, setting);
  const topicLabels = unique(matchedTopics.map((item) => item.label)).slice(0, 5);
  const keywords = inferKeywords(combined, matchedTopics, setting);
  const { sentiment, sentimentScore } = inferSentiment(combined, ratingStar);
  const issueTopics = matchedTopics.filter((item) => item.kind !== "highlight").map((item) => item.label);
  const highlightTopics = matchedTopics.filter((item) => item.kind !== "issue").map((item) => item.label);
  const painPoints = sentiment === "negative" ? unique(issueTopics).slice(0, 3) : sentiment === "neutral" ? unique(issueTopics).slice(0, 2) : [];
  const highlights = sentiment === "positive" ? unique(highlightTopics.length ? highlightTopics : topicLabels).slice(0, 3) : sentiment === "neutral" ? unique(highlightTopics).slice(0, 2) : [];
  const tone = sentiment === "positive" ? "整体评价偏正面" : sentiment === "negative" ? "整体评价偏负面" : "整体评价偏中性";
  const fallbackTopic = topicLabel(setting, 0, setting.analysisType === "video" ? "内容选题" : setting.analysisType === "tweet" ? "中立观望" : "综合体验");
  const suggestion =
    setting.analysisType === "video"
      ? sentiment === "negative"
        ? "建议核查争议评论中的事实质疑，并在后续内容或置顶回复中澄清。"
        : "建议延展观众认可的选题和表达方式，增强互动与系列化内容。"
      : setting.analysisType === "tweet"
        ? sentiment === "negative"
          ? "建议优先回应高频质疑点，降低误解扩散风险。"
          : "建议放大支持理由，并跟进可继续传播的话题。"
        : sentiment === "negative"
          ? "建议优先排查差评中的核心问题，并完善售后响应。"
          : "建议持续放大高频好评点，用于详情页和营销素材。";
  return {
    sentiment,
    sentimentScore,
    topicLabels: topicLabels.length ? topicLabels : [fallbackTopic],
    keywords,
    summary: `${tone}${topicLabels.length ? `，重点涉及${topicLabels.join("、")}` : ""}。${(translated || original).slice(0, 56)}`,
    painPoints,
    highlights,
    suggestion,
    needsAttention: sentiment === "negative" || (ratingStar > 0 && ratingStar <= 2)
  };
}

function buildSinglePrompt(setting: ResolvedAiSetting, item: BatchInput) {
  return renderTemplate(setting.userPromptTemplate, {
    taxonomy: setting.taxonomy.join("、"),
    ratingStar: item.ratingStar,
    rating_star: item.ratingStar,
    comment: item.comment,
    commentTr: item.commentTr || "",
    comment_original: item.comment,
    comment_translated: item.commentTr || ""
  });
}

function buildBatchPrompt(setting: ResolvedAiSetting, items: BatchInput[]) {
  const instructions = renderTemplate(setting.userPromptTemplate, {
    taxonomy: setting.taxonomy.join("、"),
    ratingStar: "",
    rating_star: "",
    comment: "",
    commentTr: "",
    comment_original: "",
    comment_translated: ""
  });
  const list = items
    .map(
      (item, index) =>
        `[评论 ${index + 1}]\nrating_star: ${item.ratingStar}\ncomment_original: ${JSON.stringify(item.comment)}\ncomment_translated: ${JSON.stringify(item.commentTr || "")}`
    )
    .join("\n\n");
  return `${instructions}\n\n请一次分析 ${items.length} 条评论，严格按输入顺序输出 ${items.length} 个结果。\n返回 JSON：{"analyses":[...]}\n\n${list}`;
}

async function analyzeOne(client: OpenAI | null, setting: ResolvedAiSetting, item: BatchInput): Promise<AnalysisResult> {
  if (process.env.ENABLE_MOCK_AI === "true") {
    return mockAnalyze(item.comment, item.commentTr, item.ratingStar, setting);
  }
  if (!client) {
    throw new Error(`API key for provider "${setting.provider}" is not configured`);
  }
  if (!shouldUseResponsesApi(setting)) {
    const response = await client.chat.completions.create({
      model: setting.modelName,
      temperature: setting.temperature,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${buildSystemPrompt(setting)}\nReturn only valid JSON. Do not wrap it in markdown.`
        },
        {
          role: "user",
          content: `${buildSinglePrompt(setting, item)}\n\nReturn one JSON object with these fields: sentiment, sentimentScore, topicLabels, keywords, summary, painPoints, highlights, suggestion, needsAttention.`
        }
      ]
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI response was empty");
    }
    const parsed = parseJsonObject(content);
    return sanitizeAnalysisResult(analysisSchema.parse(parsed.analysis || parsed), setting);
  }
  const response = await client.responses.parse({
    model: setting.modelName,
    temperature: setting.temperature,
    input: [
      { role: "system", content: buildSystemPrompt(setting) },
      { role: "user", content: buildSinglePrompt(setting, item) }
    ],
    text: { format: zodTextFormat(analysisSchema, "review_analysis") }
  });
  if (!response.output_parsed) {
    throw new Error("OpenAI response was not parsed");
  }
  return sanitizeAnalysisResult(response.output_parsed, setting);
}

async function analyzeBatch(client: OpenAI, setting: ResolvedAiSetting, items: BatchInput[]) {
  if (!shouldUseResponsesApi(setting)) {
    const response = await client.chat.completions.create({
      model: setting.modelName,
      temperature: setting.temperature,
      max_tokens: Math.min(6000, Math.max(1200, items.length * 650)),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${buildSystemPrompt(setting)}\nReturn only valid JSON. Do not wrap it in markdown. The analyses array must contain exactly one entry per input review, in the same order.`
        },
        {
          role: "user",
          content: `${buildBatchPrompt(setting, items)}\n\nReturn JSON in this exact shape: {"analyses":[{"sentiment":"positive|neutral|negative","sentimentScore":0.5,"topicLabels":[],"keywords":[],"summary":"","painPoints":[],"highlights":[],"suggestion":"","needsAttention":false}]}`
        }
      ]
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI response was empty");
    }
    const parsed = parseJsonObject(content);
    const normalized = Array.isArray(parsed) ? { analyses: parsed } : parsed;
    const validated = batchAnalysisSchema.parse(normalized);
    if (validated.analyses.length !== items.length) {
      throw new Error(`Batch expected ${items.length} analyses but got ${validated.analyses.length}`);
    }
    return validated.analyses.map((analysis) => sanitizeAnalysisResult(analysis, setting));
  }
  const response = await client.responses.parse({
    model: setting.modelName,
    temperature: setting.temperature,
    input: [
      {
        role: "system",
        content: `${buildSystemPrompt(setting)}\nThe analyses array must contain exactly one entry per input review, in the same order.`
      },
      { role: "user", content: buildBatchPrompt(setting, items) }
    ],
    text: { format: zodTextFormat(batchAnalysisSchema, "review_batch_analysis") }
  });
  const parsed = response.output_parsed;
  if (!parsed || parsed.analyses.length !== items.length) {
    throw new Error(`Batch expected ${items.length} analyses but got ${parsed?.analyses.length || 0}`);
  }
  return parsed.analyses.map((analysis) => sanitizeAnalysisResult(analysis, setting));
}

async function analyzeWithRetry(client: OpenAI | null, setting: ResolvedAiSetting, item: BatchInput, maxRetries = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await analyzeOne(client, setting, item);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}

function buildAnalysisData(result: AnalysisResult) {
  return {
    sentiment: result.sentiment,
    sentimentScore: result.sentimentScore,
    topicLabels: result.topicLabels,
    keywords: result.keywords,
    summary: result.summary,
    painPoints: result.painPoints,
    highlights: result.highlights,
    suggestion: result.suggestion,
    needsAttention: result.needsAttention,
    rawModelOutput: JSON.stringify(result)
  };
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function addRunLog(runId: string, level: "info" | "warn" | "error", message: string, meta?: Prisma.InputJsonValue) {
  try {
    await prisma.analysisRunLog.create({
      data: {
        runId,
        level,
        message,
        ...(meta === undefined ? {} : { meta })
      }
    });
  } catch (error) {
    console.warn("Failed to write analysis run log", error);
  }
}

async function updateRunProgress(runId: string, successCount: number, failedCount: number, lastError?: string) {
  await prisma.analysisRun.update({
    where: { id: runId },
    data: { successCount, failedCount, ...(lastError ? { lastError } : {}) }
  });
}

async function generateAiSummary(client: OpenAI | null, setting: ResolvedAiSetting, dashboard: DashboardDTO) {
  const positive = dashboard.sentimentDistribution.find((item) => item.sentiment === "positive")?.percent || 0;
  const neutral = dashboard.sentimentDistribution.find((item) => item.sentiment === "neutral")?.percent || 0;
  const negative = dashboard.sentimentDistribution.find((item) => item.sentiment === "negative")?.percent || 0;
  const topIssues = dashboard.issues.slice(0, 5).map((item) => `${item.issueName}(${item.count})`).join("、") || "暂无明显痛点";
  if (process.env.ENABLE_MOCK_AI === "true" || !client) {
    return `本次共分析 ${dashboard.reviewCount} 条评论，平均评分 ${dashboard.avgRating}，NPS 为 ${dashboard.nps}。正向占比 ${positive}%，负向占比 ${negative}%。主要痛点：${topIssues}。`;
  }
  const prompt = renderTemplate(setting.summaryPrompt, {
    reviewCount: dashboard.reviewCount,
    review_count: dashboard.reviewCount,
    avgRating: dashboard.avgRating,
    avg_rating: dashboard.avgRating,
    nps: dashboard.nps,
    positivePercent: positive,
    positive_pct: positive,
    neutralPercent: neutral,
    neutral_pct: neutral,
    negativePercent: negative,
    negative_pct: negative,
    topIssues: topIssues,
    top_issues: topIssues
  });
  const response = await client.chat.completions.create({
    model: setting.modelName,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.6
  });
  return response.choices[0]?.message?.content?.trim() || null;
}

type AnalysisRow = {
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  summary: string;
  review: { ratingStar: number; comment: string; commentTr: string | null };
};

async function generateProductInsights(
  client: OpenAI | null,
  setting: ResolvedAiSetting,
  dashboard: DashboardDTO,
  analyses: AnalysisRow[]
): Promise<ProductInsightsDTO | null> {
  if (process.env.ENABLE_MOCK_AI === "true" || !client) {
    return null;
  }
  const sample = (item: AnalysisRow) =>
    `- [${item.review.ratingStar}星 ${item.sentiment}] ${(item.review.commentTr || item.review.comment).slice(0, 220)}${item.summary ? `（摘要：${item.summary}）` : ""}`;
  const positiveSamples = analyses.filter((item) => item.sentiment === "positive").sort((a, b) => b.sentimentScore - a.sentimentScore).slice(0, 10).map(sample).join("\n") || "无";
  const negativeSamples = analyses.filter((item) => item.sentiment === "negative").sort((a, b) => a.sentimentScore - b.sentimentScore).slice(0, 10).map(sample).join("\n") || "无";
  const neutralSamples = analyses.filter((item) => item.sentiment === "neutral").slice(0, 6).map(sample).join("\n") || "无";
  const topIssues = dashboard.issues.slice(0, 8).map((item) => `${item.issueName}(${item.count})`).join("、") || "暂无";
  const topVariants = dashboard.userProfile.variantDistribution.slice(0, 5).map((item) => `${item.variant}(${item.count})`).join("、") || "暂无";
  const prompt = renderTemplate(setting.insightsPrompt, {
    reviewCount: dashboard.reviewCount,
    review_count: dashboard.reviewCount,
    avgRating: dashboard.avgRating,
    avg_rating: dashboard.avgRating,
    nps: dashboard.nps,
    topIssues,
    top_issues: topIssues,
    topVariants,
    top_variants: topVariants,
    positiveSamples,
    positive_samples: positiveSamples,
    negativeSamples,
    negative_samples: negativeSamples,
    neutralSamples,
    neutral_samples: neutralSamples
  });
  try {
    const response = await client.chat.completions.create({
      model: setting.modelName,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3000,
      temperature: 0.6
    });
    const content = response.choices[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim());
    if (
      typeof parsed.userPersonas === "string" &&
      typeof parsed.usageScenarios === "string" &&
      typeof parsed.sellingPoints === "string" &&
      typeof parsed.advantages === "string" &&
      typeof parsed.improvements === "string" &&
      typeof parsed.expectations === "string"
    ) {
      return parsed as ProductInsightsDTO;
    }
  } catch (error) {
    console.error("Failed to generate product insights", error);
  }
  return null;
}

const worker = new Worker(
  "analysis-runs",
  async (job) => {
    const { runId, taskId } = job.data as { runId: string; taskId: string; workspaceId?: string };
    const run = await prisma.analysisRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    await addRunLog(runId, "info", "Worker picked up analysis run", { taskId });
    const setting = await loadAiSetting(taskId);
    const client = buildClient(setting);
    await addRunLog(runId, "info", "AI setting resolved", {
      provider: setting.provider,
      modelName: setting.modelName,
      baseUrl: setting.baseUrl,
      analysisType: setting.analysisType,
      taxonomy: setting.taxonomy,
      throughput: {
        batchSize: ANALYSIS_BATCH_SIZE,
        batchConcurrency: ANALYSIS_BATCH_CONCURRENCY,
        singleConcurrency: ANALYSIS_SINGLE_CONCURRENCY,
        requestTimeoutMs: ANALYSIS_REQUEST_TIMEOUT_MS,
        batchPauseMs: ANALYSIS_BATCH_PAUSE_MS,
        workerConcurrency: ANALYSIS_WORKER_CONCURRENCY,
        splitBatchSize: ANALYSIS_SPLIT_BATCH_SIZE
      }
    });
    const existingReviewIds = await prisma.reviewAnalysis
      .findMany({ where: { runId }, select: { reviewId: true } })
      .then((rows) => new Set(rows.map((row) => row.reviewId)));
    const reviews = await prisma.review.findMany({ where: { taskId }, orderBy: { commentTime: "asc" } });
    const pendingReviews = reviews.filter((review) => !existingReviewIds.has(review.id));

    await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: "running",
        startedAt: run.startedAt || new Date(),
        reviewCount: reviews.length,
        successCount: existingReviewIds.size,
        lastError: null
      }
    });
    await addRunLog(runId, "info", "Analysis run started", {
      totalReviews: reviews.length,
      pendingReviews: pendingReviews.length,
      resumedReviews: existingReviewIds.size
    });

    let successCount = existingReviewIds.size;
    let failedCount = 0;
    let lastError: string | undefined;
    const useMock = process.env.ENABLE_MOCK_AI === "true";

    async function persistResult(reviewId: string, result: AnalysisResult) {
      const data = buildAnalysisData(result);
      await prisma.reviewAnalysis.upsert({
        where: { runId_reviewId: { runId, reviewId } },
        update: data,
        create: { runId, reviewId, ...data }
      });
    }

    async function persistBatchResults(batch: (typeof pendingReviews)[number][], results: AnalysisResult[]) {
      if (!results.length) {
        return;
      }
      await prisma.reviewAnalysis.createMany({
        data: results.map((result, index) => ({
          runId,
          reviewId: batch[index].id,
          ...buildAnalysisData(result)
        })),
        skipDuplicates: true
      });
    }

    async function processOne(review: (typeof pendingReviews)[number]) {
      const item = {
        comment: review.comment || review.commentTr || "",
        commentTr: review.commentTr,
        ratingStar: review.ratingStar
      };
      const result = await withTimeout(analyzeWithRetry(client, setting, item), ANALYSIS_REQUEST_TIMEOUT_MS);
      await persistResult(review.id, result);
    }

    async function processBatch(batch: (typeof pendingReviews)[number][], batchIndex: number) {
      const batchStart = batchIndex * ANALYSIS_BATCH_SIZE + 1;
      const batchEnd = batchStart + batch.length - 1;
      let batchSucceeded = false;
      let localSuccessCount = 0;
      let localFailedCount = 0;
      let localLastError: string | undefined;

      await addRunLog(runId, "info", "Processing review batch", {
        batchStart,
        batchEnd,
        batchSize: batch.length
      });

      if (!useMock && client && batch.length > 1) {
        try {
          const items = batch.map((review) => ({
            comment: review.comment || review.commentTr || "",
            commentTr: review.commentTr,
            ratingStar: review.ratingStar
          }));
          const results = await withTimeout(analyzeBatch(client, setting, items), ANALYSIS_REQUEST_TIMEOUT_MS);
          await persistBatchResults(batch, results);
          localSuccessCount += results.length;
          batchSucceeded = true;
          await addRunLog(runId, "info", "Batch analysis succeeded", {
            batchStart,
            batchEnd,
            successCount: localSuccessCount
          });
        } catch (error) {
          localLastError = error instanceof Error ? error.message : String(error);
          console.warn(`Batch analysis failed, fallback to single review: ${localLastError}`);
          await addRunLog(runId, "warn", "Batch analysis failed, falling back to single reviews", {
            batchStart,
            batchEnd,
            error: localLastError
          });
          if (batch.length > ANALYSIS_SPLIT_BATCH_SIZE) {
            try {
              const splitBatches = chunkArray(batch, ANALYSIS_SPLIT_BATCH_SIZE);
              let splitSuccessCount = 0;
              for (let splitIndex = 0; splitIndex < splitBatches.length; splitIndex += 1) {
                const splitBatch = splitBatches[splitIndex];
                const splitItems = splitBatch.map((review) => ({
                  comment: review.comment || review.commentTr || "",
                  commentTr: review.commentTr,
                  ratingStar: review.ratingStar
                }));
                const splitResults = await withTimeout(analyzeBatch(client, setting, splitItems), ANALYSIS_REQUEST_TIMEOUT_MS);
                await persistBatchResults(splitBatch, splitResults);
                splitSuccessCount += splitResults.length;
              }
              localSuccessCount += splitSuccessCount;
              localLastError = undefined;
              batchSucceeded = true;
              await addRunLog(runId, "info", "Split batch analysis succeeded", {
                batchStart,
                batchEnd,
                splitBatchSize: ANALYSIS_SPLIT_BATCH_SIZE,
                successCount: splitSuccessCount
              });
            } catch (splitError) {
              localLastError = splitError instanceof Error ? splitError.message : String(splitError);
              await addRunLog(runId, "warn", "Split batch analysis failed, falling back to single reviews", {
                batchStart,
                batchEnd,
                splitBatchSize: ANALYSIS_SPLIT_BATCH_SIZE,
                error: localLastError
              });
            }
          }
        }
      }

      if (!batchSucceeded) {
        for (let cursor = 0; cursor < batch.length; cursor += ANALYSIS_SINGLE_CONCURRENCY) {
          const slice = batch.slice(cursor, cursor + ANALYSIS_SINGLE_CONCURRENCY);
          const settled = await Promise.allSettled(slice.map((review) => processOne(review)));
          for (const result of settled) {
            if (result.status === "fulfilled") {
              localSuccessCount += 1;
            } else {
              localFailedCount += 1;
              localLastError = result.reason instanceof Error ? result.reason.message : String(result.reason);
              await addRunLog(runId, "error", "Single review analysis failed", {
                batchStart,
                batchEnd,
                error: localLastError
              });
            }
          }
        }
      }

      return {
        successCount: localSuccessCount,
        failedCount: localFailedCount,
        lastError: localFailedCount > 0 ? localLastError : undefined
      };
    }

    const reviewBatches = chunkArray(pendingReviews, ANALYSIS_BATCH_SIZE);
    for (let i = 0; i < reviewBatches.length; i += ANALYSIS_BATCH_CONCURRENCY) {
      const status = await prisma.analysisRun.findUnique({ where: { id: runId }, select: { status: true } });
      if (status?.status !== "running") {
        console.log(`Run ${runId} stopped because status changed to ${status?.status}`);
        return { successCount, failedCount, cancelled: true };
      }

      const batchGroup = reviewBatches.slice(i, i + ANALYSIS_BATCH_CONCURRENCY);
      const batchResults = await Promise.all(batchGroup.map((batch, offset) => processBatch(batch, i + offset)));
      for (const result of batchResults) {
        successCount += result.successCount;
        failedCount += result.failedCount;
        lastError = result.lastError || lastError;
      }

      await updateRunProgress(runId, successCount, failedCount, lastError);
      await addRunLog(runId, failedCount > 0 ? "warn" : "info", "Analysis progress updated", {
        successCount,
        failedCount,
        totalReviews: reviews.length,
        processedBatches: Math.min(i + batchGroup.length, reviewBatches.length),
        totalBatches: reviewBatches.length,
        lastError: lastError || null
      });
      if (ANALYSIS_BATCH_PAUSE_MS > 0 && i + ANALYSIS_BATCH_CONCURRENCY < reviewBatches.length) {
        await sleep(ANALYSIS_BATCH_PAUSE_MS);
      }
    }

    await addRunLog(runId, "info", "Generating dashboard summary");
    const analyses = await prisma.reviewAnalysis.findMany({ where: { runId }, include: { review: true } });
    const dashboard = buildDashboardSnapshot(taskId, analyses);
    dashboard.aiSummary = await generateAiSummary(client, setting, dashboard);
    dashboard.productInsights = await generateProductInsights(client, setting, dashboard, analyses);

    await prisma.issueStat.deleteMany({ where: { runId } });
    await prisma.tagStat.deleteMany({ where: { runId } });

    const issueMap = new Map<string, { count: number; sampleReviewIds: string[] }>();
    const tagMap = new Map<string, number>();
    for (const analysis of analyses) {
      for (const issue of analysis.painPoints) {
        const item = issueMap.get(issue) || { count: 0, sampleReviewIds: [] };
        item.count += 1;
        if (item.sampleReviewIds.length < 3) {
          item.sampleReviewIds.push(analysis.reviewId);
        }
        issueMap.set(issue, item);
      }
      for (const tag of [...analysis.topicLabels, ...analysis.keywords]) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }

    if (issueMap.size) {
      await prisma.issueStat.createMany({
        data: [...issueMap.entries()].map(([issueName, value]) => ({
          runId,
          issueName,
          count: value.count,
          sampleReviewIds: value.sampleReviewIds
        }))
      });
    }
    if (tagMap.size) {
      await prisma.tagStat.createMany({
        data: [...tagMap.entries()].map(([tagName, count]) => ({ runId, tagName, count }))
      });
    }

    await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: failedCount > 0 ? "partial_failed" : "completed",
        successCount: analyses.length,
        failedCount,
        dashboardSnapshot: dashboard as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
        lastError
      }
    });
    await addRunLog(runId, failedCount > 0 ? "warn" : "info", "Analysis run finished", {
      status: failedCount > 0 ? "partial_failed" : "completed",
      successCount: analyses.length,
      failedCount
    });

    await prisma.task.update({ where: { id: taskId }, data: { status: "completed" } });
    return { successCount: analyses.length, failedCount };
  },
  { connection, concurrency: ANALYSIS_WORKER_CONCURRENCY }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id} failed`, error);
  if (job?.data?.runId) {
    await addRunLog(job.data.runId as string, "error", "Analysis job failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    await prisma.analysisRun.update({
      where: { id: job.data.runId as string },
      data: {
        status: "failed",
        finishedAt: new Date(),
        lastError: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function parseOptionalDate(value: unknown) {
  if (!value) {
    return null;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function readString(row: Record<string, unknown>, key: string) {
  return String(row[key] || "").trim();
}

function normalizeCrawlRow(row: Record<string, unknown>, fallback: { shopId: string; itemId: string }) {
  const cmtId = readString(row, "cmtId") || readString(row, "cmtid");
  const comment = readString(row, "comment");
  const commentTr = readString(row, "commentTr") || readString(row, "comment_tr") || null;
  const ratingStar = Number(row.ratingStar ?? row.rating_star ?? row.rating ?? 0);
  if (!cmtId || (!comment && !commentTr)) {
    return null;
  }

  return {
    cmtId,
    shopId: readString(row, "shopId") || readString(row, "shopid") || fallback.shopId,
    itemId: readString(row, "itemId") || readString(row, "itemid") || fallback.itemId,
    ratingStar: Number.isFinite(ratingStar) ? ratingStar : 0,
    comment: comment || commentTr || "",
    commentTr,
    modelName: readString(row, "modelName") || readString(row, "model_name") || null,
    hasMedia: Boolean(row.hasMedia ?? row.has_media),
    commentTime: parseOptionalDate(row.commentTime ?? row.ctime_iso),
    rawJson: row
  };
}

async function autoImportAndAnalyzeFromMonitor(
  crawlJob: NonNullable<Awaited<ReturnType<typeof prisma.crawlJob.findUnique>>> & {
    monitor?: {
      id: string;
      workspaceId: string;
      taskId: string | null;
      name: string;
      productName: string;
      sourceChannel: string;
      analysisType: string;
      autoAnalyze: boolean;
    } | null;
  },
  result: CrawlResult
) {
  const monitor = crawlJob.monitor;
  if (!monitor?.autoAnalyze) {
    return;
  }

  const fallback = {
    shopId: result.shopId || crawlJob.platform,
    itemId: result.itemId || crawlJob.normalizedUrl
  };
  const seen = new Set<string>();
  const normalizedRows = result.rows
    .map((row) => normalizeCrawlRow(row, fallback))
    .filter((row): row is NonNullable<ReturnType<typeof normalizeCrawlRow>> => Boolean(row))
    .filter((row) => {
      if (seen.has(row.cmtId)) {
        return false;
      }
      seen.add(row.cmtId);
      return true;
    });

  if (!normalizedRows.length) {
    await prisma.crawlMonitor.update({
      where: { id: monitor.id },
      data: { lastError: "本次采集没有可导入的新评论" }
    });
    return;
  }

  const existingTask = monitor.taskId
    ? await prisma.task.findFirst({ where: { id: monitor.taskId, workspaceId: monitor.workspaceId } })
    : null;
  const existingIds = existingTask
    ? new Set(
        await prisma.review
          .findMany({
            where: {
              taskId: existingTask.id,
              cmtId: { in: normalizedRows.map((row) => row.cmtId) }
            },
            select: { cmtId: true }
          })
          .then((rows) => rows.map((row) => row.cmtId))
      )
    : new Set<string>();
  const rowsToCreate = normalizedRows.filter((row) => !existingIds.has(row.cmtId));
  const skippedDuplicate = normalizedRows.length - rowsToCreate.length;

  if (!rowsToCreate.length && existingTask) {
    await prisma.crawlJob.update({
      where: { id: crawlJob.id },
      data: { status: "imported", importedRows: 0, skippedDuplicate }
    });
    await prisma.crawlMonitor.update({
      where: { id: monitor.id },
      data: { taskId: existingTask.id, lastError: null }
    });
    return;
  }

  const subscription = await prisma.subscription.findUnique({ where: { workspaceId: monitor.workspaceId } });
  if (subscription && subscription.currentPeriodReviewCount + rowsToCreate.length > subscription.monthlyReviewLimit) {
    await prisma.crawlMonitor.update({
      where: { id: monitor.id },
      data: { lastError: "评论额度不足，监听任务已暂停自动导入" }
    });
    await prisma.crawlJob.update({
      where: { id: crawlJob.id },
      data: { lastError: "评论额度不足，无法自动导入" }
    });
    return;
  }
  if (subscription && subscription.currentPeriodRunCount + 1 > subscription.monthlyRunLimit) {
    await prisma.crawlMonitor.update({
      where: { id: monitor.id },
      data: { lastError: "分析次数额度不足，监听任务已暂停自动分析" }
    });
    await prisma.crawlJob.update({
      where: { id: crawlJob.id },
      data: { lastError: "分析次数额度不足，无法自动分析" }
    });
    return;
  }

  const aiSetting = existingTask
    ? await loadAiSetting(existingTask.id)
    : await loadAiSettingForWorkspace(monitor.workspaceId, monitor.analysisType as AnalysisType);
  if (process.env.ENABLE_MOCK_AI !== "true" && !aiSetting.apiKey) {
    await prisma.crawlMonitor.update({
      where: { id: monitor.id },
      data: { lastError: "AI API Key 未配置，无法自动分析" }
    });
    return;
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    let task = existingTask;
    if (!task) {
      task = await tx.task.create({
        data: {
          workspaceId: monitor.workspaceId,
          name: monitor.name,
          productName: monitor.productName || result.productName || monitor.name,
          shopId: fallback.shopId,
          itemId: fallback.itemId,
          sourceChannel: monitor.sourceChannel,
          analysisType: monitor.analysisType,
          status: "imported"
        }
      });
    }

    const importRecord = await tx.importRecord.create({
      data: {
        taskId: task.id,
        filename: crawlJob.normalizedUrl,
        rawContent: Buffer.from(JSON.stringify(result)).toString("base64"),
        rowCount: result.rows.length,
        status: "completed"
      }
    });

    const inserted = await tx.review.createMany({
      data: rowsToCreate.map((row) => ({
        taskId: task.id,
        importId: importRecord.id,
        cmtId: row.cmtId,
        shopId: row.shopId || task!.shopId,
        itemId: row.itemId || task!.itemId,
        ratingStar: row.ratingStar,
        comment: row.comment,
        commentTr: row.commentTr,
        modelName: row.modelName,
        hasMedia: row.hasMedia,
        commentTime: row.commentTime,
        sourceChannel: monitor.sourceChannel,
        rawJson: row.rawJson as Prisma.InputJsonValue
      })),
      skipDuplicates: true
    });

    await tx.subscription.update({
      where: { workspaceId: monitor.workspaceId },
      data: {
        currentPeriodReviewCount: { increment: inserted.count },
        currentPeriodRunCount: { increment: 1 }
      }
    });

    const reviewCount = await tx.review.count({ where: { taskId: task.id } });
    const run = await tx.analysisRun.create({
      data: {
        taskId: task.id,
        provider: aiSetting.provider,
        modelName: aiSetting.modelName,
        promptVersion: aiSetting.promptVersion,
        status: "queued",
        reviewCount
      }
    });

    await tx.analysisRunLog.create({
      data: {
        runId: run.id,
        level: "info",
        message: "Analysis run queued from crawl monitor",
        meta: { crawlJobId: crawlJob.id, monitorId: monitor.id, insertedRows: inserted.count }
      }
    });

    await tx.task.update({
      where: { id: task.id },
      data: { status: "analyzing" }
    });

    await tx.crawlJob.update({
      where: { id: crawlJob.id },
      data: {
        taskId: task.id,
        status: "imported",
        importedRows: inserted.count,
        skippedDuplicate
      }
    });

    await tx.crawlMonitor.update({
      where: { id: monitor.id },
      data: {
        taskId: task.id,
        lastCrawlJobId: crawlJob.id,
        lastError: null
      }
    });

    return { run, taskId: task.id };
  });

  await analysisQueue.add("run-analysis", {
    runId: transactionResult.run.id,
    taskId: transactionResult.taskId,
    workspaceId: monitor.workspaceId
  });
}

async function scheduleDueCrawlMonitors() {
  const now = new Date();
  const dueMonitors = await prisma.crawlMonitor.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now }
    },
    orderBy: { nextRunAt: "asc" },
    take: 20
  });

  for (const monitor of dueMonitors) {
    try {
      const nextRunAt = addMinutes(now, monitor.intervalMinutes);
      const locked = await prisma.crawlMonitor.updateMany({
        where: {
          id: monitor.id,
          enabled: true,
          nextRunAt: { lte: now }
        },
        data: {
          lastRunAt: now,
          nextRunAt,
          lastError: null
        }
      });
      if (!locked.count) {
        continue;
      }

      const activeJob = await prisma.crawlJob.findFirst({
        where: {
          monitorId: monitor.id,
          status: { in: ["queued", "running"] }
        },
        select: { id: true }
      });
      if (activeJob) {
        await prisma.crawlMonitor.update({
          where: { id: monitor.id },
          data: {
            lastCrawlJobId: activeJob.id,
            nextRunAt,
            lastError: null
          }
        });
        continue;
      }

      const crawlJob = await prisma.crawlJob.create({
        data: {
          workspaceId: monitor.workspaceId,
          taskId: monitor.taskId,
          monitorId: monitor.id,
          name: monitor.name,
          productName: monitor.productName,
          sourceChannel: monitor.sourceChannel,
          analysisType: monitor.analysisType,
          productUrl: monitor.productUrl,
          normalizedUrl: monitor.normalizedUrl,
          platform: monitor.platform,
          maxReviews: monitor.maxReviews,
          crawlChannels: "browser_intercept",
          status: "queued",
          progress: 0,
          rawResult: Prisma.JsonNull
        }
      });

      await prisma.crawlMonitor.update({
        where: { id: monitor.id },
        data: { lastCrawlJobId: crawlJob.id }
      });

      await crawlQueue.add("run-crawl", {
        crawlJobId: crawlJob.id,
        workspaceId: monitor.workspaceId,
        monitorId: monitor.id
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.crawlMonitor.update({
        where: { id: monitor.id },
        data: {
          lastError: message,
          nextRunAt: addMinutes(now, Math.max(monitor.intervalMinutes, 15))
        }
      });
    }
  }
}

const crawlWorker = new Worker(
  "crawl-jobs",
  async (job) => {
    const crawlJobId = String(job.data.crawlJobId || "");
    const crawlJob = await prisma.crawlJob.findUnique({
      where: { id: crawlJobId },
      include: { monitor: true }
    });
    if (!crawlJob) {
      throw new Error(`Crawl job ${crawlJobId} not found`);
    }
    if (crawlJob.status === "completed" || crawlJob.status === "imported") {
      return { skipped: true };
    }

    const storedSetting = await getPlatformCrawlerSetting();
    const setting: ResolvedCrawlerSetting = {
      pythonBin: resolveCrawlerPythonBin(storedSetting?.pythonBin),
      proxyUrl: storedSetting?.proxyUrl || process.env.SCRAPLING_PROXY || null,
      shopeeCookie: storedSetting?.shopeeCookie || process.env.SHOPEE_COOKIE || null,
      crawlChannels:
        crawlJob.platform === "youtube" || crawlJob.platform === "tiktok-video" || crawlJob.platform === "facebook-post"
          ? ["browser_intercept"]
          : parseCrawlerChannels(crawlJob.crawlChannels || storedSetting?.crawlChannels).length
            ? parseCrawlerChannels(crawlJob.crawlChannels || storedSetting?.crawlChannels)
            : ["api_exporter", "api_basic", "browser_intercept"],
      requestTimeoutSec: storedSetting?.requestTimeoutSec || Number(process.env.SCRAPLING_TIMEOUT_SEC || 180)
    };

    await prisma.crawlJob.update({
      where: { id: crawlJob.id },
      data: { status: "running", progress: 10, startedAt: new Date(), lastError: null }
    });

    try {
      let lastReportedProgress = 10;
      const result = await runScraplingCrawler(crawlJob.normalizedUrl, crawlJob.maxReviews, setting, async ({ elapsedSec, timeoutSec }) => {
        const nextProgress = Math.min(85, 10 + Math.floor((elapsedSec / Math.max(timeoutSec, 1)) * 75));
        if (nextProgress <= lastReportedProgress) {
          return;
        }
        lastReportedProgress = nextProgress;
        await prisma.crawlJob.update({
          where: { id: crawlJob.id },
          data: { progress: nextProgress }
        });
      });
      if (!result.rows.length) {
        const message = buildEmptyCrawlError(result);
        await prisma.crawlJob.update({
          where: { id: crawlJob.id },
          data: {
            rawResult: result as unknown as Prisma.InputJsonValue,
            crawlChannel: result.crawlChannel || null,
            crawlChannelLabel: result.crawlChannelLabel || null,
            productName: crawlJob.productName || result.productName || crawlJob.name
          }
        });
        throw new Error(message);
      }
      await prisma.crawlJob.update({
        where: { id: crawlJob.id },
        data: {
          status: "completed",
          progress: 100,
          fetchedRows: result.rows.length,
          productName: crawlJob.productName || result.productName || crawlJob.name,
          crawlChannel: result.crawlChannel || null,
          crawlChannelLabel: result.crawlChannelLabel || null,
          rawResult: result as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
          lastError: null
        }
      });
      if (crawlJob.monitorId) {
        await autoImportAndAnalyzeFromMonitor(crawlJob, result).catch(async (error) => {
          const message = error instanceof Error ? error.message : String(error);
          await prisma.crawlMonitor.update({
            where: { id: crawlJob.monitorId! },
            data: { lastError: message }
          });
          await prisma.crawlJob.update({
            where: { id: crawlJob.id },
            data: { lastError: message }
          });
        });
      }
      return { fetchedRows: result.rows.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.crawlJob.update({
        where: { id: crawlJob.id },
        data: {
          status: "failed",
          progress: 100,
          lastError: message,
          finishedAt: new Date()
        }
      });
      throw error;
    }
  },
  { connection, concurrency: 1 }
);

crawlWorker.on("completed", (job) => {
  console.log(`Crawl job ${job.id} completed`);
});

crawlWorker.on("failed", (job, error) => {
  console.error(`Crawl job ${job?.id} failed`, error);
});

const crawlMonitorScanIntervalMs = Number(process.env.CRAWL_MONITOR_SCAN_INTERVAL_MS || 60000);
setTimeout(() => {
  scheduleDueCrawlMonitors().catch((error) => console.error("Crawl monitor scheduler failed", error));
}, 5000);
setInterval(() => {
  scheduleDueCrawlMonitors().catch((error) => console.error("Crawl monitor scheduler failed", error));
}, Number.isFinite(crawlMonitorScanIntervalMs) ? crawlMonitorScanIntervalMs : 60000);

console.log("Analysis and crawl workers started");
