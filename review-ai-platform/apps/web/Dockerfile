ARG NODE_ALPINE_IMAGE=docker.m.daocloud.io/library/node:24-alpine
ARG NGINX_ALPINE_IMAGE=docker.m.daocloud.io/library/nginx:1.27-alpine
FROM ${NODE_ALPINE_IMAGE} AS builder
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY}
ENV npm_config_registry=${NPM_REGISTRY}
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @review-ai/web build

FROM ${NGINX_ALPINE_IMAGE}
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
