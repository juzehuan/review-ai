import { spawn } from "node:child_process";
import path from "node:path";
import { inferAnalysisType, type CrawlerChannel } from "@review-ai/shared";
import { defaultCrawlerSetting, parseCrawlerChannels } from "@/lib/crawler-settings";

export type CrawledReview = {
  cmtId: string;
  shopId: string;
  itemId: string;
  ratingStar: number;
  comment: string;
  commentTr: string | null;
  modelName: string | null;
  hasMedia: boolean;
  commentTime: string | null;
  rawJson: Record<string, unknown>;
};

export type CrawlResult = {
  source: string;
  crawlChannel?: string;
  crawlChannelLabel?: string;
  productUrl: string;
  productName: string;
  shopId: string;
  itemId: string;
  rows: CrawledReview[];
};

export type ResolvedCrawlerSetting = {
  enabled: boolean;
  pythonBin: string;
  proxyUrl: string | null;
  shopeeCookie: string | null;
  crawlChannels: CrawlerChannel[];
  defaultSourceChannel: string;
  defaultMaxReviews: number;
  requestTimeoutSec: number;
};

const nestedUrlParamNames = ["url", "u", "q", "target", "redirect", "redirect_url"] as const;

export function coerceCrawlUrl(value: string) {
  const url = value.trim();
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  if (!url.includes("://") && /^(www\.|m\.|[a-z0-9-]+\.)/i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

export function normalizeCrawlUrl(value: string) {
  let url = coerceCrawlUrl(value);
  for (let i = 0; i < 3; i += 1) {
    try {
      const parsed = new URL(url);
      const nested = nestedUrlParamNames
        .map((name) => parsed.searchParams.get(name))
        .find((candidate) => candidate?.startsWith("http://") || candidate?.startsWith("https://") || candidate?.startsWith("//"));
      if (!nested) {
        return url;
      }
      const nextUrl = coerceCrawlUrl(nested);
      if (nextUrl === url) {
        return url;
      }
      url = nextUrl;
    } catch {
      return url;
    }
  }
  return url;
}

export function detectCrawlerPlatform(url: string) {
  const normalizedUrl = normalizeCrawlUrl(url);
  try {
    const parsed = new URL(normalizedUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) {
      return "youtube";
    }
    if (host.includes("shopee.")) {
      return "shopee";
    }
    if ((host === "tiktok.com" || host.endsWith(".tiktok.com")) && /\/@[^/]+\/video\/\d+/i.test(parsed.pathname)) {
      return "tiktok-video";
    }
    if ((host === "facebook.com" || host.endsWith(".facebook.com")) && isFacebookPostPath(parsed)) {
      return "facebook-post";
    }
  } catch {
    const text = normalizedUrl.toLowerCase();
    if (text.includes("youtube.com") || text.includes("youtu.be")) {
      return "youtube";
    }
    if (text.includes("shopee.")) {
      return "shopee";
    }
    if (text.includes("tiktok.") && /\/@[^/]+\/video\/\d+/i.test(text)) {
      return "tiktok-video";
    }
    if (text.includes("facebook.") && /(story_fbid=|fbid=|\/posts\/|\/videos\/|\/reel\/|\/share\/[pv]\/|\/groups\/[^/]+\/posts\/)/i.test(text)) {
      return "facebook-post";
    }
  }
  return "";
}

function isFacebookPostPath(url: URL) {
  const path = url.pathname || "";
  if (url.searchParams.get("story_fbid") || url.searchParams.get("fbid") || url.searchParams.get("v")) {
    return /(story\.php|permalink\.php|photo\.php|watch|posts|videos|reel|share\/[pv])/i.test(path);
  }
  return /\/(?:groups\/[^/]+\/posts|posts|videos|reel|share\/[pv])\/[^/?#]+/i.test(path);
}

export function detectSourceChannelFromUrl(url: string) {
  const text = normalizeCrawlUrl(url).toLowerCase();
  if (text.includes("youtube.com") || text.includes("youtu.be")) {
    return "YouTube";
  }
  if (text.includes("shopee.")) {
    return "Shopee";
  }
  if (text.includes("lazada.")) {
    return "Lazada";
  }
  if (text.includes("tiktok.") && /\/@[^/]+\/video\/\d+/i.test(text)) {
    return "TikTok Video";
  }
  if (text.includes("facebook.") && /(story_fbid=|fbid=|\/posts\/|\/videos\/|\/reel\/|\/share\/[pv]\/|\/groups\/[^/]+\/posts\/)/i.test(text)) {
    return "Facebook";
  }
  if (text.includes("tiktok.")) {
    return "TikTok Shop";
  }
  return "";
}

export function parseOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseCrawlerProcessError(stderr: string, fallback: string) {
  const text = stderr.trim();
  if (!text) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(text) as { error?: string; detail?: string };
    return [parsed.error, parsed.detail].filter(Boolean).join(" - ") || fallback;
  } catch {
    return text;
  }
}

export function normalizeRequestedCrawlInput(body: Record<string, unknown>, defaults: ResolvedCrawlerSetting) {
  const productUrl = String(body.productUrl || "").trim();
  const normalizedProductUrl = normalizeCrawlUrl(productUrl);
  const crawlerPlatform = detectCrawlerPlatform(normalizedProductUrl);
  const detectedSourceChannel = detectSourceChannelFromUrl(normalizedProductUrl);
  const requestedSourceChannel = String(body.sourceChannel || "").trim();
  const sourceChannel =
    crawlerPlatform && detectedSourceChannel
      ? detectedSourceChannel
      : requestedSourceChannel || detectedSourceChannel || defaults.defaultSourceChannel;
  const rawAnalysisType = String(body.analysisType || "").trim();
  const analysisType = ["product", "video", "tweet"].includes(rawAnalysisType)
    ? rawAnalysisType
    : inferAnalysisType(sourceChannel);
  const requestedMaxReviews = Number(body.maxReviews ?? defaults.defaultMaxReviews);
  const maxReviews = requestedMaxReviews <= 0 ? 0 : Math.min(Math.max(requestedMaxReviews, 1), 1000);
  const bodyChannels = Array.isArray(body.crawlChannels) ? parseCrawlerChannels(body.crawlChannels.join(",")) : null;
  const crawlChannels = crawlerPlatform === "youtube" || crawlerPlatform === "tiktok-video" || crawlerPlatform === "facebook-post"
    ? (["browser_intercept"] as CrawlerChannel[])
    : bodyChannels?.length
      ? bodyChannels
      : defaults.crawlChannels;

  return {
    productUrl,
    normalizedProductUrl,
    crawlerPlatform,
    sourceChannel,
    analysisType,
    maxReviews,
    crawlChannels
  };
}

export function runScraplingCrawler(productUrl: string, maxReviews: number, setting: ResolvedCrawlerSetting) {
  return new Promise<CrawlResult>((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), "../../apps/crawler/scrapling_reviews.py");
    const args = [
      scriptPath,
      "--url",
      productUrl,
      "--max-reviews",
      String(maxReviews),
      "--timeout",
      String(setting.requestTimeoutSec)
    ];
    if (setting.proxyUrl) {
      args.push("--proxy", setting.proxyUrl);
    }
    if (setting.crawlChannels.length) {
      args.push("--channels", setting.crawlChannels.join(","));
    }
    const child = spawn(setting.pythonBin, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        ...(setting.shopeeCookie ? { SHOPEE_COOKIE: setting.shopeeCookie } : {})
      },
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Scrapling crawler timed out"));
    }, setting.requestTimeoutSec * 1000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(parseCrawlerProcessError(stderr, `Scrapling crawler exited with code ${code}`)));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as CrawlResult);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function resolvedCrawlerSettingFromRecord(
  storedCrawlerSetting:
    | {
        enabled: boolean;
        pythonBin: string;
        proxyUrl: string | null;
        shopeeCookie: string | null;
        crawlChannels: string;
        defaultSourceChannel: string;
        defaultMaxReviews: number;
        requestTimeoutSec: number;
      }
    | null
): ResolvedCrawlerSetting {
  const defaultSetting = defaultCrawlerSetting();
  return {
    enabled: storedCrawlerSetting?.enabled ?? defaultSetting.enabled,
    pythonBin: storedCrawlerSetting?.pythonBin || defaultSetting.pythonBin,
    proxyUrl: storedCrawlerSetting?.proxyUrl || defaultSetting.proxyUrl,
    shopeeCookie: storedCrawlerSetting?.shopeeCookie || process.env.SHOPEE_COOKIE || null,
    crawlChannels: parseCrawlerChannels(storedCrawlerSetting?.crawlChannels || defaultSetting.crawlChannels.join(",")),
    defaultSourceChannel: storedCrawlerSetting?.defaultSourceChannel || defaultSetting.defaultSourceChannel,
    defaultMaxReviews: storedCrawlerSetting?.defaultMaxReviews || defaultSetting.defaultMaxReviews,
    requestTimeoutSec: storedCrawlerSetting?.requestTimeoutSec || defaultSetting.requestTimeoutSec
  };
}
