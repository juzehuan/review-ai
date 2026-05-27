(() => {
  if (window.__shopeeReviewExporterBridgeInstalled) {
    return;
  }

  window.__shopeeReviewExporterBridgeInstalled = true;

  const TARGET_PATH = "/api/v2/item/get_ratings";

  const postPayload = (payload) => {
    window.postMessage(
      {
        source: "shopee-review-exporter-bridge",
        payload
      },
      "*"
    );
  };

  const normalizeUrl = (input) => {
    try {
      return typeof input === "string" ? input : input?.url || "";
    } catch {
      return "";
    }
  };

  const isRatingsRequest = (url) => {
    if (!url) {
      return false;
    }

    try {
      return new URL(url, window.location.origin).pathname === TARGET_PATH;
    } catch {
      return url.includes(TARGET_PATH);
    }
  };

  const emitResponse = async ({ url, method, response }) => {
    if (!isRatingsRequest(url) || !response) {
      return;
    }

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
      // Ignore non-JSON responses.
    }
  };

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const [resource, init] = args;
    const url = normalizeUrl(resource);
    const method = init?.method || (typeof resource === "object" ? resource?.method : "GET") || "GET";

    emitResponse({ url, method, response });

    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
    this.__shopeeReviewExporterMeta = {
      method,
      url
    };

    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function patchedSend(...args) {
    this.addEventListener("load", () => {
      const meta = this.__shopeeReviewExporterMeta;
      if (!meta?.url || !isRatingsRequest(meta.url)) {
        return;
      }

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
        // Ignore malformed JSON payloads.
      }
    });

    return originalSend.call(this, ...args);
  };
})();
