# 商品评论 AI 智能分析平台

## 启动

1. 复制 `.env.example` 为 `.env`
2. 安装依赖：`pnpm install`
3. 生成 Prisma Client：`pnpm db:generate`
4. 初始化数据库：`pnpm db:migrate`
5. 开发模式分别启动：
   - `pnpm dev:api`
   - `pnpm dev:worker`
   - `pnpm dev:web`

## Docker

项目已提供 `docker-compose.yml` 与各服务 Dockerfile，可直接使用 `docker compose up -d --build` 启动。

## OpenAI 分析

- 如果只想先联调前端和数据流，可以保持：
  - `ENABLE_MOCK_AI=true`
- 如果要启用真实 OpenAI 分析，请设置：
  - `OPENAI_API_KEY=你的密钥`
  - `ENABLE_MOCK_AI=false`
- 修改后重新构建：
  - `docker compose up -d --build api worker`

## 说明

- 导入入口兼容当前 Shopee 评论 CSV
- 评论页支持筛选、分组、列显隐、保存视图和默认视图
- 看板页展示 NPS、情感分布、来源分布、问题统计和词云
