import { Prisma, prisma } from "@review-ai/db";
import type { AppendImportResponse } from "@review-ai/shared";
import { parseReviewFile } from "@/lib/csv";
import { fail, ok } from "@/lib/http";
import { assertReviewQuota, canBypassQuota, getWorkspaceContext, requireScopedTask, requireWorkspaceRole } from "@/lib/workspace";

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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("请上传 CSV、XLS 或 XLSX 文件");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  let parsedRows;
  try {
    parsedRows = parseReviewFile(file.name, fileBuffer, { sourceChannel: scoped.task.sourceChannel });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "文件解析失败");
  }

  if (!parsedRows.length) {
    return fail("文件没有可导入的评论数据");
  }

  const existingCmtIds = await prisma.review
    .findMany({ where: { taskId }, select: { cmtId: true } })
    .then((rows) => new Set(rows.map((row) => row.cmtId)));

  const seen = new Set<string>();
  let droppedExisting = 0;
  let droppedDuplicate = 0;
  const rowsToCreate = parsedRows
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
      cmtId: row.cmtId,
      shopId: row.shopId || scoped.task!.shopId,
      itemId: row.itemId || scoped.task!.itemId,
      ratingStar: row.ratingStar,
      comment: row.comment || row.commentTr || "",
      commentTr: row.commentTr,
      modelName: row.modelName,
      hasMedia: row.hasMedia,
      commentTime: row.commentTime,
      sourceChannel: scoped.task!.sourceChannel,
      rawJson: row.rawJson as Prisma.InputJsonValue
    }));

  const quotaUnlimited = canBypassQuota(workspaceContext);
  const quotaWorkspaceId = scoped.task.workspaceId || workspace.id;
  const quotaResponse = await assertReviewQuota(quotaWorkspaceId, rowsToCreate.length, quotaUnlimited);
  if (quotaResponse) {
    return quotaResponse;
  }

  const result = await prisma.$transaction(async (tx) => {
    const importRecord = await tx.importRecord.create({
      data: {
        taskId,
        filename: file.name,
        rawContent: fileBuffer.toString("base64"),
        rowCount: parsedRows.length,
        status: "completed"
      }
    });

    const inserted = rowsToCreate.length
      ? await tx.review.createMany({
          data: rowsToCreate.map((row) => ({ ...row, importId: importRecord.id })),
          skipDuplicates: true
        })
      : { count: 0 };

    if (inserted.count > 0) {
      if (!quotaUnlimited) {
        await tx.subscription.update({
          where: { workspaceId: quotaWorkspaceId },
          data: { currentPeriodReviewCount: { increment: inserted.count } }
        });
      }
      await tx.task.update({
        where: { id: taskId },
        data: { status: "imported" }
      });
    }

    return {
      taskId,
      importId: importRecord.id,
      totalRows: parsedRows.length,
      newRows: inserted.count,
      skippedRows: parsedRows.length - inserted.count,
      droppedExisting,
      droppedDuplicate,
      droppedByDb: rowsToCreate.length - inserted.count
    } satisfies AppendImportResponse;
  });

  return ok(result, 201);
}
