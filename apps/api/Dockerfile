FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm db:generate && pnpm --filter @review-ai/api build

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache tini wget && \
    corepack enable && \
    addgroup -S app && adduser -S -G app app && \
    mkdir -p /app && chown -R app:app /app

ENV NODE_ENV=production

COPY --from=builder --chown=app:app /app /app

USER app
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
# Apply schema then start.
CMD sh -c "packages/db/node_modules/.bin/prisma db push --schema=packages/db/prisma/schema.prisma --skip-generate && pnpm --filter @review-ai/api start"
