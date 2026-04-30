import { prisma } from "@review-ai/db";
import { fail, ok } from "@/lib/http";
import { serializeRun, serializeTask } from "@/lib/serializers";

export async function GET(_: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      analysisRuns: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      importRecords: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!task) {
    return fail("任务不存在", 404);
  }

  return ok({
    task: serializeTask(task),
    latestImport: task.importRecords[0] || null,
    latestRun: task.analysisRuns[0] ? serializeRun(task.analysisRuns[0]) : null
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const body = await request.json().catch(() => ({}));

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const productName = typeof body.productName === "string" ? body.productName.trim() : undefined;
  const sourceChannel = typeof body.sourceChannel === "string" ? body.sourceChannel.trim() : undefined;

  if (name === "" || productName === "") {
    return fail("名称不能为空");
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return fail("任务不存在", 404);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(name ? { name } : {}),
      ...(productName ? { productName } : {}),
      ...(sourceChannel ? { sourceChannel } : {})
    },
    include: { analysisRuns: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  return ok(serializeTask(updated));
}

export async function DELETE(_: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return fail("任务不存在", 404);
  }

  await prisma.task.delete({ where: { id: taskId } });

  return ok({ deleted: true });
}
