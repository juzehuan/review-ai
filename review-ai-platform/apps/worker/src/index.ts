import { Worker } from "bullmq";
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
  type DashboardDTO,
  type ProductInsightsDTO
} from "@review-ai/shared";
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
  label: (typeof TOPIC_TAXONOMY)[number];
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

function resolveEnvKey(provider: string) {
  for (const name of PROVIDER_DEFAULTS[provider]?.envKeys || ["OPENAI_API_KEY"]) {
    if (process.env[name]) {
      return process.env[name] as string;
    }
  }
  return null;
}

async function loadAiSetting(taskId: string): Promise<ResolvedAiSetting> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { workspace: { include: { aiSetting: true } } }
  });
  const setting = task?.workspace?.aiSetting || null;
  const provider = setting?.provider || process.env.AI_PROVIDER || "openai";
  return {
    provider,
    apiKey: setting?.apiKey || resolveEnvKey(provider),
    baseUrl: setting?.baseUrl || PROVIDER_DEFAULTS[provider]?.baseUrl || null,
    modelName: setting?.modelName || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    promptVersion: setting?.promptVersion || "v2-thai",
    systemPrompt: setting?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: setting?.userPromptTemplate || DEFAULT_USER_PROMPT_TEMPLATE,
    summaryPrompt: setting?.summaryPrompt || DEFAULT_SUMMARY_PROMPT,
    insightsPrompt: setting?.insightsPrompt || DEFAULT_INSIGHTS_PROMPT,
    temperature: setting?.temperature ?? 0.2
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

function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>) {
  return template
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => String(vars[name] ?? ""))
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => String(vars[name] ?? ""));
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

function mockAnalyze(comment: string, commentTr: string | null, ratingStar: number): AnalysisResult {
  const original = comment.trim();
  const translated = (commentTr || "").trim();
  const combined = `${translated}\n${original}`.toLowerCase();
  const matchedTopics = inferTopics(combined);
  const topicLabels = unique(matchedTopics.map((item) => item.label)).slice(0, 5);
  const keywords = inferKeywords(combined, matchedTopics);
  const { sentiment, sentimentScore } = inferSentiment(combined, ratingStar);
  const issueTopics = matchedTopics.filter((item) => item.kind !== "highlight").map((item) => item.label);
  const highlightTopics = matchedTopics.filter((item) => item.kind !== "issue").map((item) => item.label);
  const painPoints = sentiment === "negative" ? unique(issueTopics).slice(0, 3) : sentiment === "neutral" ? unique(issueTopics).slice(0, 2) : [];
  const highlights = sentiment === "positive" ? unique(highlightTopics.length ? highlightTopics : topicLabels).slice(0, 3) : sentiment === "neutral" ? unique(highlightTopics).slice(0, 2) : [];
  const tone = sentiment === "positive" ? "整体评价偏正面" : sentiment === "negative" ? "整体评价偏负面" : "整体评价偏中性";
  return {
    sentiment,
    sentimentScore,
    topicLabels: topicLabels.length ? topicLabels : ["综合体验"],
    keywords: keywords.length ? keywords : ["电商评论"],
    summary: `${tone}${topicLabels.length ? `，重点涉及${topicLabels.join("、")}` : ""}。${(translated || original).slice(0, 56)}`,
    painPoints,
    highlights,
    suggestion: sentiment === "negative" ? "建议优先排查差评中的核心问题，并完善售后响应。" : "建议持续放大高频好评点，用于详情页和营销素材。",
    needsAttention: sentiment === "negative" || ratingStar <= 2
  };
}

function buildSinglePrompt(setting: ResolvedAiSetting, item: BatchInput) {
  return renderTemplate(setting.userPromptTemplate, {
    taxonomy: TOPIC_TAXONOMY.join("、"),
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
    taxonomy: TOPIC_TAXONOMY.join("、"),
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
    return mockAnalyze(item.comment, item.commentTr, item.ratingStar);
  }
  if (!client) {
    throw new Error(`API key for provider "${setting.provider}" is not configured`);
  }
  const response = await client.responses.parse({
    model: setting.modelName,
    temperature: setting.temperature,
    input: [
      { role: "system", content: setting.systemPrompt },
      { role: "user", content: buildSinglePrompt(setting, item) }
    ],
    text: { format: zodTextFormat(analysisSchema, "review_analysis") }
  });
  if (!response.output_parsed) {
    throw new Error("OpenAI response was not parsed");
  }
  return response.output_parsed;
}

async function analyzeBatch(client: OpenAI, setting: ResolvedAiSetting, items: BatchInput[]) {
  const response = await client.responses.parse({
    model: setting.modelName,
    temperature: setting.temperature,
    input: [
      {
        role: "system",
        content: `${setting.systemPrompt}\nThe analyses array must contain exactly one entry per input review, in the same order.`
      },
      { role: "user", content: buildBatchPrompt(setting, items) }
    ],
    text: { format: zodTextFormat(batchAnalysisSchema, "review_batch_analysis") }
  });
  const parsed = response.output_parsed;
  if (!parsed || parsed.analyses.length !== items.length) {
    throw new Error(`Batch expected ${items.length} analyses but got ${parsed?.analyses.length || 0}`);
  }
  return parsed.analyses;
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

    const setting = await loadAiSetting(taskId);
    const client = buildClient(setting);
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

    let successCount = existingReviewIds.size;
    let failedCount = 0;
    let lastError: string | undefined;
    const batchSize = 10;
    const requestTimeoutMs = 120000;
    const useMock = process.env.ENABLE_MOCK_AI === "true";

    async function persistResult(reviewId: string, result: AnalysisResult) {
      const data = buildAnalysisData(result);
      await prisma.reviewAnalysis.upsert({
        where: { runId_reviewId: { runId, reviewId } },
        update: data,
        create: { runId, reviewId, ...data }
      });
    }

    async function processOne(review: (typeof pendingReviews)[number]) {
      const item = {
        comment: review.comment || review.commentTr || "",
        commentTr: review.commentTr,
        ratingStar: review.ratingStar
      };
      const result = await withTimeout(analyzeWithRetry(client, setting, item), requestTimeoutMs);
      await persistResult(review.id, result);
    }

    for (let i = 0; i < pendingReviews.length; i += batchSize) {
      const status = await prisma.analysisRun.findUnique({ where: { id: runId }, select: { status: true } });
      if (status?.status !== "running") {
        console.log(`Run ${runId} stopped because status changed to ${status?.status}`);
        return { successCount, failedCount, cancelled: true };
      }

      const batch = pendingReviews.slice(i, i + batchSize);
      let batchSucceeded = false;

      if (!useMock && client && batch.length > 1) {
        try {
          const items = batch.map((review) => ({
            comment: review.comment || review.commentTr || "",
            commentTr: review.commentTr,
            ratingStar: review.ratingStar
          }));
          const results = await withTimeout(analyzeBatch(client, setting, items), requestTimeoutMs);
          for (let index = 0; index < batch.length; index += 1) {
            await persistResult(batch[index].id, results[index]);
            successCount += 1;
          }
          batchSucceeded = true;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          console.warn(`Batch analysis failed, fallback to single review: ${lastError}`);
        }
      }

      if (!batchSucceeded) {
        const parallel = 3;
        for (let cursor = 0; cursor < batch.length; cursor += parallel) {
          const slice = batch.slice(cursor, cursor + parallel);
          const settled = await Promise.allSettled(slice.map((review) => processOne(review)));
          for (const result of settled) {
            if (result.status === "fulfilled") {
              successCount += 1;
            } else {
              failedCount += 1;
              lastError = result.reason instanceof Error ? result.reason.message : String(result.reason);
            }
          }
        }
      }

      await updateRunProgress(runId, successCount, failedCount, lastError);
      if (i + batchSize < pendingReviews.length) {
        await sleep(800);
      }
    }

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

    await prisma.task.update({ where: { id: taskId }, data: { status: "completed" } });
    return { successCount: analyses.length, failedCount };
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
        lastError: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

console.log("Analysis worker started");
