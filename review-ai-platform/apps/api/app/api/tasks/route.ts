import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { serializeTask } from "@/lib/serializers";
import { getWorkspaceContext } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }
  const { workspace } = context;
  const tasks = await prisma.task.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      analysisRuns: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  return ok(tasks.map(serializeTask));
}
