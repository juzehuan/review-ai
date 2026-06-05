// TikTok Shop Thailand adapter

(() => {
  const registry = window.__REVIEW_EXPORTER;
  if (!registry || !registry.BasePlatformAdapter) {
    return;
  }

  const API_PATTERN = "/api/shop/pdp_desktop/get_product_reviews";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // i18n labels for the "Next page" button text. The TikTok PDP localizes by user setting.
  const NEXT_LABELS = ["下一步", "Next", "ถัดไป", "下一页"];
  const PREV_LABELS = ["上一步", "Previous", "ก่อนหน้า", "上一页"];

  class TikTokThAdapter extends registry.BasePlatformAdapter {
    get id() { return "tiktok-th"; }
    get label() { return "TikTok TH"; }
    get region() { return "TH"; }

    matchHost(loc) {
      return (loc.hostname === "www.tiktok.com" || loc.hostname === "tiktok.com") && /^\/shop\//i.test(loc.pathname);
    }

    parseProductInfo() {
      // /shop/{country}/pdp/{productId}
      const match = window.location.pathname.match(/\/shop\/[a-z]+\/pdp\/(\d+)/i);
      if (!match) return null;
      return {
        shopid: "",                   // TikTok PDP URL doesn't expose a shop_id
        itemid: match[1],
        url: window.location.href,
        title: document.title
      };
    }

    matchApiUrl(url) {
      if (!url) return false;
      return url.includes(API_PATTERN);
    }

    parseApiResponse(data) {
      const reviews = data?.data?.product_reviews;
      if (!Array.isArray(reviews)) {
        return { reviews: [], paging: null, hasMore: null, summary: null };
      }
      const totalReviews = Number(data.data.total_reviews);
      const paging = Number.isFinite(totalReviews) && totalReviews > 0
        ? { totalItems: totalReviews }
        : null;
      return {
        reviews,
        paging,
        hasMore: Boolean(data.data.has_more),
        summary: data.data.review_ratings || null
      };
    }

    normalizeReview(rev, product) {
      const images = Array.isArray(rev.review_images) ? rev.review_images : [];
      const tsRaw = rev.review_time;
      const ts = Number(tsRaw);
      const ctimeIso = Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString() : "";

      return {
        platform: this.id,
        shopid: "",
        itemid: rev.product_id ? String(rev.product_id) : product?.itemid || "",
        cmtid: rev.review_id != null ? String(rev.review_id) : "",
        userid: rev.reviewer_id != null ? String(rev.reviewer_id) : "",
        author_username: rev.reviewer_name || "",
        anonymous: false,
        rating_star: rev.review_rating ?? "",
        rating: rev.review_rating ?? "",
        comment: rev.review_text || "",
        comment_tr: "",
        like_count: 0,
        ctime: Number.isFinite(ts) ? Math.floor(ts / 1000) : "",
        ctime_iso: ctimeIso,
        submit_time: "",
        submit_time_iso: "",
        model_name: rev.sku_specification || "",
        options: rev.sku_specification || "",
        product_name: rev.product_name || "",
        images: images.join(" | "),
        video_urls: "",
        video_covers: "",
        has_media: images.length > 0,
        region: rev.review_country || "TH",
        review_type: rev.is_verified_purchase ? "verified" : (rev.is_incentivized_review ? "incentivized" : ""),
        product_quality: "",
        seller_service: "",
        delivery_service: "",
        original_url: product?.url || ""
      };
    }

    // TikTok requires X-Tts-Oec-Bsid session token → cannot bootstrap directly.
    async bootstrapFirstPage() { return null; }
    get supportsDirectApi() { return false; }

    async scrollToReviewSection() {
      // Try to find a "Reviews" / "评价" heading by text first
      const headingSelectors = "h1, h2, h3, h4, [class*='review' i], [class*='Reviews']";
      const candidates = document.querySelectorAll(headingSelectors);
      for (const el of candidates) {
        const text = (el.textContent || "").trim();
        if (/^reviews?(\s*\(\d+\))?$/i.test(text) || /^评价/.test(text) || /รีวิว/.test(text)) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await sleep(800);
          return;
        }
      }
      // Fallback: scroll near bottom; PDP review section is typically there
      window.scrollTo({ top: document.body.scrollHeight * 0.7, behavior: "smooth" });
      await sleep(1000);
      // Nudge a bit further to fully render the review widget
      window.scrollBy({ top: 300, behavior: "smooth" });
      await sleep(500);
    }

    async clickNextPage() {
      const candidates = document.querySelectorAll("div.cursor-pointer");
      let nextBtn = null;
      for (const el of candidates) {
        const label = (el.querySelector("div.Headline-Semibold")?.textContent || "").trim();
        if (NEXT_LABELS.includes(label)) {
          nextBtn = el;
          break;
        }
      }
      if (!nextBtn) return { clicked: false, reason: "no-button" };

      // Disabled = has placeholder text color class (same convention as previous-button when on page 1)
      const isDisabled = nextBtn.classList.contains("text-color-UITextPlaceholder");
      if (isDisabled) return { clicked: false, reason: "no-more" };

      nextBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(300);
      nextBtn.click();
      return { clicked: true };
    }

    // TikTok rate-limits its review API as well; pace conservatively
    get clickIntervalMs() { return 2000; }
    get apiIntervalMs() { return 3500; }
    get responseTimeoutMs() { return 15000; }
  }

  registry.register(new TikTokThAdapter());
})();
