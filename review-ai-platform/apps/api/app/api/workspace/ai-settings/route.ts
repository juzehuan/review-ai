import { prisma } from "@review-ai/db";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { defaultAiSetting, normalizeProviderBaseUrl, serializeAiSetting } from "@/lib/ai-settings";
import { getPlatformAiSetting } from "@/lib/platform-settings";
import { getWorkspaceContext } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  if (!context.user?.isSuperAdmin) {
    return fail("模型配置由平台超管统一管理。", 403);
  }

  return ok(serializeAiSetting(await getPlatformAiSetting()));
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  if (!context.user?.isSuperAdmin) {
    return fail("模型配置由平台超管统一管理。", 403);
  }

  const body = await request.json().catch(() => ({}));
  const defaults = defaultAiSetting();
  const provider = String(body.provider || defaults.provider).trim() || defaults.provider;
  const requestedBaseUrl =
    typeof body.baseUrl === "string" ? body.baseUrl.trim() || null : body.baseUrl === null ? null : defaults.baseUrl;
  const baseUrl = normalizeProviderBaseUrl(provider, requestedBaseUrl);
  const modelName = String(body.modelName || defaults.modelName).trim();
  const promptVersion = String(body.promptVersion || defaults.promptVersion).trim();
  const systemPrompt = String(body.systemPrompt || defaults.systemPrompt).trim();
  const userPromptTemplate = String(body.userPromptTemplate || defaults.userPromptTemplate).trim();
  const summaryPrompt = String(body.summaryPrompt || defaults.summaryPrompt).trim();
  const insightsPrompt = String(body.insightsPrompt || defaults.insightsPrompt).trim();
  const videoUserPromptTemplate = String(body.videoUserPromptTemplate || defaults.videoUserPromptTemplate).trim();
  const videoSummaryPrompt = String(body.videoSummaryPrompt || defaults.videoSummaryPrompt).trim();
  const videoInsightsPrompt = String(body.videoInsightsPrompt || defaults.videoInsightsPrompt).trim();
  const tweetUserPromptTemplate = String(body.tweetUserPromptTemplate || defaults.tweetUserPromptTemplate).trim();
  const tweetSummaryPrompt = String(body.tweetSummaryPrompt || defaults.tweetSummaryPrompt).trim();
  const tweetInsightsPrompt = String(body.tweetInsightsPrompt || defaults.tweetInsightsPrompt).trim();
  const temperature = Number(body.temperature ?? defaults.temperature);
  const apiKey =
    typeof body.apiKey === "string" && body.apiKey.trim() && !body.apiKey.includes("*")
      ? body.apiKey.trim()
      : undefined;

  if (
    !modelName ||
    !promptVersion ||
    !systemPrompt ||
    !userPromptTemplate ||
    !videoUserPromptTemplate ||
    !tweetUserPromptTemplate
  ) {
    return fail("模型名称、提示词版本和提示词内容不能为空");
  }

  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    return fail("temperature 需要在 0 到 2 之间");
  }

  const setting = await prisma.workspaceAiSetting.upsert({
    where: { workspaceId: context.workspace.id },
    update: {
      provider,
      ...(apiKey !== undefined ? { apiKey } : {}),
      baseUrl,
      modelName,
      promptVersion,
      systemPrompt,
      userPromptTemplate,
      summaryPrompt,
      insightsPrompt,
      videoUserPromptTemplate,
      videoSummaryPrompt,
      videoInsightsPrompt,
      tweetUserPromptTemplate,
      tweetSummaryPrompt,
      tweetInsightsPrompt,
      temperature
    },
    create: {
      workspaceId: context.workspace.id,
      provider,
      apiKey,
      baseUrl,
      modelName,
      promptVersion,
      systemPrompt,
      userPromptTemplate,
      summaryPrompt,
      insightsPrompt,
      videoUserPromptTemplate,
      videoSummaryPrompt,
      videoInsightsPrompt,
      tweetUserPromptTemplate,
      tweetSummaryPrompt,
      tweetInsightsPrompt,
      temperature
    }
  });
  await writeAuditLog(request, {
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "settings.ai.update",
    targetType: "workspace_ai_setting",
    targetId: setting.id,
    targetLabel: context.workspace.name,
    metadata: {
      provider,
      baseUrl,
      modelName,
      promptVersion,
      apiKeyUpdated: apiKey !== undefined,
      temperature
    }
  });

  return ok(serializeAiSetting(setting));
}
