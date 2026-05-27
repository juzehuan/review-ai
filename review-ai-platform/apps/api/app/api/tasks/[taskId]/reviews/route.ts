import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { serializeReviewRow } from "@/lib/serializers";
import { getWorkspaceContext, requireScopedTask } from "@/lib/workspace";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const workspaceContext = await getWorkspaceContext(request);
  if (workspaceContext.response || !workspaceContext.workspace) {
    return workspaceContext.response;
  }
  const { workspace } = workspaceContext;
  const scoped = await requireScopedTask(taskId, workspace.id);
  if (scoped.response) {
    return scoped.response;
  }

  const { searchParams } = new URL(request.url);
  const sentiment = searchParams.get("sentiment");
  const ratingStar = Number(searchParams.get("ratingStar") || 0);
  const variant = searchParams.get("variant");
  const keyword = searchParams.get("keyword");
  const hasMedia = searchParams.get("hasMedia");
  const sortBy = searchParams.get("sortBy") || "commentTime";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);

  const run = await prisma.analysisRun.findFirst({
    where: { taskId },
    orderBy: { startedAt: "desc" }
  });

  const reviews = await prisma.review.findMany({
    where: {
      taskId,
      ...(ratingStar ? { ratingStar } : {}),
      ...(variant ? { modelName: variant } : {}),
      ...(hasMedia !== null ? { hasMedia: hasMedia === "true" } : {}),
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
            where: sentiment ? { runId: run.id, sentiment: sentiment as never } : { runId: run.id },
            take: 1
          }
        : false
    }
  });

  let rows = reviews.map(serializeReviewRow);

  if (sentiment) {
    rows = rows.filter((row) => row.sentiment === sentiment);
  }

  if (sortBy === "ratingStar") {
    rows = rows.sort((a, b) => (sortOrder === "asc" ? a.ratingStar - b.ratingStar : b.ratingStar - a.ratingStar));
  } else if (sortBy === "sentimentScore") {
    rows = rows.sort((a, b) => {
      const av = a.sentimentScore || 0;
      const bv = b.sentimentScore || 0;
      return sortOrder === "asc" ? av - bv : bv - av;
    });
  } else {
    rows = rows.sort((a, b) => {
      const av = a.commentTime ? new Date(a.commentTime).getTime() : 0;
      const bv = b.commentTime ? new Date(b.commentTime).getTime() : 0;
      return sortOrder === "asc" ? av - bv : bv - av;
    });
  }

  const total = rows.length;
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return ok({
    total,
    page,
    pageSize,
    items: pagedRows
  });
}
