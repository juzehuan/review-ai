// Platform adapter registry & base class.
// Loaded as a content script before any specific adapter or content.js.
// Adapters register themselves into window.__REVIEW_EXPORTER.

(() => {
  if (window.__REVIEW_EXPORTER) {
    return;
  }

  const registry = {
    adapters: [],
    register(adapter) {
      this.adapters.push(adapter);
    },
    pick(loc = window.location) {
      return this.adapters.find((a) => a.matchHost(loc)) || null;
    }
  };

  // Unified canonical review schema. Every adapter must output these fields.
  const UNIFIED_FIELDS = [
    "platform",
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
    "original_url",
    "sort_mode",
    "parent_cmtid",
    "is_reply",
    "reply_count",
    "author_channel_url",
    "video_id",
    "video_title",
    "published_time_text"
  ];

  const emptyReview = () => ({
    platform: "",
    shopid: "",
    itemid: "",
    cmtid: "",
    userid: "",
    author_username: "",
    anonymous: false,
    rating_star: "",
    rating: "",
    comment: "",
    comment_tr: "",
    like_count: 0,
    ctime: "",
    ctime_iso: "",
    submit_time: "",
    submit_time_iso: "",
    model_name: "",
    options: "",
    product_name: "",
    images: "",
    video_urls: "",
    video_covers: "",
    has_media: false,
    region: "",
    review_type: "",
    product_quality: "",
    seller_service: "",
    delivery_service: "",
    original_url: "",
    sort_mode: "",
    parent_cmtid: "",
    is_reply: false,
    reply_count: "",
    author_channel_url: "",
    video_id: "",
    video_title: "",
    published_time_text: ""
  });

  // Adapters extend this and override the platform-specific methods.
  class BasePlatformAdapter {
    // Identity
    get id() { return "base"; }
    get label() { return "Base"; }
    get region() { return ""; }
    get itemLabel() { return "Product"; }
    get itemCountLabel() { return "Reviews"; }
    get pageCountLabel() { return "Pages"; }
    get supportsSortModes() { return false; }
    get supportsReplies() { return false; }

    // Match this adapter to current page
    matchHost(_loc) { return false; }

    // Parse current location → product info or null if not a product page.
    // Return shape: { shopid, itemid, url, title }
    parseProductInfo() { return null; }

    // Detect whether an intercepted URL is the review API
    matchApiUrl(_url) { return false; }

    // Parse intercepted API response.
    // Return shape: { reviews: rawReview[], paging: { pageNo, totalPages, totalItems } | null, hasMore: boolean | null, summary: object | null }
    parseApiResponse(_data, _url, _context) {
      return { reviews: [], paging: null, hasMore: null, summary: null };
    }

    // Normalize a single raw review into UNIFIED_FIELDS shape
    normalizeReview(_rawReview, _productInfo, _context) {
      return emptyReview();
    }

    getReviewKey(normalizedReview) {
      return String(normalizedReview?.cmtid || "");
    }

    // Optional: directly fetch first page (Shopee). Lazada returns null.
    async bootstrapFirstPage() { return null; }

    // Direct-API mode capability
    get supportsDirectApi() { return false; }
    get directApiPageSize() { return 6; }

    // Direct-API mode: fetch a specific page. Returns { url, data } or null.
    // pageIndex starts at 1 (page numbers) for Lazada, or means offset / pageSize for Shopee.
    async fetchPage(_pageIndex, _productInfo) { return null; }

    // Scroll the page so review section comes into view (and lazy load fires)
    async scrollToReviewSection() {
      window.scrollTo({ top: document.body.scrollHeight * 0.55, behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 800));
    }

    // Click the next-page button. Returns { clicked: boolean, reason?: string }
    async clickNextPage() { return { clicked: false, reason: "not-implemented" }; }

    // Pace between successive page clicks (ms) — DOM mode
    get clickIntervalMs() { return 1400; }

    // Pace between successive API calls (ms) — Direct API mode (often slower due to anti-bot)
    get apiIntervalMs() { return 2000; }

    // Max wait for a new captured response after clicking next (ms)
    get responseTimeoutMs() { return 12000; }
  }

  registry.BasePlatformAdapter = BasePlatformAdapter;
  registry.UNIFIED_FIELDS = UNIFIED_FIELDS;
  registry.emptyReview = emptyReview;

  window.__REVIEW_EXPORTER = registry;
})();
