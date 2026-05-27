import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { defaultAiSetting, serializeAiSetting } from "@/lib/ai-settings";
import { getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const setting = await prisma.workspaceAiSetting.findUnique({
    where: { workspaceId: context.workspace.id }
  });

  return ok(serializeAiSetting(setting));
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const roleResponse = requireWorkspaceRole(context, ["owner", "admin"]);
  if (roleResponse) {
    return roleResponse;
  }

  const body = await request.json().catch(() => ({}));
  const defaults = defaultAiSetting();
  const provider = String(body.provider || defaults.provider).trim() || defaults.provider;
  const baseUrl =
    typeof body.baseUrl === "string" ? body.baseUrl.trim() || null : body.baseUrl === null ? null : defaults.baseUrl;
  const modelName = String(body.modelName || defaults.modelName).trim();
  const promptVersion = String(body.promptVersion || defaults.promptVersion).trim();
  const systemPrompt = String(body.systemPrompt || defaults.systemPrompt).trim();
  const userPromptTemplate = String(body.userPromptTemplate || defaults.userPromptTemplate).trim();
  const summaryPrompt = String(body.summaryPrompt || defaults.summaryPrompt).trim();
  const insightsPrompt = String(body.insightsPrompt || defaults.insightsPrompt).trim();
  const temperature = Number(body.temperature ?? defaults.temperature);
  const apiKey =
    typeof body.apiKey === "string" && body.apiKey.trim() && !body.apiKey.includes("*")
      ? body.apiKey.trim()
      : undefined;

  if (!modelName || !promptVersion || !systemPrompt || !userPromptTemplate) {
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
      temperature
    }
  });

  return ok(serializeAiSetting(setting));
}
