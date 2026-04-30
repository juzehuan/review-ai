import { prisma } from "@review-ai/db";
import { serializeReviewRow } from "@/lib/serializers";
import { fail } from "@/lib/http";

function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(values: unknown[]): string {
  return values.map(escapeCsv).join(",");
}

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const { searchParams } = new URL(request.url);
  const sentiment = searchParams.get("sentiment") || undefined;
  const ratingStar = Number(searchParams.get("ratingStar") || 0) || undefined;
  const keyword = searchParams.get("keyword") || undefined;
  const hasMedia = searchParams.get("hasMedia");
  const needsAttention = searchParams.get("needsAttention");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return fail("任务不存在", 404);
  }

  const run = await prisma.analysisRun.findFirst({
    where: { taskId, status: { in: ["completed", "partial_failed"] } },
    orderBy: { startedAt: "desc" }
  });

  const needsAttentionFilter =
    needsAttention === "true" && run
      ? { analyses: { some: { runId: run.id, needsAttention: true } } }
      : {};

  const keywordFilter = keyword
    ? {
        OR: [
          { comment: { contains: keyword, mode: "insensitive" as const } },
          { commentTr: { contains: keyword, mode: "insensitive" as const } }
        ]
      }
    : {};

  const where = {
    taskId,
    ...(ratingStar ? { ratingStar } : {}),
    ...(hasMedia !== null && hasMedia !== "" ? { hasMedia: hasMedia === "true" } : {}),
    ...keywordFilter,
    ...needsAttentionFilter
  };

  const reviews = await prisma.review.findMany({
    where,
    include: {
      task: true,
      ...(run
        ? {
            analyses: {
              where: sentiment ? { runId: run.id, sentiment: sentiment as never } : { runId: run.id },
              take: 1
            }
          }
        : {})
    },
    orderBy: { commentTime: "desc" }
  });

  const rows = reviews
    .map(serializeReviewRow)
    .filter((row) => !sentiment || row.sentiment === sentiment);

  const header = toRow([
    "评论ID",
    "商品名称",
    "规格",
    "评分",
    "评论时间",
    "反馈渠道",
    "是否有媒体",
    "原始评论",
    "翻译评论",
    "AI情感",
    "情感分数",
    "AI标签",
    "关键词",
    "问题点",
    "亮点",
    "AI摘要",
    "AI建议",
    "需要关注"
  ]);

  const lines = rows.map((r) =>
    toRow([
      r.cmtId,
      r.productName,
      r.variantName,
      r.ratingStar,
      r.commentTime || "",
      r.sourceChannel,
      r.hasMedia ? "是" : "否",
      r.comment,
      r.commentTr || "",
      r.sentiment || "",
      r.sentimentScore ?? "",
      r.analysisTags.join("；"),
      r.keywords.join("；"),
      r.painPoints.join("；"),
      r.highlights.join("；"),
      r.summary || "",
      r.suggestion || "",
      r.needsAttention ? "是" : "否"
    ])
  );

  // UTF-8 BOM so Excel opens correctly
  const bom = "﻿";
  const csv = bom + [header, ...lines].join("\n");

  const filename = encodeURIComponent(`${task.name}-评论导出.csv`);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`
    }
  });
}
