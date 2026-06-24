import { prisma } from "@review-ai/db";
import { serializeReviewRow } from "@/lib/serializers";
import { fail } from "@/lib/http";
import { findAnalysisRunForResults } from "@/lib/analysis-runs";
import { getWorkspaceContext, requireScopedTask } from "@/lib/workspace";

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvRow(values: unknown[]) {
  return values.map(escapeCsv).join(",");
}

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }

  const scoped = await requireScopedTask(taskId, workspaceContext.workspace.id);
  if (scoped.response || !scoped.task) {
    return scoped.response;
  }

  const { searchParams } = new URL(request.url);
  const sentiment = searchParams.get("sentiment");
  const issue = searchParams.get("issue");
  const intent = searchParams.get("intent");
  const tag = searchParams.get("tag");
  const reviewIds = searchParams
    .get("reviewIds")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const needsAttention = searchParams.get("needsAttention");
  const ratingStar = Number(searchParams.get("ratingStar") || 0);
  const keyword = searchParams.get("keyword");
  const hasMedia = searchParams.get("hasMedia");
  const variant = searchParams.get("variant");

  const run = await findAnalysisRunForResults(taskId, searchParams.get("runId"));
  const hasAnalysisFilter = Boolean(sentiment || issue || intent || tag || needsAttention !== null);
  if (hasAnalysisFilter && !run) {
    return fail("当前项目还没有可导出的分析结果", 404);
  }
  const analysisFilter = run
    ? {
        runId: run.id,
        ...(sentiment ? { sentiment: sentiment as never } : {}),
        ...(issue ? { painPoints: { has: issue } } : {}),
        ...(intent ? { intentLabels: { has: intent } } : {}),
        ...(tag ? { topicLabels: { has: tag } } : {}),
        ...(needsAttention !== null ? { needsAttention: needsAttention === "true" } : {})
      }
    : null;

  const reviews = await prisma.review.findMany({
    where: {
      taskId,
      ...(reviewIds?.length ? { id: { in: reviewIds } } : {}),
      ...(ratingStar ? { ratingStar } : {}),
      ...(variant ? { modelName: variant } : {}),
      ...(hasMedia !== null && hasMedia !== "" ? { hasMedia: hasMedia === "true" } : {}),
      ...(analysisFilter ? { analyses: { some: analysisFilter } } : {}),
      ...(keyword
        ? {
            OR: [
              { comment: { contains: keyword, mode: "insensitive" } },
              { commentTr: { contains: keyword, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: {
      task: true,
      analyses: run
        ? {
            where: analysisFilter || { runId: run.id },
            take: 1
          }
        : false
    },
    orderBy: { commentTime: "desc" }
  });

  const rows = reviews.map(serializeReviewRow);
  if (!rows.length) {
    return fail("当前筛选条件下没有可导出的评论", 404);
  }

  const header = toCsvRow([
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
    "评论意图",
    "关键词",
    "问题点",
    "亮点",
    "AI摘要",
    "AI建议",
    "需要关注"
  ]);

  const lines = rows.map((row) =>
    toCsvRow([
      row.cmtId,
      row.productName,
      row.variantName,
      row.ratingStar,
      row.commentTime || "",
      row.sourceChannel,
      row.hasMedia ? "是" : "否",
      row.comment,
      row.commentTr || "",
      row.sentiment || "",
      row.sentimentScore ?? "",
      row.analysisTags.join("; "),
      row.intentLabels.join("; "),
      row.keywords.join("; "),
      row.painPoints.join("; "),
      row.highlights.join("; "),
      row.summary || "",
      row.suggestion || "",
      row.needsAttention ? "是" : "否"
    ])
  );

  const csv = `\uFEFF${[header, ...lines].join("\n")}`;
  const filename = encodeURIComponent(`${scoped.task.name}-reviews.csv`);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`
    }
  });
}
