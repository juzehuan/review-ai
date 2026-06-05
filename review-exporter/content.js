// Platform-agnostic content script.
// Picks an adapter from window.__REVIEW_EXPORTER and drives the scrape loop.

const BRIDGE_SOURCE = "review-exporter-bridge";
const BRIDGE_SCRIPT_ID = "review-exporter-page-bridge";

const registry = window.__REVIEW_EXPORTER;
const adapter = registry?.pick(window.location) || null;

const DEFAULT_SETTINGS = {
  paginationMode: "dom",
  requestSpeed: "auto",
  youtubeSortMode: "both",
  includeReplies: false,
  maxItems: 500
};

const SPEED_PRESETS = {
  slow: 5000,
  normal: 2800,
  fast: 1500
};

const PLATFORM_MIN_INTERVAL = {
  "shopee-th": { dom: 1000, api: 1200 },
  "lazada-th": { dom: 1500, api: 2500 },
  "tiktok-video": { dom: 1500, api: 2000 },
  "youtube-video": { dom: 1000, api: 1500 },
  "facebook-post": { dom: 1800, api: 2500 }
};

const state = {
  running: false,
  stopRequested: false,
  statusText: "Idle",
  reviewMap: new Map(),
  pageKeys: new Set(),
  logs: [],
  product: null,
  summary: null,
  paging: null,
  hasMore: null,
  totalItems: null,
  lastCapturedAt: 0,
  lastMatchedRequestAt: 0,
  lastRequestUrl: "",
  isProductPage: false,
  platform: adapter?.id || "",
  platformLabel: adapter?.label || "",
  region: adapter?.region || "",
  supportsDirectApi: Boolean(adapter?.supportsDirectApi),
  settings: { ...DEFAULT_SETTINGS },
  activeMode: "dom",
  currentSortMode: "",
  captureIndex: 0,
  rawSeenCount: 0,
  duplicateCount: 0,
  emptyCmtidCount: 0
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addLog = (message) => {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  state.logs.unshift(`[${timestamp}] ${message}`);
  state.logs = state.logs.slice(0, 16);
};

const loadSettings = async () => {
  try {
    const stored = await chrome.storage.local.get(["settings"]);
    if (stored?.settings && typeof stored.settings === "object") {
      state.settings = { ...DEFAULT_SETTINGS, ...stored.settings };
    }
  } catch {
    // Keep defaults when chrome.storage is unavailable.
  }
  if (adapter?.id === "youtube-video") {
    state.settings.includeReplies = false;
  }
};

const computeEffectiveDelay = (mode, settings, platformAdapter) => {
  const defaultMs = mode === "api" ? platformAdapter.apiIntervalMs : platformAdapter.clickIntervalMs;
  const speed = settings?.requestSpeed || "auto";
  let chosen = defaultMs;
  if (speed === "auto") {
    chosen = defaultMs;
  } else if (typeof speed === "number" && Number.isFinite(speed)) {
    chosen = speed;
  } else if (SPEED_PRESETS[speed]) {
    chosen = SPEED_PRESETS[speed];
  }
  const floor = PLATFORM_MIN_INTERVAL[platformAdapter.id]?.[mode] ?? 1000;
  return Math.max(chosen, floor);
};

const ensureBridgeInjected = () => {
  if (document.getElementById(BRIDGE_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = BRIDGE_SCRIPT_ID;
  script.src = chrome.runtime.getURL("page-bridge.js");
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
};

const notifyBridgeReady = () => {
  window.postMessage({ type: "review-exporter-consumer-ready" }, "*");
};

const updateProductState = () => {
  if (!adapter) {
    state.product = null;
    state.isProductPage = false;
    return;
  }
  state.product = adapter.parseProductInfo();
  state.isProductPage = Boolean(state.product?.itemid);
};

const serializeState = () => ({
  running: state.running,
  statusText: state.statusText,
  reviewCount: state.reviewMap.size,
  pageCount: state.pageKeys.size,
  logs: [...state.logs],
  product: state.product,
  summary: state.summary,
  paging: state.paging,
  hasMore: state.hasMore,
  totalItems: state.totalItems,
  isProductPage: state.isProductPage,
  platform: state.platform,
  platformLabel: state.platformLabel,
  region: state.region,
  supportsDirectApi: state.supportsDirectApi,
  supportsSortModes: Boolean(adapter?.supportsSortModes),
  supportsReplies: Boolean(adapter?.supportsReplies),
  itemLabel: adapter?.itemLabel || "Product",
  itemCountLabel: adapter?.itemCountLabel || "Reviews",
  pageCountLabel: adapter?.pageCountLabel || "Pages",
  settings: { ...state.settings },
  activeMode: state.activeMode,
  currentSortMode: state.currentSortMode
});

const consumeParsedReviews = (parsed, source = {}) => {
  let pageNew = 0;
  let pageDup = 0;
  let pageEmpty = 0;
  for (const raw of parsed?.reviews || []) {
    const normalized = adapter.normalizeReview(raw, state.product, {
      settings: state.settings,
      currentSortMode: state.currentSortMode
    });
    state.rawSeenCount += 1;
    if (!normalized.cmtid) {
      pageEmpty += 1;
      state.emptyCmtidCount += 1;
      continue;
    }

    const key = adapter.getReviewKey
      ? adapter.getReviewKey(normalized)
      : String(normalized.cmtid);
    if (state.reviewMap.has(key)) {
      pageDup += 1;
      state.duplicateCount += 1;
    } else {
      pageNew += 1;
    }
    state.reviewMap.set(key, normalized);
  }

  let pageKey = null;
  if (parsed.paging?.pageNo != null) {
    pageKey = `p${parsed.paging.pageNo}`;
    state.paging = parsed.paging;
    if (parsed.paging.totalItems != null) {
      state.totalItems = parsed.paging.totalItems;
    }
  } else {
    try {
      const offset = source.url ? new URL(source.url, location.origin).searchParams.get("offset") : null;
      if (offset != null) pageKey = `o${offset}`;
    } catch {
      // Ignore malformed URLs.
    }
  }
  if (!pageKey) pageKey = source.pageKey || `c${state.captureIndex}`;
  state.pageKeys.add(`${state.currentSortMode || "default"}:${pageKey}`);

  if (parsed.summary) state.summary = parsed.summary;
  if (parsed.hasMore != null) state.hasMore = parsed.hasMore;

  state.lastCapturedAt = Date.now();
  state.lastRequestUrl = source.url || source.label || "";

  const totalLabel = state.totalItems ? ` / ${state.totalItems}` : "";
  const dupLabel = pageDup > 0 ? ` (duplicates ${pageDup})` : "";
  const emptyLabel = pageEmpty > 0 ? ` (empty id ${pageEmpty})` : "";
  addLog(`Captured ${pageKey}: +${pageNew}${dupLabel}${emptyLabel}, total ${state.reviewMap.size}${totalLabel}`);
  if (!parsed?.reviews?.length) return false;
  if (source.requireNew && pageNew <= 0) return false;
  return true;
};

const consumeApiResponse = ({ url, data }) => {
  if (!adapter || !adapter.matchApiUrl(url)) return false;
  if (adapter.id === "youtube-video") {
    if (url.includes("/youtubei/v1/next")) {
      state.lastMatchedRequestAt = Date.now();
      state.lastRequestUrl = url;
    }
    return false;
  }

  state.lastMatchedRequestAt = Date.now();
  state.lastRequestUrl = url;
  state.captureIndex += 1;
  const parsed = adapter.parseApiResponse(data, url, {
    product: state.product,
    settings: state.settings,
    currentSortMode: state.currentSortMode,
    captureIndex: state.captureIndex
  });
  return consumeParsedReviews(parsed, { url });
};

const consumeDomSnapshot = (label = "dom") => {
  if (!adapter?.collectDomReviews) return false;
  state.captureIndex += 1;
  const parsed = adapter.collectDomReviews({
    product: state.product,
    settings: state.settings,
    currentSortMode: state.currentSortMode,
    captureIndex: state.captureIndex
  });
  return consumeParsedReviews(parsed, { label, pageKey: `${label}-${state.captureIndex}`, requireNew: true });
};

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== BRIDGE_SOURCE) return;
  const payload = event.data.payload;
  if (!payload?.url) return;
  consumeApiResponse(payload);
});

const waitForCondition = async (predicate, timeoutMs) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return true;
    await sleep(250);
  }
  return false;
};

const waitForNewCapture = async (previousTimestamp, timeoutMs) => {
  const updated = await waitForCondition(() => state.lastCapturedAt > previousTimestamp, timeoutMs);
  if (!updated) addLog("Timed out waiting for the next response.");
  return updated;
};

const bootstrapFirstPage = async () => {
  try {
    const direct = await adapter.bootstrapFirstPage();
    if (direct) {
      addLog("Bootstrapping page 1 directly.");
      return consumeApiResponse({ url: direct.url, data: direct.data });
    }
  } catch (e) {
    addLog(`Direct bootstrap failed: ${e?.message || e}`);
  }

  if (state.reviewMap.size > 0) {
    addLog(`Page 1 already captured (${state.reviewMap.size} reviews from bridge buffer).`);
    return true;
  }

  addLog("Waiting for page to issue first review request...");
  const previousTimestamp = state.lastCapturedAt;
  await adapter.scrollToReviewSection();
  return waitForNewCapture(previousTimestamp, adapter.responseTimeoutMs);
};

const runApiMode = async () => {
  const delay = computeEffectiveDelay("api", state.settings, adapter);
  addLog(`[API] Pacing ${delay}ms between requests.`);

  let pageNo = 1;
  while (!state.stopRequested) {
    addLog(`[API] Fetching page ${pageNo}...`);
    let result;
    try {
      result = await adapter.fetchPage(pageNo, state.product);
    } catch (err) {
      if (err?.code === "RGV587") {
        addLog(`Blocked: ${err.message}`);
      } else {
        addLog(`[API] Error on page ${pageNo}: ${err?.message || err}`);
      }
      throw err;
    }
    if (!result?.data) {
      addLog(`[API] Empty response on page ${pageNo}.`);
      break;
    }

    consumeApiResponse({ url: result.url, data: result.data });

    const paging = state.paging;
    if (paging?.totalPages != null && pageNo >= Number(paging.totalPages)) {
      addLog("[API] Reached final page.");
      break;
    }
    if (state.hasMore === false) {
      addLog("[API] hasMore=false, done.");
      break;
    }

    pageNo += 1;
    await sleep(delay);
  }
};

const runDomMode = async () => {
  const delay = computeEffectiveDelay("dom", state.settings, adapter);
  addLog(`[DOM] Pacing ${delay}ms between clicks.`);

  await adapter.scrollToReviewSection();
  await bootstrapFirstPage();

  while (!state.stopRequested) {
    if (state.hasMore === false) {
      addLog("Reached the final review page.");
      break;
    }

    const previousTimestamp = state.lastCapturedAt;
    const click = await adapter.clickNextPage({
      settings: state.settings,
      currentSortMode: state.currentSortMode,
      reviewCount: state.reviewMap.size
    });
    if (!click.clicked) {
      addLog(`Stopped clicking: ${click.reason || "unknown"}.`);
      break;
    }
    addLog("Triggered next DOM load.");

    const captured = await waitForNewCapture(previousTimestamp, adapter.responseTimeoutMs);
    if (!captured) break;

    await sleep(delay);
  }
};

const reachedMaxItems = () => {
  const max = Number(state.settings.maxItems || 0);
  return max > 0 && state.reviewMap.size >= max;
};

const runYouTubeMode = async () => {
  const delay = computeEffectiveDelay("dom", state.settings, adapter);
  const modes = adapter.getSortModes(state.settings.youtubeSortMode);
  addLog(`[YouTube] Pacing ${delay}ms. Sort modes: ${modes.join(", ")}.`);

  for (const mode of modes) {
    if (state.stopRequested || reachedMaxItems()) break;
    state.currentSortMode = mode;
    state.hasMore = null;
    addLog(`[YouTube] Loading ${mode === "newest" ? "Newest first" : "Top comments"}...`);

    if (adapter.selectSortMode) {
      const selected = await adapter.selectSortMode(mode);
      if (!selected.changed) addLog(`[YouTube] Sort menu fallback: ${selected.reason || "unchanged"}.`);
    } else {
      await adapter.scrollToReviewSection();
    }

    consumeDomSnapshot(`${mode}-initial`);
    await sleep(800);
    consumeDomSnapshot(`${mode}-settled`);
    if (adapter.hasSelectedCommentsNotice?.()) {
      addLog(`[YouTube] Selected-comments notice found; comments are fully loaded for ${mode}.`);
      continue;
    }

    while (!state.stopRequested && !reachedMaxItems()) {
      if (adapter.hasSelectedCommentsNotice?.()) {
        consumeDomSnapshot(`${mode}-notice`);
        addLog(`[YouTube] Selected-comments notice found; comments are fully loaded for ${mode}.`);
        break;
      }

      const previousRequestTimestamp = state.lastMatchedRequestAt;
      const click = await adapter.clickNextPage({
        settings: state.settings,
        currentSortMode: state.currentSortMode,
        reviewCount: state.reviewMap.size
      });
      if (!click.clicked) {
        addLog(`[YouTube] Stopped scrolling: ${click.reason || "unknown"}.`);
        break;
      }

      const requested = await waitForCondition(
        () => state.lastMatchedRequestAt > previousRequestTimestamp,
        adapter.responseTimeoutMs
      );
      if (!requested) {
        consumeDomSnapshot(`${mode}-final`);
        addLog(`[YouTube] No new /youtubei/v1/next request after scrolling; comments are fully loaded for ${mode}.`);
        break;
      }

      if (adapter.hasSelectedCommentsNotice?.()) {
        consumeDomSnapshot(`${mode}-notice`);
        addLog(`[YouTube] Selected-comments notice found after scrolling; comments are fully loaded for ${mode}.`);
        break;
      }

      await sleep(800);
      consumeDomSnapshot(`${mode}-scroll`);
      await sleep(delay);
    }
  }
};

const runScrollableDomMode = async () => {
  const delay = computeEffectiveDelay("dom", state.settings, adapter);
  addLog(`[${adapter.label}] Pacing ${delay}ms while scrolling.`);

  await adapter.scrollToReviewSection();
  consumeDomSnapshot("initial");
  await sleep(900);
  consumeDomSnapshot("settled");

  let idleRounds = 0;
  while (!state.stopRequested && !reachedMaxItems()) {
    const before = state.reviewMap.size;
    const click = await adapter.clickNextPage({
      settings: state.settings,
      currentSortMode: state.currentSortMode,
      reviewCount: state.reviewMap.size
    });
    await sleep(delay);
    consumeDomSnapshot("scroll");

    const added = state.reviewMap.size - before;
    if (added <= 0) {
      idleRounds += 1;
    } else {
      idleRounds = 0;
      addLog(`[${adapter.label}] Added ${added} comments after scroll.`);
    }

    if (!click.clicked && idleRounds >= 1) {
      addLog(`[${adapter.label}] Stopped scrolling: ${click.reason || "unknown"}.`);
      break;
    }
    if (idleRounds >= 4) {
      addLog(`[${adapter.label}] No new comments after repeated scrolls; done.`);
      break;
    }
  }
};

const startScrape = async () => {
  if (!adapter) {
    state.statusText = "No adapter for this site";
    addLog("No platform adapter matched this URL.");
    return serializeState();
  }

  updateProductState();

  if (!state.isProductPage) {
    state.statusText = `Not a ${adapter.itemLabel.toLowerCase()} page`;
    addLog(`Current tab is not a ${adapter.label} ${adapter.itemLabel.toLowerCase()} page.`);
    return serializeState();
  }

  if (state.running) {
    addLog("Scrape is already running.");
    return serializeState();
  }

  ensureBridgeInjected();
  await loadSettings();

  const requested = state.settings.paginationMode === "api" ? "api" : "dom";
  const useApi = (adapter.id === "tiktok-video" && adapter.supportsDirectApi) || (requested === "api" && adapter.supportsDirectApi);
  if (requested === "api" && !adapter.supportsDirectApi) {
    addLog(`[${adapter.label}] Direct API is not supported by this adapter; falling back to DOM mode.`);
  }
  state.activeMode = useApi ? "api" : "dom";

  state.running = true;
  state.stopRequested = false;
  state.statusText = `Running (${state.activeMode.toUpperCase()})`;
  addLog(`[${adapter.label}] Started on ${adapter.itemLabel.toLowerCase()} ${state.product.itemid}.`);

  try {
    if (adapter.id === "youtube-video") {
      await runYouTubeMode();
    } else if (adapter.id === "facebook-post") {
      await runScrollableDomMode();
    } else if (useApi) {
      await runApiMode();
    } else {
      await runDomMode();
    }

    state.statusText = state.stopRequested ? "Stopped" : "Completed";
    addLog(`Summary: raw ${state.rawSeenCount}, unique ${state.reviewMap.size}, duplicates ${state.duplicateCount}, empty id ${state.emptyCmtidCount}.`);
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
  state.pageKeys.clear();
  state.summary = null;
  state.paging = null;
  state.hasMore = null;
  state.totalItems = null;
  state.lastCapturedAt = 0;
  state.lastMatchedRequestAt = 0;
  state.lastRequestUrl = "";
  state.rawSeenCount = 0;
  state.duplicateCount = 0;
  state.emptyCmtidCount = 0;
  state.currentSortMode = "";
  state.captureIndex = 0;
  state.statusText = "Idle";
  addLog("Collected data cleared.");
  return serializeState();
};

const escapeCsv = (value) => {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replace(/"/g, "\"\"")}"`;
};

const sortReviews = (reviews) =>
  [...reviews].sort((a, b) => {
    const sa = String(a.sort_mode || "");
    const sb = String(b.sort_mode || "");
    if (sa !== sb) return sa.localeCompare(sb);
    const ai = String(a.cmtid || "");
    const bi = String(b.cmtid || "");
    const an = Number(ai);
    const bn = Number(bi);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return ai.localeCompare(bi);
  });

const buildExportPayload = (format) => {
  const reviews = sortReviews([...state.reviewMap.values()]);
  const platformId = state.platform || "review";
  const region = state.region ? `-${state.region.toLowerCase()}` : "";
  const baseName = `${platformId}${region}-reviews-${state.product?.shopid || "source"}-${state.product?.itemid || "item"}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}`;

  if (format === "json") {
    const content = JSON.stringify(
      {
        platform: state.platform,
        platformLabel: state.platformLabel,
        product: state.product,
        summary: state.summary,
        paging: state.paging,
        total_collected: reviews.length,
        total_items: state.totalItems,
        stats: {
          raw_seen: state.rawSeenCount,
          duplicates: state.duplicateCount,
          empty_cmtid: state.emptyCmtidCount,
          unique: reviews.length
        },
        page_keys: [...state.pageKeys],
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

  const headers = registry?.UNIFIED_FIELDS || Object.keys(reviews[0] || {});
  const rows = reviews.map((review) => headers.map((header) => escapeCsv(review[header])).join(","));

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

const updateSettings = async (incoming) => {
  if (incoming && typeof incoming === "object") {
    state.settings = { ...state.settings, ...incoming };
    try {
      await chrome.storage.local.set({ settings: state.settings });
    } catch {
      // Ignore storage write failures.
    }
  }
  return serializeState();
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message?.type;

  if (type === "GET_STATE") {
    updateProductState();
    ensureBridgeInjected();
    notifyBridgeReady();
    loadSettings().then(() => sendResponse(serializeState()));
    return true;
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
  if (type === "UPDATE_SETTINGS") {
    updateSettings(message.settings).then(sendResponse);
    return true;
  }
  if (type === "EXPORT_REVIEWS") {
    exportReviews(message.format || "json").then(sendResponse);
    return true;
  }
  return false;
});

if (!adapter) {
  state.statusText = "Unsupported site";
  addLog("No platform adapter matched this URL.");
} else {
  updateProductState();
  ensureBridgeInjected();
  notifyBridgeReady();
  loadSettings().then(() => addLog(`Content script ready (${adapter.label}).`));
}
