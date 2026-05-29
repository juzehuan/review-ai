from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import time
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    from scrapling.fetchers import Fetcher
except Exception as exc:  # pragma: no cover - surfaced to the Node API.
    print(
        json.dumps(
            {
                "error": "Scrapling is not installed. Run: pip install -r apps/crawler/requirements.txt",
                "detail": str(exc),
            },
            ensure_ascii=True,
        ),
        file=sys.stderr,
    )
    sys.exit(2)

try:
    from scrapling.fetchers import DynamicFetcher
except Exception:  # pragma: no cover - browser channel is optional.
    DynamicFetcher = None


CHANNEL_LABELS = {
    "api_exporter": "增强接口",
    "api_basic": "基础接口",
    "browser_intercept": "浏览器拦截",
    "youtube_dom": "YouTube DOM",
}
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"}
NESTED_URL_PARAM_NAMES = ("url", "u", "q", "target", "redirect", "redirect_url")


def coerce_url(value: str) -> str:
    url = str(value or "").strip()
    if url.startswith("//"):
        return f"https:{url}"
    if "://" not in url and re.match(r"^(www\.|m\.|[a-z0-9-]+\.)", url, re.IGNORECASE):
        return f"https://{url}"
    return url


def unwrap_nested_url(value: str) -> str:
    url = coerce_url(value)
    for _ in range(3):
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        nested = None
        for param_name in NESTED_URL_PARAM_NAMES:
            candidate = params.get(param_name, [None])[0]
            if candidate and candidate.startswith(("http://", "https://", "//")):
                nested = candidate
                break
        if not nested:
            return url
        next_url = coerce_url(nested)
        if next_url == url:
            return url
        url = next_url
    return url


def is_youtube_url(url: str) -> bool:
    url = unwrap_nested_url(url)
    host = urlparse(url).netloc.lower().removeprefix("www.")
    return host in YOUTUBE_HOSTS or host.endswith(".youtube.com")


def is_shopee_url(url: str) -> bool:
    url = unwrap_nested_url(url)
    host = urlparse(url).netloc.lower()
    return "shopee." in host


def parse_youtube_video_id(url: str) -> str:
    url = unwrap_nested_url(url)
    parsed = urlparse(url)
    host = parsed.netloc.lower().removeprefix("www.")
    if host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
        if video_id:
            return video_id

    params = parse_qs(parsed.query)
    video_id = params.get("v", [None])[0]
    if video_id:
        return video_id

    match = re.search(r"/(?:shorts|live|embed)/([^/?#]+)", parsed.path)
    if match:
        return match.group(1)

    raise ValueError("Could not parse YouTube video id from URL")


def stable_youtube_comment_id(video_id: str, author: str, published_time: str, content: str, index: int) -> str:
    digest = hashlib.sha1(f"{video_id}|{author}|{published_time}|{content}|{index}".encode("utf-8")).hexdigest()
    return f"yt_{video_id}_{digest[:18]}"


def iter_dicts(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_dicts(child)


def collect_youtube_payload_comments(
    payload: dict[str, Any],
    video_id: str,
    source_url: str,
    comments_by_id: dict[str, dict[str, Any]],
    max_reviews: int,
) -> int:
    added = 0
    for node in iter_dicts(payload):
        entity = node.get("commentEntityPayload")
        if not isinstance(entity, dict):
            continue
        properties = entity.get("properties") if isinstance(entity.get("properties"), dict) else {}
        if int(properties.get("replyLevel") or 0) != 0:
            continue
        content_node = properties.get("content") if isinstance(properties.get("content"), dict) else {}
        content = str(content_node.get("content") or "").strip()
        if not content:
            continue
        author_node = entity.get("author") if isinstance(entity.get("author"), dict) else {}
        author = str(author_node.get("displayName") or properties.get("authorButtonA11y") or "").strip()
        published_time = str(properties.get("publishedTime") or "").strip()
        comment_id = str(properties.get("commentId") or entity.get("key") or "").strip() or stable_youtube_comment_id(
            video_id,
            author,
            published_time,
            content,
            len(comments_by_id),
        )
        if comment_id in comments_by_id:
            continue
        toolbar = entity.get("toolbar") if isinstance(entity.get("toolbar"), dict) else {}
        comments_by_id[comment_id] = {
            "cmtId": comment_id,
            "shopId": "youtube",
            "itemId": video_id,
            "ratingStar": 0,
            "comment": content,
            "commentTr": None,
            "modelName": author or None,
            "hasMedia": False,
            "commentTime": None,
            "rawJson": {
                "platform": "YouTube",
                "videoId": video_id,
                "author": author,
                "publishedTime": published_time,
                "likeText": toolbar.get("likeCountNotliked") or toolbar.get("likeCountA11y") or "",
                "replyText": toolbar.get("replyCountA11y") or toolbar.get("replyCount") or "",
                "sourceUrl": source_url,
                "source": "youtubei_next",
            },
        }
        added += 1
        if len(comments_by_id) >= max_reviews:
            break
    return added


def youtube_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        if isinstance(value.get("simpleText"), str):
            return value["simpleText"]
        if isinstance(value.get("content"), str):
            return value["content"]
        runs = value.get("runs")
        if isinstance(runs, list):
            return "".join(youtube_text(run) for run in runs)
        if isinstance(value.get("text"), str):
            return value["text"]
    if isinstance(value, list):
        return "".join(youtube_text(item) for item in value)
    return ""


def collect_youtube_renderer_comments(
    payload: dict[str, Any],
    video_id: str,
    source_url: str,
    comments_by_id: dict[str, dict[str, Any]],
    max_reviews: int,
) -> int:
    added = 0
    for node in iter_dicts(payload):
        renderer = node.get("commentRenderer") or node.get("commentViewModelRenderer")
        if not isinstance(renderer, dict):
            continue
        content = youtube_text(renderer.get("contentText") or renderer.get("content") or renderer.get("body")).strip()
        if not content:
            continue
        author = youtube_text(renderer.get("authorText") or renderer.get("author")).strip()
        published_time = youtube_text(renderer.get("publishedTimeText") or renderer.get("publishedTime")).strip()
        comment_id = str(renderer.get("commentId") or renderer.get("commentKey") or renderer.get("entityKey") or "").strip()
        if not comment_id:
            comment_id = stable_youtube_comment_id(video_id, author, published_time, content, len(comments_by_id))
        if comment_id in comments_by_id:
            continue
        comments_by_id[comment_id] = {
            "cmtId": comment_id,
            "shopId": "youtube",
            "itemId": video_id,
            "ratingStar": 0,
            "comment": content,
            "commentTr": None,
            "modelName": author or None,
            "hasMedia": False,
            "commentTime": None,
            "rawJson": {
                "platform": "YouTube",
                "videoId": video_id,
                "author": author,
                "publishedTime": published_time,
                "likeText": youtube_text(renderer.get("voteCount") or renderer.get("voteCountText")),
                "replyText": "",
                "sourceUrl": source_url,
                "source": "youtube_renderer",
            },
        }
        added += 1
        if len(comments_by_id) >= max_reviews:
            break
    return added


def parse_product_ids(url: str) -> tuple[str, str]:
    url = unwrap_nested_url(url)
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    shop_id = params.get("shopid", [None])[0]
    item_id = params.get("itemid", [None])[0]
    if shop_id and item_id:
        return shop_id, item_id

    patterns = [
        r"(?:-i\.|/i\.)(\d+)\.(\d+)",
        r"/product/(\d+)/(\d+)",
        r"[?&]shopid=(\d+).*?[?&]itemid=(\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1), match.group(2)

    raise ValueError("Could not parse Shopee shop_id and item_id from product URL")


def request_json(url: str, referer: str, proxy: str | None, timeout: int = 30) -> dict[str, Any]:
    headers = {
        "accept": "application/json",
        "accept-language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
        "origin": "https://shopee.co.th",
        "referer": referer,
        "x-api-source": "pc",
    }
    cookie = os.getenv("SHOPEE_COOKIE")
    if cookie:
        headers["cookie"] = cookie

    kwargs: dict[str, Any] = {
        "headers": headers,
        "impersonate": "chrome",
        "stealthy_headers": True,
        "timeout": timeout,
    }
    if proxy:
        kwargs["proxy"] = proxy

    page = Fetcher.get(url, **kwargs)
    if getattr(page, "status", 200) >= 400:
        raise RuntimeError(f"HTTP {page.status} from {url}")
    return page.json()


def build_ratings_url(shop_id: str, item_id: str, offset: int, limit: int, channel: str) -> str:
    params: dict[str, str] = {
        "filter": "0",
        "flag": "1",
        "itemid": item_id,
        "limit": str(limit),
        "offset": str(offset),
        "shopid": shop_id,
        "type": "0",
    }
    if channel == "api_exporter":
        params.update(
            {
                "exclude_filter": "1",
                "filter_size": "0",
                "fold_filter": "0",
                "relevant_reviews": "false",
                "request_source": "2",
                "tag_filter": "",
                "variation_filters": "",
                "need_translation": "1",
                "fe_toggle": "[2,3]",
                "preferred_item_shop_id": shop_id,
                "preferred_item_item_id": item_id,
                "preferred_item_include_type": "1",
            }
        )
    return f"https://shopee.co.th/api/v2/item/get_ratings?{urlencode(params)}"


def parse_timestamp(value: Any) -> str | None:
    try:
        timestamp = int(value)
    except (TypeError, ValueError):
        return None
    if timestamp <= 0:
        return None
    return dt.datetime.fromtimestamp(timestamp, tz=dt.timezone.utc).isoformat()


def normalize_rating(row: dict[str, Any], shop_id: str, item_id: str) -> dict[str, Any] | None:
    cmt_id = str(row.get("cmtid") or row.get("comment_id") or "").strip()
    rating_star = int(row.get("rating_star") or row.get("rating") or 0)
    comment = str(row.get("comment") or "").strip()
    comment_tr = str(row.get("comment_tr") or row.get("comment_tran") or "").strip() or None
    if not cmt_id or not rating_star or (not comment and not comment_tr):
        return None

    media_items = [
        row.get("images"),
        row.get("videos"),
        row.get("medias"),
    ]
    has_media = any(isinstance(item, list) and len(item) > 0 for item in media_items)
    model_name = None
    product_items = row.get("product_items")
    if isinstance(product_items, list) and product_items:
        model_name = product_items[0].get("model_name") if isinstance(product_items[0], dict) else None

    return {
        "cmtId": cmt_id,
        "shopId": str(row.get("shopid") or shop_id),
        "itemId": str(row.get("itemid") or item_id),
        "ratingStar": rating_star,
        "comment": comment,
        "commentTr": comment_tr,
        "modelName": model_name or row.get("model_name") or row.get("variation") or None,
        "hasMedia": has_media,
        "commentTime": parse_timestamp(row.get("ctime")),
        "rawJson": row,
    }


def read_ratings(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], bool | None, dict[str, Any] | None]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    ratings = data.get("ratings") or []
    has_more = data.get("has_more")
    summary = data.get("item_rating_summary") if isinstance(data.get("item_rating_summary"), dict) else None
    return ratings if isinstance(ratings, list) else [], bool(has_more) if has_more is not None else None, summary


def get_product_name(product_url: str, shop_id: str, item_id: str, proxy: str | None, timeout: int) -> str:
    detail_url = f"https://shopee.co.th/api/v4/item/get?shopid={shop_id}&itemid={item_id}"
    try:
        detail = request_json(detail_url, product_url, proxy, timeout)
        return str(detail.get("data", {}).get("name") or "")
    except Exception:
        return ""


def fetch_api_reviews(product_url: str, max_reviews: int, proxy: str | None, channel: str, timeout: int) -> dict[str, Any]:
    shop_id, item_id = parse_product_ids(product_url)
    limit = min(50, max(1, max_reviews))
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    offset = 0
    page_offsets: list[int] = []
    summary: dict[str, Any] | None = None
    product_name = get_product_name(product_url, shop_id, item_id, proxy, timeout)

    while len(rows) < max_reviews:
        url = build_ratings_url(shop_id, item_id, offset, limit, channel)
        payload = request_json(url, product_url, proxy, timeout)
        ratings, has_more, next_summary = read_ratings(payload)
        summary = next_summary or summary
        if not ratings:
            break

        for rating in ratings:
            normalized = normalize_rating(rating, shop_id, item_id)
            if normalized and normalized["cmtId"] not in seen:
                seen.add(normalized["cmtId"])
                rows.append(normalized)
                if len(rows) >= max_reviews:
                    break

        page_offsets.append(offset)
        if has_more is False or len(ratings) < limit:
            break
        offset += limit
        time.sleep(0.35)

    return {
        "source": "Shopee",
        "crawlChannel": channel,
        "crawlChannelLabel": CHANNEL_LABELS[channel],
        "productUrl": product_url,
        "productName": product_name,
        "shopId": shop_id,
        "itemId": item_id,
        "pageOffsets": page_offsets,
        "summary": summary,
        "rows": rows,
    }


def fetch_browser_intercept_reviews(product_url: str, max_reviews: int, proxy: str | None, timeout: int) -> dict[str, Any]:
    if DynamicFetcher is None:
        raise RuntimeError("Scrapling DynamicFetcher is not available. Reinstall with: pip install 'scrapling[fetchers]'")

    shop_id, item_id = parse_product_ids(product_url)
    rows_by_id: dict[str, dict[str, Any]] = {}
    page_offsets: set[int] = set()
    state: dict[str, Any] = {"has_more": None, "summary": None, "product_name": ""}

    def consume(url: str, payload: dict[str, Any]) -> bool:
        ratings, has_more, summary = read_ratings(payload)
        if not ratings:
            return False

        parsed_offset = 0
        try:
            parsed_offset = int(parse_qs(urlparse(url).query).get("offset", ["0"])[0] or 0)
        except Exception:
            parsed_offset = 0

        for rating in ratings:
            normalized = normalize_rating(rating, shop_id, item_id)
            if normalized:
                rows_by_id[normalized["cmtId"]] = normalized

        page_offsets.add(parsed_offset)
        if has_more is not None:
            state["has_more"] = has_more
        if summary:
            state["summary"] = summary
        return True

    def page_action(page: Any) -> None:
        def on_response(response: Any) -> None:
            try:
                if "/api/v2/item/get_ratings" not in response.url:
                    return
                consume(response.url, response.json())
            except Exception:
                return

        page.on("response", on_response)

        try:
            title = page.title()
            state["product_name"] = title.split("|")[0].strip() if title else ""
        except Exception:
            state["product_name"] = ""

        bootstrap_url = build_ratings_url(shop_id, item_id, 0, min(50, max_reviews), "api_exporter")
        try:
            bootstrap_payload = page.evaluate(
                """async (url) => {
                    const response = await fetch(url, { credentials: 'include' });
                    return await response.json();
                }""",
                bootstrap_url,
            )
            consume(bootstrap_url, bootstrap_payload)
        except Exception:
            pass

        next_selector = ".product-ratings__page-controller .shopee-icon-button--right"
        deadline = time.time() + timeout
        while len(rows_by_id) < max_reviews and time.time() < deadline:
            if state.get("has_more") is False:
                break
            previous_count = len(rows_by_id)
            try:
                button = page.query_selector(next_selector)
                if not button:
                    break
                disabled = button.get_attribute("aria-disabled") == "true" or button.is_disabled()
                if disabled:
                    break
                button.scroll_into_view_if_needed(timeout=3000)
                button.click(timeout=3000)
                page.wait_for_timeout(1400)
            except Exception:
                page.wait_for_timeout(1200)
            if len(rows_by_id) == previous_count:
                break

    fetch_kwargs: dict[str, Any] = {
        "headless": True,
        "disable_resources": False,
        "network_idle": True,
        "timeout": timeout * 1000,
        "wait": 1000,
        "page_action": page_action,
        "locale": "th-TH",
        "extra_headers": {"accept-language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7"},
    }
    if proxy:
        fetch_kwargs["proxy"] = proxy

    DynamicFetcher.fetch(product_url, **fetch_kwargs)
    rows = list(rows_by_id.values())[:max_reviews]
    return {
        "source": "Shopee",
        "crawlChannel": "browser_intercept",
        "crawlChannelLabel": CHANNEL_LABELS["browser_intercept"],
        "productUrl": product_url,
        "productName": state.get("product_name") or get_product_name(product_url, shop_id, item_id, proxy, timeout),
        "shopId": shop_id,
        "itemId": item_id,
        "pageOffsets": sorted(page_offsets),
        "summary": state.get("summary"),
        "rows": rows,
    }


def fetch_youtube_comments(video_url: str, max_reviews: int, proxy: str | None, timeout: int) -> dict[str, Any]:
    if DynamicFetcher is None:
        raise RuntimeError("Scrapling DynamicFetcher is not available. Reinstall with: pip install 'scrapling[fetchers]'")

    video_id = parse_youtube_video_id(video_url)
    comments_by_id: dict[str, dict[str, Any]] = {}
    state: dict[str, Any] = {
        "next_requests": 0,
        "title": "",
        "end_reached": False,
        "payload_comments": 0,
        "dom_comment_count": 0,
        "dom_content_text_count": 0,
    }

    def page_action(page: Any) -> None:
        def on_response(response: Any) -> None:
            try:
                if "/youtubei/v1/next" in response.url:
                    state["next_requests"] = int(state.get("next_requests") or 0) + 1
                    try:
                        payload = json.loads(response.text())
                        payload_added = collect_youtube_payload_comments(
                            payload,
                            video_id,
                            video_url,
                            comments_by_id,
                            max_reviews,
                        )
                        renderer_added = collect_youtube_renderer_comments(
                            payload,
                            video_id,
                            video_url,
                            comments_by_id,
                            max_reviews,
                        )
                        state["payload_comments"] = int(state.get("payload_comments") or 0) + payload_added + renderer_added
                    except Exception:
                        return
            except Exception:
                return

        page.on("response", on_response)
        page.wait_for_timeout(2500)

        try:
            for selector in [
                "button:has-text('Accept all')",
                "button:has-text('I agree')",
                "button:has-text('全部接受')",
                "button:has-text('同意')",
            ]:
                button = page.query_selector(selector)
                if button:
                    button.click(timeout=2000)
                    page.wait_for_timeout(800)
                    break
        except Exception:
            pass

        try:
            title = page.title() or ""
            state["title"] = title.replace("- YouTube", "").strip()
        except Exception:
            state["title"] = ""

        def extract_comments() -> list[dict[str, Any]]:
            return page.evaluate(
                """() => {
                    const clean = (value) => (value || "").replace(/\\s+/g, " ").trim();
                    const comments = Array.from(document.querySelectorAll(
                      "ytd-comment-view-model#comment, ytd-comment-view-model"
                    )).filter((comment, index, all) =>
                      !comment.closest("ytd-comment-replies-renderer") && all.indexOf(comment) === index
                    );
                    return comments.map((comment, index) => {
                      const thread = comment.closest("ytd-comment-thread-renderer");
                      const author =
                        clean(comment.querySelector("#author-text span")?.textContent) ||
                        clean(comment.querySelector("#author-thumbnail-button")?.getAttribute("aria-label"));
                      const contentRoot = comment.querySelector("#content-text, yt-attributed-string[slot='content']");
                      const content = clean(contentRoot?.innerText || contentRoot?.textContent);
                      const timeLink = comment.querySelector("#published-time-text a");
                      const publishedTime = clean(timeLink?.textContent);
                      const href = timeLink?.getAttribute("href") || "";
                      let commentId = "";
                      try {
                        const url = new URL(href, location.origin);
                        commentId = url.searchParams.get("lc") || "";
                      } catch {}
                      const likeText = clean(comment.querySelector("#vote-count-middle")?.textContent);
                      const replyText =
                        clean(thread.querySelector("ytd-comment-replies-renderer #more-replies-sub-thread button")?.getAttribute("aria-label")) ||
                        clean(thread.querySelector("ytd-comment-replies-renderer #more-replies-sub-thread span[role='text']")?.textContent);
                      if (!content) return null;
                      return { index, author, content, publishedTime, commentId, likeText, replyText };
                    }).filter(Boolean);
                }"""
            )

        def has_end_hint() -> bool:
            try:
                return bool(
                    page.evaluate(
                        """() => {
                            const text = document.body?.innerText || "";
                            return text.includes("目前你选择的是") ||
                              text.includes("当前你选择的是") ||
                              text.includes("当前选择的是") ||
                              (text.includes("最热门") && text.includes("精选评论")) ||
                              text.includes("You're currently sorted") ||
                              text.includes("Top comments");
                        }"""
                    )
                )
            except Exception:
                return False

        def refresh_diagnostics() -> None:
            try:
                diagnostics = page.evaluate(
                    """() => ({
                        commentViews: document.querySelectorAll("ytd-comment-view-model").length,
                        contentTexts: document.querySelectorAll("ytd-comment-view-model #content-text, ytd-comment-view-model yt-attributed-string[slot='content']").length
                    })"""
                )
                state["dom_comment_count"] = int(diagnostics.get("commentViews") or 0)
                state["dom_content_text_count"] = int(diagnostics.get("contentTexts") or 0)
            except Exception:
                return

        idle_rounds = 0
        last_count = 0
        last_next_requests = int(state.get("next_requests") or 0)
        deadline = time.time() + timeout

        try:
            page.evaluate(
                """() => {
                    const comments = document.querySelector("ytd-comments");
                    if (comments) {
                        comments.scrollIntoView({ block: "start" });
                    } else {
                        window.scrollBy(0, Math.max(900, Math.floor(window.innerHeight * 1.2)));
                    }
                }"""
            )
            page.wait_for_timeout(2200)
        except Exception:
            page.wait_for_timeout(1200)

        refresh_diagnostics()

        while len(comments_by_id) < max_reviews and time.time() < deadline:
            try:
                page.evaluate(
                    """() => {
                        window.scrollBy(0, Math.max(700, Math.floor(window.innerHeight * 0.85)));
                    }"""
                )
                page.wait_for_timeout(1800)
            except Exception:
                page.wait_for_timeout(1200)

            refresh_diagnostics()

            for item in extract_comments():
                content = str(item.get("content") or "").strip()
                if not content:
                    continue
                author = str(item.get("author") or "").strip()
                published_time = str(item.get("publishedTime") or "").strip()
                comment_id = str(item.get("commentId") or "").strip() or stable_youtube_comment_id(
                    video_id,
                    author,
                    published_time,
                    content,
                    int(item.get("index") or len(comments_by_id)),
                )
                comments_by_id[comment_id] = {
                    "cmtId": comment_id,
                    "shopId": "youtube",
                    "itemId": video_id,
                    "ratingStar": 0,
                    "comment": content,
                    "commentTr": None,
                    "modelName": author or None,
                    "hasMedia": False,
                    "commentTime": None,
                    "rawJson": {
                        "platform": "YouTube",
                        "videoId": video_id,
                        "author": author,
                        "publishedTime": published_time,
                        "likeText": item.get("likeText") or "",
                        "replyText": item.get("replyText") or "",
                        "sourceUrl": video_url,
                    },
                }
                if len(comments_by_id) >= max_reviews:
                    break

            current_count = len(comments_by_id)
            current_next_requests = int(state.get("next_requests") or 0)
            if current_count == last_count and current_next_requests == last_next_requests:
                idle_rounds += 1
            else:
                idle_rounds = 0
            last_count = current_count
            last_next_requests = current_next_requests

            if has_end_hint():
                state["end_reached"] = True
                if idle_rounds >= 1:
                    break
            if idle_rounds >= 3:
                break

    fetch_kwargs: dict[str, Any] = {
        "headless": True,
        "disable_resources": False,
        "network_idle": False,
        "timeout": timeout * 1000,
        "wait": 1000,
        "page_action": page_action,
        "locale": "zh-CN",
        "extra_headers": {"accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7"},
    }
    if proxy:
        fetch_kwargs["proxy"] = proxy

    DynamicFetcher.fetch(video_url, **fetch_kwargs)
    rows = list(comments_by_id.values())[:max_reviews]
    return {
        "source": "YouTube",
        "crawlChannel": "youtube_dom",
        "crawlChannelLabel": CHANNEL_LABELS["youtube_dom"],
        "productUrl": video_url,
        "productName": state.get("title") or f"YouTube {video_id}",
        "shopId": "youtube",
        "itemId": video_id,
        "videoId": video_id,
        "nextRequests": state.get("next_requests"),
        "endReached": state.get("end_reached"),
        "payloadComments": state.get("payload_comments"),
        "domCommentCount": state.get("dom_comment_count"),
        "domContentTextCount": state.get("dom_content_text_count"),
        "rows": rows,
    }


def parse_channels(value: str) -> list[str]:
    channels = [item.strip() for item in value.split(",") if item.strip()]
    valid = [item for item in channels if item in CHANNEL_LABELS]
    return valid or ["api_exporter", "api_basic", "browser_intercept"]


def fetch_shopee_reviews(product_url: str, max_reviews: int, proxy: str | None, channels: list[str], timeout: int) -> dict[str, Any]:
    errors: list[str] = []
    shopee_channels = [channel for channel in channels if channel in {"api_exporter", "api_basic", "browser_intercept"}]
    for channel in shopee_channels:
        try:
            if channel == "browser_intercept":
                result = fetch_browser_intercept_reviews(product_url, max_reviews, proxy, timeout)
            else:
                result = fetch_api_reviews(product_url, max_reviews, proxy, channel, timeout)
            if result["rows"]:
                result["channelErrors"] = errors
                return result
            errors.append(f"{CHANNEL_LABELS[channel]}：没有抓取到评论")
        except Exception as exc:
            errors.append(f"{CHANNEL_LABELS[channel]}：{exc}")

    raise RuntimeError(" | ".join(errors) or "No available crawl channel")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--max-reviews", type=int, default=200)
    parser.add_argument("--proxy", default=os.getenv("SCRAPLING_PROXY"))
    parser.add_argument("--channels", default=os.getenv("SCRAPLING_CHANNELS", "api_exporter,api_basic,browser_intercept"))
    parser.add_argument("--timeout", type=int, default=int(os.getenv("SCRAPLING_TIMEOUT_SEC", "180")))
    args = parser.parse_args()

    try:
        crawl_url = unwrap_nested_url(args.url)
        if is_youtube_url(crawl_url):
            result = fetch_youtube_comments(crawl_url, args.max_reviews, args.proxy, args.timeout)
        elif is_shopee_url(crawl_url):
            result = fetch_shopee_reviews(crawl_url, args.max_reviews, args.proxy, parse_channels(args.channels), args.timeout)
        else:
            raise RuntimeError("Unsupported crawl URL. Currently supports Shopee product links and YouTube video links.")
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=True), file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
