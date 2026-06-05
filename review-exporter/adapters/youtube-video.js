// YouTube video comment adapter

(() => {
  const registry = window.__REVIEW_EXPORTER;
  if (!registry || !registry.BasePlatformAdapter) return;

  const API_PATTERNS = ["/youtubei/v1/next", "/youtubei/v1/browse"];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const textOf = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();

  const resolveUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/")) return `https://www.youtube.com${url}`;
    return url;
  };

  const getText = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value.simpleText === "string") return value.simpleText;
    if (typeof value.content === "string") return value.content;
    if (Array.isArray(value.runs)) {
      return value.runs.map((run) => run?.text || "").join("");
    }
    const label = value.accessibility?.accessibilityData?.label;
    return typeof label === "string" ? label : "";
  };

  const getUrl = (endpoint) => {
    const command = endpoint?.innertubeCommand || endpoint;
    const url =
      command?.commandMetadata?.webCommandMetadata?.url ||
      command?.browseEndpoint?.canonicalBaseUrl ||
      command?.browseEndpoint?.browseId ||
      "";
    return resolveUrl(url);
  };

  const walk = (node, visit) => {
    if (!node || typeof node !== "object") return;
    visit(node);
    if (Array.isArray(node)) {
      for (const child of node) walk(child, visit);
      return;
    }
    for (const value of Object.values(node)) walk(value, visit);
  };

  const parseCount = (text) => {
    if (!text) return 0;
    const normalized = String(text).replace(/,/g, "").trim().toLowerCase();
    const match = normalized.match(/([\d.]+)/);
    if (!match) return 0;
    const base = Number(match[1]);
    if (!Number.isFinite(base)) return 0;
    if (normalized.includes("\u4e07")) return Math.round(base * 10000);
    if (normalized.includes("k")) return Math.round(base * 1000);
    if (normalized.includes("m")) return Math.round(base * 1000000);
    return Math.round(base);
  };

  const extractCommentId = (href) => {
    if (!href) return "";
    try {
      return new URL(href, window.location.origin).searchParams.get("lc") || "";
    } catch {
      return "";
    }
  };

  const hashText = (input) => {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  const firstScoped = (root, selector, fallbackSelector = selector) => {
    try {
      return root.querySelector(selector);
    } catch {
      return root.querySelector(fallbackSelector);
    }
  };

  const normalizeBase = ({
    product,
    sortMode,
    commentId,
    authorId,
    authorName,
    authorUrl,
    avatarUrl,
    comment,
    publishedTimeText,
    likeCountText,
    replyCountText,
    isReply,
    parentId
  }) => ({
    platform: "youtube-video",
    shopid: product?.shopid || "",
    itemid: product?.itemid || "",
    cmtid: commentId,
    userid: authorId || "",
    author_username: authorName || "",
    anonymous: false,
    rating_star: "",
    rating: "",
    comment: comment || "",
    comment_tr: "",
    like_count: parseCount(likeCountText),
    ctime: "",
    ctime_iso: "",
    submit_time: publishedTimeText || "",
    submit_time_iso: "",
    model_name: "",
    options: "",
    product_name: product?.title || "",
    images: avatarUrl || "",
    video_urls: "",
    video_covers: "",
    has_media: Boolean(avatarUrl),
    region: "",
    review_type: isReply ? "reply" : "comment",
    product_quality: "",
    seller_service: "",
    delivery_service: "",
    original_url: product?.url || "",
    sort_mode: sortMode || "captured",
    parent_cmtid: parentId || "",
    is_reply: Boolean(isReply),
    reply_count: parseCount(replyCountText),
    author_channel_url: authorUrl || "",
    video_id: product?.itemid || "",
    video_title: product?.title || "",
    published_time_text: publishedTimeText || ""
  });

  const normalizeDomComment = ({ element, product, sortMode, isReply, parentId }) => {
    const authorLink = element.querySelector("#author-text");
    const timeLink = element.querySelector("#published-time-text a");
    const contentEl = element.querySelector("#content-text");
    const likeEl = element.querySelector("#vote-count-middle");
    const likeButton = element.querySelector("#like-button button[aria-label], ytd-toggle-button-renderer#like-button button[aria-label]");
    const thumb = element.querySelector("#author-thumbnail img");

    const author = textOf(authorLink);
    const comment = textOf(contentEl);
    const publishedTimeText = textOf(timeLink);
    const commentId =
      extractCommentId(timeLink?.getAttribute("href") || "") ||
      `dom-${hashText(`${sortMode || "captured"}|${parentId || ""}|${author}|${publishedTimeText}|${comment}`)}`;

    return normalizeBase({
      product,
      sortMode,
      commentId,
      authorName: author,
      authorUrl: resolveUrl(authorLink?.getAttribute("href") || ""),
      avatarUrl: thumb?.src || "",
      comment,
      publishedTimeText,
      likeCountText: textOf(likeEl) || likeButton?.getAttribute("aria-label") || "",
      replyCountText: "",
      isReply,
      parentId
    });
  };

  const normalizeRenderer = ({ renderer, product, sortMode, isReply, parentId }) => {
    const commentId = renderer.commentId || renderer.commentEntityPayload?.properties?.commentId || "";
    const authorEndpoint = renderer.authorEndpoint || renderer.authorText?.runs?.[0]?.navigationEndpoint;
    const thumbnails = renderer.authorThumbnail?.thumbnails || [];
    const authorThumb = thumbnails.length ? thumbnails[thumbnails.length - 1]?.url || "" : "";
    const replyCountText =
      getText(renderer.moreRepliesButton?.buttonRenderer?.text) ||
      getText(renderer.viewReplies?.buttonRenderer?.text) ||
      getText(renderer.replyCountText);

    return normalizeBase({
      product,
      sortMode,
      commentId,
      authorId: renderer.authorExternalChannelId || "",
      authorName: getText(renderer.authorText),
      authorUrl: getUrl(authorEndpoint),
      avatarUrl: authorThumb,
      comment: getText(renderer.contentText),
      publishedTimeText: getText(renderer.publishedTimeText),
      likeCountText: getText(renderer.voteCount) || getText(renderer.voteCountText),
      replyCountText,
      isReply,
      parentId
    });
  };

  const normalizeEntityPayload = ({ entity, product, sortMode }) => {
    const props = entity.properties || {};
    const author = entity.author || {};
    const toolbar = entity.toolbar || {};
    const avatarSources = entity.avatar?.image?.sources || [];
    const avatarUrl =
      author.avatarThumbnailUrl ||
      (avatarSources.length ? avatarSources[avatarSources.length - 1]?.url || "" : "");
    const authorUrl =
      getUrl(author.channelPageEndpoint) ||
      resolveUrl(author.channelPageEndpoint?.innertubeCommand?.browseEndpoint?.canonicalBaseUrl || "");
    const replyLevel = Number(props.replyLevel || 0);
    const parentId =
      props.parentCommentId ||
      props.parentId ||
      props.parentCommentEntityKey ||
      "";

    return normalizeBase({
      product,
      sortMode,
      commentId: props.commentId || entity.commentId || entity.key || "",
      authorId: author.channelId || "",
      authorName: author.displayName || props.authorButtonA11y || entity.avatar?.accessibilityText || "",
      authorUrl,
      avatarUrl,
      comment: getText(props.content),
      publishedTimeText: props.publishedTime || "",
      likeCountText: toolbar.likeCountNotliked || toolbar.likeCountA11y || toolbar.likeButtonA11y || "",
      replyCountText: toolbar.replyCount || toolbar.replyCountA11y || "",
      isReply: replyLevel > 0,
      parentId
    });
  };

  class YouTubeVideoAdapter extends registry.BasePlatformAdapter {
    get id() { return "youtube-video"; }
    get label() { return "YouTube"; }
    get region() { return ""; }
    get itemLabel() { return "Video"; }
    get itemCountLabel() { return "Main comments"; }
    get pageCountLabel() { return "Scroll loads"; }
    get supportsDirectApi() { return false; }
    get supportsSortModes() { return true; }
    get supportsReplies() { return false; }

    matchHost(loc) {
      return ["www.youtube.com", "youtube.com", "m.youtube.com"].includes(loc.hostname);
    }

    parseProductInfo() {
      const url = new URL(window.location.href);
      let videoId = "";
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else {
        const shorts = url.pathname.match(/^\/shorts\/([^/?#]+)/);
        if (shorts) videoId = shorts[1];
      }
      if (!videoId) return null;

      const channelLink =
        document.querySelector("#owner a[href^='/@'], ytd-video-owner-renderer a[href^='/channel/']") ||
        document.querySelector("a.yt-simple-endpoint[href^='/@']");
      const channelUrl = channelLink?.getAttribute("href") || "";

      return {
        shopid: channelUrl,
        itemid: videoId,
        url: window.location.href,
        title: document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent?.trim() || document.title
      };
    }

    matchApiUrl(url) {
      if (!url) return false;
      return API_PATTERNS.some((pattern) => url.includes(pattern));
    }

    parseApiResponse(data, _url, context = {}) {
      const includeReplies = context.settings?.includeReplies !== false;
      const sortMode = context.currentSortMode || "captured";
      const product = context.product || this.parseProductInfo();
      const reviews = [];
      const seen = new Set();

      const pushReview = (normalized) => {
        if (!normalized?.cmtid || !normalized.comment) return;
        if (!includeReplies && normalized.is_reply) return;
        const key = `${normalized.sort_mode}:${normalized.cmtid}:${normalized.parent_cmtid}`;
        if (seen.has(key)) return;
        seen.add(key);
        reviews.push(normalized);
      };

      const pushRenderer = (renderer, isReply, parentId) => {
        if (!renderer) return;
        pushReview(normalizeRenderer({ renderer, product, sortMode, isReply, parentId }));
      };

      walk(data, (node) => {
        const thread = node.commentThreadRenderer;
        if (!thread) return;
        const main = thread.comment?.commentRenderer;
        const parentId = main?.commentId || "";
        pushRenderer(main, false, "");
        if (!includeReplies) return;
        walk(thread.replies, (replyNode) => {
          const reply = replyNode.commentRenderer;
          if (reply) pushRenderer(reply, true, parentId);
        });
      });

      if (includeReplies) {
        walk(data, (node) => {
          if (node.commentThreadRenderer) return;
          const renderer = node.commentRenderer;
          if (renderer) pushRenderer(renderer, Boolean(renderer.replyLevel), renderer.parentId || "");
        });
      }

      walk(data?.frameworkUpdates?.entityBatchUpdate?.mutations, (node) => {
        const entity = node.commentEntityPayload || node.payload?.commentEntityPayload;
        if (entity) pushReview(normalizeEntityPayload({ entity, product, sortMode }));
      });

      return {
        reviews,
        paging: reviews.length ? { pageNo: context.captureIndex || null } : null,
        hasMore: null,
        summary: null
      };
    }

    collectDomReviews(context = {}) {
      const includeReplies = context.settings?.includeReplies !== false;
      const sortMode = context.currentSortMode || "captured";
      const product = context.product || this.parseProductInfo();
      const reviews = [];
      const seen = new Set();
      const threads = [...document.querySelectorAll("ytd-comment-thread-renderer")];

      const pushReview = (review) => {
        if (!review.cmtid || !review.comment) return;
        const key = `${review.sort_mode}:${review.cmtid}:${review.parent_cmtid}`;
        if (seen.has(key)) return;
        seen.add(key);
        reviews.push(review);
      };

      for (const thread of threads) {
        const main =
          firstScoped(thread, ":scope > #comment-container ytd-comment-view-model#comment", "ytd-comment-view-model#comment") ||
          thread.querySelector("ytd-comment-view-model#comment");
        if (!main) continue;

        const mainReview = normalizeDomComment({ element: main, product, sortMode, isReply: false, parentId: "" });
        const replyCountText = textOf(thread.querySelector(
          "ytd-comment-replies-renderer #more-replies button, ytd-comment-replies-renderer #more-replies-sub-thread button"
        ));
        mainReview.reply_count = parseCount(replyCountText);
        pushReview(mainReview);

        if (!includeReplies) continue;
        const replyRoot = thread.querySelector("#replies");
        if (!replyRoot) continue;
        const replies = [...replyRoot.querySelectorAll("ytd-comment-view-model#comment")].filter((reply) => reply !== main);
        for (const reply of replies) {
          pushReview(normalizeDomComment({
            element: reply,
            product,
            sortMode,
            isReply: true,
            parentId: mainReview.cmtid
          }));
        }
      }

      return {
        reviews,
        paging: reviews.length ? { pageNo: context.captureIndex || null } : null,
        hasMore: null,
        summary: null
      };
    }

    getDomCommentTagCount() {
      return document.querySelectorAll("ytd-comment-thread-renderer").length;
    }

    hasSelectedCommentsNotice() {
      const comments =
        document.querySelector("ytd-item-section-renderer[section-identifier='comment-item-section']") ||
        document.querySelector("#comments") ||
        document.body;
      const text = textOf(comments);
      return (
        text.includes("\u76ee\u524d\u4f60\u9009\u62e9\u7684\u662f") &&
        text.includes("\u6700\u70ed\u95e8") &&
        text.includes("\u7cbe\u9009\u8bc4\u8bba")
      );
    }

    normalizeReview(review) {
      return review;
    }

    getReviewKey(review) {
      return `${review.sort_mode || "captured"}:${review.cmtid || ""}`;
    }

    getSortModes(setting) {
      if (setting === "top") return ["top"];
      if (setting === "newest") return ["newest"];
      return ["top", "newest"];
    }

    async scrollToReviewSection() {
      const comments =
        document.querySelector("#comments") ||
        document.querySelector("ytd-item-section-renderer[section-identifier='comment-item-section']");
      if (comments) {
        comments.scrollIntoView({ behavior: "smooth", block: "start" });
        await sleep(1000);
      } else {
        window.scrollTo({ top: Math.min(900, document.body.scrollHeight * 0.35), behavior: "smooth" });
        await sleep(1000);
      }
    }

    async selectSortMode(mode) {
      await this.scrollToReviewSection();
      const sortMenu =
        document.querySelector("ytd-comments-header-renderer #sort-menu yt-dropdown-menu") ||
        document.querySelector("#sort-menu yt-dropdown-menu") ||
        document.querySelector("yt-sort-filter-sub-menu-renderer yt-dropdown-menu");
      const sortButton =
        sortMenu?.querySelector("tp-yt-paper-button#label, #label, button[aria-label*='\\8bc4\\8bba\\6392\\5e8f'], button[aria-label*='Sort']") ||
        document.querySelector("ytd-comments-header-renderer #sort-menu button") ||
        document.querySelector("button[aria-label*='\\8bc4\\8bba\\6392\\5e8f'], button[aria-label*='Sort']");
      if (!sortButton) {
        return { changed: false, reason: "no-sort-menu" };
      }

      sortButton.click();
      await sleep(600);

      const optionRoot =
        sortMenu ||
        document.querySelector("ytd-popup-container tp-yt-paper-listbox") ||
        document.querySelector("ytd-popup-container") ||
        document;
      const options = [
        ...optionRoot.querySelectorAll(
          "tp-yt-paper-listbox#menu a.yt-simple-endpoint, tp-yt-paper-listbox#menu tp-yt-paper-item, ytd-menu-service-item-renderer, tp-yt-paper-item, yt-list-item-view-model, a.yt-simple-endpoint"
        )
      ].filter((el) => {
        const text = textOf(el);
        const rect = el.getBoundingClientRect();
        return text && rect.width > 0 && rect.height > 0;
      });
      if (!options.length) {
        return { changed: false, reason: "no-sort-options" };
      }

      const matcher = mode === "newest"
        ? (text) => /\u6700\u65b0|newest/i.test(text)
        : (text) => /\u6700\u70ed\u95e8|\u70ed\u95e8|top/i.test(text);
      const option = options.find((el) => matcher(textOf(el))) || options[mode === "newest" ? 1 : 0] || options[0];
      option.click();
      await sleep(1400);
      return { changed: true };
    }

    async clickVisibleReplyButtons(limit = 8) {
      const selectors = [
        "ytd-comment-replies-renderer #more-replies button",
        "ytd-comment-replies-renderer #more-replies-sub-thread button",
        "ytd-comment-replies-renderer button[aria-label*='\\6761\\56de\\590d']",
        "ytd-comment-replies-renderer button[aria-label*='repl']"
      ];
      const buttons = [...document.querySelectorAll(selectors.join(","))]
        .filter((button) => {
          const text = (button.textContent || button.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
          if (!text || /^\u56de\u590d$/i.test(text) || /^reply$/i.test(text)) return false;
          return /\u6761\u56de\u590d|repl/i.test(text);
        })
        .slice(0, limit);

      for (const button of buttons) {
        if (button.disabled || button.getAttribute("aria-disabled") === "true") continue;
        button.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(250);
        button.click();
        await sleep(500);
      }
      return buttons.length;
    }

    getCommentScrollTarget() {
      const continuation = document.querySelector(
        "ytd-item-section-renderer[section-identifier='comment-item-section'] ytd-continuation-item-renderer"
      );
      if (continuation) return continuation;

      const threads = [...document.querySelectorAll("ytd-comment-thread-renderer")];
      if (threads.length) return threads[threads.length - 1];

      return document.querySelector("#comments") || document.documentElement;
    }

    async scrollNextCommentBatch() {
      const beforeHeight = document.documentElement.scrollHeight;
      const target = this.getCommentScrollTarget();
      target?.scrollIntoView({ behavior: "smooth", block: "end" });
      await sleep(700);

      for (let i = 0; i < 3; i += 1) {
        window.scrollBy({ top: Math.max(900, window.innerHeight * 0.9), behavior: "smooth" });
        await sleep(450);
      }

      return {
        beforeHeight,
        afterHeight: document.documentElement.scrollHeight
      };
    }

    async clickNextPage(context = {}) {
      if (context.settings?.includeReplies !== false) {
        await this.clickVisibleReplyButtons(8);
      }
      const scroll = await this.scrollNextCommentBatch();
      await sleep(1200);
      return { clicked: true, action: "scroll", ...scroll };
    }

    get clickIntervalMs() { return 1300; }
    get responseTimeoutMs() { return 9000; }
  }

  registry.register(new YouTubeVideoAdapter());
})();
