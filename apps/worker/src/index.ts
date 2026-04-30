import { Worker } from "bullmq";
import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Prisma, prisma } from "@review-ai/db";
import { buildDashboardSnapshot, type DashboardDTO, type ProductInsightsDTO } from "@review-ai/shared";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

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

const analysisSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  sentimentScore: z.number().min(0).max(1),
  topicLabels: z.array(z.enum(TOPIC_TAXONOMY)).max(6),
  keywords: z.array(z.string()).max(12),
  summary: z.string().max(200),
  painPoints: z.array(z.enum(TOPIC_TAXONOMY)).max(5),
  highlights: z.array(z.enum(TOPIC_TAXONOMY)).max(5),
  suggestion: z.string().max(160),
  needsAttention: z.boolean()
});

type AnalysisResult = z.infer<typeof analysisSchema>;

type TopicRule = {
  label: (typeof TOPIC_TAXONOMY)[number];
  keywords: string[];
  kind: "issue" | "highlight" | "mixed";
};

const TOPIC_RULES: TopicRule[] = [
  { label: "物流速度", keywords: ["delivery", "shipping", "arrive", "ส่ง", "จัดส่ง", "เร็ว", "快递", "发货", "到货"], kind: "mixed" },
  { label: "包装保护", keywords: ["package", "packaging", "boxed", "แพค", "กล่อง", "包装", "外包装", "快递盒"], kind: "mixed" },
  { label: "清洁效果", keywords: ["clean", "cleaning", "dust", "vacuum", "mop", "ทำความสะอาด", "ดูดฝุ่น", "ถูพื้น", "清洁", "打扫", "吸尘", "拖地"], kind: "mixed" },
  { label: "吸力表现", keywords: ["suction", "powerful", "แรงดูด", "吸力", "吸尘力", "强力"], kind: "mixed" },
  { label: "噪音控制", keywords: ["noise", "loud", "quiet", "เสียง", "噪音", "声音", "吵", "安静"], kind: "mixed" },
  { label: "续航表现", keywords: ["battery", "charge", "charging", "แบต", "ชาร์จ", "电池", "续航", "充电", "电量"], kind: "mixed" },
  { label: "建图导航", keywords: ["map", "lidar", "navigation", "mapped", "แผนที่", "นำทาง", "建图", "导航", "激光", "地图"], kind: "mixed" },
  { label: "APP连接", keywords: ["app", "wifi", "application", "แอป", "连接", "APP", "手机", "配对"], kind: "mixed" },
  { label: "越障爬坡", keywords: ["carpet", "stairs", "climb", "พรม", "บันได", "地毯", "越障", "台阶", "爬坡"], kind: "issue" },
  { label: "质量做工", keywords: ["quality", "material", "premium", "คุณภาพ", "วัสดุ", "质量", "做工", "材质", "品质"], kind: "mixed" },
  { label: "性价比", keywords: ["value", "worth", "price", "cheap", "คุ้ม", "ราคา", "性价比", "划算", "便宜", "值得"], kind: "highlight" },
  { label: "售后服务", keywords: ["service", "support", "repair", "after-sales", "ซ่อม", "ประกัน", "售后", "维修", "保修", "退换"], kind: "mixed" },
  { label: "客服响应", keywords: ["customer service", "chat", "reply", "客服", "แชท", "ตอบ", "回复", "响应", "处理"], kind: "mixed" }
];

const POSITIVE_HINTS = [
  "good", "great", "excellent", "fast", "worth", "recommend", "clean", "easy to use",
  "คุ้ม", "ดี", "เยี่ยม", "สะดวก",
  "好", "棒", "不错", "满意", "推荐", "喜欢", "完美", "强烈推荐"
];

const NEGATIVE_HINTS = [
  "bad", "broken", "problem", "issue", "slow", "difficult", "hard", "cannot", "can't", "failed",
  "แย่", "พัง", "ยาก", "ไม่ได้",
  "差", "坏", "问题", "故障", "难用", "失望", "退货", "不好"
];

// AI configuration is loaded from DB (AiConfig singleton row) at the start of each job.
// Falls back to env vars when DB row not yet created.
type ResolvedAiConfig = {
  provider: string;
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
  reviewPrompt: string;
  summaryPrompt: string;
  insightsPrompt: string;
};

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1" },
  volcengine: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1" },
  moonshot: { baseUrl: "https://api.moonshot.cn/v1" },
  dashscope: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  zhipu: { baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1" }
};

const ENV_FALLBACK_KEYS: Record<string, string[]> = {
  openai: ["OPENAI_API_KEY"],
  volcengine: ["VOLC_ARK_API_KEY"],
  deepseek: ["DEEPSEEK_API_KEY"],
  moonshot: ["MOONSHOT_API_KEY"],
  dashscope: ["DASHSCOPE_API_KEY"],
  zhipu: ["ZHIPU_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"]
};

async function loadAiConfig(): Promise<ResolvedAiConfig> {
  const row = await prisma.aiConfig.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const provider = row?.provider || process.env.AI_PROVIDER || "openai";
  const baseUrl =
    row?.baseUrl ||
    PROVIDER_DEFAULTS[provider]?.baseUrl ||
    null;
  // Use stored API key, otherwise fall back to env
  let apiKey = row?.apiKey || null;
  if (!apiKey) {
    const envNames = ENV_FALLBACK_KEYS[provider] || ["OPENAI_API_KEY"];
    for (const name of envNames) {
      if (process.env[name]) {
        apiKey = process.env[name] as string;
        break;
      }
    }
  }
  return {
    provider,
    apiKey,
    baseUrl,
    modelName:
      row?.modelName ||
      process.env.VOLC_MODEL ||
      process.env.OPENAI_MODEL ||
      "doubao-seed-2-0-code-preview-260215",
    reviewPrompt: row?.reviewPrompt || "",
    summaryPrompt: row?.summaryPrompt || "",
    insightsPrompt: row?.insightsPrompt || ""
  };
}

function buildAIClient(config: ResolvedAiConfig): OpenAI | null {
  if (!config.apiKey) return null;
  const init: { apiKey: string; baseURL?: string } = { apiKey: config.apiKey };
  if (config.baseUrl) init.baseURL = config.baseUrl;
  return new OpenAI(init);
}

// Substitutes {{var}} placeholders in a prompt template
function renderPrompt(template: string, vars: Record<string, string | number | undefined | null>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => {
    const v = vars[name];
    return v == null ? "" : String(v);
  });
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function scoreHits(text: string, words: string[]) {
  return words.filter((word) => text.includes(word.toLowerCase())).length;
}

function normalizeAnalysisText(comment: string, commentTr: string | null) {
  return {
    original: comment.trim(),
    translated: (commentTr || "").trim(),
    combined: `${commentTr || ""}\n${comment}`.toLowerCase()
  };
}

function inferTopics(text: string) {
  return TOPIC_RULES.filter((rule) => rule.keywords.some((keyword) => text.includes(keyword.toLowerCase())));
}

function inferKeywords(text: string, matchedTopics: TopicRule[]) {
  const englishWords = text
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => /^[a-z][a-z0-9-]{2,}$/i.test(word))
    .slice(0, 6);

  return unique([...matchedTopics.map((item) => item.label), ...englishWords]).slice(0, 10);
}

function inferSentiment(text: string, ratingStar: number) {
  const positiveHits = scoreHits(text, POSITIVE_HINTS);
  const negativeHits = scoreHits(text, NEGATIVE_HINTS);

  if (ratingStar <= 3 || negativeHits >= positiveHits + 1) {
    return { sentiment: "negative" as const, sentimentScore: ratingStar <= 2 ? 0.14 : 0.22 };
  }
  if (ratingStar === 4 || negativeHits > 0) {
    return { sentiment: "neutral" as const, sentimentScore: 0.56 };
  }
  return { sentiment: "positive" as const, sentimentScore: positiveHits >= 2 ? 0.92 : 0.84 };
}

function buildSummary(sentiment: AnalysisResult["sentiment"], topics: string[], original: string, translated: string) {
  const text = translated || original;
  const topicText = topics.length ? `，重点涉及${topics.join("、")}` : "";
  const tone =
    sentiment === "positive" ? "整体评价偏正面" : sentiment === "negative" ? "整体评价偏负面" : "整体评价偏中性";
  return `${tone}${topicText}。${text.slice(0, 56)}`;
}

function buildSuggestion(sentiment: AnalysisResult["sentiment"], painPoints: string[], highlights: string[]) {
  if (sentiment === "negative") {
    return painPoints.length
      ? `建议优先优化${painPoints.join("、")}相关体验，并补充更明确的售后或使用指引。`
      : "建议优先排查差评中的核心问题，并完善使用说明与售后响应。";
  }
  if (sentiment === "neutral") {
    return painPoints.length
      ? `建议继续优化${painPoints.join("、")}等细节，降低中性评论转差评的风险。`
      : "建议继续打磨产品细节与使用体验，提升中性评价向正向转化。";
  }
  return highlights.length
    ? `建议在商品卖点和详情页中继续突出${highlights.join("、")}等高频好评点。`
    : "建议持续放大当前高频好评点，用于详情页和营销素材。";
}

function mockAnalyze(comment: string, commentTr: string | null, ratingStar: number): AnalysisResult {
  const { original, translated, combined } = normalizeAnalysisText(comment, commentTr);
  const matchedTopics = inferTopics(combined);
  const topicLabels = unique(matchedTopics.map((item) => item.label)).slice(0, 5);
  const keywords = inferKeywords(combined, matchedTopics);
  const { sentiment, sentimentScore } = inferSentiment(combined, ratingStar);

  const issueTopics = matchedTopics
    .filter((item) => item.kind === "issue" || item.kind === "mixed")
    .map((item) => item.label);
  const highlightTopics = matchedTopics
    .filter((item) => item.kind === "highlight" || item.kind === "mixed")
    .map((item) => item.label);

  const painPoints =
    sentiment === "negative"
      ? unique(issueTopics).slice(0, 3)
      : sentiment === "neutral" && issueTopics.length
        ? unique(issueTopics).slice(0, 2)
        : [];

  const highlights =
    sentiment === "positive"
      ? unique(highlightTopics.length ? highlightTopics : topicLabels).slice(0, 3)
      : sentiment === "neutral"
        ? unique(highlightTopics).slice(0, 2)
        : [];

  return {
    sentiment,
    sentimentScore,
    topicLabels: topicLabels.length ? topicLabels : ["综合体验"],
    keywords: keywords.length ? keywords : ["电商评论"],
    summary: buildSummary(sentiment, topicLabels, original, translated),
    painPoints,
    highlights,
    suggestion: buildSuggestion(sentiment, painPoints, highlights),
    needsAttention: sentiment === "negative" || ratingStar <= 2
  };
}

const FALLBACK_REVIEW_PROMPT = `你是电商商品评论分析助手，擅长处理泰文、英文和中文混合评论。
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
comment_translated: {{comment_translated}}`;

function buildOpenAiPrompt(template: string, comment: string, commentTr: string | null, ratingStar: number) {
  const tpl = template && template.trim() ? template : FALLBACK_REVIEW_PROMPT;
  return renderPrompt(tpl, {
    taxonomy: TOPIC_TAXONOMY.join("、"),
    rating_star: ratingStar,
    comment_original: comment,
    comment_translated: commentTr || ""
  });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// Batched analysis: send multiple reviews in ONE AI call. Returns array in same order.
const batchAnalysisSchema = z.object({
  analyses: z.array(analysisSchema)
});

type BatchInput = {
  comment: string;
  commentTr: string | null;
  ratingStar: number;
};

function buildBatchPrompt(template: string, items: BatchInput[]): string {
  const taxonomy = TOPIC_TAXONOMY.join("、");
  const userTpl = template && template.trim() ? template : FALLBACK_REVIEW_PROMPT;
  // Build a list of review payloads
  const list = items
    .map((it, idx) => {
      const num = idx + 1;
      return `[评论 ${num}]\nrating_star: ${it.ratingStar}\ncomment_original: ${JSON.stringify(it.comment)}\ncomment_translated: ${JSON.stringify(it.commentTr || "")}`;
    })
    .join("\n\n");

  // Use the single-review template's instructions but apply to a batch
  // We strip the fixed rating/comment placeholders from the template since we have a list
  const cleanedTpl = userTpl
    .replace(/rating_star:\s*\{\{\s*rating_star\s*\}\}/g, "")
    .replace(/comment_original:\s*\{\{\s*comment_original\s*\}\}/g, "")
    .replace(/comment_translated:\s*\{\{\s*comment_translated\s*\}\}/g, "")
    .trim();
  const renderedTpl = renderPrompt(cleanedTpl, { taxonomy });

  return `${renderedTpl}

----
你将一次分析 ${items.length} 条评论。请严格按输入顺序输出 ${items.length} 个分析结果，结构与单条相同。
返回 JSON 对象 {"analyses": [<评论1的分析>, <评论2的分析>, ...]}。

待分析评论：
${list}`;
}

async function analyzeBatch(
  client: OpenAI,
  config: ResolvedAiConfig,
  items: BatchInput[]
): Promise<AnalysisResult[]> {
  const prompt = buildBatchPrompt(config.reviewPrompt, items);

  const response = await client.responses.parse({
    model: config.modelName,
    input: [
      {
        role: "system",
        content:
          "You are a precise multilingual ecommerce review analyst. Always follow the requested JSON schema exactly. The 'analyses' array MUST contain one entry per input review, in the same order."
      },
      { role: "user", content: prompt }
    ],
    text: {
      format: zodTextFormat(batchAnalysisSchema, "review_batch_analysis")
    }
  });

  const parsed = response.output_parsed;
  if (!parsed?.analyses) {
    throw new Error("Batch response was not parsed");
  }
  if (parsed.analyses.length !== items.length) {
    throw new Error(`Batch expected ${items.length} analyses but got ${parsed.analyses.length}`);
  }
  return parsed.analyses;
}

async function openAiAnalyze(
  client: OpenAI | null,
  config: ResolvedAiConfig,
  comment: string,
  commentTr: string | null,
  ratingStar: number
): Promise<AnalysisResult> {
  const useMock = process.env.ENABLE_MOCK_AI === "true";
  if (useMock) {
    return mockAnalyze(comment, commentTr, ratingStar);
  }

  if (!client) {
    throw new Error(`API key for provider "${config.provider}" not configured. Set it in Settings or via env var.`);
  }

  const response = await client.responses.parse({
    model: config.modelName,
    input: [
      {
        role: "system",
        content: "You are a precise multilingual ecommerce review analyst. Always follow the requested JSON schema exactly."
      },
      {
        role: "user",
        content: buildOpenAiPrompt(config.reviewPrompt, comment, commentTr, ratingStar)
      }
    ],
    text: {
      format: zodTextFormat(analysisSchema, "review_analysis")
    }
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI response was not parsed");
  }

  return response.output_parsed;
}

// Retry with exponential backoff for a single review analysis
async function analyzeWithRetry(
  client: OpenAI | null,
  config: ResolvedAiConfig,
  comment: string,
  commentTr: string | null,
  ratingStar: number,
  maxRetries = 3
): Promise<AnalysisResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await openAiAnalyze(client, config, comment, commentTr, ratingStar);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}

const FALLBACK_SUMMARY_PROMPT = `你是资深电商数据分析师，请根据以下评论分析数据，用100-150字的中文生成一段专业分析总结，包含核心洞察和具体运营建议，直接输出文字不要加标题：

评论总数：{{review_count}} 条
平均评分：{{avg_rating}} 星
NPS净推荐值：{{nps}}（推荐者{{promoters_pct}}%，批评者{{detractors_pct}}%）
情感分布：正向{{positive_pct}}%、中性{{neutral_pct}}%、负向{{negative_pct}}%
主要痛点：{{top_issues}}`;

async function generateAiSummary(
  client: OpenAI | null,
  config: ResolvedAiConfig,
  dashboard: DashboardDTO
): Promise<string | null> {
  const useMock = process.env.ENABLE_MOCK_AI === "true";
  const pos = dashboard.sentimentDistribution.find((s) => s.sentiment === "positive")?.percent || 0;
  const neu = dashboard.sentimentDistribution.find((s) => s.sentiment === "neutral")?.percent || 0;
  const neg = dashboard.sentimentDistribution.find((s) => s.sentiment === "negative")?.percent || 0;
  const topIssues = dashboard.issues.slice(0, 3).map((i) => i.issueName).join("、");
  const npsLevel = dashboard.nps >= 50 ? "优秀" : dashboard.nps >= 30 ? "良好" : dashboard.nps >= 0 ? "中性" : "较差";

  if (useMock || !client) {
    return `本批共收集 ${dashboard.reviewCount} 条评论，平均评分 ${dashboard.avgRating} 星，NPS 净推荐值为 ${dashboard.nps}（${npsLevel}）。情感分布：正向 ${pos}%、中性 ${neu}%、负向 ${neg}%。${topIssues ? `主要痛点集中在${topIssues}等方面，建议` : "建议"}团队持续关注用户反馈，优化产品体验与服务质量。`;
  }

  try {
    const promoters = dashboard.npsBreakdown.find((n) => n.label.includes("推荐"))?.percent || 0;
    const detractors = dashboard.npsBreakdown.find((n) => n.label.includes("批评"))?.percent || 0;
    const issueDetail = dashboard.issues.slice(0, 5).map((i) => `${i.issueName}(${i.count}次)`).join("、");
    const tpl = config.summaryPrompt && config.summaryPrompt.trim() ? config.summaryPrompt : FALLBACK_SUMMARY_PROMPT;
    const prompt = renderPrompt(tpl, {
      review_count: dashboard.reviewCount,
      avg_rating: dashboard.avgRating,
      nps: dashboard.nps,
      promoters_pct: promoters,
      detractors_pct: detractors,
      positive_pct: pos,
      neutral_pct: neu,
      negative_pct: neg,
      top_issues: issueDetail || "暂无明显痛点"
    });

    const response = await client.chat.completions.create({
      model: config.modelName,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7
    });
    return response.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("Failed to generate AI summary:", e);
    return null;
  }
}

type AnalysisRow = {
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  summary: string;
  painPoints: string[];
  highlights: string[];
  review: { ratingStar: number; comment: string; commentTr: string | null };
};

const FALLBACK_INSIGHTS_PROMPT = `你是资深电商产品分析师。基于以下用户评论数据，输出产品总结报告。

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
{"userPersonas":"...","usageScenarios":"...","sellingPoints":"...","advantages":"...","improvements":"...","expectations":"..."}`;

async function generateProductInsights(
  client: OpenAI | null,
  config: ResolvedAiConfig,
  dashboard: DashboardDTO,
  analyses: AnalysisRow[]
): Promise<ProductInsightsDTO | null> {
  const useMock = process.env.ENABLE_MOCK_AI === "true";
  if (useMock || !client) return null;

  // Pick representative samples
  const sortByScore = (a: AnalysisRow, b: AnalysisRow) => b.sentimentScore - a.sentimentScore;
  const positives = analyses.filter((a) => a.sentiment === "positive").sort(sortByScore).slice(0, 12);
  const negatives = analyses.filter((a) => a.sentiment === "negative").sort((a, b) => a.sentimentScore - b.sentimentScore).slice(0, 12);
  const neutrals = analyses.filter((a) => a.sentiment === "neutral").slice(0, 6);

  const formatSample = (a: AnalysisRow) => {
    const text = (a.review.commentTr || a.review.comment || "").trim().slice(0, 240);
    return `- [${a.review.ratingStar}星·${a.sentiment}] ${text}${a.summary ? `（AI摘要：${a.summary}）` : ""}`;
  };

  const topIssues = dashboard.issues.slice(0, 8).map((i) => `${i.issueName}(${i.count})`).join("、");
  const topVariants = dashboard.userProfile.variantDistribution.slice(0, 5).map((v) => `${v.variant}(${v.count})`).join("、");

  const tpl = config.insightsPrompt && config.insightsPrompt.trim() ? config.insightsPrompt : FALLBACK_INSIGHTS_PROMPT;
  const prompt = renderPrompt(tpl, {
    review_count: dashboard.reviewCount,
    avg_rating: dashboard.avgRating,
    nps: dashboard.nps,
    top_issues: topIssues || "暂无",
    top_variants: topVariants || "暂无",
    positive_samples: positives.map(formatSample).join("\n") || "(无)",
    negative_samples: negatives.map(formatSample).join("\n") || "(无)",
    neutral_samples: neutrals.map(formatSample).join("\n") || "(无)"
  });

  try {
    const response = await client.chat.completions.create({
      model: config.modelName,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3000,
      temperature: 0.6
    });
    const content = response.choices[0]?.message?.content?.trim() || "";
    const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    const required = ["userPersonas", "usageScenarios", "sellingPoints", "advantages", "improvements", "expectations"];
    for (const k of required) {
      if (typeof parsed[k] !== "string") return null;
    }
    return parsed as ProductInsightsDTO;
  } catch (e) {
    console.error("Failed to generate product insights:", e);
    return null;
  }
}

async function updateRunProgress(runId: string, successCount: number, failedCount: number, lastError?: string) {
  await prisma.analysisRun.update({
    where: { id: runId },
    data: { successCount, failedCount, ...(lastError ? { lastError } : {}) }
  });
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

const worker = new Worker(
  "analysis-runs",
  async (job) => {
    const { runId, taskId } = job.data as { runId: string; taskId: string };
    const run = await prisma.analysisRun.findUnique({ where: { id: runId } });

    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    // Incremental analysis: only process reviews that don't have a result for this run yet
    const existingAnalysedIds = await prisma.reviewAnalysis
      .findMany({ where: { runId }, select: { reviewId: true } })
      .then((rows) => new Set(rows.map((r) => r.reviewId)));

    // Load AI config from DB at the start of each job
    const aiConfig = await loadAiConfig();
    const aiClient = buildAIClient(aiConfig);
    console.log(
      `Run ${runId} using provider=${aiConfig.provider} model=${aiConfig.modelName} apiKeySet=${Boolean(aiConfig.apiKey)}`
    );

    const reviews = await prisma.review.findMany({
      where: { taskId },
      orderBy: { commentTime: "asc" }
    });

    const pendingReviews = reviews.filter((r) => !existingAnalysedIds.has(r.id));

    // Write total count upfront so frontend can show progress denominator
    await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: "running",
        startedAt: new Date(),
        reviewCount: reviews.length,
        successCount: existingAnalysedIds.size
      }
    });

    console.log(
      `Run ${runId}: total=${reviews.length} already_done=${existingAnalysedIds.size} pending=${pendingReviews.length}`
    );

    let successCount = 0;
    let failedCount = 0;
    let processedCount = 0;
    let lastError: string | undefined;
    const BATCH_SIZE = 10;          // reviews per AI call (was 1 per call × 3 parallel)
    const REQUEST_TIMEOUT_MS = 120000; // larger payload → longer timeout
    const useMock = process.env.ENABLE_MOCK_AI === "true";

    // Persist a single review's analysis result
    async function persistResult(reviewId: string, result: AnalysisResult) {
      const data = buildAnalysisData(result);
      await prisma.reviewAnalysis.upsert({
        where: { runId_reviewId: { runId, reviewId } },
        update: data,
        create: { runId, reviewId, ...data }
      });
    }

    // Process a single review (used as fallback when batch fails)
    async function processOne(review: typeof pendingReviews[number]): Promise<{ ok: boolean; error?: string }> {
      try {
        const text = review.comment || review.commentTr || "";
        const result = await withTimeout(
          analyzeWithRetry(aiClient, aiConfig, text, review.commentTr, review.ratingStar),
          REQUEST_TIMEOUT_MS
        );
        await persistResult(review.id, result);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: (e as Error)?.message || String(e) };
      }
    }

    for (let i = 0; i < pendingReviews.length; i += BATCH_SIZE) {
      // Check if the run was cancelled between batches
      const currentStatus = await prisma.analysisRun.findUnique({
        where: { id: runId },
        select: { status: true }
      });
      if (currentStatus?.status !== "running") {
        console.log(`Run ${runId} status changed to ${currentStatus?.status}, stopping early.`);
        break;
      }

      const batch = pendingReviews.slice(i, i + BATCH_SIZE);

      // Try batched AI call first (much faster). Fall back to per-review if batch fails.
      let batchSucceeded = false;
      if (!useMock && aiClient && batch.length > 1) {
        try {
          const items: BatchInput[] = batch.map((r) => ({
            comment: r.comment || r.commentTr || "",
            commentTr: r.commentTr,
            ratingStar: r.ratingStar
          }));
          const results = await withTimeout(analyzeBatch(aiClient, aiConfig, items), REQUEST_TIMEOUT_MS);
          for (let k = 0; k < batch.length; k++) {
            await persistResult(batch[k].id, results[k]);
            successCount += 1;
            processedCount += 1;
          }
          batchSucceeded = true;
          console.log(`[batch] processed ${batch.length} reviews in one call`);
        } catch (e) {
          const msg = (e as Error)?.message || String(e);
          console.warn(`[batch] failed (${msg}), falling back to per-review for ${batch.length} reviews.`);
          if (!lastError) lastError = `batch fallback: ${msg}`;
        }
      }

      if (!batchSucceeded) {
        // Fallback: process each review individually (in parallel, capped at 3)
        const PARALLEL = 3;
        for (let p = 0; p < batch.length; p += PARALLEL) {
          const slice = batch.slice(p, p + PARALLEL);
          const settled = await Promise.allSettled(slice.map((r) => processOne(r)));
          for (let k = 0; k < slice.length; k++) {
            const s = settled[k];
            if (s.status === "fulfilled" && s.value.ok) {
              successCount += 1;
            } else {
              failedCount += 1;
              const msg = s.status === "fulfilled" ? s.value.error : (s.reason as Error)?.message;
              if (!lastError) lastError = msg || "unknown error";
              console.error(`Failed review ${slice[k].id}: ${msg}`);
            }
            processedCount += 1;
          }
        }
      }

      await updateRunProgress(runId, successCount + existingAnalysedIds.size, failedCount, lastError);
      console.log(
        `Run ${runId} progress ${processedCount}/${pendingReviews.length} success=${successCount} failed=${failedCount}`
      );
      // Pace requests so anti-bot doesn't kick in
      if (i + BATCH_SIZE < pendingReviews.length) {
        await sleep(800);
      }
    }

    const analyses = await prisma.reviewAnalysis.findMany({
      where: { runId },
      include: { review: true }
    });

    const dashboard = buildDashboardSnapshot(taskId, analyses);
    dashboard.aiSummary = await generateAiSummary(aiClient, aiConfig, dashboard);
    dashboard.productInsights = await generateProductInsights(aiClient, aiConfig, dashboard, analyses);

    await prisma.issueStat.deleteMany({ where: { runId } });
    await prisma.tagStat.deleteMany({ where: { runId } });

    const issueMap = new Map<string, { count: number; sampleReviewIds: string[] }>();
    const tagMap = new Map<string, number>();

    for (const analysis of analyses) {
      for (const issue of analysis.painPoints) {
        const existing = issueMap.get(issue) || { count: 0, sampleReviewIds: [] };
        existing.count += 1;
        if (existing.sampleReviewIds.length < 3) existing.sampleReviewIds.push(analysis.reviewId);
        issueMap.set(issue, existing);
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

    const totalFailed = failedCount;
    await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: totalFailed > 0 ? "partial_failed" : "completed",
        successCount: analyses.length,
        failedCount: totalFailed,
        dashboardSnapshot: dashboard as unknown as Prisma.InputJsonValue,
        finishedAt: new Date()
      }
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "completed" }
    });

    return { successCount: analyses.length, failedCount: totalFailed };
  },
  { connection, concurrency: 2 }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id} failed`, error);
  if (job?.data?.runId) {
    await prisma.analysisRun.update({
      where: { id: job.data.runId as string },
      data: {
        status: "failed",
        finishedAt: new Date(),
        lastError: (error as Error)?.message || String(error)
      }
    });
  }
});

console.log("Analysis worker started");
