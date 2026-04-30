import { Prisma, prisma } from "@review-ai/db";
import type { ImportTaskResponse } from "@review-ai/shared";
import { parseShopeeCsv } from "@/lib/csv";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const productName = String(formData.get("productName") || "").trim();
  const sourceChannel = String(formData.get("sourceChannel") || "Shopee").trim();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return fail("请上传 CSV 文件");
  }

  if (!name || !productName) {
    return fail("任务名称和商品名称不能为空");
  }

  const rawContent = await file.text();
  const parsedRows = parseShopeeCsv(rawContent);

  if (!parsedRows.length) {
    return fail("CSV 没有可导入的数据");
  }

  const first = parsedRows[0];

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        name,
        productName,
        shopId: first.shopId,
        itemId: first.itemId,
        sourceChannel,
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

    return {
      taskId: task.id,
      importId: importRecord.id,
      reviewCount: createManyData.length
    } satisfies ImportTaskResponse;
  });

  return ok(result, 201);
}
