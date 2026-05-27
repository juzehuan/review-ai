import type { WorkspaceAiSetting } from "@review-ai/db";
import type { WorkspaceAiSettingDTO } from "@review-ai/shared";
import {
  AI_PROVIDER_PRESETS,
  DEFAULT_INSIGHTS_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE
} from "@review-ai/shared";

const ENV_FALLBACK_KEYS: Record<string, string[]> = {
  openai: ["OPENAI_API_KEY"],
  volcengine: ["VOLC_ARK_API_KEY"],
  deepseek: ["DEEPSEEK_API_KEY"],
  moonshot: ["MOONSHOT_API_KEY"],
  dashscope: ["DASHSCOPE_API_KEY"],
  zhipu: ["ZHIPU_API_KEY"]
};

export function maskApiKey(key: string | null | undefined) {
  if (!key) {
    return null;
  }
  if (key.length <= 8) {
    return "*".repeat(key.length);
  }
  return `${key.slice(0, 4)}${"*".repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`;
}

export function providerBaseUrl(provider: string) {
  return AI_PROVIDER_PRESETS.find((item) => item.id === provider)?.baseUrl || null;
}

export function resolveApiKey(provider: string, storedKey?: string | null) {
  if (storedKey) {
    return storedKey;
  }
  for (const name of ENV_FALLBACK_KEYS[provider] || ["OPENAI_API_KEY"]) {
    if (process.env[name]) {
      return process.env[name] as string;
    }
  }
  return null;
}

export function defaultAiSetting(): WorkspaceAiSettingDTO {
  const provider = process.env.AI_PROVIDER || "openai";
  const apiKey = resolveApiKey(provider);
  return {
    provider,
    apiKey: maskApiKey(apiKey),
    apiKeySet: Boolean(apiKey),
    baseUrl: providerBaseUrl(provider),
    modelName: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    promptVersion: "v2-thai",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
    summaryPrompt: DEFAULT_SUMMARY_PROMPT,
    insightsPrompt: DEFAULT_INSIGHTS_PROMPT,
    temperature: 0.2,
    updatedAt: null
  };
}

export function serializeAiSetting(setting: WorkspaceAiSetting | null): WorkspaceAiSettingDTO {
  if (!setting) {
    return defaultAiSetting();
  }

  return {
    provider: setting.provider,
    apiKey: maskApiKey(resolveApiKey(setting.provider, setting.apiKey)),
    apiKeySet: Boolean(resolveApiKey(setting.provider, setting.apiKey)),
    baseUrl: setting.baseUrl || providerBaseUrl(setting.provider),
    modelName: setting.modelName,
    promptVersion: setting.promptVersion,
    systemPrompt: setting.systemPrompt,
    userPromptTemplate: setting.userPromptTemplate,
    summaryPrompt: setting.summaryPrompt || DEFAULT_SUMMARY_PROMPT,
    insightsPrompt: setting.insightsPrompt || DEFAULT_INSIGHTS_PROMPT,
    temperature: setting.temperature,
    updatedAt: setting.updatedAt.toISOString()
  };
}
