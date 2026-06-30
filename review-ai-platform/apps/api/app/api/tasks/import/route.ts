import { Prisma, prisma } from "@review-ai/db";
import type { ImportTaskResponse } from "@review-ai/shared";
import { inferAnalysisType } from "@review-ai/shared";
import { parseReviewFile } from "@/lib/csv";
import { fail, ok } from "@/lib/http";
import { assertReviewQuota, canBypassQuota, getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function POST(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }
  const roleResponse = requireWorkspaceRole(context, ["owner", "admin", "analyst"]);
  if (roleResponse) {
    return roleResponse;
  }
  const { workspace } = context;
  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const productName = String(formData.get("productName") || "").trim();
  const sourceChannel = String(formData.get("sourceChannel") || "Shopee").trim();
  const rawAnalysisType = String(formData.get("analysisType") || "").trim();
  const analysisType = ["product", "video", "tweet"].includes(rawAnalysisType)
    ? rawAnalysisType
    : inferAnalysisType(sourceChannel);
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return fail("请上传 CSV、XLS 或 XLSX 文件");
  }

  if (!name || !productName) {
    return fail("任务名称和商品名称不能为空");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const rawContent = fileBuffer.toString("base64");
  let parsedRows;
  try {
    parsedRows = parseReviewFile(file.name, fileBuffer, { sourceChannel });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "文件解析失败");
  }

  if (!parsedRows.length) {
    return fail("CSV 没有可导入的数据");
  }

  const quotaUnlimited = canBypassQuota(context);
  const quotaResponse = await assertReviewQuota(workspace.id, parsedRows.length, quotaUnlimited);
  if (quotaResponse) {
    return quotaResponse;
  }

  const first = parsedRows[0];

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        workspaceId: workspace.id,
        name,
        productName,
        shopId: first.shopId,
        itemId: first.itemId,
        sourceChannel,
        analysisType,
        status: "imported"
      }
    });

    const importRecord = await tx.importRecord.create({
      data: {
        taskId: task.id,
        filename: file.name,
        rawContent,
        rowCount: parsedRows.length,
        status: "completed"
      }
    });

    const existing = new Set<string>();
    const createManyData = parsedRows
      .filter((row) => {
        if (existing.has(row.cmtId)) {
          return false;
        }
        existing.add(row.cmtId);
        return true;
      })
      .map((row) => ({
        taskId: task.id,
        importId: importRecord.id,
        cmtId: row.cmtId,
        shopId: row.shopId,
        itemId: row.itemId,
        ratingStar: row.ratingStar,
        comment: row.comment || row.commentTr || "",
        commentTr: row.commentTr,
        modelName: row.modelName,
        hasMedia: row.hasMedia,
        commentTime: row.commentTime,
        sourceChannel,
        rawJson: row.rawJson as Prisma.InputJsonValue
      }));

    await tx.review.createMany({
      data: createManyData,
      skipDuplicates: true
    });

    if (!quotaUnlimited) {
      await tx.subscription.update({
        where: { workspaceId: workspace.id },
        data: {
          currentPeriodReviewCount: {
            increment: createManyData.length
          }
        }
      });
    }

    return {
      taskId: task.id,
      importId: importRecord.id,
      reviewCount: createManyData.length
    } satisfies ImportTaskResponse;
  });

  return ok(result, 201);
}
