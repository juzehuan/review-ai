from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

try:
    from scrapling.fetchers import Fetcher
except Exception as exc:  # pragma: no cover - surfaced to the Node API.
    print(
        json.dumps(
            {
                "error": "Scrapling is not installed. Run: pip install -r apps/crawler/requirements.txt",
                "detail": str(exc),
            },
            ensure_ascii=False,
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
}


def parse_product_ids(url: str) -> tuple[str, str]:
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


def parse_channels(value: str) -> list[str]:
    channels = [item.strip() for item in value.split(",") if item.strip()]
    valid = [item for item in channels if item in CHANNEL_LABELS]
    return valid or ["api_exporter", "api_basic", "browser_intercept"]


def fetch_shopee_reviews(product_url: str, max_reviews: int, proxy: str | None, channels: list[str], timeout: int) -> dict[str, Any]:
    errors: list[str] = []
    for channel in channels:
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

    raise RuntimeError("；".join(errors) or "没有可用的抓取渠道")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--max-reviews", type=int, default=200)
    parser.add_argument("--proxy", default=os.getenv("SCRAPLING_PROXY"))
    parser.add_argument("--channels", default=os.getenv("SCRAPLING_CHANNELS", "api_exporter,api_basic,browser_intercept"))
    parser.add_argument("--timeout", type=int, default=int(os.getenv("SCRAPLING_TIMEOUT_SEC", "180")))
    args = parser.parse_args()

    try:
        result = fetch_shopee_reviews(args.url, args.max_reviews, args.proxy, parse_channels(args.channels), args.timeout)
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
