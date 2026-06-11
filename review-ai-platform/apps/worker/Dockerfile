ARG NODE_BOOKWORM_IMAGE=docker.m.daocloud.io/library/node:24-bookworm-slim
FROM ${NODE_BOOKWORM_IMAGE}
WORKDIR /app
ARG APT_MIRROR=http://mirrors.aliyun.com/debian
ARG APT_SECURITY_MIRROR=http://mirrors.aliyun.com/debian-security
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

ENV SCRAPLING_PYTHON_BIN=/opt/review-ai-crawler/bin/python
ENV SCRAPLING_CHROMIUM_EXECUTABLE=/usr/bin/chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PIP_INDEX_URL=${PIP_INDEX_URL}
ENV PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST}
ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY}
ENV npm_config_registry=${NPM_REGISTRY}

RUN sed -i "s|http://deb.debian.org/debian-security|${APT_SECURITY_MIRROR}|g; s|http://deb.debian.org/debian|${APT_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    python3 \
    python3-pip \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/review-ai-crawler
COPY apps/crawler/requirements.txt /tmp/crawler-requirements.txt
RUN /opt/review-ai-crawler/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
  && /opt/review-ai-crawler/bin/pip install --no-cache-dir -r /tmp/crawler-requirements.txt

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate
RUN pnpm --filter @review-ai/worker build
ENV NODE_ENV=production
CMD ["node", "apps/worker/dist/apps/worker/src/index.js"]
