// Shopee Thailand adapter

(() => {
  const registry = window.__REVIEW_EXPORTER;
  if (!registry || !registry.BasePlatformAdapter) {
    return;
  }

  const RATINGS_PATH = "/api/v2/item/get_ratings";
  const DEFAULT_LIMIT = 6;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class ShopeeThAdapter extends registry.BasePlatformAdapter {
    get id() { return "shopee-th"; }
    get label() { return "Shopee TH"; }
    get region() { return "TH"; }

    matchHost(loc) {
      return loc.hostname === "shopee.co.th";
    }

    parseProductInfo() {
      const match = window.location.pathname.match(/-i\.(\d+)\.(\d+)/);
      if (!match) return null;
      return {
        shopid: match[1],
        itemid: match[2],
        url: window.location.href,
        title: document.title
      };
    }

    matchApiUrl(url) {
      if (!url) return false;
      try {
        return new URL(url, window.location.origin).pathname === RATINGS_PATH;
      } catch {
        return url.includes(RATINGS_PATH);
      }
    }

    parseApiResponse(data) {
      if (!data?.data?.ratings) {
        return { reviews: [], paging: null, hasMore: null, summary: null };
      }
      return {
        reviews: data.data.ratings,
        paging: null,
        hasMore: Boolean(data.data.has_more),
        summary: data.data.item_rating_summary || null
      };
    }

    normalizeReview(rating, product) {
      const productItem = rating.product_items?.[0] || {};
      const videoUrls = (rating.videos || []).map((v) => v.url).filter(Boolean);
      const videoCovers = (rating.videos || []).map((v) => v.cover).filter(Boolean);

      return {
        platform: this.id,
        shopid: rating.shopid ?? product?.shopid ?? "",
        itemid: rating.itemid ?? product?.itemid ?? "",
        cmtid: rating.cmtid ?? "",
        userid: rating.userid ?? "",
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
        region: rating.region || "TH",
        review_type: rating.review_type ?? "",
        product_quality: rating.detailed_rating?.product_quality ?? "",
        seller_service: rating.detailed_rating?.seller_service ?? "",
        delivery_service: rating.detailed_rating?.delivery_service ?? "",
        original_url: product?.url || ""
      };
    }

    async bootstrapFirstPage() {
      return this.fetchPage(1);
    }

    get supportsDirectApi() { return true; }
    get directApiPageSize() { return DEFAULT_LIMIT; }

    async fetchPage(pageIndex, productInfoOverride) {
      const product = productInfoOverride || this.parseProductInfo();
      if (!product) return null;
      const offset = (Math.max(1, pageIndex) - 1) * DEFAULT_LIMIT;
      const url = new URL(`https://shopee.co.th${RATINGS_PATH}`);
      url.searchParams.set("filter", "0");
      url.searchParams.set("flag", "1");
      url.searchParams.set("limit", String(DEFAULT_LIMIT));
      url.searchParams.set("offset", String(offset));
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

      const response = await fetch(url.toString(), { credentials: "include" });
      const data = await response.json();
      return { url: url.toString(), data };
    }

    async scrollToReviewSection() {
      const target = document.querySelector(
        "div.product-ratings, section:has(.product-ratings), .product-detail-page"
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(600);
      } else {
        window.scrollTo({ top: document.body.scrollHeight * 0.55, behavior: "smooth" });
        await sleep(800);
      }
    }

    async clickNextPage() {
      const button = document.querySelector(
        ".product-ratings__page-controller .shopee-icon-button--right"
      );
      if (!button) return { clicked: false, reason: "no-button" };

      const disabled = button.disabled || button.getAttribute("aria-disabled") === "true";
      if (disabled) return { clicked: false, reason: "no-more" };

      button.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(300);
      button.click();
      return { clicked: true };
    }

    get clickIntervalMs() { return 1400; }
    get apiIntervalMs() { return 1800; }
    get responseTimeoutMs() { return 12000; }
  }

  registry.register(new ShopeeThAdapter());
})();
