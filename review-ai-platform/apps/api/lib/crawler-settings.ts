import type { WorkspaceCrawlerSetting } from "@review-ai/db";
import type { WorkspaceCrawlerSettingDTO } from "@review-ai/shared";

function maskSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  if (value.length <= 12) {
    return "*".repeat(Math.min(value.length, 8));
  }
  return `${value.slice(0, 6)}${"*".repeat(8)}${value.slice(-4)}`;
}

export function defaultCrawlerSetting(): WorkspaceCrawlerSettingDTO {
  const shopeeCookie = process.env.SHOPEE_COOKIE || null;
  return {
    enabled: process.env.SCRAPLING_ENABLED !== "false",
    pythonBin: process.env.SCRAPLING_PYTHON_BIN || "python",
    proxyUrl: process.env.SCRAPLING_PROXY || null,
    shopeeCookie: maskSecret(shopeeCookie),
    shopeeCookieSet: Boolean(shopeeCookie),
    defaultSourceChannel: process.env.SCRAPLING_DEFAULT_SOURCE || "Shopee",
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
    shopeeCookie: maskSecret(setting.shopeeCookie),
    shopeeCookieSet: Boolean(setting.shopeeCookie || process.env.SHOPEE_COOKIE),
    defaultSourceChannel: setting.defaultSourceChannel,
    defaultMaxReviews: setting.defaultMaxReviews,
    requestTimeoutSec: setting.requestTimeoutSec,
    updatedAt: setting.updatedAt.toISOString()
  };
}

