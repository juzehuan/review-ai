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

项目已提供完整 Docker 部署配置，包含：

- Web：Nginx 静态站点与 `/api` 反向代理
- API：Next.js API 服务
- Worker：BullMQ 分析任务 worker
- Postgres：业务数据库
- Redis：任务队列
- AI 评论爬虫运行时：Python venv、Scrapling、Playwright Chromium 与浏览器系统依赖

首次部署：

```bash
cp .env.example .env
docker compose up -d --build
```

启动完成后访问：

```text
http://127.0.0.1:5173
```

默认超管账号会在数据库初始化后自动创建：

```text
邮箱：admin@reviewiq.local
密码：Admin@123456
```

生产部署前请在 `.env` 中修改 `DEFAULT_ADMIN_EMAIL` 和 `DEFAULT_ADMIN_PASSWORD`。

部署时会自动执行一次 `pnpm db:migrate`，把 Prisma schema 同步到 Postgres。更新代码后重新部署：

```bash
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f web
```

停止服务：

```bash
docker compose down
```

如需同时删除数据库卷：

```bash
docker compose down -v
```

## OpenAI 分析

- 如果只想先联调前端和数据流，可以保持：
  - `ENABLE_MOCK_AI=true`
- 如果要启用真实 OpenAI 分析，请设置：
  - `OPENAI_API_KEY=你的密钥`
  - `ENABLE_MOCK_AI=false`
- 修改后重新构建：
  - `docker compose up -d --build api worker`

也可以在空间设置里配置 OpenAI 兼容供应商、Base URL、API Key 和模型名称。

## AI 评论爬虫

Docker API 镜像已内置爬虫所需依赖，不需要在宿主机额外安装 Python、Scrapling 或 Playwright。

可在 `.env` 中配置：

```text
SCRAPLING_ENABLED=true
SCRAPLING_PROXY=
SCRAPLING_CHANNELS=api_exporter,api_basic,browser_intercept
SCRAPLING_DEFAULT_SOURCE=Shopee
SCRAPLING_DEFAULT_MAX_REVIEWS=200
SCRAPLING_TIMEOUT_SEC=180
SHOPEE_COOKIE=
```

也可以登录后在「设置 / 爬虫设置」里按空间单独配置。默认渠道顺序为：

1. 增强接口
2. 基础接口
3. 浏览器拦截

浏览器拦截通道会启动容器内 Chromium，速度更慢，但更接近 `shopee-th-review-exporter` 的页面拦截方式。

## 说明

- 导入入口兼容当前 Shopee 评论 CSV
- 评论页支持筛选、分组、列显隐、保存视图和默认视图
- 看板页展示 NPS、情感分布、来源分布、问题统计和词云
