import { prisma } from "@review-ai/db";

export async function getPlatformAiSetting() {
  return prisma.workspaceAiSetting.findFirst({
    where: {
      workspace: {
        memberships: {
          some: {
            user: { isSuperAdmin: true }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getPlatformCrawlerSetting() {
  return prisma.workspaceCrawlerSetting.findFirst({
    where: {
      workspace: {
        memberships: {
          some: {
            user: { isSuperAdmin: true }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}
