import { prisma } from "@review-ai/db";
import type { PromptEvalDTO } from "@review-ai/shared";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { getPlatformAiSetting } from "@/lib/platform-settings";
import { getWorkspaceContext } from "@/lib/workspace";

function includesAny(value: string, tokens: string[]) {
  const lower = value.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

export async function POST(request: Request) {
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  if (!workspaceContext.user?.isSuperAdmin) {
    return fail("提示词评估由平台超管统一管理。", 403);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const setting = await getPlatformAiSetting();
  const userPromptTemplate = String(body.userPromptTemplate || setting?.userPromptTemplate || "");
  const systemPrompt = String(body.systemPrompt || setting?.systemPrompt || "");
  const summaryPrompt = String(body.summaryPrompt || setting?.summaryPrompt || "");
  const insightsPrompt = String(body.insightsPrompt || setting?.insightsPrompt || "");
  const corpus = [systemPrompt, userPromptTemplate, summaryPrompt, insightsPrompt].join("\n");
  const sampleCount = await prisma.review.count({
    where: { task: { workspaceId: workspaceContext.workspace.id } }
  });

  const checks = [
    {
      key: "json-schema",
      label: "结构化输出",
      passed: includesAny(corpus, ["json", "sentiment", "summary", "painPoints", "highlights"]),
      detail: "提示词应明确要求稳定的 JSON 字段，方便程序解析和纠错。"
    },
    {
      key: "evidence",
      label: "证据约束",
      passed: includesAny(corpus, ["证据", "原文", "引用", "evidence", "quote"]),
      detail: "分析结论最好绑定评论原文证据，减少泛泛总结。"
    },
    {
      key: "taxonomy",
      label: "分类口径",
      passed: includesAny(corpus, ["分类", "标签", "taxonomy", "topicLabels", "painPoints"]),
      detail: "标签和痛点需要稳定口径，才能做跨任务对比。"
    },
    {
      key: "role-context",
      label: "业务角色",
      passed: includesAny(systemPrompt, ["产品", "运营", "客服", "增长", "review", "customer"]),
      detail: "系统提示词应说明 AI 扮演的业务角色和决策目标。"
    },
    {
      key: "model-ready",
      label: "模型配置",
      passed: Boolean(setting?.modelName && setting?.provider),
      detail: "需要配置模型供应商和模型名称。"
    }
  ];
  const passed = checks.filter((item) => item.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const recommendations = checks
    .filter((item) => !item.passed)
    .map((item) => `补强「${item.label}」：${item.detail}`)
    .slice(0, 4);

  const dto: PromptEvalDTO = {
    generatedAt: new Date().toISOString(),
    provider: setting?.provider || "openai",
    modelName: setting?.modelName || "",
    promptVersion: setting?.promptVersion || "",
    score,
    checks,
    sampleCount,
    recommendations: recommendations.length ? recommendations : ["当前提示词结构较完整，建议每周抽样 20 条评论做人工验收。"]
  };

  await writeAuditLog(request, {
    workspaceId: workspaceContext.workspace.id,
    actor: workspaceContext.user,
    action: "prompt_eval.run",
    targetType: "prompt_eval",
    targetId: setting?.id || null,
    targetLabel: setting?.promptVersion || setting?.modelName || "prompt-eval",
    metadata: {
      provider: dto.provider,
      modelName: dto.modelName,
      promptVersion: dto.promptVersion,
      score: dto.score,
      passedChecks: passed,
      totalChecks: checks.length,
      sampleCount: dto.sampleCount,
      recommendationCount: dto.recommendations.length
    }
  });

  return ok(dto);
}
