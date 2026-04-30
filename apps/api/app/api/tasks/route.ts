import { prisma } from "@review-ai/db";
import { ok } from "@/lib/http";
import { serializeTask } from "@/lib/serializers";

export async function GET() {
  const tasks = await prisma.task.findMany({
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

