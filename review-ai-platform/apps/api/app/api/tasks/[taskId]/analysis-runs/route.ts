import { prisma } from "@review-ai/db";
import { buildAnalysisQueueJobId, QUEUE_JOB_CLEANUP_OPTIONS } from "@review-ai/shared";
import { attachAnalysisQueuePosition, attachAnalysisQueuePositions } from "@/lib/analysis-run-queue";
import { getAnalysisQueue } from "@/lib/queue";
import { writeAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { serializeRun } from "@/lib/serializers";
import { defaultAiSetting, resolveApiKey } from "@/lib/ai-settings";
import { getPlatformAiSetting } from "@/lib/platform-settings";
import { assertRunQuota, canBypassQuota, getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const { workspace } = workspaceContext;
  const scoped = await requireScopedTask(taskId, workspace.id, workspaceContext.user?.isSuperAdmin);
  if (scoped.response) {
    return scoped.response;
  }

  const runs = await prisma.analysisRun.findMany({
    where: { taskId },
    orderBy: [{ createdAt: "desc" }, { startedAt: "desc" }],
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  const runsWithQueuePositions = await attachAnalysisQueuePositions(runs);
  return ok(runsWithQueuePositions.map(serializeRun));
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }
  const { workspace } = workspaceContext;
  const scoped = await requireScopedTask(taskId, workspace.id, workspaceContext.user?.isSuperAdmin);

  if (scoped.response || !scoped.task) {
    return scoped.response;
  }

  const activeRun = await prisma.analysisRun.findFirst({
    where: {
      taskId,
      status: { in: ["queued", "running"] }
    },
    orderBy: [{ createdAt: "desc" }, { startedAt: "desc" }],
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (activeRun) {
    if (scoped.task.status !== "analyzing") {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "analyzing" }
      });
    }
    return ok(serializeRun(await attachAnalysisQueuePosition(activeRun)));
  }

  const quotaUnlimited = canBypassQuota(workspaceContext);
  const quotaWorkspaceId = scoped.task.workspaceId || workspace.id;
  const quotaResponse = await assertRunQuota(quotaWorkspaceId, quotaUnlimited);
  if (quotaResponse) {
    return quotaResponse;
  }

  const aiSetting = (await getPlatformAiSetting()) || defaultAiSetting();
  const modelName = aiSetting.modelName;
  const promptVersion = aiSetting.promptVersion;
  const reviewCount = await prisma.review.count({ where: { taskId } });

  if (!reviewCount) {
    return fail("当前任务没有可分析的评论", 400);
  }

  if (
    process.env.ENABLE_MOCK_AI !== "true" &&
    !resolveApiKey(aiSetting.provider, "apiKey" in aiSetting ? aiSetting.apiKey : null)
  ) {
    return fail("AI 模型尚未配置 API Key，请先到提示词与模型设置中配置模型。", 400);
  }

  const run = await prisma.$transaction(async (tx) => {
    const createdRun = await tx.analysisRun.create({
      data: {
        taskId,
        provider: aiSetting.provider,
        modelName,
        promptVersion,
        status: "queued",
        reviewCount
      }
    });

    await tx.task.update({
      where: { id: taskId },
      data: { status: "analyzing" }
    });

    if (!quotaUnlimited) {
      await tx.subscription.update({
        where: { workspaceId: quotaWorkspaceId },
        data: {
          currentPeriodRunCount: {
            increment: 1
          }
        }
      });
    }

    return createdRun;
  });

  await getAnalysisQueue().add(
    "run-analysis",
    {
      runId: run.id,
      taskId,
      workspaceId: quotaWorkspaceId
    },
    {
      jobId: buildAnalysisQueueJobId(run.id),
      ...QUEUE_JOB_CLEANUP_OPTIONS
    }
  );

  await prisma.analysisRunLog.create({
    data: {
      runId: run.id,
      level: "info",
      message: "Analysis run queued",
      meta: { provider: aiSetting.provider, modelName, reviewCount }
    }
  });

  await writeAuditLog(request, {
    workspaceId: quotaWorkspaceId,
    actor: workspaceContext.user,
    action: "analysis_run.create",
    targetType: "analysis_run",
    targetId: run.id,
    targetLabel: scoped.task.name,
    metadata: {
      taskId,
      provider: aiSetting.provider,
      modelName,
      promptVersion,
      reviewCount
    }
  });

  return ok(serializeRun(await attachAnalysisQueuePosition(run)), 201);
}
