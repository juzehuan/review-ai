import { Prisma, prisma } from "@review-ai/db";
import { parseShopeeCsv } from "@/lib/csv";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return fail("任务不存在", 404);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return fail("请上传 CSV 文件");
  }

  const rawContent = await file.text();
  const { rows: parsedRows, stats } = parseShopeeCsv(rawContent);

  if (!parsedRows.length) {
    return fail("CSV 没有可导入的数据");
  }

  // Find existing cmtIds for this task to skip duplicates
  const existingCmtIds = await prisma.review
    .findMany({ where: { taskId }, select: { cmtId: true } })
    .then((rows) => new Set(rows.map((r) => r.cmtId)));

  const importRecord = await prisma.importRecord.create({
    data: {
      taskId,
      filename: file.name,
      rawContent,
      rowCount: parsedRows.length,
      status: "completed"
    }
  });

  const seen = new Set<string>();
  let droppedExisting = 0;
  let droppedDuplicate = 0;
  const newRows = parsedRows
    .filter((row) => {
      if (existingCmtIds.has(row.cmtId)) {
        droppedExisting += 1;
        return false;
      }
      if (seen.has(row.cmtId)) {
        droppedDuplicate += 1;
        return false;
      }
      seen.add(row.cmtId);
      return true;
    })
    .map((row) => ({
      taskId,
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
      sourceChannel: task.sourceChannel,
      rawJson: row.rawJson as Prisma.InputJsonValue
    }));

  const inserted = await prisma.review.createMany({ data: newRows, skipDuplicates: true });

  return ok(
    {
      taskId,
      importId: importRecord.id,
      totalRows: parsedRows.length,
      newRows: inserted.count,
      skippedRows: parsedRows.length - inserted.count,
      csvTotal: stats.totalParsed,
      droppedEmpty: stats.droppedEmpty,
      droppedExisting,
      droppedDuplicate,
      droppedByDb: newRows.length - inserted.count
    },
    201
  );
}
