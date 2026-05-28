import { prisma } from "@review-ai/db";
import { defaultCrawlerSetting, serializeCrawlerChannels, serializeCrawlerSetting } from "@/lib/crawler-settings";
import { fail, ok } from "@/lib/http";
import { getWorkspaceContext, requireWorkspaceRole } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const setting = await prisma.workspaceCrawlerSetting.findUnique({
    where: { workspaceId: context.workspace.id }
  });

  return ok(serializeCrawlerSetting(setting));
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const roleResponse = requireWorkspaceRole(context, ["owner", "admin"]);
  if (roleResponse) {
    return roleResponse;
  }

  const body = await request.json().catch(() => ({}));
  const defaults = defaultCrawlerSetting();
  const enabled = Boolean(body.enabled);
  const pythonBin = String(body.pythonBin || defaults.pythonBin).trim();
  const proxyUrl =
    typeof body.proxyUrl === "string" ? body.proxyUrl.trim() || null : body.proxyUrl === null ? null : defaults.proxyUrl;
  const defaultSourceChannel = String(body.defaultSourceChannel || defaults.defaultSourceChannel).trim();
  const defaultMaxReviews = Math.min(Math.max(Number(body.defaultMaxReviews || defaults.defaultMaxReviews), 1), 1000);
  const requestTimeoutSec = Math.min(Math.max(Number(body.requestTimeoutSec || defaults.requestTimeoutSec), 30), 900);
  const shopeeCookie =
    typeof body.shopeeCookie === "string" && body.shopeeCookie.trim() && !body.shopeeCookie.includes("*")
      ? body.shopeeCookie.trim()
      : undefined;
  const crawlChannels = serializeCrawlerChannels(body.crawlChannels);

  if (!pythonBin || !defaultSourceChannel) {
    return fail("请填写 Python 命令和默认来源渠道");
  }
  if (!crawlChannels) {
    return fail("请至少选择一个抓取渠道");
  }

  const setting = await prisma.workspaceCrawlerSetting.upsert({
    where: { workspaceId: context.workspace.id },
    update: {
      enabled,
      pythonBin,
      proxyUrl,
      ...(shopeeCookie !== undefined ? { shopeeCookie } : {}),
      crawlChannels,
      defaultSourceChannel,
      defaultMaxReviews,
      requestTimeoutSec
    },
    create: {
      workspaceId: context.workspace.id,
      enabled,
      pythonBin,
      proxyUrl,
      shopeeCookie,
      crawlChannels,
      defaultSourceChannel,
      defaultMaxReviews,
      requestTimeoutSec
    }
  });

  return ok(serializeCrawlerSetting(setting));
}
