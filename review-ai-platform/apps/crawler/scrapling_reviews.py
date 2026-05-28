from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
from typing import Any
from urllib.parse import parse_qs, urlparse

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


def request_json(url: str, referer: str, proxy: str | None) -> dict[str, Any]:
    headers = {
        "accept": "application/json",
        "accept-language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
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
        "timeout": 30,
    }
    if proxy:
        kwargs["proxy"] = proxy

    page = Fetcher.get(url, **kwargs)
    if getattr(page, "status", 200) >= 400:
        raise RuntimeError(f"HTTP {page.status} from {url}")
    return page.json()


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


def fetch_shopee_reviews(product_url: str, max_reviews: int, proxy: str | None) -> dict[str, Any]:
    shop_id, item_id = parse_product_ids(product_url)
    limit = min(50, max(1, max_reviews))
    rows: list[dict[str, Any]] = []
    offset = 0
    product_name = ""

    detail_url = f"https://shopee.co.th/api/v4/item/get?shopid={shop_id}&itemid={item_id}"
    try:
        detail = request_json(detail_url, product_url, proxy)
        product_name = str(detail.get("data", {}).get("name") or "")
    except Exception:
        product_name = ""

    while len(rows) < max_reviews:
        url = (
            "https://shopee.co.th/api/v2/item/get_ratings"
            f"?filter=0&flag=1&itemid={item_id}&limit={limit}&offset={offset}&shopid={shop_id}&type=0"
        )
        payload = request_json(url, product_url, proxy)
        ratings = payload.get("data", {}).get("ratings") or payload.get("ratings") or []
        if not ratings:
            break

        for rating in ratings:
            normalized = normalize_rating(rating, shop_id, item_id)
            if normalized:
                rows.append(normalized)
                if len(rows) >= max_reviews:
                    break

        if len(ratings) < limit:
            break
        offset += limit
        time.sleep(0.35)

    return {
        "source": "Shopee",
        "productUrl": product_url,
        "productName": product_name,
        "shopId": shop_id,
        "itemId": item_id,
        "rows": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--max-reviews", type=int, default=200)
    parser.add_argument("--proxy", default=os.getenv("SCRAPLING_PROXY"))
    args = parser.parse_args()

    try:
        result = fetch_shopee_reviews(args.url, args.max_reviews, args.proxy)
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
