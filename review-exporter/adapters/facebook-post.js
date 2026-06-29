// Facebook post comment adapter

(() => {
  const registry = window.__REVIEW_EXPORTER;
  if (!registry || !registry.BasePlatformAdapter) return;

  const normalizeText = (value) => String(value || "").replace(/[\u200b-\u200f\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  const textOf = (el) => normalizeText(el?.textContent || "");
  const labelOf = (el) => normalizeText([el?.textContent, el?.getAttribute?.("aria-label"), el?.getAttribute?.("title")].filter(Boolean).join(" "));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const PROFILE_LINK_SELECTOR =
    "a[role='link'][href*='facebook.com'], a[href^='/profile.php'], a[href^='/people/'], a[href^='/'][tabindex='0']";

  const SORT_CURRENT_LABELS = ["Most relevant", "Top comments", "\u6700\u76f8\u5173"];
  const SORT_ALL_LABELS = [
    "All comments",
    "\u6240\u6709\u8bc4\u8bba",
    "\u5168\u90e8\u8bc4\u8bba",
    "\u6240\u6709\u7559\u8a00",
    "\u5168\u90e8\u7559\u8a00"
  ];
  const MORE_COMMENTS_LABELS = [
    "View more comments",
    "View previous comments",
    "More comments",
    "See more comments",
    "\u67e5\u770b\u66f4\u591a\u8bc4\u8bba",
    "\u67e5\u770b\u66f4\u591a\u7559\u8a00",
    "\u66f4\u591a\u8bc4\u8bba",
    "\u67e5\u770b\u4e4b\u524d\u7684\u8bc4\u8bba"
  ];

  const hashText = (input) => {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  const normalizeUrl = (href, paramsToDrop = []) => {
    if (!href) return "";
    try {
      const url = new URL(href, window.location.origin);
      paramsToDrop.forEach((param) => url.searchParams.delete(param));
      return url.href;
    } catch {
      return "";
    }
  };

  const parsePostIdFromUrl = (loc = window.location) => {
    const params = new URLSearchParams(loc.search || "");
    const path = loc.pathname || "";
    const isPostPath = /\/(posts|videos|reel|watch|story\.php|permalink\.php|photo(?:\.php)?|share\/[pv]|groups\/[^/]+\/posts)\b/i.test(path);
    const direct = params.get("story_fbid") || params.get("fbid") || params.get("v");
    if (direct && isPostPath) return direct;

    const patterns = [
      /\/groups\/[^/]+\/posts\/([^/?#]+)/i,
      /\/posts\/([^/?#]+)/i,
      /\/videos\/([^/?#]+)/i,
      /\/reel\/([^/?#]+)/i,
      /\/share\/p\/([^/?#]+)/i,
      /\/share\/v\/([^/?#]+)/i
    ];
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    return null;
  };

  const textWithImageAlt = (el) => {
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone.querySelectorAll("img[alt]").forEach((img) => {
      if (img.alt) img.replaceWith(document.createTextNode(` ${img.alt} `));
    });
    return textOf(clone);
  };

  const isVisible = (el) => {
    if (!el?.isConnected) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  };

  const labelMatches = (text, labels, { exact = false, startsWith = false } = {}) => {
    const normalized = normalizeText(text).toLowerCase();
    return labels.some((label) => {
      const expected = normalizeText(label).toLowerCase();
      if (exact) return normalized === expected;
      if (startsWith) return normalized === expected || normalized.startsWith(`${expected} `);
      return normalized.includes(expected);
    });
  };

  const pressElement = (el) => {
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    el.click();
  };

  const findInteractiveByLabels = (
    labels,
    {
      exact = false,
      startsWith = false,
      selector = "div[role='button'], span[role='button'], a[role='link'], [role='menuitem'], [role='option']"
    } = {}
  ) => {
    const elements = [...document.querySelectorAll(selector)];
    return elements.find((el) => isVisible(el) && labelMatches(labelOf(el), labels, { exact, startsWith }));
  };

  const findSortButton = () =>
    findInteractiveByLabels([...SORT_CURRENT_LABELS, ...SORT_ALL_LABELS], {
      selector: "div[role='button'][aria-haspopup='menu'], div[role='button'], span[role='button']"
    });

  const findAllCommentsOption = () =>
    findInteractiveByLabels(SORT_ALL_LABELS, {
      selector: "[role='menuitem'], [role='menuitemradio'], [role='option'], [role='radio']"
    }) ||
    findInteractiveByLabels(SORT_ALL_LABELS, {
      selector: "div[role='button'], span[role='button']"
    });

  const findMoreCommentsButton = () =>
    findInteractiveByLabels(MORE_COMMENTS_LABELS, {
      selector: "div[role='button'], span[role='button'], a[role='link']"
    });

  const waitForMoreCommentsButton = async (timeoutMs = 12000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const target = findMoreCommentsButton();
      if (target) return target;
      window.scrollBy({ top: Math.max(700, Math.floor(window.innerHeight * 0.65)), behavior: "smooth" });
      await sleep(900);
    }
    return null;
  };

  const findAuthorLink = (node) => {
    const links = [...node.querySelectorAll(PROFILE_LINK_SELECTOR)];
    return links.find((link) => {
      const text = textOf(link);
      return text && !/^(like|reply|share|\u8d5e|\u56de\u590d|\u5206\u4eab)$/i.test(text);
    });
  };

  const parseAuthorFromNode = (node) => {
    const author = textOf(findAuthorLink(node)).replace(/^@/, "").trim();
    if (author) return author;

    const aria = node.getAttribute("aria-label") || "";
    const ariaMatch = aria.match(/comment by\s+(.+?)(?:$|,|\.|\s+on\s+)/i);
    if (ariaMatch?.[1]) return ariaMatch[1].trim();

    const zhMatch = aria.match(/(?:\u8bc4\u8bba\u8005|\u7559\u8a00\u8005)[:\uff1a]\s*(.+?)(?:\d+\s*(?:\u79d2|\u5206\u949f|\u5c0f\u65f6|\u5929|\u65e5|\u5468|\u661f\u671f|\u4e2a\u6708|\u6708|\u5e74)(?:\u524d)?|$)/i);
    return (zhMatch?.[1] || "").trim();
  };

  const parseCommentText = (node, author) => {
    const isNoiseText = (text) =>
      !text ||
      text === author ||
      /^(like|reply|share|edited|top fan|author|all comments|most relevant|view more comments|view previous comments)$/i.test(text) ||
      /^(\u8d5e|\u56de\u590d|\u5206\u4eab|\u5df2\u7f16\u8f91|\u4f5c\u8005|\u6240\u6709\u8bc4\u8bba|\u5168\u90e8\u8bc4\u8bba|\u6700\u76f8\u5173|\u67e5\u770b\u66f4\u591a\u8bc4\u8bba)$/.test(text) ||
      /^\d+\s*(?:s|sec|secs|m|min|mins|h|hr|hrs|d|w|mo|y|second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years|\u79d2|\u5206\u949f|\u5c0f\u65f6|\u5929|\u65e5|\u5468|\u661f\u671f|\u4e2a\u6708|\u6708|\u5e74)(?:\s*ago|\u524d)?$/i.test(text) ||
      /^(\u521a\u521a|\u6628\u5929)$/.test(text) ||
      /^\u5168\u90e8\s*\d+\s*\u6761?\u56de\u590d$/.test(text) ||
      /^\d+\s*\/\s*[\d,]+$/.test(text) ||
      /^\d+\s*\u4e2a\u5fc3\u60c5/.test(text) ||
      /^\u5199\u8bc4\u8bba/.test(text);

    const blocks = [...node.querySelectorAll("div[dir='auto'], span[dir='auto']")]
      .filter((el) => !el.closest("form, [role='textbox'], [contenteditable='true']"))
      .filter((el) => !el.closest("ul"))
      .filter((el) => !el.closest("a[role='link']"))
      .filter((el) => !el.closest("[role='button'], [role='menuitem'], [role='option']"))
      .map((el) => textWithImageAlt(el))
      .filter((text) => !isNoiseText(text));

    const unique = [];
    for (const text of blocks) {
      if (!unique.includes(text)) unique.push(text);
    }
    return unique.join(" ").trim();
  };

  const isCommentArticle = (node) => {
    const aria = node.getAttribute("aria-label") || "";
    return /comment by|\u8bc4\u8bba\u8005|\u7559\u8a00\u8005/i.test(aria) || Boolean(node.querySelector("a[href*='comment_id='], a[href*='comment/replies']"));
  };

  const parseCommentIdFromUrl = (href) => {
    try {
      const params = new URL(href || "", window.location.origin).searchParams;
      return params.get("comment_id") || params.get("reply_comment_id") || "";
    } catch {
      return "";
    }
  };

  const formatUnixTime = (value) => {
    const seconds = Number(value || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return { text: "", iso: "" };
    const date = new Date(seconds * 1000);
    return {
      text: date.toLocaleString(),
      iso: date.toISOString()
    };
  };

  const toReviewRecord = ({
    product,
    commentId,
    author,
    authorId = "",
    authorUrl = "",
    comment,
    commentUrl = "",
    createdTime = "",
    likeCount = 0,
    replyCount = "",
    sortMode = "all_comments"
  }) => {
    const time = formatUnixTime(createdTime);
    return {
      ...registry.emptyReview(),
      platform: "facebook-post",
      shopid: product.shopid || "facebook",
      itemid: product.itemid,
      cmtid: commentId,
      userid: authorId,
      author_username: author,
      anonymous: false,
      rating_star: "",
      rating: "",
      comment,
      comment_tr: "",
      like_count: Number(likeCount || 0),
      ctime: time.text,
      ctime_iso: time.iso,
      submit_time: time.text,
      submit_time_iso: time.iso,
      model_name: author,
      options: "",
      product_name: product.title || "",
      images: "",
      video_urls: "",
      video_covers: "",
      has_media: false,
      region: "global",
      review_type: "comment",
      original_url: product.url,
      sort_mode: sortMode,
      parent_cmtid: "",
      is_reply: false,
      reply_count: replyCount,
      author_channel_url: authorUrl,
      video_id: product.itemid,
      video_title: product.title || "",
      published_time_text: time.text,
      comment_url: commentUrl
    };
  };

  const normalizeDomComment = (node, product, index = 0) => {
    if (!product?.itemid) return null;

    const author = parseAuthorFromNode(node);
    const comment = parseCommentText(node, author);
    if (!comment || comment.length < 2) return null;

    const link = node.querySelector("a[href*='comment_id='], a[href*='comment/replies']");
    const commentUrl = normalizeUrl(link?.href || "");
    let commentId = parseCommentIdFromUrl(link?.href || "");
    if (!commentId) {
      commentId = `fb_${product.itemid}_${hashText(`${author}|${comment}|${index}`)}`;
    }

    const authorUrl = normalizeUrl(findAuthorLink(node)?.href || "", ["comment_id", "reply_comment_id", "__cft__[0]", "__tn__"]);
    return toReviewRecord({
      product,
      commentId,
      author,
      authorUrl,
      comment,
      commentUrl,
      sortMode: "all_comments"
    });
  };

  const extractGraphqlCommentEdges = (data) => {
    const connections = [];
    const seenConnections = new Set();
    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }

      Object.entries(value).forEach(([key, child]) => {
        if (key.startsWith("comment_rendering_instance") && child?.comments?.edges && !seenConnections.has(child.comments)) {
          seenConnections.add(child.comments);
          connections.push(child.comments);
        }
        if (child && typeof child === "object") visit(child);
      });
    };

    visit(data);
    const edges = [];
    connections.forEach((connection) => {
      if (Array.isArray(connection.edges)) edges.push(...connection.edges);
    });
    return { edges, pageInfo: connections.find((connection) => connection.page_info)?.page_info || null };
  };

  const normalizeApiComment = (node, product, index = 0) => {
    if (!product?.itemid || !node || typeof node !== "object") return null;

    const comment = normalizeText(node.body?.text || node.body?.text_with_entities?.text || node.body_renderer?.text || "");
    if (!comment || comment.length < 2) return null;

    const author = node.author || node.commenter || node.actors?.[0] || {};
    const authorName = normalizeText(author.name || author.short_name || "");
    const commentUrl = normalizeUrl(node.url || node.feedback?.url || "");
    const rawId = parseCommentIdFromUrl(commentUrl) || node.id || node.feedback?.id || "";
    const commentId = rawId || `fb_${product.itemid}_${hashText(`${authorName}|${comment}|api|${index}`)}`;
    const reactionCount =
      node.feedback?.reaction_count?.count ??
      node.feedback?.reactors?.count ??
      node.feedback?.likers?.count ??
      node.feedback?.top_reactions?.count ??
      0;
    const replyCount = node.feedback?.replies_fields?.total_count ?? node.feedback?.replies_fields?.count ?? "";

    return toReviewRecord({
      product,
      commentId,
      author: authorName,
      authorId: author.id || "",
      authorUrl: normalizeUrl(author.url || ""),
      comment,
      commentUrl,
      createdTime: node.created_time || node.creation_time || "",
      likeCount: reactionCount,
      replyCount,
      sortMode: "all_comments_api"
    });
  };

  class FacebookPostAdapter extends registry.BasePlatformAdapter {
    get id() { return "facebook-post"; }
    get label() { return "Facebook Post"; }
    get region() { return "global"; }
    get itemLabel() { return "Post"; }
    get itemCountLabel() { return "Comments"; }
    get pageCountLabel() { return "Loads"; }
    get clickIntervalMs() { return 1800; }
    get responseTimeoutMs() { return 6000; }

    matchHost(loc) {
      const host = (loc.hostname || "").toLowerCase();
      if (!["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"].includes(host)) return false;
      return this.parseProductInfo(loc)?.itemid ? true : false;
    }

    parseProductInfo(loc = window.location) {
      const itemid = parsePostIdFromUrl(loc);
      if (!itemid) return null;
      const title = document.title.replace(/\s*\|\s*Facebook.*$/i, "").trim() || "Facebook post";
      return {
        shopid: "facebook",
        itemid,
        url: loc.href,
        title
      };
    }

    matchApiUrl(url) {
      return /\/api\/graphql\/?/i.test(url || "");
    }

    normalizeReview(review) {
      return review;
    }

    parseApiResponse(data, _url, context = {}) {
      const product = context.product || this.parseProductInfo();
      const { edges, pageInfo } = extractGraphqlCommentEdges(data);
      const reviews = [];
      const seen = new Set();

      edges.forEach((edge, index) => {
        const review = normalizeApiComment(edge?.node || edge, product, index);
        if (!review) return;
        if (seen.has(review.cmtid)) return;
        seen.add(review.cmtid);
        reviews.push(review);
      });

      return {
        reviews,
        paging: {
          pageNo: context.captureIndex || null,
          totalItems: null,
          endCursor: pageInfo?.end_cursor || null
        },
        hasMore: pageInfo?.has_next_page ?? null,
        summary: null
      };
    }

    async scrollToReviewSection() {
      const candidates = [...document.querySelectorAll("span, div")]
        .filter((node) => /comment|\u8bc4\u8bba|\u7559\u8a00/i.test(textOf(node)))
        .slice(0, 20);
      candidates[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (!candidates.length) {
        window.scrollTo({ top: Math.floor(document.body.scrollHeight * 0.45), behavior: "smooth" });
      }
      await sleep(1200);
    }

    async prepareDomCapture() {
      await this.scrollToReviewSection();
      const sortButton = findSortButton();
      if (!sortButton) {
        return { changed: false, message: "Comment sort menu was not found; continuing with current order." };
      }

      if (labelMatches(labelOf(sortButton), SORT_ALL_LABELS)) {
        return { changed: false, message: "All comments is already selected." };
      }

      pressElement(sortButton);
      await sleep(800);
      const allCommentsOption = findAllCommentsOption();
      if (!allCommentsOption) {
        return { changed: false, message: "All comments option was not found; continuing with current order." };
      }

      pressElement(allCommentsOption);
      await sleep(1600);
      return { changed: true, message: "Selected All comments before capture." };
    }

    async clickNextPage() {
      const target = await waitForMoreCommentsButton();
      if (!target) {
        return { clicked: false, reason: "no more comments button" };
      }

      pressElement(target);
      await sleep(900);
      return { clicked: true, reason: "more comments button" };
    }

    collectDomReviews(context = {}) {
      const product = context.product || this.parseProductInfo();
      const selectors = [
        "div[aria-label^='Comment by' i]",
        "div[aria-label*=' comment by ' i]",
        "div[role='article'][aria-label*='Comment' i]",
        "div[role='article']"
      ];
      const nodes = [...document.querySelectorAll(selectors.join(","))].filter(isCommentArticle);
      const reviews = [];
      const seen = new Set();
      nodes.forEach((node, index) => {
        const review = normalizeDomComment(node, product, index);
        if (!review) return;
        if (seen.has(review.cmtid)) return;
        seen.add(review.cmtid);
        reviews.push(review);
      });
      return {
        reviews,
        paging: { pageNo: context.captureIndex || null, totalItems: null },
        hasMore: Boolean(findMoreCommentsButton()),
        summary: null
      };
    }
  }

  registry.register(new FacebookPostAdapter());
})();
