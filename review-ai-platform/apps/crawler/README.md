# Review crawler

Optional Python crawler used by the API route `POST /api/tasks/crawl`.

Supported links:

- Shopee product links: uses API-first channels and falls back to browser interception.
- YouTube video links: uses browser DOM scrolling, extracts top-level comments only, and stops when no new `youtubei/v1/next` requests/comments appear or YouTube shows the sorted-comments end hint.

Model usage:

- The crawler does not call an LLM while collecting comments. It only returns normalized raw review/comment rows.
- AI model calls happen in the analysis worker after comments are imported.
- If future crawler features need AI extraction or page understanding, they should reuse the workspace AI settings configured in the app instead of introducing a separate crawler model configuration.

Install dependencies in a Python 3.10+ environment:

```bash
pip install -r apps/crawler/requirements.txt
```

Optional environment variables:

- `SCRAPLING_PYTHON_BIN`: Python executable used by the API, defaults to `python`.
- `SCRAPLING_PROXY`: proxy URL passed to Scrapling, for example `http://127.0.0.1:7890`.
- `SHOPEE_COOKIE`: cookie header for Shopee pages that require a logged-in/session context.

The first implementation targets Shopee product URLs and normalizes reviews into the same shape as uploaded CSV rows.
