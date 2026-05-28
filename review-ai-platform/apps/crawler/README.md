# Review crawler

Optional Python crawler used by the API route `POST /api/tasks/crawl`.

Install dependencies in a Python 3.10+ environment:

```bash
pip install -r apps/crawler/requirements.txt
```

Optional environment variables:

- `SCRAPLING_PYTHON_BIN`: Python executable used by the API, defaults to `python`.
- `SCRAPLING_PROXY`: proxy URL passed to Scrapling, for example `http://127.0.0.1:7890`.
- `SHOPEE_COOKIE`: cookie header for Shopee pages that require a logged-in/session context.

The first implementation targets Shopee product URLs and normalizes reviews into the same shape as uploaded CSV rows.
