const statusText = document.getElementById("statusText");
const reviewCount = document.getElementById("reviewCount");
const pageCount = document.getElementById("pageCount");
const pageHint = document.getElementById("pageHint");
const logBox = document.getElementById("logBox");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const jsonBtn = document.getElementById("jsonBtn");
const csvBtn = document.getElementById("csvBtn");
const clearBtn = document.getElementById("clearBtn");

let activeTabId = null;

const queryActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  return tab;
};

const ensureContentScript = async (tab) => {
  if (!tab?.id || !/^https:\/\/shopee\.co\.th\//.test(tab.url || "")) {
    return false;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "GET_STATE" });
    return true;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
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

const renderState = (state, tab) => {
  const isShopeePage = /^https:\/\/shopee\.co\.th\//.test(tab?.url || "");
  const isProductPage = state?.isProductPage;
  const running = Boolean(state?.running);

  pageHint.textContent = !isShopeePage
    ? "Open a Shopee Thailand product detail page first."
    : isProductPage
      ? `Product: ${state.product?.itemid || "-"} | Shop: ${state.product?.shopid || "-"}`
      : "Current page is not recognized as a Shopee product detail page.";

  statusText.textContent = state?.statusText || "Idle";
  reviewCount.textContent = String(state?.reviewCount ?? 0);
  pageCount.textContent = String(state?.pageCount ?? 0);

  startBtn.disabled = !isProductPage || running;
  stopBtn.disabled = !isProductPage || !running;
  jsonBtn.disabled = !isProductPage || !state?.reviewCount;
  csvBtn.disabled = !isProductPage || !state?.reviewCount;
  clearBtn.disabled = !isProductPage || running || !state?.reviewCount;

  setLog(state?.logs?.length ? state.logs : ["Waiting for page data..."]);
};

const refreshState = async () => {
  const tab = await queryActiveTab();

  if (!tab?.id || !/^https:\/\/shopee\.co\.th\//.test(tab.url || "")) {
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
        logs: [
          "Content script is not ready.",
          String(error?.message || error)
        ]
      },
      tab
    );
  }
};

startBtn.addEventListener("click", async () => {
  try {
    await sendTabMessage("START_SCRAPE");
    await refreshState();
  } catch (error) {
    setLog(["Failed to start.", String(error?.message || error)]);
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    await sendTabMessage("STOP_SCRAPE");
    await refreshState();
  } catch (error) {
    setLog(["Failed to stop.", String(error?.message || error)]);
  }
});

jsonBtn.addEventListener("click", async () => {
  try {
    const result = await sendTabMessage("EXPORT_REVIEWS", { format: "json" });
    setLog(result?.logs || ["JSON export requested."]);
    if (result && result.ok === false) {
      statusText.textContent = "Export failed";
    }
    await refreshState();
  } catch (error) {
    setLog(["Failed to export JSON.", String(error?.message || error)]);
  }
});

csvBtn.addEventListener("click", async () => {
  try {
    const result = await sendTabMessage("EXPORT_REVIEWS", { format: "csv" });
    setLog(result?.logs || ["CSV export requested."]);
    if (result && result.ok === false) {
      statusText.textContent = "Export failed";
    }
    await refreshState();
  } catch (error) {
    setLog(["Failed to export CSV.", String(error?.message || error)]);
  }
});

clearBtn.addEventListener("click", async () => {
  try {
    await sendTabMessage("CLEAR_DATA");
    await refreshState();
  } catch (error) {
    setLog(["Failed to clear data.", String(error?.message || error)]);
  }
});

refreshState();
setInterval(refreshState, 1000);
