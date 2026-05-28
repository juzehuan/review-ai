FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV SCRAPLING_PYTHON_BIN=/opt/review-ai-crawler/bin/python
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/review-ai-crawler
COPY apps/crawler/requirements.txt /tmp/crawler-requirements.txt
RUN /opt/review-ai-crawler/bin/pip install --no-cache-dir -r /tmp/crawler-requirements.txt \
  && /opt/review-ai-crawler/bin/python -m playwright install --with-deps chromium

RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate
RUN pnpm --filter @review-ai/api build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["pnpm", "--filter", "@review-ai/api", "start"]
