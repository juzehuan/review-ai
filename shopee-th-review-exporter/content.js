const BRIDGE_SOURCE = "shopee-review-exporter-bridge";
const BRIDGE_SCRIPT_ID = "shopee-review-exporter-page-bridge";
const RATINGS_PATH = "/api/v2/item/get_ratings";
const DEFAULT_LIMIT = 6;
const CLICK_DELAY_MS = 1400;
const RESPONSE_WAIT_MS = 12000;

const state = {
  running: false,
  stopRequested: false,
  statusText: "Idle",
  reviewMap: new Map(),
  pageOffsets: new Set(),
  logs: [],
  product: null,
  summary: null,
  hasMore: null,
  lastCapturedAt: 0,
  lastCapturedOffset: null,
  lastRequestUrl: "",
  isProductPage: false
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addLog = (message) => {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  state.logs.unshift(`[${timestamp}] ${message}`);
  state.logs = state.logs.slice(0, 14);
};

const parseProductInfo = () => {
  const match = window.location.pathname.match(/-i\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }

  return {
    shopid: match[1],
    itemid: match[2],
    url: window.location.href,
    title: document.title
  };
};

const ensureBridgeInjected = () => {
  if (document.getElementById(BRIDGE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = BRIDGE_SCRIPT_ID;
  script.src = chrome.runtime.getURL("page-bridge.js");
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
};

const updateProductState = () => {
  state.product = parseProductInfo();
  state.isProductPage = Boolean(state.product);
};

const serializeState = () => ({
  running: state.running,
  statusText: state.statusText,
  reviewCount: state.reviewMap.size,
  pageCount: state.pageOffsets.size,
  logs: [...state.logs],
  product: state.product,
  summary: state.summary,
  hasMore: state.hasMore,
  isProductPage: state.isProductPage
});

const normalizeRating = (rating) => {
  const productItem = rating.product_items?.[0] || {};
  const videoUrls = (rating.videos || []).map((video) => video.url).filter(Boolean);
  const videoCovers = (rating.videos || []).map((video) => video.cover).filter(Boolean);

  return {
    shopid: rating.shopid,
    itemid: rating.itemid,
    cmtid: rating.cmtid,
    userid: rating.userid,
    author_username: rating.author_username || "",
    anonymous: Boolean(rating.anonymous),
    rating_star: rating.rating_star ?? "",
    rating: rating.rating ?? "",
    comment: rating.comment || "",
    comment_tr: rating.comment_tr || "",
    like_count: rating.like_count ?? 0,
    ctime: rating.ctime ?? "",
    ctime_iso: rating.ctime ? new Date(rating.ctime * 1000).toISOString() : "",
    submit_time: rating.submit_time ?? "",
    submit_time_iso: rating.submit_time ? new Date(rating.submit_time * 1000).toISOString() : "",
    model_name: productItem.model_name || "",
    options: Array.isArray(productItem.options) ? productItem.options.join(" | ") : "",
    product_name: productItem.name || "",
    images: Array.isArray(rating.images) ? rating.images.join(" | ") : "",
    video_urls: videoUrls.join(" | "),
    video_covers: videoCovers.join(" | "),
    has_media: Boolean((rating.images || []).length || (rating.videos || []).length),
    region: rating.region || "",
    review_type: rating.review_type ?? "",
    product_quality: rating.detailed_rating?.product_quality ?? "",
    seller_service: rating.detailed_rating?.seller_service ?? "",
    delivery_service: rating.detailed_rating?.delivery_service ?? "",
    original_url: state.product?.url || "",
    raw: rating
  };
};

const consumeRatingsResponse = ({ url, data }) => {
  if (!data?.data?.ratings) {
    return false;
  }

  let offset = null;
  try {
    offset = Number(new URL(url, location.origin).searchParams.get("offset") || 0);
  } catch {
    offset = null;
  }

  for (const rating of data.data.ratings) {
    const normalized = normalizeRating(rating);
    state.reviewMap.set(String(normalized.cmtid), normalized);
  }

  if (Number.isFinite(offset)) {
    state.pageOffsets.add(offset);
    state.lastCapturedOffset = offset;
  }

  state.summary = data.data.item_rating_summary || state.summary;
  state.hasMore = Boolean(data.data.has_more);
  state.lastCapturedAt = Date.now();
  state.lastRequestUrl = url;

  addLog(
    `Captured offset ${offset ?? "?"}, total reviews ${state.reviewMap.size}, has_more=${String(state.hasMore)}`
  );

  return true;
};

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== BRIDGE_SOURCE) {
    return;
  }

  const payload = event.data.payload;
  if (!payload?.url || !payload.url.includes(RATINGS_PATH)) {
    return;
  }

  consumeRatingsResponse(payload);
});

const waitForElement = async (selector, timeoutMs = 15000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }

    await sleep(250);
  }

  return null;
};

const waitForCondition = async (predicate, timeoutMs) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return true;
    }

    await sleep(250);
  }

  return false;
};

const waitForRatingsSection = async () => {
  const heading = await waitForElement("div.product-ratings, section:has(.product-ratings), .product-detail-page");
  if (heading) {
    heading.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(600);
  } else {
    window.scrollTo({ top: document.body.scrollHeight * 0.55, behavior: "smooth" });
    await sleep(800);
  }
};

const buildBootstrapUrl = () => {
  const product = parseProductInfo();
  if (!product) {
    return null;
  }

  const url = new URL(`https://shopee.co.th${RATINGS_PATH}`);
  url.searchParams.set("filter", "0");
  url.searchParams.set("flag", "1");
  url.searchParams.set("limit", String(DEFAULT_LIMIT));
  url.searchParams.set("offset", "0");
  url.searchParams.set("type", "0");
  url.searchParams.set("exclude_filter", "1");
  url.searchParams.set("filter_size", "0");
  url.searchParams.set("fold_filter", "0");
  url.searchParams.set("relevant_reviews", "false");
  url.searchParams.set("request_source", "2");
  url.searchParams.set("tag_filter", "");
  url.searchParams.set("variation_filters", "");
  url.searchParams.set("need_translation", "1");
  url.searchParams.set("shopid", product.shopid);
  url.searchParams.set("itemid", product.itemid);
  url.searchParams.set("fe_toggle", "[2,3]");
  url.searchParams.set("preferred_item_shop_id", product.shopid);
  url.searchParams.set("preferred_item_item_id", product.itemid);
  url.searchParams.set("preferred_item_include_type", "1");

  return url.toString();
};

const bootstrapFirstPage = async () => {
  if (state.pageOffsets.has(0)) {
    return true;
  }

  const url = buildBootstrapUrl();
  if (!url) {
    return false;
  }

  addLog("Bootstrapping page 1 reviews...");

  const response = await fetch(url, {
    credentials: "include"
  });
  const data = await response.json();

  return consumeRatingsResponse({ url, data });
};

const findNextButton = () => {
  const button = document.querySelector(".product-ratings__page-controller .shopee-icon-button--right");
  if (!button) {
    return null;
  }

  const disabled = button.disabled || button.getAttribute("aria-disabled") === "true";
  return disabled ? null : button;
};

const clickNextPage = async () => {
  const nextButton = findNextButton();
  if (!nextButton) {
    addLog("Next page button not available.");
    return false;
  }

  nextButton.scrollIntoView({ behavior: "smooth", block: "center" });
  await sleep(300);
  nextButton.click();
  addLog("Clicked next page button.");

  return true;
};

const waitForNewCapture = async (previousTimestamp) => {
  const updated = await waitForCondition(() => state.lastCapturedAt > previousTimestamp, RESPONSE_WAIT_MS);
  if (!updated) {
    addLog("Timed out waiting for the next review response.");
  }
  return updated;
};

const startScrape = async () => {
  updateProductState();

  if (!state.isProductPage) {
    state.statusText = "Not a product page";
    addLog("Current tab is not a Shopee product detail page.");
    return serializeState();
  }

  if (state.running) {
    addLog("Scrape is already running.");
    return serializeState();
  }

  ensureBridgeInjected();

  state.running = true;
  state.stopRequested = false;
  state.statusText = "Running";
  addLog(`Started on item ${state.product.itemid}.`);

  try {
    await waitForRatingsSection();
    await bootstrapFirstPage();

    while (!state.stopRequested) {
      if (state.hasMore === false) {
        addLog("Reached the final review page.");
        break;
      }

      const previousTimestamp = state.lastCapturedAt;
      const clicked = await clickNextPage();
      if (!clicked) {
        break;
      }

      const captured = await waitForNewCapture(previousTimestamp);
      if (!captured) {
        break;
      }

      await sleep(CLICK_DELAY_MS);
    }

    state.statusText = state.stopRequested ? "Stopped" : "Completed";
  } catch (error) {
    state.statusText = "Failed";
    addLog(`Error: ${error?.message || String(error)}`);
  } finally {
    state.running = false;
    state.stopRequested = false;
  }

  return serializeState();
};

const stopScrape = () => {
  state.stopRequested = true;
  state.statusText = "Stopping";
  addLog("Stop requested.");
  return serializeState();
};

const clearData = () => {
  state.reviewMap.clear();
  state.pageOffsets.clear();
  state.summary = null;
  state.hasMore = null;
  state.lastCapturedAt = 0;
  state.lastCapturedOffset = null;
  state.lastRequestUrl = "";
  state.statusText = "Idle";
  addLog("Collected data cleared.");
  return serializeState();
};

const escapeCsv = (value) => {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replace(/"/g, "\"\"")}"`;
};

const buildExportPayload = (format) => {
  const reviews = [...state.reviewMap.values()].sort((a, b) => Number(a.cmtid) - Number(b.cmtid));
  const baseName = `shopee-th-reviews-${state.product?.shopid || "shop"}-${state.product?.itemid || "item"}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}`;

  if (format === "json") {
    const content = JSON.stringify(
      {
        product: state.product,
        summary: state.summary,
        total_collected: reviews.length,
        page_offsets: [...state.pageOffsets].sort((a, b) => a - b),
        reviews
      },
      null,
      2
    );

    return {
      filename: `${baseName}.json`,
      mimeType: "application/json;charset=utf-8",
      content
    };
  }

  const headers = [
    "shopid",
    "itemid",
    "cmtid",
    "userid",
    "author_username",
    "anonymous",
    "rating_star",
    "rating",
    "comment",
    "comment_tr",
    "like_count",
    "ctime",
    "ctime_iso",
    "submit_time",
    "submit_time_iso",
    "model_name",
    "options",
    "product_name",
    "images",
    "video_urls",
    "video_covers",
    "has_media",
    "region",
    "review_type",
    "product_quality",
    "seller_service",
    "delivery_service",
    "original_url"
  ];

  const rows = reviews.map((review) =>
    headers.map((header) => escapeCsv(review[header])).join(",")
  );

  return {
    filename: `${baseName}.csv`,
    mimeType: "text/csv;charset=utf-8",
    content: `\uFEFF${headers.join(",")}\n${rows.join("\n")}`
  };
};

const exportReviews = async (format) => {
  updateProductState();

  if (!state.reviewMap.size) {
    addLog("No collected reviews to export.");
    return { ok: false, logs: [...state.logs] };
  }

  const payload = buildExportPayload(format);
  const response = await chrome.runtime.sendMessage({
    type: "DOWNLOAD_FILE",
    ...payload
  });

  if (response?.ok) {
    addLog(`Download started: ${payload.filename}`);
  } else {
    addLog(`Download failed: ${response?.error || "Unknown error"}`);
  }

  return { ok: Boolean(response?.ok), logs: [...state.logs] };
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message?.type;

  if (type === "GET_STATE") {
    updateProductState();
    ensureBridgeInjected();
    sendResponse(serializeState());
    return false;
  }

  if (type === "START_SCRAPE") {
    startScrape().then(sendResponse);
    return true;
  }

  if (type === "STOP_SCRAPE") {
    sendResponse(stopScrape());
    return false;
  }

  if (type === "CLEAR_DATA") {
    sendResponse(clearData());
    return false;
  }

  if (type === "EXPORT_REVIEWS") {
    exportReviews(message.format || "json").then(sendResponse);
    return true;
  }

  return false;
});

updateProductState();
ensureBridgeInjected();
addLog("Content script ready.");
