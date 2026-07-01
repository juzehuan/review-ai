import { encryptSecret, prisma } from "@review-ai/db";
import { normalizeCrawlSourceChannel } from "@review-ai/shared";
import { writeAuditLog } from "@/lib/audit-log";
import { defaultCrawlerSetting, serializeCrawlerChannels, serializeCrawlerSetting } from "@/lib/crawler-settings";
import { fail, ok } from "@/lib/http";
import { getPlatformCrawlerSetting } from "@/lib/platform-settings";
import { getWorkspaceContext } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  const serialized = serializeCrawlerSetting(await getPlatformCrawlerSetting());
  if (!context.user?.isSuperAdmin) {
    return ok({
      ...serialized,
      pythonBin: "",
      proxyUrl: null,
      shopeeCookie: null,
      shopeeCookieSet: false
    });
  }

  return ok(serialized);
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }

  if (!context.user?.isSuperAdmin) {
    return fail("抓取配置由平台超管统一管理。", 403);
  }

  const body = await request.json().catch(() => ({}));
  const defaults = defaultCrawlerSetting();
  const enabled = Boolean(body.enabled);
  const pythonBin = String(body.pythonBin || defaults.pythonBin).trim();
  const proxyUrl =
    typeof body.proxyUrl === "string" ? body.proxyUrl.trim() || null : body.proxyUrl === null ? null : defaults.proxyUrl;
  const defaultSourceChannel = normalizeCrawlSourceChannel(
    body.defaultSourceChannel,
    normalizeCrawlSourceChannel(defaults.defaultSourceChannel, "YouTube")
  );
  const defaultMaxReviews = Math.min(Math.max(Number(body.defaultMaxReviews ?? defaults.defaultMaxReviews), 0), 20000);
  const requestTimeoutSec = Math.min(Math.max(Number(body.requestTimeoutSec || defaults.requestTimeoutSec), 30), 900);
  const shopeeCookie = null;
  const storedProxyUrl = proxyUrl ? encryptSecret(proxyUrl) : null;
  const crawlChannels = serializeCrawlerChannels(body.crawlChannels || defaults.crawlChannels);

  if (!pythonBin) {
    return fail("请填写 Python 命令");
  }

  const setting = await prisma.workspaceCrawlerSetting.upsert({
    where: { workspaceId: context.workspace.id },
    update: {
      enabled,
      pythonBin,
      proxyUrl: storedProxyUrl,
      shopeeCookie,
      crawlChannels,
      defaultSourceChannel,
      defaultMaxReviews,
      requestTimeoutSec
    },
    create: {
      workspaceId: context.workspace.id,
      enabled,
      pythonBin,
      proxyUrl: storedProxyUrl,
      shopeeCookie,
      crawlChannels,
      defaultSourceChannel,
      defaultMaxReviews,
      requestTimeoutSec
    }
  });
  await writeAuditLog(request, {
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "settings.crawler.update",
    targetType: "workspace_crawler_setting",
    targetId: setting.id,
    targetLabel: context.workspace.name,
    metadata: {
      enabled,
      pythonBin,
      proxyConfigured: Boolean(proxyUrl),
      crawlChannels,
      defaultSourceChannel,
      defaultMaxReviews,
      requestTimeoutSec
    }
  });

  return ok(serializeCrawlerSetting(setting));
}
