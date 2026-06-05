// TikTok video comment adapter

(() => {
  const registry = window.__REVIEW_EXPORTER;
  if (!registry || !registry.BasePlatformAdapter) return;

  const API_PATTERNS = ["/api/comment/list/"];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const normalizeHasMore = (value) => {
    if (value === undefined || value === null) return null;
    if (value === true || value === 1 || value === "1") return true;
    if (value === false || value === 0 || value === "0") return false;
    return Boolean(value);
  };

  const textOf = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();

  const parseCount = (value) => {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : 0;
    const normalized = String(value).replace(/,/g, "").trim().toLowerCase();
    const match = normalized.match(/([\d.]+)/);
    if (!match) return 0;
    const base = Number(match[1]);
    if (!Number.isFinite(base)) return 0;
    if (normalized.includes("\u4e07")) return Math.round(base * 10000);
    if (normalized.includes("k")) return Math.round(base * 1000);
    if (normalized.includes("m")) return Math.round(base * 1000000);
    return Math.round(base);
  };

  const hashText = (input) => {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  const getBestUrl = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    const urls = value.url_list || value.urls || value.urlList;
    if (Array.isArray(urls) && urls.length) return String(urls[0] || "");
    return "";
  };

  const buildAuthorUrl = (uniqueId) => {
    if (!uniqueId) return "";
    return `https://www.tiktok.com/@${String(uniqueId).replace(/^@/, "")}`;
  };

  const getVideoIdFromUrl = () => {
    const match = window.location.pathname.match(/\/video\/(\d+)/i);
    return match?.[1] || "";
  };

  const normalizeBase = ({ product, rawId, userId, authorName, avatarUrl, text, likeCount, createTime, replyCount }) => {
    const ts = Number(createTime || 0);
    const tsMs = Number.isFinite(ts) && ts > 0 ? (ts > 100000000000 ? ts : ts * 1000) : 0;
    const uniqueId = authorName || "";
    const commentId = rawId || `dom-${hashText(`${product?.itemid || ""}|${uniqueId}|${text}`)}`;

    return {
      platform: "tiktok-video",
      shopid: product?.shopid || "",
      itemid: product?.itemid || "",
      cmtid: commentId,
      userid: userId || "",
      author_username: uniqueId,
      anonymous: false,
      rating_star: "",
      rating: "",
      comment: text || "",
      comment_tr: "",
      like_count: parseCount(likeCount),
      ctime: tsMs ? Math.floor(tsMs / 1000) : "",
      ctime_iso: tsMs ? new Date(tsMs).toISOString() : "",
      submit_time: "",
      submit_time_iso: "",
      model_name: "",
      options: "",
      product_name: product?.title || "",
      images: avatarUrl || "",
      video_urls: product?.url || "",
      video_covers: "",
      has_media: Boolean(avatarUrl),
      region: "",
      review_type: "comment",
      product_quality: "",
      seller_service: "",
      delivery_service: "",
      original_url: product?.url || "",
      sort_mode: "captured",
      parent_cmtid: "",
      is_reply: false,
      reply_count: parseCount(replyCount),
      author_channel_url: buildAuthorUrl(uniqueId),
      video_id: product?.itemid || "",
      video_title: product?.title || "",
      published_time_text: ""
    };
  };

  const normalizeApiComment = (comment, product) => {
    const user = comment?.user || {};
    const uniqueId = user.unique_id || user.uniqueId || user.sec_uid || user.nickname || "";
    return normalizeBase({
      product,
      rawId: comment.cid || comment.comment_id || comment.id || "",
      userId: user.uid || user.id || "",
      authorName: uniqueId,
      avatarUrl: getBestUrl(user.avatar_thumb || user.avatarThumb || user.avatar_medium || user.avatarMedium),
      text: comment.text || comment.comment || "",
      likeCount: comment.digg_count ?? comment.like_count ?? comment.diggCount,
      createTime: comment.create_time || comment.createTime,
      replyCount: comment.reply_comment_total ?? comment.reply_count ?? comment.replyCommentTotal
    });
  };

  const normalizeDomComment = (el, product) => {
    const authorLink =
      el.querySelector("a[href^='/@'], a[href*='tiktok.com/@']") ||
      el.closest("[data-e2e]")?.querySelector("a[href^='/@'], a[href*='tiktok.com/@']");
    const uniqueId = textOf(authorLink).replace(/^@/, "");
    const textEl =
      el.querySelector("[data-e2e*='comment-level-1'] p, [data-e2e*='comment'] p") ||
      el.querySelector("p, span");
    const likeEl =
      el.querySelector("[data-e2e*='comment-like-count'], [class*='like-count' i]") ||
      el.querySelector("strong");
    const avatar = el.querySelector("img");
    const text = textOf(textEl);

    return normalizeBase({
      product,
      rawId: el.getAttribute("data-id") || el.getAttribute("id") || "",
      userId: "",
      authorName: uniqueId,
      avatarUrl: avatar?.src || "",
      text,
      likeCount: textOf(likeEl),
      createTime: "",
      replyCount: ""
    });
  };

  class TikTokVideoAdapter extends registry.BasePlatformAdapter {
    get id() { return "tiktok-video"; }
    get label() { return "TikTok Video"; }
    get itemLabel() { return "Video"; }
    get itemCountLabel() { return "Comments"; }
    get pageCountLabel() { return "Scroll loads"; }
    get supportsDirectApi() { return true; }
    get directApiPageSize() { return 50; }
    get supportsReplies() { return false; }

    matchHost(loc) {
      return (loc.hostname === "www.tiktok.com" || loc.hostname === "tiktok.com") && /\/video\/\d+/i.test(loc.pathname);
    }

    parseProductInfo() {
      const videoId = getVideoIdFromUrl();
      if (!videoId) return null;
      const author = window.location.pathname.match(/^\/@([^/]+)/)?.[1] || "";
      const title =
        document.querySelector("[data-e2e='browse-video-desc'], h1, [class*='video-desc' i]")?.textContent?.trim() ||
        document.title.replace(/\s*\|\s*TikTok.*$/i, "").trim();
      return {
        shopid: author,
        itemid: videoId,
        url: window.location.href,
        title
      };
    }

    matchApiUrl(url) {
      if (!url) return false;
      return API_PATTERNS.some((pattern) => url.includes(pattern)) && !url.includes("/api/comment/list/reply/");
    }

    parseApiResponse(data, _url, context = {}) {
      const product = context.product || this.parseProductInfo();
      const rawComments = Array.isArray(data?.comments)
        ? data.comments
        : Array.isArray(data?.data?.comments)
          ? data.data.comments
          : [];
      const hasMore = data?.has_more ?? data?.data?.has_more ?? null;
      return {
        reviews: rawComments.map((comment) => normalizeApiComment(comment, product)),
        paging: {
          pageNo: context.captureIndex || null,
          totalItems: data?.total || data?.data?.total || null
        },
        hasMore: normalizeHasMore(hasMore),
        summary: null
      };
    }

    normalizeReview(review) {
      return review;
    }

    async fetchPage(pageIndex, productInfo) {
      const product = productInfo || this.parseProductInfo();
      if (!product?.itemid) return null;
      const count = this.directApiPageSize;
      const cursor = Math.max(0, (Number(pageIndex || 1) - 1) * count);
      const params = new URLSearchParams({
        aid: "1988",
        aweme_id: product.itemid,
        count: String(count),
        cursor: String(cursor)
      });
      const url = `https://www.tiktok.com/api/comment/list/?${params.toString()}`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          accept: "application/json, text/plain, */*"
        },
        referrer: product.url || window.location.href
      });
      if (!response.ok) {
        throw new Error(`TikTok comment API HTTP ${response.status}`);
      }
      return { url, data: await response.json() };
    }

    getReviewKey(review) {
      return String(review?.cmtid || "");
    }

    collectDomReviews(context = {}) {
      const product = context.product || this.parseProductInfo();
      const selectors = [
        "[data-e2e='comment-item']",
        "[data-e2e*='comment-level-1']",
        "div[class*='CommentItem']",
        "div[class*='DivCommentItem']"
      ];
      const nodes = [...document.querySelectorAll(selectors.join(","))];
      const reviews = [];
      const seen = new Set();
      for (const node of nodes) {
        const review = normalizeDomComment(node, product);
        if (!review.cmtid || !review.comment) continue;
        if (seen.has(review.cmtid)) continue;
        seen.add(review.cmtid);
        reviews.push(review);
      }
      return {
        reviews,
        paging: reviews.length ? { pageNo: context.captureIndex || null } : null,
        hasMore: null,
        summary: null
      };
    }

    async scrollToReviewSection() {
      const commentPanel =
        document.querySelector("[data-e2e='comment-list'], [class*='CommentList'], [class*='DivCommentList']") ||
        document.querySelector("[data-e2e='browse-comment']");
      if (commentPanel) {
        commentPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(900);
        return;
      }
      window.scrollTo({ top: Math.min(900, document.body.scrollHeight * 0.45), behavior: "smooth" });
      await sleep(900);
    }

    getCommentScrollTarget() {
      return (
        document.querySelector("[data-e2e='comment-list'], [class*='CommentList'], [class*='DivCommentList']") ||
        document.querySelector("[data-e2e='browse-comment']") ||
        document.scrollingElement ||
        document.documentElement
      );
    }

    async clickNextPage() {
      const target = this.getCommentScrollTarget();
      const beforeTop = target.scrollTop || window.scrollY;
      const beforeHeight = target.scrollHeight || document.documentElement.scrollHeight;
      if (target && target !== document.documentElement && target !== document.body) {
        target.scrollBy({ top: Math.max(700, target.clientHeight * 0.9), behavior: "smooth" });
      } else {
        window.scrollBy({ top: Math.max(900, window.innerHeight * 0.9), behavior: "smooth" });
      }
      await sleep(1200);
      return {
        clicked: true,
        action: "scroll",
        beforeTop,
        afterTop: target.scrollTop || window.scrollY,
        beforeHeight,
        afterHeight: target.scrollHeight || document.documentElement.scrollHeight
      };
    }

    get clickIntervalMs() { return 1800; }
    get responseTimeoutMs() { return 10000; }
  }

  registry.register(new TikTokVideoAdapter());
})();
