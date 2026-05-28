import { spawn } from "node:child_process";
import path from "node:path";
import { Prisma, prisma } from "@review-ai/db";
import type { CrawlTaskResponse } from "@review-ai/shared";
import { fail, ok } from "@/lib/http";
import { assertReviewQuota, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

type CrawledReview = {
  cmtId: string;
  shopId: string;
  itemId: string;
  ratingStar: number;
  comment: string;
  commentTr: string | null;
  modelName: string | null;
  hasMedia: boolean;
  commentTime: string | null;
  rawJson: Record<string, unknown>;
};

type CrawlResult = {
  source: string;
  productUrl: string;
  productName: string;
  shopId: string;
  itemId: string;
  rows: CrawledReview[];
};

function runScraplingCrawler(productUrl: string, maxReviews: number) {
  return new Promise<CrawlResult>((resolve, reject) => {
    const pythonBin = process.env.SCRAPLING_PYTHON_BIN || "python";
    const scriptPath = path.resolve(process.cwd(), "../../apps/crawler/scrapling_reviews.py");
    const child = spawn(pythonBin, [scriptPath, "--url", productUrl, "--max-reviews", String(maxReviews)], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Scrapling crawler timed out"));
    }, 180000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Scrapling crawler exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as CrawlResult);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const roleResponse = requireWorkspaceRole(context, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }

  const body = await request.json().catch(() => ({}));
  const productUrl = String(body.productUrl || "").trim();
  const name = String(body.name || "").trim();
  const productNameFromBody = String(body.productName || "").trim();
  const sourceChannel = String(body.sourceChannel || "Shopee").trim();
  const maxReviews = Math.min(Math.max(Number(body.maxReviews || 200), 1), 1000);

  if (!productUrl) {
    return fail("请填写商品链接");
  }
  if (!name) {
    return fail("请填写任务名称");
  }

  let crawlResult: CrawlResult;
  try {
    crawlResult = await runScraplingCrawler(productUrl, maxReviews);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Scrapling 爬取失败", 502);
  }

  if (!crawlResult.rows.length) {
    return fail("没有抓取到可导入的评论", 404);
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

  const quotaResponse = await assertReviewQuota(context.workspace.id, rowsToCreate.length);
  if (quotaResponse) {
    return quotaResponse;
  }

  const first = rowsToCreate[0];
  const productName = productNameFromBody || crawlResult.productName || name;
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        workspaceId: context.workspace!.id,
        name,
        productName,
        shopId: crawlResult.shopId || first.shopId,
        itemId: crawlResult.itemId || first.itemId,
        sourceChannel,
        status: "imported"
      }
    });

    const importRecord = await tx.importRecord.create({
      data: {
        taskId: task.id,
        filename: productUrl,
        rawContent: Buffer.from(JSON.stringify(crawlResult)).toString("base64"),
        rowCount: crawlResult.rows.length,
        status: "completed"
      }
    });

    const inserted = await tx.review.createMany({
      data: rowsToCreate.map((row) => ({
        taskId: task.id,
        importId: importRecord.id,
        cmtId: row.cmtId,
        shopId: row.shopId || task.shopId,
        itemId: row.itemId || task.itemId,
        ratingStar: row.ratingStar,
        comment: row.comment || row.commentTr || "",
        commentTr: row.commentTr,
        modelName: row.modelName,
        hasMedia: row.hasMedia,
        commentTime: row.commentTime ? new Date(row.commentTime) : null,
        sourceChannel,
        rawJson: row.rawJson as Prisma.InputJsonValue
      })),
      skipDuplicates: true
    });

    await tx.subscription.update({
      where: { workspaceId: context.workspace!.id },
      data: { currentPeriodReviewCount: { increment: inserted.count } }
    });

    return {
      taskId: task.id,
      importId: importRecord.id,
      reviewCount: inserted.count,
      productUrl,
      fetchedRows: crawlResult.rows.length,
      skippedDuplicate
    } satisfies CrawlTaskResponse;
  });

  return ok(result, 201);
}
