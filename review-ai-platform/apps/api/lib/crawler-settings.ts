import type { WorkspaceCrawlerSetting } from "@review-ai/db";
import { CRAWLER_CHANNEL_PRESETS, type CrawlerChannel, type WorkspaceCrawlerSettingDTO } from "@review-ai/shared";

const DEFAULT_CHANNELS: CrawlerChannel[] = ["browser_intercept"];

const channelIds = new Set(CRAWLER_CHANNEL_PRESETS.map((item) => item.id));

export function parseCrawlerChannels(value: string | null | undefined): CrawlerChannel[] {
  const channels = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is CrawlerChannel => channelIds.has(item as CrawlerChannel));
  return channels.length ? channels : DEFAULT_CHANNELS;
}

export function serializeCrawlerChannels(value: CrawlerChannel[] | string | null | undefined) {
  if (Array.isArray(value)) {
    const channels = value.filter((item): item is CrawlerChannel => channelIds.has(item));
    return (channels.length ? channels : DEFAULT_CHANNELS).join(",");
  }
  return parseCrawlerChannels(value).join(",");
}

export function defaultCrawlerSetting(): WorkspaceCrawlerSettingDTO {
  return {
    enabled: process.env.SCRAPLING_ENABLED !== "false",
    pythonBin: process.env.SCRAPLING_PYTHON_BIN || "python",
    proxyUrl: process.env.SCRAPLING_PROXY || null,
    shopeeCookie: null,
    shopeeCookieSet: false,
    crawlChannels: ["browser_intercept"],
    defaultSourceChannel: process.env.SCRAPLING_DEFAULT_SOURCE === "TikTok Video" ? "TikTok Video" : "YouTube",
    defaultMaxReviews: Number(process.env.SCRAPLING_DEFAULT_MAX_REVIEWS || 200),
    requestTimeoutSec: Number(process.env.SCRAPLING_TIMEOUT_SEC || 180),
    updatedAt: null
  };
}

export function serializeCrawlerSetting(setting: WorkspaceCrawlerSetting | null): WorkspaceCrawlerSettingDTO {
  if (!setting) {
    return defaultCrawlerSetting();
  }

  return {
    enabled: setting.enabled,
    pythonBin: setting.pythonBin,
    proxyUrl: setting.proxyUrl,
    shopeeCookie: null,
    shopeeCookieSet: false,
    crawlChannels: ["browser_intercept"],
    defaultSourceChannel: setting.defaultSourceChannel === "TikTok Video" ? "TikTok Video" : "YouTube",
    defaultMaxReviews: setting.defaultMaxReviews,
    requestTimeoutSec: setting.requestTimeoutSec,
    updatedAt: setting.updatedAt.toISOString()
  };
}
