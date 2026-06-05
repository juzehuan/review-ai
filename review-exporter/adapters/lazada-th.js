// Lazada Thailand adapter

(() => {
  const registry = window.__REVIEW_EXPORTER;
  if (!registry || !registry.BasePlatformAdapter) {
    return;
  }

  const API_PATTERN = "mtop.lazada.review.item.getpcreviewlist";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Parse "สูตร:Shiso" → { label: "สูตร", value: "Shiso" }
  const parseSkuInfo = (skuInfo) => {
    if (!skuInfo || typeof skuInfo !== "string") return { label: "", value: "" };
    const idx = skuInfo.indexOf(":");
    if (idx === -1) return { label: "", value: skuInfo.trim() };
    return {
      label: skuInfo.slice(0, idx).trim(),
      value: skuInfo.slice(idx + 1).trim()
    };
  };

  class LazadaThAdapter extends registry.BasePlatformAdapter {
    get id() { return "lazada-th"; }
    get label() { return "Lazada TH"; }
    get region() { return "TH"; }

    matchHost(loc) {
      return loc.hostname === "www.lazada.co.th" || loc.hostname === "lazada.co.th";
    }

    parseProductInfo() {
      const match = window.location.pathname.match(/\/products\/pdp-i(\d+)-s(\d+)\.html/);
      if (!match) {
        // Fallback: read itemid from review widget DOM if URL pattern differs
        const widget = document.querySelector(".pdp-mod-review-v2[itemid]");
        if (!widget) return null;
        return {
          shopid: "",
          itemid: widget.getAttribute("itemid") || "",
          url: window.location.href,
          title: document.title
        };
      }
      return {
        shopid: match[2],
        itemid: match[1],
        url: window.location.href,
        title: document.title
      };
    }

    matchApiUrl(url) {
      if (!url) return false;
      // Lazada MTOP path is mixed case; Network panel sometimes lowercases. Check both.
      const lower = url.toLowerCase();
      return lower.includes(API_PATTERN);
    }

    parseApiResponse(data) {
      const reviews = data?.data?.module?.reviews;
      if (!Array.isArray(reviews)) {
        return { reviews: [], paging: null, hasMore: null, summary: null };
      }
      const paging = data.data.paging || null;
      const hasMore = paging
        ? Number(paging.pageNo) < Number(paging.totalPages)
        : null;
      const summary = data.data.module.impressionTags
        ? { tags: data.data.module.impressionTags }
        : null;
      return { reviews, paging, hasMore, summary };
    }

    normalizeReview(rev, product) {
      const mediaList = Array.isArray(rev.mediaList) ? rev.mediaList : [];
      const images = mediaList
        .filter((m) => m.mediaType === 1)
        .map((m) => m.coverUrl)
        .filter(Boolean);
      const videoUrls = mediaList
        .filter((m) => m.mediaType === 2)
        .map((m) => m.videoUrl)
        .filter(Boolean);
      const videoCovers = mediaList
        .filter((m) => m.mediaType === 2)
        .map((m) => m.coverUrl)
        .filter(Boolean);

      const sku = parseSkuInfo(rev.skuInfo);
      const comment = Array.isArray(rev.reviewContentList)
        ? rev.reviewContentList.map((c) => c?.content || "").filter(Boolean).join("\n")
        : "";

      const reviewTime = rev.reviewTime || "";
      let ctimeIso = "";
      if (reviewTime) {
        const d = new Date(reviewTime);
        if (!Number.isNaN(d.getTime())) ctimeIso = d.toISOString();
      }

      return {
        platform: this.id,
        shopid: product?.shopid || "",
        itemid: product?.itemid || "",
        cmtid: rev.reviewId != null ? String(rev.reviewId) : "",
        userid: "",
        author_username: rev.buyerName || "",
        anonymous: false,
        rating_star: rev.rating ?? "",
        rating: rev.rating ?? "",
        comment,
        comment_tr: "",
        like_count: rev.likeCount ?? 0,
        ctime: "",
        ctime_iso: ctimeIso || reviewTime,
        submit_time: "",
        submit_time_iso: "",
        model_name: sku.value,
        options: rev.skuInfo || "",
        product_name: "",
        images: images.join(" | "),
        video_urls: videoUrls.join(" | "),
        video_covers: videoCovers.join(" | "),
        has_media: mediaList.length > 0,
        region: "TH",
        review_type: "",
        product_quality: "",
        seller_service: "",
        delivery_service: "",
        original_url: product?.url || ""
      };
    }

    // Lazada uses MTOP signed API → DOM mode is the default.
    // Direct API mode signs requests using _m_h5_tk cookie + MD5.
    async bootstrapFirstPage() { return null; }

    get supportsDirectApi() { return Boolean(registry._utils?.md5); }
    get directApiPageSize() { return 5; }

    async fetchPage(pageIndex, productInfoOverride) {
      const utils = registry._utils;
      if (!utils?.md5 || !utils?.getCookie) {
        throw new Error("MD5 utility not loaded.");
      }

      const product = productInfoOverride || this.parseProductInfo();
      if (!product?.itemid) throw new Error("Item ID missing.");

      const tk = utils.getCookie("_m_h5_tk");
      if (!tk) {
        throw new Error("_m_h5_tk cookie missing — please scroll the review section once first to make Lazada issue tokens.");
      }
      const token = tk.split("_")[0];
      const t = Date.now();
      const appKey = "24677475";
      const dataObj = {
        itemId: Number(product.itemid),
        pageSize: 5,
        pageNo: Math.max(1, pageIndex),
        ratingFilter: 0,
        sort: 0,
        tagId: 0
      };
      const dataString = JSON.stringify(dataObj);
      const sign = utils.md5(`${token}&${t}&${appKey}&${dataString}`);

      const url = new URL("https://acs-m.lazada.co.th/h5/mtop.lazada.review.item.getpcreviewlist/1.0/");
      url.searchParams.set("jsv", "2.7.2");
      url.searchParams.set("appKey", appKey);
      url.searchParams.set("t", String(t));
      url.searchParams.set("sign", sign);
      url.searchParams.set("api", "mtop.lazada.review.item.getPcReviewList");
      url.searchParams.set("v", "1.0");
      url.searchParams.set("type", "originaljson");
      url.searchParams.set("isSec", "1");
      url.searchParams.set("AntiCreep", "true");
      url.searchParams.set("timeout", "10000");
      url.searchParams.set("dataType", "json");
      url.searchParams.set("sessionOption", "AutoLoginOnly");
      url.searchParams.set("x-i18n-language", "en");
      url.searchParams.set("x-i18n-regionID", "TH");
      url.searchParams.set("data", dataString);

      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });
      const data = await response.json();

      // MTOP error handling:
      const ret = Array.isArray(data?.ret) ? data.ret.join(",") : String(data?.ret || "");
      if (ret.includes("FAIL_SYS_USER_VALIDATE") || ret.includes("RGV587")) {
        // Anti-bot challenge — captcha required. Stop immediately.
        const captchaUrl = data?.data?.url || "";
        const err = new Error(
          "🚧 Lazada anti-bot triggered (RGV587). " +
          "Please slow down or switch to DOM mode. " +
          "If it persists, open a Lazada page and solve any captcha shown, then wait 1-2 minutes."
        );
        err.code = "RGV587";
        err.captchaUrl = captchaUrl;
        throw err;
      }
      if (ret.includes("FAIL_SYS_TOKEN")) {
        throw new Error(`MTOP token error: ${ret}. Please reload the Lazada page and try again.`);
      }
      if (ret.includes("FAIL_SYS_ILLEGAL_ACCESS") || ret.includes("FAIL_SYS_TRAFFIC_LIMIT")) {
        throw new Error(`Anti-creep blocked: ${ret}. Slow down or switch to DOM mode.`);
      }
      if (ret && !ret.includes("SUCCESS")) {
        throw new Error(`Lazada API error: ${ret}`);
      }

      return { url: url.toString(), data };
    }

    async scrollToReviewSection() {
      const anchor = document.querySelector(
        "#module_product_review, .pdp-mod-review-v2"
      );
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(800);
        // Nudge a bit further to make sure the review list (and pagination) is visible
        window.scrollBy({ top: 200, behavior: "smooth" });
        await sleep(400);
      } else {
        window.scrollTo({ top: document.body.scrollHeight * 0.6, behavior: "smooth" });
        await sleep(1000);
      }
    }

    async clickNextPage() {
      const next = document.querySelector(
        "ul.review-pagination li.iweb-pagination-next, ul.iweb-pagination li.iweb-pagination-next"
      );
      if (!next) return { clicked: false, reason: "no-button" };

      const disabled = next.getAttribute("aria-disabled") === "true";
      if (disabled) return { clicked: false, reason: "no-more" };

      next.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(300);

      const button = next.querySelector("button");
      (button || next).click();
      return { clicked: true };
    }

    // Slower pace to be friendly to Alibaba MTOP anti-creep
    get clickIntervalMs() { return 1800; }     // DOM mode pacing
    get apiIntervalMs() { return 3500; }       // Direct-API mode pacing (more conservative)
    get responseTimeoutMs() { return 15000; }
  }

  registry.register(new LazadaThAdapter());
})();
