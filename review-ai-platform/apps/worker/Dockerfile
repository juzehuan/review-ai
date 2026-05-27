FROM node:24-alpine
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
RUN pnpm db:generate
RUN pnpm --filter @review-ai/worker build
CMD ["node", "apps/worker/dist/apps/worker/src/index.js"]
