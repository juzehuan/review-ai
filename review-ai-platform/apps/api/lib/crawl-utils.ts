import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { decryptSecret } from "@review-ai/db";
import { inferAnalysisType, normalizeCrawlSourceChannel, type CrawlerChannel } from "@review-ai/shared";
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
  stopReason?: string;
  commentSortAttempted?: boolean;
  commentSortSwitched?: boolean;
  commentSortOpened?: boolean;
  commentSortLabel?: string;
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

function isCrawlResult(value: unknown): value is CrawlResult {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as { rows?: unknown }).rows));
}

function parseCrawlerOutput(stdout: string) {
  const parsed = JSON.parse(stdout) as unknown;
  if (!isCrawlResult(parsed)) {
    throw new Error("Scrapling crawler returned an invalid result: missing rows array");
  }
  return parsed;
}

const nestedUrlParamNames = ["url", "u", "q", "target", "redirect", "redirect_url"] as const;
const supportedCrawlUrlMessage = "目前支持 Shopee 商品链接、YouTube 视频链接、TikTok 视频链接和 Facebook 帖子/图片/Reel 链接。";

function isFacebookHost(host: string) {
  return host === "facebook.com" || host.endsWith(".facebook.com");
}

function isFacebookCrawlTarget(pathname: string, searchParams: URLSearchParams) {
  const path = pathname || "/";
  if (searchParams.has("story_fbid") || searchParams.has("fbid") || searchParams.has("v")) {
    return /\/(story\.php|permalink\.php|photo(?:\.php)?|watch|posts|videos|reel|share\/[pv])/i.test(path);
  }
  return /\/(?:groups\/[^/]+\/posts|posts|videos|reel|share\/[pv])\/[^/?#]+/i.test(path);
}

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
    if ((host === "tiktok.com" || host.endsWith(".tiktok.com")) && /\/@[^/]+\/video\/\d+/i.test(parsed.pathname)) {
      return "tiktok-video";
    }
    if (host.includes("shopee.")) {
      return "shopee";
    }
    if (isFacebookHost(host) && isFacebookCrawlTarget(parsed.pathname, parsed.searchParams)) {
      return "facebook-post";
    }
  } catch {
    const text = normalizedUrl.toLowerCase();
    if (text.includes("youtube.com") || text.includes("youtu.be")) {
      return "youtube";
    }
    if (text.includes("tiktok.") && /\/@[^/]+\/video\/\d+/i.test(text)) {
      return "tiktok-video";
    }
    if (text.includes("shopee.")) {
      return "shopee";
    }
    if (text.includes("facebook.") && /(story_fbid=|fbid=|[?&]v=|\/posts\/|\/videos\/|\/reel\/|\/photo\/|photo\.php|\/share\/[pv])/i.test(text)) {
      return "facebook-post";
    }
  }
  return "";
}

export function detectSourceChannelFromUrl(url: string) {
  const normalizedUrl = normalizeCrawlUrl(url);
  const platform = detectCrawlerPlatform(normalizedUrl);
  if (platform === "youtube") {
    return "YouTube";
  }
  if (platform === "tiktok-video") {
    return "TikTok Video";
  }
  if (platform === "shopee") {
    return "Shopee";
  }
  if (platform === "facebook-post") {
    return "Facebook";
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

function stderrTail(stderr: string) {
  const text = stderr.trim();
  if (!text) {
    return "";
  }
  return text.split(/\r?\n/).slice(-8).join("\n");
}

function formatCrawlerSpawnError(error: unknown, pythonBin: string) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
  const message = error instanceof Error ? error.message : String(error);
  if (code === "ENOENT") {
    return new Error(
      `Python command not found: ${pythonBin}. Please set SCRAPLING_PYTHON_BIN or update crawler settings to a valid Python executable.`
    );
  }
  return error instanceof Error ? error : new Error(message);
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
      : normalizeCrawlSourceChannel(requestedSourceChannel || detectedSourceChannel || defaults.defaultSourceChannel, "YouTube");
  const rawAnalysisType = String(body.analysisType || "").trim();
  const requestedAnalysisType = ["product", "video", "tweet"].includes(rawAnalysisType) ? rawAnalysisType : "";
  const analysisType =
    crawlerPlatform && detectedSourceChannel
      ? inferAnalysisType(detectedSourceChannel, normalizedProductUrl)
      : requestedAnalysisType || inferAnalysisType(sourceChannel, normalizedProductUrl);
  const requestedMaxReviews = Number(body.maxReviews ?? defaults.defaultMaxReviews);
  const maxReviews = requestedMaxReviews <= 0 ? 0 : Math.min(Math.max(requestedMaxReviews, 1), 20000);
  const crawlChannels = crawlerPlatform === "shopee" ? defaults.crawlChannels : (["browser_intercept"] as CrawlerChannel[]);

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
    const scriptPath = resolveCrawlerScriptPath();
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
    const cleanup = () => {
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      child.kill();
      const detail = stderrTail(stderr);
      reject(new Error(detail ? `Scrapling crawler timed out. Recent crawler log:\n${detail}` : "Scrapling crawler timed out"));
    }, (setting.requestTimeoutSec + 45) * 1000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      cleanup();
      reject(formatCrawlerSpawnError(error, setting.pythonBin));
    });
    child.on("close", (code) => {
      cleanup();
      if (code !== 0) {
        reject(new Error(parseCrawlerProcessError(stderr, `Scrapling crawler exited with code ${code}`)));
        return;
      }
      try {
        resolve(parseCrawlerOutput(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function resolveCrawlerScriptPath() {
  const candidates = [
    path.resolve(process.cwd(), "apps/crawler/scrapling_reviews.py"),
    path.resolve(process.cwd(), "../../apps/crawler/scrapling_reviews.py"),
    path.resolve(process.cwd(), "../crawler/scrapling_reviews.py")
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

export function resolveCrawlerPythonBin(storedPythonBin: string | null | undefined, fallbackPythonBin = "python") {
  const configuredPythonBin = storedPythonBin?.trim();
  const envPythonBin = process.env.SCRAPLING_PYTHON_BIN?.trim();
  if (configuredPythonBin && configuredPythonBin !== "python") {
    return configuredPythonBin;
  }
  return envPythonBin || configuredPythonBin || fallbackPythonBin;
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
  const storedProxyUrl = decryptSecret(storedCrawlerSetting?.proxyUrl);
  const storedShopeeCookie = decryptSecret(storedCrawlerSetting?.shopeeCookie);
  return {
    enabled: storedCrawlerSetting?.enabled ?? defaultSetting.enabled,
    pythonBin: resolveCrawlerPythonBin(storedCrawlerSetting?.pythonBin, defaultSetting.pythonBin),
    proxyUrl: storedProxyUrl || defaultSetting.proxyUrl,
    shopeeCookie: storedShopeeCookie,
    crawlChannels: parseCrawlerChannels(storedCrawlerSetting?.crawlChannels || defaultSetting.crawlChannels.join(",")),
    defaultSourceChannel: normalizeCrawlSourceChannel(
      storedCrawlerSetting?.defaultSourceChannel,
      normalizeCrawlSourceChannel(defaultSetting.defaultSourceChannel, "YouTube")
    ),
    defaultMaxReviews: storedCrawlerSetting?.defaultMaxReviews ?? defaultSetting.defaultMaxReviews,
    requestTimeoutSec: storedCrawlerSetting?.requestTimeoutSec || defaultSetting.requestTimeoutSec
  };
}

export function supportedCrawlUrlError(prefix = "暂不支持该链接抓取") {
  return `${prefix}，${supportedCrawlUrlMessage}`;
}
