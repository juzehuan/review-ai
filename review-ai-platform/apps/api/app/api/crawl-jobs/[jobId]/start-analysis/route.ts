import { Prisma, prisma } from "@review-ai/db";
import type { CrawlResult } from "@/lib/crawl-utils";
import { parseOptionalDate } from "@/lib/crawl-utils";
import { defaultAiSetting, resolveApiKey } from "@/lib/ai-settings";
import { fail, ok } from "@/lib/http";
import { getPlatformAiSetting } from "@/lib/platform-settings";
import { getAnalysisQueue } from "@/lib/queue";
import { serializeRun } from "@/lib/serializers";
import { assertReviewQuota, assertRunQuota, canAccessAllWorkspaces, canBypassQuota, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

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

function readString(row: Record<string, unknown>, key: string) {
  return String(row[key] || "").trim();
}

function readBoolean(row: Record<string, unknown>, key: string, fallbackKey: string) {
  const value = row[key] ?? row[fallbackKey];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["1", "true", "yes"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
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
    hasMedia: readBoolean(row, "hasMedia", "has_media"),
    commentTime: parseOptionalDate(readString(row, "commentTime") || readString(row, "ctime_iso")),
    rawJson: row
  };
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
  const allowGlobalAccess = canAccessAllWorkspaces(workspaceContext);
  const quotaUnlimited = canBypassQuota(workspaceContext);
  const job = await prisma.crawlJob.findFirst({
    where: allowGlobalAccess ? { id: jobId } : { id: jobId, workspaceId: workspace.id }
  });

  if (!job) {
    return fail("爬取任务不存在或不属于当前空间", 404);
  }
  if (!["completed", "imported"].includes(job.status)) {
    return fail("爬取任务尚未完成，不能开始分析", 400);
  }

  const crawlResult = parseCrawlResult(job.rawResult);
  if (!crawlResult || !crawlResult.rows.length) {
    return fail("爬取结果为空，不能开始分析", 400);
  }

  const fallback = {
    shopId: crawlResult.shopId || job.platform,
    itemId: crawlResult.itemId || job.normalizedUrl
  };
  const seen = new Set<string>();
  let skippedDuplicate = 0;
  const rowsToCreate = crawlResult.rows
    .map((row) => normalizeCrawlRow(row as unknown as Record<string, unknown>, fallback))
    .filter((row): row is NonNullable<ReturnType<typeof normalizeCrawlRow>> => Boolean(row))
    .filter((row) => {
      if (seen.has(row.cmtId)) {
        skippedDuplicate += 1;
        return false;
      }
      seen.add(row.cmtId);
      return true;
    });

  if (!rowsToCreate.length && !job.taskId) {
    return fail("爬取结果里没有可导入的评论，不能开始分析", 400);
  }

  const quotaWorkspaceId = job.workspaceId;
  const quotaResponse = job.taskId ? null : await assertReviewQuota(quotaWorkspaceId, rowsToCreate.length, quotaUnlimited);
  if (quotaResponse) {
    return quotaResponse;
  }
  const runQuotaResponse = await assertRunQuota(quotaWorkspaceId, quotaUnlimited);
  if (runQuotaResponse) {
    return runQuotaResponse;
  }

  const aiSetting = (await getPlatformAiSetting()) || defaultAiSetting();
  const modelName = aiSetting.modelName;
  const promptVersion = aiSetting.promptVersion;

  if (
    process.env.ENABLE_MOCK_AI !== "true" &&
    !resolveApiKey(aiSetting.provider, "apiKey" in aiSetting ? aiSetting.apiKey : null)
  ) {
    return fail("AI 模型尚未配置 API Key，请先到提示词与模型设置中配置模型。", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    let taskId = job.taskId;
    let importId: string | null = null;
    let reviewCount = 0;

    if (!taskId) {
      const first = rowsToCreate[0];
      const task = await tx.task.create({
        data: {
          workspaceId: quotaWorkspaceId,
          name: job.name,
          productName: job.productName || crawlResult.productName || job.name,
          shopId: crawlResult.shopId || first.shopId || fallback.shopId,
          itemId: crawlResult.itemId || first.itemId || fallback.itemId,
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
          comment: row.comment,
          commentTr: row.commentTr,
          modelName: row.modelName,
          hasMedia: row.hasMedia,
          commentTime: row.commentTime,
          sourceChannel: job.sourceChannel,
          rawJson: row.rawJson as Prisma.InputJsonValue
        })),
        skipDuplicates: true
      });
      reviewCount = inserted.count;

      if (!quotaUnlimited) {
        await tx.subscription.update({
          where: { workspaceId: quotaWorkspaceId },
          data: { currentPeriodReviewCount: { increment: inserted.count } }
        });
      }

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

    if (!quotaUnlimited) {
      await tx.subscription.update({
        where: { workspaceId: quotaWorkspaceId },
        data: { currentPeriodRunCount: { increment: 1 } }
      });
    }

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
    workspaceId: quotaWorkspaceId
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
