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
    "tiktok_video": "TikTok Video DOM",
    "facebook_post": "Facebook Post DOM",
}
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"}
TIKTOK_HOSTS = {"tiktok.com", "www.tiktok.com", "m.tiktok.com"}
FACEBOOK_HOSTS = {"facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"}
NESTED_URL_PARAM_NAMES = ("url", "u", "q", "target", "redirect", "redirect_url")
CRAWL_PROGRESS_PREFIX = "__CRAWL_PROGRESS__"
FACEBOOK_SHARE_PATH_RE = re.compile(r"/share/(?:p|v|r|reel|video|photo)(?:/|$)", re.IGNORECASE)


def compact_dict(value: dict[str, Any]) -> dict[str, Any]:
    return {key: item for key, item in value.items() if item is not None}


def compact_metric_parts(parts: list[str | None]) -> str:
    return "，".join([part for part in parts if part])


def emit_crawl_progress(
    source: str,
    crawl_channel: str,
    rows_by_id: dict[str, dict[str, Any]],
    state: dict[str, Any],
    max_reviews: int,
    deadline: float | None = None,
) -> None:
    try:
        fetched_rows = len(rows_by_id)
        coverage_percent = None
        if max_reviews > 0:
            coverage_percent = min(100, round((fetched_rows / max_reviews) * 100))
        remaining_seconds = None
        if deadline is not None:
            remaining_seconds = max(0, int(deadline - time.time()))
        payload = compact_dict(
            {
                "source": source,
                "crawlChannel": crawl_channel,
                "crawlChannelLabel": CHANNEL_LABELS.get(crawl_channel),
                "fetchedRows": fetched_rows,
                "maxReviews": max_reviews,
                "coveragePercent": coverage_percent,
                "nextRequests": state.get("next_requests") if state.get("next_requests") is not None else state.get("comment_requests"),
                "payloadComments": state.get("payload_comments"),
                "domCommentCount": state.get("dom_comment_count"),
                "domContentTextCount": state.get("dom_content_text_count"),
                "loadMoreClicks": state.get("load_more_clicks"),
                "idleRounds": state.get("idle_rounds"),
                "lastAddedRows": state.get("last_added_rows"),
                "noMoreButtonRounds": state.get("no_more_button_rounds"),
                "lastLoadMoreClicked": state.get("last_load_more_clicked"),
                "hasMore": state.get("has_more"),
                "lastRequestStatus": state.get("last_request_status"),
                "endReached": state.get("end_reached"),
                "stopReason": state.get("stop_reason"),
                "commentSortAttempted": state.get("comment_sort_attempted"),
                "commentSortSwitched": state.get("comment_sort_switched"),
                "commentSortOpened": state.get("comment_sort_opened"),
                "commentSortLabel": state.get("comment_sort_label"),
                "cursor": state.get("cursor"),
                "totalComments": state.get("total_comments"),
                "remainingSeconds": remaining_seconds,
                "emittedAt": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            }
        )
        print(f"{CRAWL_PROGRESS_PREFIX}{json.dumps(payload, ensure_ascii=True)}", file=sys.stderr, flush=True)
    except Exception:
        pass


def apply_dynamic_fetcher_defaults(fetch_kwargs: dict[str, Any]) -> dict[str, Any]:
    executable_path = os.getenv("SCRAPLING_CHROMIUM_EXECUTABLE") or os.getenv("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    if executable_path:
        fetch_kwargs.setdefault("executable_path", executable_path)
    return fetch_kwargs


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


def is_tiktok_video_url(url: str) -> bool:
    url = unwrap_nested_url(url)
    parsed = urlparse(url)
    host = parsed.netloc.lower().removeprefix("www.")
    return (host in TIKTOK_HOSTS or host.endswith(".tiktok.com")) and bool(re.search(r"/@[^/]+/video/\d+", parsed.path))


def is_facebook_post_url(url: str) -> bool:
    url = unwrap_nested_url(url)
    parsed = urlparse(url)
    host = parsed.netloc.lower().removeprefix("www.")
    if host not in FACEBOOK_HOSTS and not host.endswith(".facebook.com"):
        return False
    path = parsed.path or ""
    params = parse_qs(parsed.query)
    if FACEBOOK_SHARE_PATH_RE.search(path):
        return True
    if params.get("story_fbid") or params.get("fbid") or params.get("v"):
        return bool(re.search(r"/(story\.php|permalink\.php|photo(?:\.php)?|watch|posts|videos|reel)", path, re.IGNORECASE))
    return bool(re.search(r"/(?:groups/[^/]+/posts|posts|videos|reel)/[^/?#]+", path, re.IGNORECASE))


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


def parse_tiktok_video_id(url: str) -> str:
    url = unwrap_nested_url(url)
    parsed = urlparse(url)
    match = re.search(r"/@[^/]+/video/(\d+)", parsed.path)
    if match:
        return match.group(1)
    params = parse_qs(parsed.query)
    video_id = params.get("aweme_id", [None])[0] or params.get("item_id", [None])[0]
    if video_id:
        return video_id
    raise ValueError("Could not parse TikTok video id from URL")


def parse_facebook_post_id(url: str) -> str:
    url = unwrap_nested_url(url)
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    for name in ("story_fbid", "fbid", "v"):
        value = params.get(name, [None])[0]
        if value:
            return value
    match = re.search(r"/groups/[^/]+/posts/([^/?#]+)", parsed.path, re.IGNORECASE)
    if match:
        return match.group(1)
    match = re.search(r"/(?:posts|videos|reel|share/(?:p|v|r|reel|video|photo))/([^/?#]+)", parsed.path, re.IGNORECASE)
    if match:
        return match.group(1)
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()
    return f"fbpost_{digest[:18]}"


def stable_youtube_comment_id(video_id: str, author: str, published_time: str, content: str, index: int) -> str:
    digest = hashlib.sha1(f"{video_id}|{author}|{published_time}|{content}|{index}".encode("utf-8")).hexdigest()
    return f"yt_{video_id}_{digest[:18]}"


def stable_tiktok_comment_id(video_id: str, author: str, content: str, index: int) -> str:
    digest = hashlib.sha1(f"{video_id}|{author}|{content}|{index}".encode("utf-8")).hexdigest()
    return f"tt_{video_id}_{digest[:18]}"


def tiktok_best_url(value: Any) -> str:
    if isinstance(value, str):
        return value
    if not isinstance(value, dict):
        return ""
    urls = value.get("url_list") or value.get("urls") or value.get("urlList")
    if isinstance(urls, list) and urls:
        return str(urls[0] or "")
    return ""


def tiktok_comment_image_urls(comment: dict[str, Any]) -> list[str]:
    images = comment.get("image_list")
    if not isinstance(images, list):
        return []
    urls: list[str] = []
    for image in images:
        if not isinstance(image, dict):
            continue
        url = tiktok_best_url(image.get("origin_url")) or tiktok_best_url(image.get("crop_url")) or tiktok_best_url(image)
        if url:
            urls.append(url)
    return urls


def response_status(response: Any) -> int | None:
    try:
        status = getattr(response, "status", None)
        if callable(status):
            status = status()
        parsed = int(status)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def stable_facebook_comment_id(post_id: str, author: str, content: str, index: int) -> str:
    digest = hashlib.sha1(f"{post_id}|{author}|{content}|{index}".encode("utf-8")).hexdigest()
    return f"fb_{post_id}_{digest[:18]}"


def facebook_comment_time(value: Any) -> str | None:
    try:
        timestamp = int(value)
        return dt.datetime.utcfromtimestamp(timestamp).replace(microsecond=0).isoformat() + "Z"
    except Exception:
        return None


def facebook_comment_url(node: dict[str, Any]) -> str:
    url = node.get("url")
    if isinstance(url, str):
        return url
    for child in iter_dicts(node.get("comment_action_links")):
        comment = child.get("comment")
        if isinstance(comment, dict) and isinstance(comment.get("url"), str):
            return comment["url"]
    return ""


def parse_json_documents(text: str) -> list[dict[str, Any]]:
    raw = text.strip()
    if raw.startswith("for (;;);"):
        raw = raw[len("for (;;);") :].strip()
    candidates = [raw] if raw else []
    candidates.extend(line.strip() for line in raw.splitlines() if line.strip().startswith("{"))
    documents: list[dict[str, Any]] = []
    seen: set[str] = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        try:
            parsed = json.loads(candidate)
        except Exception:
            continue
        if isinstance(parsed, dict):
            documents.append(parsed)
    return documents


def iter_dicts(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_dicts(child)


def collect_facebook_graphql_comments(
    payload: dict[str, Any],
    post_id: str,
    source_url: str,
    comments_by_id: dict[str, dict[str, Any]],
    max_reviews: int,
) -> int:
    added = 0
    for node in iter_dicts(payload):
        if node.get("__typename") != "Comment":
            continue
        body = node.get("body") if isinstance(node.get("body"), dict) else {}
        content = str(body.get("text") or "").strip()
        if not content:
            continue
        author_node = node.get("author") if isinstance(node.get("author"), dict) else {}
        author = str(author_node.get("name") or "").strip()
        comment_id = str(node.get("id") or node.get("legacy_fbid") or "").strip() or stable_facebook_comment_id(
            post_id,
            author,
            content,
            len(comments_by_id),
        )
        if comment_id in comments_by_id:
            continue
        comment_time = facebook_comment_time(node.get("created_time"))
        comment_url = facebook_comment_url(node)
        comments_by_id[comment_id] = {
            "cmtId": comment_id,
            "shopId": "facebook",
            "itemId": post_id,
            "ratingStar": 0,
            "comment": content,
            "commentTr": None,
            "modelName": author or None,
            "hasMedia": bool(node.get("attachments")),
            "commentTime": comment_time,
            "rawJson": {
                "platform": "Facebook",
                "postId": post_id,
                "author": author,
                "authorId": author_node.get("id") or "",
                "commentUrl": comment_url,
                "sourceUrl": source_url,
                "source": "facebook_graphql",
            },
        }
        added += 1
        if max_reviews > 0 and len(comments_by_id) >= max_reviews:
            break
    return added


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
        if max_reviews > 0 and len(comments_by_id) >= max_reviews:
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
        if max_reviews > 0 and len(comments_by_id) >= max_reviews:
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


def request_tiktok_json(url: str, referer: str, proxy: str | None, timeout: int = 30) -> dict[str, Any]:
    payload, _status = request_tiktok_json_with_status(url, referer, proxy, timeout)
    return payload


def request_tiktok_json_with_status(url: str, referer: str, proxy: str | None, timeout: int = 30) -> tuple[dict[str, Any], int | None]:
    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.7,zh;q=0.6",
        "origin": "https://www.tiktok.com",
        "referer": referer,
    }
    kwargs: dict[str, Any] = {
        "headers": headers,
        "impersonate": "chrome",
        "stealthy_headers": True,
        "timeout": timeout,
    }
    if proxy:
        kwargs["proxy"] = proxy
    page = Fetcher.get(url, **kwargs)
    status = response_status(page) or 200
    if status >= 400:
        raise RuntimeError(f"HTTP {status} from {url}")
    return page.json(), status


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
    unlimited = max_reviews <= 0
    limit = 50 if unlimited else min(50, max(1, max_reviews))
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    offset = 0
    page_offsets: list[int] = []
    summary: dict[str, Any] | None = None
    product_name = get_product_name(product_url, shop_id, item_id, proxy, timeout)
    deadline = time.time() + max(1, timeout)

    while (unlimited or len(rows) < max_reviews) and time.time() < deadline:
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
                if not unlimited and len(rows) >= max_reviews:
                    break

        page_offsets.append(offset)
        if has_more is False or (has_more is None and len(ratings) < limit):
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
    page_limit = 50 if max_reviews <= 0 else min(50, max_reviews)
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

        bootstrap_url = build_ratings_url(shop_id, item_id, 0, page_limit, "api_exporter")
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
        while (max_reviews <= 0 or len(rows_by_id) < max_reviews) and time.time() < deadline:
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

    apply_dynamic_fetcher_defaults(fetch_kwargs)
    DynamicFetcher.fetch(product_url, **fetch_kwargs)
    rows = list(rows_by_id.values())
    if max_reviews > 0:
        rows = rows[:max_reviews]
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
        "crawl_deadline_reached": False,
    }

    def page_action(page: Any) -> None:
        def on_response(response: Any) -> None:
            try:
                if "/youtubei/v1/next" in response.url:
                    state["next_requests"] = int(state.get("next_requests") or 0) + 1
                    state["last_request_status"] = response_status(response)
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
                        contentTexts: document.querySelectorAll("ytd-comment-view-model #content-text, ytd-comment-view-model yt-attributed-string[slot='content']").length,
                        continuations: document.querySelectorAll("ytd-continuation-item, tp-yt-paper-spinner, #continuations").length,
                        scrollY: Math.round(window.scrollY || 0),
                        scrollHeight: Math.round(document.documentElement?.scrollHeight || document.body?.scrollHeight || 0)
                    })"""
                )
                state["dom_comment_count"] = int(diagnostics.get("commentViews") or 0)
                state["dom_content_text_count"] = int(diagnostics.get("contentTexts") or 0)
                state["continuation_count"] = int(diagnostics.get("continuations") or 0)
                state["scroll_y"] = int(diagnostics.get("scrollY") or 0)
                state["scroll_height"] = int(diagnostics.get("scrollHeight") or 0)
            except Exception:
                return

        def trigger_more_comments(round_index: int) -> None:
            page.evaluate(
                """(roundIndex) => {
                    const commentViews = document.querySelectorAll("ytd-comment-view-model").length;
                    const commentsSection = document.querySelector("ytd-comments");
                    if (!commentViews && !commentsSection) {
                      window.scrollBy({ top: Math.max(window.innerHeight * 1.6, 1200), behavior: "smooth" });
                      return;
                    }
                    const scrollIntoView = (node) => {
                      if (node) node.scrollIntoView({ block: "center", inline: "nearest" });
                      return Boolean(node);
                    };
                    const continuation =
                      document.querySelector("ytd-continuation-item") ||
                      document.querySelector("#continuations") ||
                      document.querySelector("tp-yt-paper-spinner");
                    if (scrollIntoView(continuation)) return;

                    const comments = Array.from(document.querySelectorAll("ytd-comment-view-model"));
                    const lastComment = comments[comments.length - 1];
                    if (scrollIntoView(lastComment)) return;

                    const delta = Math.max(window.innerHeight * (roundIndex % 3 === 0 ? 2.2 : 1.1), 900);
                    window.scrollBy({ top: delta, behavior: "smooth" });
                }""",
                round_index,
            )

        idle_rounds = 0
        last_count = 0
        last_next_requests = int(state.get("next_requests") or 0)
        # Leave time for Scrapling/Node to serialize partial rows instead of
        # being killed by the outer process timeout.
        deadline = time.time() + max(10, timeout - 20)

        try:
            page.evaluate(
                """() => {
                    const comments = document.querySelector("ytd-comments");
                    if (comments) {
                        comments.scrollIntoView({ block: "start" });
                    } else {
                        window.scrollBy(0, Math.max(1400, Math.floor(window.innerHeight * 1.8)));
                    }
                }"""
            )
            page.wait_for_timeout(2200)
            page.keyboard.press("PageDown")
            page.wait_for_timeout(1200)
        except Exception:
            page.wait_for_timeout(1200)

        refresh_diagnostics()

        while (max_reviews <= 0 or len(comments_by_id) < max_reviews) and time.time() < deadline:
            try:
                trigger_more_comments(idle_rounds)
                page.wait_for_timeout(2400 if idle_rounds else 1800)
                if idle_rounds >= 2:
                    page.keyboard.press("End")
                    page.wait_for_timeout(1800)
                if idle_rounds >= 5:
                    page.keyboard.press("PageDown")
                    page.wait_for_timeout(1600)
            except Exception:
                page.wait_for_timeout(1600)

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
                if max_reviews > 0 and len(comments_by_id) >= max_reviews:
                    break

            current_count = len(comments_by_id)
            current_next_requests = int(state.get("next_requests") or 0)
            if current_count == last_count and current_next_requests == last_next_requests:
                idle_rounds += 1
            else:
                idle_rounds = 0
            last_count = current_count
            last_next_requests = current_next_requests
            emit_crawl_progress("YouTube", "youtube_dom", comments_by_id, state, max_reviews, deadline)

            if has_end_hint():
                state["end_reached"] = True
                if idle_rounds >= 1:
                    break
            if idle_rounds >= 10:
                break

        if time.time() >= deadline and (max_reviews <= 0 or len(comments_by_id) < max_reviews):
            state["crawl_deadline_reached"] = True

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

    apply_dynamic_fetcher_defaults(fetch_kwargs)
    DynamicFetcher.fetch(video_url, **fetch_kwargs)
    rows = list(comments_by_id.values())
    if max_reviews > 0:
        rows = rows[:max_reviews]
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
        "continuationCount": state.get("continuation_count"),
        "lastRequestStatus": state.get("last_request_status"),
        "scrollY": state.get("scroll_y"),
        "scrollHeight": state.get("scroll_height"),
        "partialDueToTimeout": state.get("crawl_deadline_reached"),
        "rows": rows,
    }


def collect_tiktok_api_comments(
    payload: dict[str, Any],
    video_id: str,
    source_url: str,
    comments_by_id: dict[str, dict[str, Any]],
    max_reviews: int,
) -> int:
    comments = tiktok_payload_comments(payload)

    added = 0
    for index, comment in enumerate(comments):
        if not isinstance(comment, dict):
            continue
        image_urls = tiktok_comment_image_urls(comment)
        content = str(comment.get("text") or comment.get("comment") or ("[image comment]" if image_urls else "")).strip()
        if not content:
            continue
        user = comment.get("user") if isinstance(comment.get("user"), dict) else {}
        author = str(user.get("unique_id") or user.get("uniqueId") or user.get("nickname") or "").strip()
        author_nickname = str(user.get("nickname") or "").strip()
        comment_id = str(comment.get("cid") or comment.get("comment_id") or comment.get("id") or "").strip()
        if not comment_id:
            comment_id = stable_tiktok_comment_id(video_id, author, content, len(comments_by_id) + index)
        if comment_id in comments_by_id:
            continue

        create_time = comment.get("create_time") or comment.get("createTime")
        comment_time = None
        try:
            timestamp = int(create_time)
            if timestamp > 0:
                comment_time = dt.datetime.fromtimestamp(timestamp, tz=dt.timezone.utc).isoformat()
        except Exception:
            comment_time = None

        comments_by_id[comment_id] = {
            "cmtId": comment_id,
            "shopId": "tiktok",
            "itemId": video_id,
            "ratingStar": 0,
            "comment": content,
            "commentTr": None,
            "modelName": author or None,
            "hasMedia": bool(image_urls),
            "commentTime": comment_time,
            "rawJson": {
                "platform": "TikTok Video",
                "videoId": video_id,
                "author": author,
                "authorNickname": author_nickname,
                "authorId": user.get("uid") or user.get("id") or "",
                "authorSecUid": user.get("sec_uid") or "",
                "commentLanguage": comment.get("comment_language") or "",
                "likeCount": comment.get("digg_count") or comment.get("like_count") or 0,
                "replyCount": comment.get("reply_comment_total") or comment.get("reply_count") or 0,
                "imageUrls": image_urls,
                "shareUrl": (comment.get("share_info") or {}).get("url") if isinstance(comment.get("share_info"), dict) else "",
                "sourceUrl": source_url,
                "source": "tiktok_comment_list",
            },
        }
        added += 1
        if max_reviews > 0 and len(comments_by_id) >= max_reviews:
            break
    return added


def build_tiktok_comment_url(video_id: str, cursor: int, count: int) -> str:
    params = {
        "aid": "1988",
        "aweme_id": video_id,
        "count": str(count),
        "cursor": str(cursor),
    }
    return f"https://www.tiktok.com/api/comment/list/?{urlencode(params)}"


def parse_tiktok_has_more(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"", "0", "false", "no", "none"}:
            return False
        if normalized in {"1", "true", "yes"}:
            return True
    return bool(value)


def tiktok_payload_value(payload: dict[str, Any], key: str) -> Any:
    value = payload.get(key)
    if value is not None:
        return value
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    return data.get(key)


def tiktok_payload_comments(payload: dict[str, Any]) -> list[Any]:
    comments = payload.get("comments")
    if isinstance(comments, list):
        return comments
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    comments = data.get("comments")
    return comments if isinstance(comments, list) else []


def summarize_empty_tiktok_direct_result(result: dict[str, Any]) -> str:
    reason = str(result.get("stopReason") or "no_rows")
    details = compact_metric_parts(
        [
            f"请求 {result.get('nextRequests')}" if result.get("nextRequests") is not None else None,
            f"接口评论 {result.get('payloadComments')}" if result.get("payloadComments") is not None else None,
            f"HTTP {result.get('lastRequestStatus')}" if result.get("lastRequestStatus") is not None else None,
            f"游标 {result.get('cursor')}" if result.get("cursor") else None,
            f"还有更多 {'是' if result.get('hasMore') else '否'}" if result.get("hasMore") is not None else None,
        ]
    )
    return f"直连接口未返回有效评论（{reason}{'，' + details if details else ''}），已切换浏览器兜底"


def fetch_tiktok_video_comments_direct(video_url: str, max_reviews: int, proxy: str | None, timeout: int) -> dict[str, Any]:
    video_id = parse_tiktok_video_id(video_url)
    comments_by_id: dict[str, dict[str, Any]] = {}
    cursor = 0
    count = 50
    page_count = 0
    has_more = True
    total_count: int | None = None
    state: dict[str, Any] = {
        "comment_requests": 0,
        "payload_comments": 0,
        "dom_comment_count": 0,
        "cursor": cursor,
        "has_more": None,
        "total_comments": None,
        "end_reached": False,
        "stop_reason": None,
        "crawl_deadline_reached": False,
    }
    deadline = time.time() + timeout

    while has_more and time.time() < deadline:
        if max_reviews > 0 and len(comments_by_id) >= max_reviews:
            state["stop_reason"] = "max_reviews"
            break
        url = build_tiktok_comment_url(video_id, cursor, count)
        payload, request_status = request_tiktok_json_with_status(url, video_url, proxy, min(30, max(5, timeout)))
        page_count += 1
        state["comment_requests"] = page_count
        state["last_request_status"] = request_status
        comments = tiktok_payload_comments(payload)
        added = collect_tiktok_api_comments(payload, video_id, video_url, comments_by_id, max_reviews)
        state["payload_comments"] = len(comments_by_id)
        state["last_added_rows"] = added
        parsed_has_more = parse_tiktok_has_more(tiktok_payload_value(payload, "has_more"))
        try:
            total_count = int(tiktok_payload_value(payload, "total") or total_count or 0) or total_count
            state["total_comments"] = total_count
        except Exception:
            total_count = total_count
        try:
            next_cursor = int(tiktok_payload_value(payload, "cursor") or 0)
        except Exception:
            next_cursor = 0
        reached_limit = max_reviews > 0 and len(comments_by_id) >= max_reviews
        if reached_limit:
            state["stop_reason"] = "max_reviews"
            cursor_advanced = next_cursor > cursor
            if cursor_advanced:
                cursor = next_cursor
                state["cursor"] = cursor
            if parsed_has_more is not None:
                has_more = parsed_has_more
            elif cursor_advanced:
                has_more = True
            state["has_more"] = has_more
            emit_crawl_progress("TikTok Video", "tiktok_video", comments_by_id, state, max_reviews, deadline)
            break
        if parsed_has_more is False or not comments:
            has_more = False
            state["has_more"] = has_more
            state["end_reached"] = True
            state["stop_reason"] = "no_more_comments"
            if next_cursor > cursor:
                cursor = next_cursor
                state["cursor"] = cursor
            emit_crawl_progress("TikTok Video", "tiktok_video", comments_by_id, state, max_reviews, deadline)
            break
        if next_cursor <= cursor:
            has_more = True if parsed_has_more is not False else False
            state["has_more"] = has_more
            state["end_reached"] = False
            state["stop_reason"] = "cursor_stalled"
            emit_crawl_progress("TikTok Video", "tiktok_video", comments_by_id, state, max_reviews, deadline)
            break
        cursor = next_cursor
        state["cursor"] = cursor
        has_more = True if parsed_has_more is None else parsed_has_more
        state["has_more"] = has_more
        emit_crawl_progress("TikTok Video", "tiktok_video", comments_by_id, state, max_reviews, deadline)
        time.sleep(0.8)
    if time.time() >= deadline and has_more and (max_reviews <= 0 or len(comments_by_id) < max_reviews):
        state["crawl_deadline_reached"] = True
        state["stop_reason"] = "timeout"
    if not comments_by_id and not state.get("stop_reason"):
        state["stop_reason"] = "no_comments_found"
    emit_crawl_progress("TikTok Video", "tiktok_video", comments_by_id, state, max_reviews, deadline)

    rows = list(comments_by_id.values())
    if max_reviews > 0:
        rows = rows[:max_reviews]
    return {
        "source": "TikTok Video",
        "crawlChannel": "tiktok_video",
        "crawlChannelLabel": CHANNEL_LABELS["tiktok_video"],
        "productUrl": video_url,
        "productName": f"TikTok {video_id}",
        "shopId": "tiktok",
        "itemId": video_id,
        "videoId": video_id,
        "nextRequests": page_count,
        "payloadComments": len(rows),
        "domCommentCount": 0,
        "cursor": cursor,
        "hasMore": state.get("has_more") if state.get("has_more") is not None else has_more,
        "lastRequestStatus": state.get("last_request_status"),
        "totalComments": total_count,
        "endReached": bool(state.get("end_reached")),
        "stopReason": state.get("stop_reason"),
        "partialDueToTimeout": state.get("crawl_deadline_reached"),
        "rows": rows,
    }


def fetch_tiktok_video_comments(video_url: str, max_reviews: int, proxy: str | None, timeout: int) -> dict[str, Any]:
    channel_errors: list[str] = []
    try:
        direct_result = fetch_tiktok_video_comments_direct(video_url, max_reviews, proxy, timeout)
        if direct_result["rows"]:
            return direct_result
        channel_errors.append(f"TikTok 直连接口：{summarize_empty_tiktok_direct_result(direct_result)}")
    except Exception as exc:
        channel_errors.append(f"TikTok 直连接口：{exc}")

    if DynamicFetcher is None:
        raise RuntimeError("Scrapling DynamicFetcher is not available. Reinstall with: pip install 'scrapling[fetchers]'")

    video_id = parse_tiktok_video_id(video_url)
    comments_by_id: dict[str, dict[str, Any]] = {}
    state: dict[str, Any] = {
        "comment_requests": 0,
        "payload_comments": 0,
        "dom_comment_count": 0,
        "title": "",
        "has_more": None,
        "cursor": None,
        "total_comments": None,
        "end_reached": False,
        "idle_rounds": 0,
        "last_added_rows": 0,
        "stop_reason": None,
        "crawl_deadline_reached": False,
    }
    deadline_at = time.time() + timeout

    def page_action(page: Any) -> None:
        def limit_reached() -> bool:
            return max_reviews > 0 and len(comments_by_id) >= max_reviews

        def on_response(response: Any) -> None:
            try:
                if "/api/comment/list/" not in response.url or "/api/comment/list/reply/" in response.url:
                    return
                state["comment_requests"] = int(state.get("comment_requests") or 0) + 1
                state["last_request_status"] = response_status(response)
                try:
                    payload = json.loads(response.text())
                    added = collect_tiktok_api_comments(payload, video_id, video_url, comments_by_id, max_reviews)
                    state["payload_comments"] = int(state.get("payload_comments") or 0) + added
                    state["last_payload_added_rows"] = added
                    has_more_value = tiktok_payload_value(payload, "has_more")
                    if has_more_value is not None:
                        state["has_more"] = parse_tiktok_has_more(has_more_value)
                    cursor_value = tiktok_payload_value(payload, "cursor")
                    if cursor_value is not None:
                        state["cursor"] = cursor_value
                    total_value = tiktok_payload_value(payload, "total")
                    if total_value is not None:
                        state["total_comments"] = total_value
                except Exception:
                    return
            except Exception:
                return

        page.on("response", on_response)
        page.wait_for_timeout(3000)

        try:
            state["title"] = (page.title() or "").replace("| TikTok", "").strip()
        except Exception:
            state["title"] = ""

        def open_comment_panel() -> None:
            try:
                opened = page.evaluate(
                    """async () => {
                        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                        const listSelector = [
                          "[data-e2e='comment-list']",
                          "[data-e2e='browse-comment']",
                          "[class*='DivCommentListContainer']",
                          "[class*='CommentList']"
                        ].join(",");
                        const panelSelector = [
                          listSelector,
                          "[class*='DivCommentMain']",
                          "[class*='RightPanelContainer']"
                        ].join(",");
                        const visible = (el) => {
                          if (!el || !el.getBoundingClientRect) return false;
                          const rect = el.getBoundingClientRect();
                          const style = window.getComputedStyle(el);
                          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
                        };
                        const hasPanel = () => Array.from(document.querySelectorAll(listSelector)).some(visible);
                        if (hasPanel()) return true;
                        const scoreButton = (button) => {
                          if (!visible(button) || button.closest(panelSelector)) return -1000;
                          const rect = button.getBoundingClientRect();
                          const label = [
                            button.getAttribute("aria-label"),
                            button.getAttribute("title"),
                            button.getAttribute("data-e2e"),
                            button.getAttribute("data-testid"),
                            button.textContent
                          ].filter(Boolean).join(" ").toLowerCase();
                          const pathText = Array.from(button.querySelectorAll("svg path")).map((path) => path.getAttribute("d") || "").join(" ");
                          let score = 0;
                          if (/comment|comments|评论|評論|留言/.test(label)) score += 120;
                          if (/reply|回复|回覆/.test(label)) score -= 60;
                          if (/tux-web-icon-button/.test(label)) score += 12;
                          if (/M2\\s+21\\.5|22\\s+7\\.78|14\\s+25a3|34\\s+25/i.test(pathText)) score += 90;
                          if (/M24\\s+12\\.62|m24\\s+27\\.76|M5\\s+24a4/i.test(pathText)) score -= 45;
                          if (rect.left > window.innerWidth * 0.45) score += 8;
                          if (rect.width <= 72 && rect.height <= 72) score += 8;
                          return score;
                        };
                        const button = Array.from(document.querySelectorAll([
                          "button[data-e2e*='comment' i]",
                          "[role='button'][data-e2e*='comment' i]",
                          "button[aria-label*='comment' i]",
                          "button[aria-label*='评论']",
                          "button[aria-label*='評論']",
                          "button[data-testid='tux-web-icon-button']",
                          "button"
                        ].join(",")))
                          .map((candidate) => ({ candidate, score: scoreButton(candidate) }))
                          .filter((item) => item.score > 0)
                          .sort((a, b) => b.score - a.score)[0]?.candidate;
                        if (!button) return false;
                        button.scrollIntoView({ block: "center", inline: "center" });
                        await sleep(300);
                        button.click();
                        const startedAt = Date.now();
                        while (Date.now() - startedAt < 6500) {
                          if (hasPanel()) return true;
                          await sleep(250);
                        }
                        return false;
                    }"""
                )
                if opened:
                    page.wait_for_timeout(1800)
                else:
                    page.wait_for_timeout(1200)
            except Exception:
                page.wait_for_timeout(1200)

        def extract_dom_comments() -> list[dict[str, Any]]:
            return page.evaluate(
                """() => {
                    const clean = (value) => (value || "").replace(/\\s+/g, " ").trim();
                    const rootOf = (node) =>
                      node.closest("div[class*='DivCommentObjectWrapper'], [data-e2e='comment-item'], div[class*='CommentItem']") ||
                      node.closest("div[class*='DivCommentItemWrapper']") ||
                      node;
                    const nodes = Array.from(new Set(Array.from(document.querySelectorAll(
                      "[data-e2e='comment-item'], div[class*='DivCommentObjectWrapper'], div[class*='DivCommentItemWrapper'], div[class*='CommentItem'], [data-e2e='comment-level-1']"
                    )).map(rootOf)));
                    return nodes.map((node, index) => {
                      const authorLink = node.querySelector("a[href^='/@'], a[href*='tiktok.com/@']");
                      const authorHref = authorLink?.getAttribute("href") || "";
                      const author = (authorHref.match(/\\/@([^/?#]+)/)?.[1] || clean(authorLink?.textContent)).replace(/^@/, "");
                      const textEl =
                        node.querySelector("[data-e2e='comment-level-1'] .TUXText, [data-e2e='comment-level-1'] span, [data-e2e='comment-level-1'] p, [data-e2e='comment-level-1']") ||
                        node.querySelector("[data-e2e*='comment'] p, [data-e2e*='comment'] span") ||
                        node.querySelector("p, span");
                      const content = clean(textEl?.innerText || textEl?.textContent);
                      const likeEl = node.querySelector("[data-e2e*='comment-like-count'], [class*='like-count' i], [class*='LikeContainer'] span, [aria-label*='like' i], [aria-label*='赞'], [aria-label*='讚'], strong");
                      const likeText = clean(likeEl?.textContent) || likeEl?.getAttribute("aria-label") || "";
                      const commentId = node.getAttribute("data-id") || node.getAttribute("id") || "";
                      if (!content) return null;
                      return { index, author, content, likeText, commentId };
                    }).filter(Boolean);
                }"""
            )

        def scroll_comments() -> None:
            page.evaluate(
                """() => {
                    const target =
                      document.querySelector("[data-e2e='comment-list'], [data-e2e='browse-comment'], [class*='DivCommentListContainer'], [class*='CommentList']") ||
                      document.querySelector("[class*='DivCommentMain'], [class*='RightPanelContainer']") ||
                      document.scrollingElement ||
                      document.documentElement;
                    if (target && target !== document.documentElement && target !== document.body) {
                      target.scrollBy({ top: Math.max(700, Math.floor((target.clientHeight || 800) * 0.9)), behavior: "smooth" });
                    } else {
                      window.scrollBy({ top: Math.max(900, Math.floor(window.innerHeight * 0.9)), behavior: "smooth" });
                    }
                }"""
            )

        idle_rounds = 0
        last_count = 0
        last_requests = int(state.get("comment_requests") or 0)
        deadline = deadline_at

        open_comment_panel()

        try:
            page.evaluate(
                """() => {
                    const comments =
                      document.querySelector("[data-e2e='comment-list'], [data-e2e='browse-comment'], [class*='DivCommentListContainer'], [class*='CommentList']");
                    if (comments) comments.scrollIntoView({ block: "center" });
                    else window.scrollBy(0, Math.max(700, Math.floor(window.innerHeight * 0.8)));
                }"""
            )
            page.wait_for_timeout(1800)
        except Exception:
            page.wait_for_timeout(1200)

        while not limit_reached() and time.time() < deadline:
            try:
                scroll_comments()
                page.wait_for_timeout(1800)
            except Exception:
                page.wait_for_timeout(1200)

            try:
                dom_items = extract_dom_comments()
                state["dom_comment_count"] = len(dom_items)
            except Exception:
                dom_items = []

            for item in dom_items:
                content = str(item.get("content") or "").strip()
                if not content:
                    continue
                author = str(item.get("author") or "").strip()
                comment_id = str(item.get("commentId") or "").strip() or stable_tiktok_comment_id(
                    video_id,
                    author,
                    content,
                    int(item.get("index") or len(comments_by_id)),
                )
                if comment_id in comments_by_id:
                    continue
                comments_by_id[comment_id] = {
                    "cmtId": comment_id,
                    "shopId": "tiktok",
                    "itemId": video_id,
                    "ratingStar": 0,
                    "comment": content,
                    "commentTr": None,
                    "modelName": author or None,
                    "hasMedia": False,
                    "commentTime": None,
                    "rawJson": {
                        "platform": "TikTok Video",
                        "videoId": video_id,
                        "author": author,
                        "likeText": item.get("likeText") or "",
                        "sourceUrl": video_url,
                        "source": "tiktok_dom",
                    },
                }
                if limit_reached():
                    break

            current_count = len(comments_by_id)
            current_requests = int(state.get("comment_requests") or 0)
            state["last_added_rows"] = max(0, current_count - last_count)
            if current_count == last_count and current_requests == last_requests:
                idle_rounds += 1
            else:
                idle_rounds = 0
            state["idle_rounds"] = idle_rounds
            last_count = current_count
            last_requests = current_requests
            emit_crawl_progress("TikTok Video", "tiktok_video", comments_by_id, state, max_reviews, deadline)

            if state.get("has_more") is False and idle_rounds >= 1:
                break
            if idle_rounds >= 4:
                break
        if limit_reached():
            state["stop_reason"] = "max_reviews"
        elif time.time() >= deadline:
            state["crawl_deadline_reached"] = True
            state["stop_reason"] = "timeout"
        elif state.get("has_more") is False:
            state["end_reached"] = True
            state["stop_reason"] = "no_more_comments"
        elif idle_rounds >= 4:
            state["stop_reason"] = "idle_no_progress"
        elif not comments_by_id:
            state["stop_reason"] = "no_comments_found"
        emit_crawl_progress("TikTok Video", "tiktok_video", comments_by_id, state, max_reviews, deadline)

    fetch_kwargs: dict[str, Any] = {
        "headless": True,
        "disable_resources": False,
        "network_idle": False,
        "timeout": timeout * 1000,
        "wait": 1000,
        "page_action": page_action,
        "locale": "en-US",
        "extra_headers": {"accept-language": "en-US,en;q=0.9,zh-CN;q=0.7,zh;q=0.6"},
    }
    if proxy:
        fetch_kwargs["proxy"] = proxy

    apply_dynamic_fetcher_defaults(fetch_kwargs)
    DynamicFetcher.fetch(video_url, **fetch_kwargs)
    if not comments_by_id and not state.get("stop_reason"):
        state["stop_reason"] = "no_comments_found"
    rows = list(comments_by_id.values())
    if max_reviews > 0:
        rows = rows[:max_reviews]
    return {
        "source": "TikTok Video",
        "crawlChannel": "tiktok_video",
        "crawlChannelLabel": CHANNEL_LABELS["tiktok_video"],
        "productUrl": video_url,
        "productName": state.get("title") or f"TikTok {video_id}",
        "shopId": "tiktok",
        "itemId": video_id,
        "videoId": video_id,
        "nextRequests": state.get("comment_requests"),
        "payloadComments": state.get("payload_comments"),
        "domCommentCount": state.get("dom_comment_count"),
        "cursor": state.get("cursor"),
        "hasMore": state.get("has_more"),
        "lastRequestStatus": state.get("last_request_status"),
        "totalComments": state.get("total_comments"),
        "idleRounds": state.get("idle_rounds"),
        "lastAddedRows": state.get("last_added_rows"),
        "partialDueToTimeout": state.get("crawl_deadline_reached"),
        "endReached": state.get("end_reached"),
        "stopReason": state.get("stop_reason"),
        "channelErrors": channel_errors,
        "rows": rows,
    }

    def page_action(page: Any) -> None:
        def on_response(response: Any) -> None:
            try:
                if "/youtubei/v1/next" in response.url:
                    state["next_requests"] = int(state.get("next_requests") or 0) + 1
                    state["last_request_status"] = response_status(response)
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

    apply_dynamic_fetcher_defaults(fetch_kwargs)
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


def fetch_facebook_post_comments(post_url: str, max_reviews: int, proxy: str | None, timeout: int) -> dict[str, Any]:
    if DynamicFetcher is None:
        raise RuntimeError("Scrapling DynamicFetcher is not available. Reinstall with: pip install 'scrapling[fetchers]'")

    post_id = parse_facebook_post_id(post_url)
    comments_by_id: dict[str, dict[str, Any]] = {}
    state: dict[str, Any] = {
        "title": "",
        "next_requests": 0,
        "payload_comments": 0,
        "dom_comment_count": 0,
        "total_comments": None,
        "load_more_clicks": 0,
        "idle_rounds": 0,
        "last_added_rows": 0,
        "no_more_button_rounds": 0,
        "last_load_more_clicked": None,
        "end_reached": False,
        "comment_sort_attempted": False,
        "comment_sort_switched": False,
        "comment_sort_opened": None,
        "comment_sort_label": None,
        "stop_reason": "unknown",
    }

    def page_action(page: Any) -> None:
        def limit_reached() -> bool:
            return max_reviews > 0 and len(comments_by_id) >= max_reviews

        def on_response(response: Any) -> None:
            try:
                if "/api/graphql/" not in response.url and "/graphql/" not in response.url:
                    return
                state["next_requests"] = int(state.get("next_requests") or 0) + 1
                state["last_request_status"] = response_status(response)
                added = 0
                for payload in parse_json_documents(response.text()):
                    added += collect_facebook_graphql_comments(payload, post_id, post_url, comments_by_id, max_reviews)
                    if limit_reached():
                        break
                if added:
                    state["payload_comments"] = int(state.get("payload_comments") or 0) + added
            except Exception:
                return

        page.on("response", on_response)
        page.wait_for_timeout(3000)
        try:
            state["title"] = (page.title() or "").replace("| Facebook", "").strip()
        except Exception:
            state["title"] = ""

        def switch_to_all_comments() -> bool:
            state["comment_sort_attempted"] = True
            try:
                open_result = page.evaluate(
                    """() => {
                        const clean = (value) => (value || "").replace(/\\s+/g, " ").trim();
                        const textFor = (node) => clean([
                          node.textContent,
                          node.getAttribute("aria-label"),
                          node.getAttribute("title")
                        ].filter(Boolean).join(" "));
                        const lower = (value) => clean(value).toLowerCase();
                        const allLabels = [
                          "all comments",
                          "all public comments",
                          "所有评论",
                          "全部评论",
                          "所有留言",
                          "全部留言",
                          "所有回應",
                          "所有回应",
                          "ความคิดเห็นทั้งหมด"
                        ];
                        const triggerLabels = [
                          "most relevant",
                          "top comments",
                          "relevant comments",
                          "comment ranking",
                          "sort comments",
                          "最相关",
                          "最相關",
                          "热门评论",
                          "熱門留言",
                          "热门留言",
                          "ความคิดเห็นที่เกี่ยวข้องมากที่สุด",
                          "เกี่ยวข้องมากที่สุด"
                        ];
                        const isAll = (text) => allLabels.some((label) => lower(text).includes(lower(label)));
                        const isTrigger = (text) => triggerLabels.some((label) => lower(text).includes(lower(label)));
                        const isNoise = (text) => /view more comments|see more comments|查看更多|更多评论|more comments/i.test(text);
                        const nodes = Array.from(document.querySelectorAll(
                          "[aria-haspopup='menu'], [aria-haspopup='listbox'], div[role='button'], span[role='button'], a[role='link']"
                        ));
                        const labeledNodes = nodes
                          .map((node) => ({ node, label: textFor(node) }))
                          .filter((item) => item.label && item.label.length <= 120 && !isNoise(item.label));
                        const allNode = labeledNodes.find((item) => isAll(item.label));
                        if (allNode) {
                          return { opened: false, alreadyAll: true, label: allNode.label };
                        }
                        const target = labeledNodes.find((item) => isTrigger(item.label));
                        if (target) {
                          target.node.click();
                          return { opened: true, alreadyAll: false, label: target.label };
                        }
                        return { opened: false, alreadyAll: false, label: "" };
                    }"""
                ) or {}
                if isinstance(open_result, dict):
                    state["comment_sort_opened"] = bool(open_result.get("opened"))
                    if open_result.get("label"):
                        state["comment_sort_label"] = str(open_result.get("label"))
                    if open_result.get("alreadyAll"):
                        state["comment_sort_switched"] = True
                        return True
                else:
                    state["comment_sort_opened"] = bool(open_result)
                if state.get("comment_sort_opened"):
                    page.wait_for_timeout(1000)
                switch_result = page.evaluate(
                    """() => {
                        const clean = (value) => (value || "").replace(/\\s+/g, " ").trim();
                        const lower = (value) => clean(value).toLowerCase();
                        const optionLabels = [
                          "all comments",
                          "all public comments",
                          "所有评论",
                          "全部评论",
                          "所有留言",
                          "全部留言",
                          "所有回應",
                          "所有回应",
                          "ความคิดเห็นทั้งหมด"
                        ];
                        const nodes = Array.from(document.querySelectorAll("div[role='menuitem'], div[role='option'], div[role='button'], span[role='button'], [aria-checked]"));
                        const target = nodes
                          .map((node) => ({ node, label: clean([node.textContent, node.getAttribute("aria-label"), node.getAttribute("title")].filter(Boolean).join(" ")) }))
                          .filter((item) => item.label && item.label.length <= 120)
                          .find((item) => optionLabels.some((label) => lower(item.label).includes(lower(label))));
                        if (target) {
                          target.node.click();
                          return { switched: true, label: target.label };
                        }
                        return { switched: false, label: "" };
                    }"""
                ) or {}
                switched = bool(switch_result.get("switched")) if isinstance(switch_result, dict) else bool(switch_result)
                if isinstance(switch_result, dict) and switch_result.get("label"):
                    state["comment_sort_label"] = str(switch_result.get("label"))
                if switched:
                    state["comment_sort_switched"] = True
                    page.wait_for_timeout(1800)
                return switched
            except Exception:
                return False

        def refresh_total_comments() -> None:
            try:
                total = page.evaluate(
                    """() => {
                        const clean = (value) => (value || "").replace(/\\s+/g, " ").trim();
                        const toNumber = (raw, unit) => {
                          const rawText = String(raw || "").replace(/\\s/g, "");
                          const normalizedRaw = unit && /^\\d+,\\d{1,2}$/.test(rawText) ? rawText.replace(",", ".") : rawText.replace(/,/g, "");
                          const base = Number(normalizedRaw);
                          if (!Number.isFinite(base)) return null;
                          const normalizedUnit = String(unit || "").toLowerCase();
                          if (normalizedUnit === "k" || unit === "千" || unit === "พัน") return Math.round(base * 1000);
                          if (unit === "万" || unit === "萬" || unit === "หมื่น") return Math.round(base * 10000);
                          if (unit === "แสน") return Math.round(base * 100000);
                          if (normalizedUnit === "m") return Math.round(base * 1000000);
                          if (unit === "ล้าน") return Math.round(base * 1000000);
                          return Math.round(base);
                        };
                        const commentWords = "comments?|评论|評論|留言|ความคิดเห็น|คอมเมนต์";
                        const pattern = new RegExp(
                          "(\\\\d+(?:[,.]\\\\d+)*)\\\\s*([kKmM]|万|萬|千|พัน|หมื่น|แสน|ล้าน)?\\\\s*(?:条|則|个)?\\\\s*(?:" + commentWords + ")",
                          "gi"
                        );
                        const nodes = Array.from(document.querySelectorAll("span, div, a"))
                          .map((node) => clean(node.textContent))
                          .filter((text, index, all) => text && text.length <= 140 && all.indexOf(text) === index)
                          .filter((text) => new RegExp(commentWords, "i").test(text));
                        let best = null;
                        for (const text of nodes) {
                          for (const match of text.matchAll(pattern)) {
                            const value = toNumber(match[1], match[2]);
                            if (value && value > (best || 0)) best = value;
                          }
                        }
                        return best;
                    }"""
                )
                if total:
                    state["total_comments"] = int(total)
            except Exception:
                return

        def click_more_comments() -> bool:
            try:
                clicked = bool(
                    page.evaluate(
                        """() => {
                            const clean = (value) => (value || "").replace(/\\s+/g, " ").trim().toLowerCase();
                            const labels = [
                              "view more comments",
                              "view previous comments",
                              "more comments",
                              "see more comments",
                              "查看更多评论",
                              "查看更多留言",
                              "更多评论",
                              "查看之前的评论"
                            ];
                            const nodes = Array.from(document.querySelectorAll("div[role='button'], span[role='button'], a[role='link']"));
                            const target = nodes.find((node) => labels.some((label) => clean(node.textContent).includes(label.toLowerCase())));
                            if (target) {
                              target.click();
                              return true;
                            }
                            return false;
                        }"""
                    )
                )
                if clicked:
                    state["load_more_clicks"] = int(state.get("load_more_clicks") or 0) + 1
                return clicked
            except Exception:
                return False

        def scroll_comments() -> None:
            page.evaluate(
                """() => {
                    const comments = Array.from(document.querySelectorAll("span, div"))
                      .find((node) => /comment|评论|留言/i.test((node.textContent || "").trim()));
                    if (comments) comments.scrollIntoView({ block: "center" });
                    window.scrollBy({ top: Math.max(900, Math.floor(window.innerHeight * 0.9)), behavior: "smooth" });
                }"""
            )

        def extract_dom_comments() -> list[dict[str, Any]]:
            return page.evaluate(
                """() => {
                    const clean = (value) => (value || "").replace(/\\s+/g, " ").trim();
                    const hash = (input) => {
                      let h = 2166136261;
                      for (let i = 0; i < input.length; i += 1) {
                        h ^= input.charCodeAt(i);
                        h = Math.imul(h, 16777619);
                      }
                      return (h >>> 0).toString(36);
                    };
                    const nodes = Array.from(document.querySelectorAll(
                      "div[aria-label^='Comment by' i], div[aria-label*=' comment by ' i], div[role='article'][aria-label*='Comment' i], div[role='article']"
                    ));
                    return nodes.map((node, index) => {
                      const aria = node.getAttribute("aria-label") || "";
                      const ariaMatch = aria.match(/comment by\\s+(.+?)(?:$|,|\\.|\\s+on\\s+)/i);
                      const authorLink = node.querySelector("a[role='link'][href*='facebook.com'], a[href^='/profile.php'], a[href^='/people/'], a[href^='/'][tabindex='0']");
                      const author = clean(ariaMatch?.[1] || authorLink?.textContent || "");
                      const blocks = Array.from(node.querySelectorAll("div[dir='auto'], span[dir='auto']"))
                        .map((el) => clean(el.textContent))
                        .filter(Boolean)
                        .filter((text) => text !== author)
                        .filter((text) => !/^(like|reply|share|edited|top fan|author|all comments|most relevant)$/i.test(text))
                        .filter((text) => !/^\\d+\\s*(m|h|d|w|mo|y|分钟|小时|天|周|月|年)$/i.test(text));
                      const unique = [];
                      for (const text of blocks) {
                        if (!unique.includes(text)) unique.push(text);
                      }
                      const content = unique.join(" ").trim();
                      if (!content || content.length < 2) return null;
                      const link = node.querySelector("a[href*='comment_id='], a[href*='comment/replies']");
                      let commentId = "";
                      let commentUrl = "";
                      try {
                        if (link?.href) {
                          const url = new URL(link.href, location.origin);
                          commentId = url.searchParams.get("comment_id") || url.searchParams.get("reply_comment_id") || "";
                          commentUrl = url.href;
                        }
                      } catch {}
                      if (!commentId) commentId = hash(`${author}|${content}|${index}`);
                      return { index, author, content, commentId, commentUrl };
                    }).filter(Boolean);
                }"""
            )

        idle_rounds = 0
        last_count = 0
        last_requests = int(state.get("next_requests") or 0)
        deadline = time.time() + timeout

        try:
            scroll_comments()
            page.wait_for_timeout(1800)
            switch_to_all_comments()
            refresh_total_comments()
        except Exception:
            page.wait_for_timeout(1200)

        while not limit_reached() and time.time() < deadline:
            clicked = click_more_comments()
            state["last_load_more_clicked"] = clicked
            if clicked:
                state["no_more_button_rounds"] = 0
            else:
                state["no_more_button_rounds"] = int(state.get("no_more_button_rounds") or 0) + 1
            try:
                scroll_comments()
                page.wait_for_timeout(1800 if clicked else 1400)
            except Exception:
                page.wait_for_timeout(1200)

            try:
                refresh_total_comments()
                dom_items = extract_dom_comments()
                state["dom_comment_count"] = len(dom_items)
            except Exception:
                dom_items = []

            for item in dom_items:
                content = str(item.get("content") or "").strip()
                if not content:
                    continue
                author = str(item.get("author") or "").strip()
                raw_id = str(item.get("commentId") or "").strip()
                comment_id = raw_id or stable_facebook_comment_id(
                    post_id,
                    author,
                    content,
                    int(item.get("index") or len(comments_by_id)),
                )
                if comment_id in comments_by_id:
                    continue
                comments_by_id[comment_id] = {
                    "cmtId": comment_id,
                    "shopId": "facebook",
                    "itemId": post_id,
                    "ratingStar": 0,
                    "comment": content,
                    "commentTr": None,
                    "modelName": author or None,
                    "hasMedia": False,
                    "commentTime": None,
                    "rawJson": {
                        "platform": "Facebook",
                        "postId": post_id,
                        "author": author,
                        "commentUrl": item.get("commentUrl") or "",
                        "sourceUrl": post_url,
                        "source": "facebook_dom",
                    },
                }
                if limit_reached():
                    break

            current_count = len(comments_by_id)
            current_requests = int(state.get("next_requests") or 0)
            state["last_added_rows"] = max(0, current_count - last_count)
            if current_count == last_count and current_requests == last_requests:
                idle_rounds += 1
            else:
                idle_rounds = 0
            state["idle_rounds"] = idle_rounds
            last_count = current_count
            last_requests = current_requests
            emit_crawl_progress("Facebook", "facebook_post", comments_by_id, state, max_reviews, deadline)
            if idle_rounds >= 5:
                state["end_reached"] = True
                state["stop_reason"] = "no_more_comments"
                break
        if limit_reached():
            state["stop_reason"] = "max_reviews"
        elif time.time() >= deadline and state.get("stop_reason") == "unknown":
            state["stop_reason"] = "timeout"

    fetch_kwargs: dict[str, Any] = {
        "headless": True,
        "disable_resources": False,
        "network_idle": False,
        "timeout": timeout * 1000,
        "wait": 1000,
        "page_action": page_action,
        "locale": "en-US",
        "extra_headers": {"accept-language": "en-US,en;q=0.9,zh-CN;q=0.7,zh;q=0.6"},
    }
    if proxy:
        fetch_kwargs["proxy"] = proxy

    apply_dynamic_fetcher_defaults(fetch_kwargs)
    DynamicFetcher.fetch(post_url, **fetch_kwargs)
    rows = list(comments_by_id.values())
    if max_reviews > 0:
        rows = rows[:max_reviews]
    stop_reason = state.get("stop_reason")
    if not rows and stop_reason == "unknown":
        stop_reason = "no_comments_found"
    return {
        "source": "Facebook",
        "crawlChannel": "facebook_post",
        "crawlChannelLabel": CHANNEL_LABELS["facebook_post"],
        "productUrl": post_url,
        "productName": state.get("title") or f"Facebook {post_id}",
        "shopId": "facebook",
        "itemId": post_id,
        "postId": post_id,
        "nextRequests": state.get("next_requests"),
        "payloadComments": state.get("payload_comments"),
        "domCommentCount": state.get("dom_comment_count"),
        "totalComments": state.get("total_comments"),
        "loadMoreClicks": state.get("load_more_clicks"),
        "idleRounds": state.get("idle_rounds"),
        "lastAddedRows": state.get("last_added_rows"),
        "noMoreButtonRounds": state.get("no_more_button_rounds"),
        "lastLoadMoreClicked": state.get("last_load_more_clicked"),
        "lastRequestStatus": state.get("last_request_status"),
        "endReached": state.get("end_reached"),
        "stopReason": stop_reason,
        "commentSortAttempted": state.get("comment_sort_attempted"),
        "commentSortSwitched": state.get("comment_sort_switched"),
        "commentSortOpened": state.get("comment_sort_opened"),
        "commentSortLabel": state.get("comment_sort_label"),
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
        elif is_tiktok_video_url(crawl_url):
            result = fetch_tiktok_video_comments(crawl_url, args.max_reviews, args.proxy, args.timeout)
        elif is_facebook_post_url(crawl_url):
            result = fetch_facebook_post_comments(crawl_url, args.max_reviews, args.proxy, args.timeout)
        elif is_shopee_url(crawl_url):
            result = fetch_shopee_reviews(crawl_url, args.max_reviews, args.proxy, parse_channels(args.channels), args.timeout)
        else:
            raise RuntimeError("Unsupported crawl URL. Currently supports Shopee product links, YouTube video links, TikTok video links and Facebook post links.")
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=True), file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
