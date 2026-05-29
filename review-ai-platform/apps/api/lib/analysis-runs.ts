import { prisma } from "@review-ai/db";

const RESULT_RUN_STATUSES = ["completed", "partial_failed"] as const;

export async function findAnalysisRunForResults(taskId: string, requestedRunId?: string | null) {
  if (requestedRunId) {
    return prisma.analysisRun.findFirst({
      where: {
        id: requestedRunId,
        taskId,
        status: { in: [...RESULT_RUN_STATUSES] }
      }
    });
  }

  return prisma.analysisRun.findFirst({
    where: {
      taskId,
      status: { in: [...RESULT_RUN_STATUSES] }
    },
    orderBy: [{ finishedAt: "desc" }, { startedAt: "desc" }, { createdAt: "desc" }]
  });
}

export function isResultRunStatus(status: string | null | undefined) {
  return RESULT_RUN_STATUSES.includes(status as (typeof RESULT_RUN_STATUSES)[number]);
}
