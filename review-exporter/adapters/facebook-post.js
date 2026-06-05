// Facebook post comment adapter

(() => {
  const registry = window.__REVIEW_EXPORTER;
  if (!registry || !registry.BasePlatformAdapter) return;

  const textOf = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();

  const hashText = (input) => {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  const normalizeUrl = (href) => {
    if (!href) return "";
    try {
      return new URL(href, window.location.origin).href.split("?comment_id=")[0];
    } catch {
      return "";
    }
  };

  const parsePostIdFromUrl = (loc = window.location) => {
    const params = new URLSearchParams(loc.search || "");
    const path = loc.pathname || "";
    const isPostPath = /\/(posts|videos|reel|watch|story\.php|permalink\.php|photo\.php|share\/[pv]|groups\/[^/]+\/posts)\b/i.test(path);
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

  const parseAuthorFromNode = (node) => {
    const aria = node.getAttribute("aria-label") || "";
    const ariaMatch = aria.match(/comment by\s+(.+?)(?:$|,|\.|\s+on\s+)/i);
    if (ariaMatch?.[1]) return ariaMatch[1].trim();

    const authorLink = node.querySelector(
      "a[role='link'][href*='facebook.com'], a[href^='/profile.php'], a[href^='/people/'], a[href^='/'][tabindex='0']"
    );
    const author = textOf(authorLink);
    return author.replace(/^@/, "").trim();
  };

  const parseCommentText = (node, author) => {
    const blocks = [...node.querySelectorAll("div[dir='auto'], span[dir='auto']")]
      .map((el) => textOf(el))
      .filter(Boolean)
      .filter((text) => text !== author)
      .filter((text) => !/^(like|reply|share|edited|top fan|author|all comments|most relevant)$/i.test(text))
      .filter((text) => !/^\d+\s*(m|h|d|w|mo|y|分钟|小时|天|周|月|年)$/i.test(text));

    const unique = [];
    for (const text of blocks) {
      if (!unique.includes(text)) unique.push(text);
    }
    return unique.join(" ").trim();
  };

  const normalizeDomComment = (node, product, index = 0) => {
    const author = parseAuthorFromNode(node);
    const comment = parseCommentText(node, author);
    if (!comment || comment.length < 2) return null;

    const link = node.querySelector("a[href*='comment_id='], a[href*='comment/replies']");
    const commentUrl = normalizeUrl(link?.href || "");
    let commentId = "";
    try {
      const params = new URL(link?.href || "", window.location.origin).searchParams;
      commentId = params.get("comment_id") || params.get("reply_comment_id") || "";
    } catch {
      commentId = "";
    }
    if (!commentId) {
      commentId = `fb_${product.itemid}_${hashText(`${author}|${comment}|${index}`)}`;
    }

    return {
      ...registry.emptyReview(),
      platform: "facebook-post",
      shopid: product.shopid || "facebook",
      itemid: product.itemid,
      cmtid: commentId,
      userid: "",
      author_username: author,
      anonymous: false,
      rating_star: "",
      rating: "",
      comment,
      comment_tr: "",
      like_count: 0,
      ctime: "",
      ctime_iso: "",
      submit_time: "",
      submit_time_iso: "",
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
      sort_mode: "",
      parent_cmtid: "",
      is_reply: false,
      reply_count: "",
      author_channel_url: normalizeUrl(node.querySelector("a[role='link'][href*='facebook.com'], a[href^='/profile.php']")?.href || ""),
      video_id: product.itemid,
      video_title: product.title || "",
      published_time_text: "",
      comment_url: commentUrl
    };
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

    matchApiUrl(_url) {
      return false;
    }

    normalizeReview(review) {
      return review;
    }

    async scrollToReviewSection() {
      const candidates = [...document.querySelectorAll("span, div")]
        .filter((node) => /comment|评论|留言/i.test(textOf(node)))
        .slice(0, 20);
      candidates[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (!candidates.length) {
        window.scrollTo({ top: Math.floor(document.body.scrollHeight * 0.45), behavior: "smooth" });
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    async clickNextPage() {
      const labels = [
        "View more comments",
        "View previous comments",
        "More comments",
        "See more comments",
        "查看更多评论",
        "查看更多留言",
        "更多评论",
        "查看之前的评论"
      ];
      const buttons = [...document.querySelectorAll("div[role='button'], span[role='button'], a[role='link']")];
      const target = buttons.find((button) => labels.some((label) => textOf(button).toLowerCase().includes(label.toLowerCase())));
      if (target) {
        target.click();
        await new Promise((r) => setTimeout(r, 900));
        return { clicked: true };
      }
      window.scrollBy({ top: Math.max(900, Math.floor(window.innerHeight * 0.9)), behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 900));
      return { clicked: true, reason: "scrolled" };
    }

    collectDomReviews(context = {}) {
      const product = context.product || this.parseProductInfo();
      const selectors = [
        "div[aria-label^='Comment by' i]",
        "div[aria-label*=' comment by ' i]",
        "div[role='article'][aria-label*='Comment' i]",
        "div[role='article']"
      ];
      const nodes = [...document.querySelectorAll(selectors.join(","))];
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
        hasMore: null,
        summary: null
      };
    }
  }

  registry.register(new FacebookPostAdapter());
})();
