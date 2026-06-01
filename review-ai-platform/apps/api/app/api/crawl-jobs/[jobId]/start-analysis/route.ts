import { Prisma, prisma } from "@review-ai/db";
import type { CrawlResult } from "@/lib/crawl-utils";
import { parseOptionalDate } from "@/lib/crawl-utils";
import { defaultAiSetting, resolveApiKey } from "@/lib/ai-settings";
import { fail, ok } from "@/lib/http";
import { getAnalysisQueue } from "@/lib/queue";
import { serializeRun } from "@/lib/serializers";
import { assertReviewQuota, assertRunQuota, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

function parseCrawlResult(value: Prisma.JsonValue | null): CrawlResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const rows = (value as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) {
    return null;
  }
  return value as unknown as CrawlResult;
}

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const roleResponse = requireWorkspaceRole(workspaceContext, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }
  const { workspace } = workspaceContext;
  const job = await prisma.crawlJob.findFirst({
    where: { id: jobId, workspaceId: workspace.id }
  });

  if (!job) {
    return fail("爬取任务不存在或不属于当前空间", 404);
  }
  if (!["completed", "imported"].includes(job.status)) {
    return fail("爬取任务尚未完成，不能开始分析", 400);
  }

  const crawlResult = parseCrawlResult(job.rawResult);
  if (!crawlResult?.rows.length) {
    return fail("爬取结果为空，不能开始分析", 400);
  }

  const quotaResponse = job.taskId ? null : await assertReviewQuota(workspace.id, crawlResult.rows.length);
  if (quotaResponse) {
    return quotaResponse;
  }
  const runQuotaResponse = await assertRunQuota(workspace.id);
  if (runQuotaResponse) {
    return runQuotaResponse;
  }

  const aiSetting =
    (await prisma.workspaceAiSetting.findUnique({
      where: { workspaceId: workspace.id }
    })) || defaultAiSetting();
  const body = await request.json().catch(() => ({}));
  const modelName = String(body.modelName || aiSetting.modelName);
  const promptVersion = String(body.promptVersion || aiSetting.promptVersion);

  if (
    process.env.ENABLE_MOCK_AI !== "true" &&
    !resolveApiKey(aiSetting.provider, "apiKey" in aiSetting ? aiSetting.apiKey : null)
  ) {
    return fail("AI 模型尚未配置 API Key，请先到提示词与模型设置中配置模型。", 400);
  }

  const seen = new Set<string>();
  let skippedDuplicate = 0;
  const rowsToCreate = crawlResult.rows.filter((row) => {
    if (seen.has(row.cmtId)) {
      skippedDuplicate += 1;
      return false;
    }
    seen.add(row.cmtId);
    return true;
  });

  const result = await prisma.$transaction(async (tx) => {
    let taskId = job.taskId;
    let importId: string | null = null;
    let reviewCount = 0;

    if (!taskId) {
      const first = rowsToCreate[0];
      const task = await tx.task.create({
        data: {
          workspaceId: workspace.id,
          name: job.name,
          productName: job.productName || crawlResult.productName || job.name,
          shopId: crawlResult.shopId || first.shopId,
          itemId: crawlResult.itemId || first.itemId,
          sourceChannel: job.sourceChannel,
          analysisType: job.analysisType,
          status: "imported"
        }
      });
      taskId = task.id;

      const importRecord = await tx.importRecord.create({
        data: {
          taskId,
          filename: job.normalizedUrl,
          rawContent: Buffer.from(JSON.stringify(crawlResult)).toString("base64"),
          rowCount: crawlResult.rows.length,
          status: "completed"
        }
      });
      importId = importRecord.id;

      const inserted = await tx.review.createMany({
        data: rowsToCreate.map((row) => ({
          taskId: taskId!,
          importId: importRecord.id,
          cmtId: row.cmtId,
          shopId: row.shopId || task.shopId,
          itemId: row.itemId || task.itemId,
          ratingStar: row.ratingStar,
          comment: row.comment || row.commentTr || "",
          commentTr: row.commentTr,
          modelName: row.modelName,
          hasMedia: row.hasMedia,
          commentTime: parseOptionalDate(row.commentTime),
          sourceChannel: job.sourceChannel,
          rawJson: row.rawJson as Prisma.InputJsonValue
        })),
        skipDuplicates: true
      });
      reviewCount = inserted.count;

      await tx.subscription.update({
        where: { workspaceId: workspace.id },
        data: { currentPeriodReviewCount: { increment: inserted.count } }
      });

      await tx.crawlJob.update({
        where: { id: job.id },
        data: {
          taskId,
          status: "imported",
          progress: 100,
          importedRows: inserted.count,
          skippedDuplicate
        }
      });
    } else {
      reviewCount = await tx.review.count({ where: { taskId } });
    }

    if (!reviewCount) {
      throw new Error("No reviews available for analysis");
    }

    const run = await tx.analysisRun.create({
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

    await tx.subscription.update({
      where: { workspaceId: workspace.id },
      data: { currentPeriodRunCount: { increment: 1 } }
    });

    await tx.analysisRunLog.create({
      data: {
        runId: run.id,
        level: "info",
        message: "Analysis run queued from crawl job",
        meta: { crawlJobId: job.id, provider: aiSetting.provider, modelName, reviewCount }
      }
    });

    return { taskId, importId, reviewCount, run };
  });

  await getAnalysisQueue().add("run-analysis", {
    runId: result.run.id,
    taskId: result.taskId,
    workspaceId: workspace.id
  });

  return ok(
    {
      taskId: result.taskId,
      importId: result.importId || "",
      reviewCount: result.reviewCount,
      skippedDuplicate,
      run: serializeRun(result.run)
    },
    201
  );
}
