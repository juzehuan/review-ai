// Page-context bridge: hooks fetch + XHR and forwards review-API responses to content.js.
// Runs in MAIN world at document_start so it captures the very first page-load fetches.
// Buffers payloads until content.js (isolated world, document_idle) signals readiness.

(() => {
  if (window.__reviewExporterBridgeInstalled) {
    return;
  }
  window.__reviewExporterBridgeInstalled = true;

  const TARGET_PATTERNS = [
    "/api/v2/item/get_ratings",                            // Shopee
    "mtop.lazada.review.item.getpcreviewlist",             // Lazada
    "/api/shop/pdp_desktop/get_product_reviews",           // TikTok Shop
    "/api/comment/list/",                                  // TikTok video comments
    "/youtubei/v1/next",                                   // YouTube comments
    "/youtubei/v1/browse"                                  // YouTube continuations
  ];

  const BUFFER = [];
  const BUFFER_CAP = 100;
  let consumerReady = false;

  const dispatch = (payload) => {
    window.postMessage(
      { source: "review-exporter-bridge", payload },
      "*"
    );
  };

  const postPayload = (payload) => {
    if (consumerReady) {
      dispatch(payload);
      return;
    }
    BUFFER.push(payload);
    if (BUFFER.length > BUFFER_CAP) BUFFER.shift();
  };

  // When content.js attaches its listener, it sends "flush" so we replay the buffer.
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== "review-exporter-consumer-ready") return;
    consumerReady = true;
    while (BUFFER.length) {
      dispatch(BUFFER.shift());
    }
  });

  const normalizeUrl = (input) => {
    try {
      return typeof input === "string" ? input : input?.url || "";
    } catch {
      return "";
    }
  };

  const isTargetRequest = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return TARGET_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
  };

  const emitFetchResponse = async ({ url, method, response }) => {
    if (!isTargetRequest(url) || !response) return;
    try {
      const data = await response.clone().json();
      postPayload({
        channel: "fetch",
        method,
        url,
        data,
        capturedAt: Date.now()
      });
    } catch {
      // non-JSON: ignore
    }
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const [resource, init] = args;
    const url = normalizeUrl(resource);
    const method =
      init?.method ||
      (typeof resource === "object" ? resource?.method : "GET") ||
      "GET";
    emitFetchResponse({ url, method, response });
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
    this.__reviewExporterMeta = { method, url };
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function patchedSend(...args) {
    this.addEventListener("load", () => {
      const meta = this.__reviewExporterMeta;
      if (!meta?.url || !isTargetRequest(meta.url)) return;
      try {
        const data = JSON.parse(this.responseText);
        postPayload({
          channel: "xhr",
          method: meta.method || "GET",
          url: meta.url,
          data,
          capturedAt: Date.now()
        });
      } catch {
        // ignore malformed JSON
      }
    });
    return originalSend.call(this, ...args);
  };
})();
