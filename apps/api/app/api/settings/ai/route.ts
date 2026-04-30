import { prisma } from "@review-ai/db";
import type { AiConfigDTO } from "@review-ai/shared";
import { DEFAULT_PROMPTS } from "@review-ai/shared";
import { fail, ok } from "@/lib/http";

const SINGLETON_ID = "singleton";

const maskKey = (key: string | null | undefined) => {
  if (!key) return null;
  if (key.length <= 8) return "*".repeat(key.length);
  return `${key.slice(0, 4)}${"*".repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`;
};

const ensureRow = async () => {
  const existing = await prisma.aiConfig.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) return existing;
  return prisma.aiConfig.create({
    data: {
      id: SINGLETON_ID,
      provider: process.env.AI_PROVIDER || "volcengine",
      apiKey: process.env.VOLC_ARK_API_KEY || process.env.OPENAI_API_KEY || null,
      baseUrl: null,
      modelName: process.env.VOLC_MODEL || process.env.OPENAI_MODEL || "doubao-seed-2-0-code-preview-260215",
      reviewPrompt: DEFAULT_PROMPTS.reviewPrompt,
      summaryPrompt: DEFAULT_PROMPTS.summaryPrompt,
      insightsPrompt: DEFAULT_PROMPTS.insightsPrompt
    }
  });
};

const serialize = (row: { provider: string; apiKey: string | null; baseUrl: string | null; modelName: string; reviewPrompt: string; summaryPrompt: string; insightsPrompt: string; updatedAt: Date }): AiConfigDTO => ({
  provider: row.provider,
  apiKey: maskKey(row.apiKey),
  apiKeySet: Boolean(row.apiKey && row.apiKey.length > 0),
  baseUrl: row.baseUrl,
  modelName: row.modelName,
  reviewPrompt: row.reviewPrompt || DEFAULT_PROMPTS.reviewPrompt,
  summaryPrompt: row.summaryPrompt || DEFAULT_PROMPTS.summaryPrompt,
  insightsPrompt: row.insightsPrompt || DEFAULT_PROMPTS.insightsPrompt,
  updatedAt: row.updatedAt.toISOString()
});

export async function GET() {
  const row = await ensureRow();
  return ok(serialize(row));
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.provider === "string") data.provider = body.provider;
  if (typeof body.baseUrl === "string" || body.baseUrl === null) data.baseUrl = body.baseUrl || null;
  if (typeof body.modelName === "string") data.modelName = body.modelName;
  if (typeof body.reviewPrompt === "string") data.reviewPrompt = body.reviewPrompt;
  if (typeof body.summaryPrompt === "string") data.summaryPrompt = body.summaryPrompt;
  if (typeof body.insightsPrompt === "string") data.insightsPrompt = body.insightsPrompt;
  // Only update apiKey if a non-empty new value was sent (not the masked one).
  if (typeof body.apiKey === "string" && body.apiKey.trim() && !body.apiKey.includes("*")) {
    data.apiKey = body.apiKey.trim();
  }

  if (!Object.keys(data).length) {
    return fail("没有要更新的字段", 400);
  }

  await ensureRow();
  const updated = await prisma.aiConfig.update({
    where: { id: SINGLETON_ID },
    data
  });
  return ok(serialize(updated));
}
