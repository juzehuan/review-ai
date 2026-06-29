const statusText = document.getElementById("statusText");
const reviewCount = document.getElementById("reviewCount");
const reviewTotalHint = document.getElementById("reviewTotalHint");
const pageCount = document.getElementById("pageCount");
const itemCountLabel = document.getElementById("itemCountLabel");
const pageCountLabel = document.getElementById("pageCountLabel");
const pageHint = document.getElementById("pageHint");
const platformBadge = document.getElementById("platformBadge");
const logBox = document.getElementById("logBox");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const jsonBtn = document.getElementById("jsonBtn");
const csvBtn = document.getElementById("csvBtn");
const clearBtn = document.getElementById("clearBtn");
const apiUnsupportedNote = document.getElementById("apiUnsupportedNote");
const commerceSettings = document.getElementById("commerceSettings");
const youtubeSettings = document.getElementById("youtubeSettings");
const youtubeSortMode = document.getElementById("youtubeSortMode");
const includeReplies = document.getElementById("includeReplies");
const maxItems = document.getElementById("maxItems");
const paginationRadios = document.querySelectorAll('input[name="paginationMode"]');
const speedRadios = document.querySelectorAll('input[name="requestSpeed"]');

let activeTabId = null;
let pendingSettingWrite = false;

const SUPPORTED_HOST_RE = /^https:\/\/(shopee\.co\.th|(www\.)?lazada\.co\.th|www\.tiktok\.com\/(shop\/|@[^/]+\/video\/)|(www\.|m\.)?youtube\.com\/(watch|shorts\/)|(www\.|m\.|web\.)?facebook\.com\/)/i;

const CONTENT_FILES = [
  "adapters/platform.js",
  "adapters/_utils.js",
  "adapters/shopee-th.js",
  "adapters/lazada-th.js",
  "adapters/tiktok-th.js",
  "adapters/tiktok-video.js",
  "adapters/youtube-video.js",
  "adapters/facebook-post.js",
  "content.js"
];

const queryActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  return tab;
};

const ensureContentScript = async (tab) => {
  if (!tab?.id || !SUPPORTED_HOST_RE.test(tab.url || "")) {
    return false;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "GET_STATE" });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["page-bridge.js"],
        world: "MAIN"
      });
    } catch {
      // The bridge is idempotent; duplicate injection errors can be ignored.
    }
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: CONTENT_FILES
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    return true;
  }
};

const sendTabMessage = async (type, payload = {}) => {
  if (!activeTabId) {
    throw new Error("No active tab found.");
  }
  return chrome.tabs.sendMessage(activeTabId, { type, ...payload });
};

const setLog = (lines) => {
  logBox.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
};

const setBadge = (platform, label) => {
  platformBadge.className = "badge";
  if (platform === "shopee-th") {
    platformBadge.classList.add("badge-shopee");
    platformBadge.textContent = label || "Shopee TH";
  } else if (platform === "lazada-th") {
    platformBadge.classList.add("badge-lazada");
    platformBadge.textContent = label || "Lazada TH";
  } else if (platform === "tiktok-th") {
    platformBadge.classList.add("badge-tiktok");
    platformBadge.textContent = label || "TikTok TH";
  } else if (platform === "tiktok-video") {
    platformBadge.classList.add("badge-tiktok");
    platformBadge.textContent = label || "TikTok Video";
  } else if (platform === "youtube-video") {
    platformBadge.classList.add("badge-youtube");
    platformBadge.textContent = label || "YouTube";
  } else if (platform === "facebook-post") {
    platformBadge.classList.add("badge-facebook");
    platformBadge.textContent = label || "Facebook Post";
  } else {
    platformBadge.classList.add("badge-default");
    platformBadge.textContent = "未匹配";
  }
};

const setControlDisabled = (running) => {
  paginationRadios.forEach((radio) => { radio.disabled = running; });
  speedRadios.forEach((radio) => { radio.disabled = running; });
  youtubeSortMode.disabled = running;
  includeReplies.disabled = running;
  maxItems.disabled = running;
};

const renderSettings = (state, running) => {
  const isYouTube = state?.platform === "youtube-video";
  const isTikTokVideo = state?.platform === "tiktok-video";
  const isFacebookPost = state?.platform === "facebook-post";
  commerceSettings.hidden = isYouTube;
  youtubeSettings.hidden = !isYouTube;

  if (!pendingSettingWrite && state?.settings) {
    const mode = state.settings.paginationMode || "dom";
    paginationRadios.forEach((radio) => {
      radio.checked = radio.value === mode;
    });

    const speed = state.settings.requestSpeed || "auto";
    speedRadios.forEach((radio) => {
      radio.checked = radio.value === speed;
    });

    youtubeSortMode.value = state.settings.youtubeSortMode || "both";
    includeReplies.checked = state.settings.includeReplies !== false;
    if (isYouTube && state.supportsReplies === false) {
      includeReplies.checked = false;
    }
    maxItems.value = String(state.settings.maxItems ?? 500);
  }

  if (apiUnsupportedNote) {
    const showWarn = state?.platform && state.supportsDirectApi === false && !isYouTube && !isFacebookPost;
    apiUnsupportedNote.hidden = !showWarn;
  }
  setControlDisabled(running);
  if (isYouTube && state?.supportsReplies === false) {
    includeReplies.disabled = true;
  }
};

const renderState = (state, tab) => {
  const isSupported = SUPPORTED_HOST_RE.test(tab?.url || "");
  const isProductPage = state?.isProductPage;
  const running = Boolean(state?.running);
  const itemLabel = state?.itemLabel || "Product";
  const countLabel = state?.itemCountLabel || "Reviews";
  const loadsLabel = state?.pageCountLabel || "Pages";

  setBadge(state?.platform, state?.platformLabel);
  itemCountLabel.textContent = countLabel;
  pageCountLabel.textContent = loadsLabel;

  if (!isSupported) {
    pageHint.textContent = "请先打开 Shopee / Lazada / TikTok Shop 商品页，或 YouTube 视频页。";
  } else if (!isProductPage) {
    pageHint.textContent = `当前页面还没有识别到 ${itemLabel} 信息。`;
  } else if (state.platform === "youtube-video") {
    pageHint.textContent = `Video: ${state.product?.itemid || "-"} | ${state.product?.title || ""}`;
  } else if (state.platform === "tiktok-video") {
    pageHint.textContent = `TikTok Video: ${state.product?.itemid || "-"} | ${state.product?.title || ""}`;
  } else if (state.platform === "facebook-post") {
    pageHint.textContent = `Facebook Post: ${state.product?.itemid || "-"} | ${state.product?.title || ""}`;
  } else {
    const shopText = state.product?.shopid ? ` | Shop: ${state.product.shopid}` : "";
    pageHint.textContent = `Product: ${state.product?.itemid || "-"}${shopText}`;
  }

  statusText.textContent = state?.statusText || "Idle";
  reviewCount.textContent = String(state?.reviewCount ?? 0);
  pageCount.textContent = String(state?.pageCount ?? 0);
  reviewTotalHint.textContent = state?.totalItems ? `/ ${state.totalItems}` : "";

  startBtn.disabled = !isProductPage || running;
  stopBtn.disabled = !isProductPage || !running;
  jsonBtn.disabled = !isProductPage || !state?.reviewCount;
  csvBtn.disabled = !isProductPage || !state?.reviewCount;
  clearBtn.disabled = !isProductPage || running || !state?.reviewCount;

  renderSettings(state, running);
  setLog(state?.logs?.length ? state.logs : ["等待页面数据..."]);
};

const refreshState = async () => {
  const tab = await queryActiveTab();

  if (!tab?.id || !SUPPORTED_HOST_RE.test(tab.url || "")) {
    renderState(null, tab);
    return;
  }

  try {
    await ensureContentScript(tab);
    const state = await sendTabMessage("GET_STATE");
    renderState(state, tab);
  } catch (error) {
    renderState(
      {
        statusText: "Unavailable",
        logs: ["Content script is not ready.", String(error?.message || error)]
      },
      tab
    );
  }
};

const persistSetting = async (key, value) => {
  pendingSettingWrite = true;
  try {
    await sendTabMessage("UPDATE_SETTINGS", { settings: { [key]: value } });
    try {
      const stored = await chrome.storage.local.get(["settings"]);
      const next = { ...(stored?.settings || {}), [key]: value };
      await chrome.storage.local.set({ settings: next });
    } catch {
      // Ignore local storage errors.
    }
  } catch (e) {
    setLog(["设置保存失败。", String(e?.message || e)]);
  } finally {
    setTimeout(() => {
      pendingSettingWrite = false;
    }, 1000);
  }
};

startBtn.addEventListener("click", async () => {
  try {
    await sendTabMessage("START_SCRAPE");
    await refreshState();
  } catch (error) {
    setLog(["启动失败。", String(error?.message || error)]);
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    await sendTabMessage("STOP_SCRAPE");
    await refreshState();
  } catch (error) {
    setLog(["停止失败。", String(error?.message || error)]);
  }
});

jsonBtn.addEventListener("click", async () => {
  try {
    const result = await sendTabMessage("EXPORT_REVIEWS", { format: "json" });
    setLog(result?.logs || ["已请求导出 JSON。"]);
    if (result && result.ok === false) statusText.textContent = "Export failed";
    await refreshState();
  } catch (error) {
    setLog(["导出 JSON 失败。", String(error?.message || error)]);
  }
});

csvBtn.addEventListener("click", async () => {
  try {
    const result = await sendTabMessage("EXPORT_REVIEWS", { format: "csv" });
    setLog(result?.logs || ["已请求导出 CSV。"]);
    if (result && result.ok === false) statusText.textContent = "Export failed";
    await refreshState();
  } catch (error) {
    setLog(["导出 CSV 失败。", String(error?.message || error)]);
  }
});

clearBtn.addEventListener("click", async () => {
  try {
    await sendTabMessage("CLEAR_DATA");
    await refreshState();
  } catch (error) {
    setLog(["清空失败。", String(error?.message || error)]);
  }
});

paginationRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) persistSetting("paginationMode", radio.value);
  });
});

speedRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) persistSetting("requestSpeed", radio.value);
  });
});

youtubeSortMode.addEventListener("change", () => {
  persistSetting("youtubeSortMode", youtubeSortMode.value);
});

includeReplies.addEventListener("change", () => {
  persistSetting("includeReplies", includeReplies.checked);
});

maxItems.addEventListener("change", () => {
  const value = Math.max(0, Number(maxItems.value || 0));
  persistSetting("maxItems", value);
});

refreshState();
setInterval(refreshState, 1000);
