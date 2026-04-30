# Review AI Platform

商品评价 AI 智能分析看板。从 CSV 导入电商评论 → AI 自动情感分析 / 痛点提取 / 用户画像 → 生成可视化看板与产品总结报告。

支持多家大模型平台：OpenAI / 火山引擎豆包 / DeepSeek / Moonshot Kimi / 通义千问 / 智谱 ChatGLM / Anthropic / 自定义 OpenAI 兼容。

![stack](https://img.shields.io/badge/stack-Vue3%20+%20Next.js%20+%20BullMQ%20+%20Postgres%20+%20Redis-blueviolet)
![deploy](https://img.shields.io/badge/deploy-Docker%20Compose-2496ED)

## 功能特性

- **导入** — CSV 批量导入评论（支持泰文 / 英文 / 中文混合，按 cmtId 自动去重）
- **AI 分析** — 批量化（一次 10 条评论一次调用）、并发、超时重试、可中断 / 重新发起
- **可配置** — Web 端动态切换 AI 服务商、API Key、模型、Prompt 模板（写入 DB，不需重启容器）
- **看板** — 5 KPI、NPS 仪表、情感分布饼、评分分布、各星级情感、月度趋势、词云、痛点统计、AI 智能总结、产品总结 6 卡、好评/差评精选、渠道分布
- **评论明细** — 表格 + 分组双视图、过滤排序、视图保存、单元格 hover 完整内容、导出 CSV
- **任务管理** — 多任务并行、追加导入、删除、停止分析、重新分析

## 一键部署

```bash
git clone https://github.com/juzehuan/review-ai.git && cd review-ai
chmod +x deploy.sh
./deploy.sh
```

`deploy.sh` 自动完成：
- 检查 Docker / Docker Compose
- 生成 `.env.production`（自动随机 32 位 Postgres 密码）
- 构建镜像 + 启动容器
- 等待健康检查通过
- 输出访问地址

启动后访问：

- 主页：`http://<服务器IP>/`
- AI 配置：`http://<服务器IP>/settings`（首次进入选择服务商 + 填 API Key + 选模型即可开始分析）

更多运维命令（停止、重启、备份、更新）见 `./deploy.sh help`。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + Ant Design Vue + ECharts + marked |
| API | Next.js Route Handlers + Prisma |
| Worker | BullMQ + OpenAI SDK（兼容多家供应商）+ zod |
| 数据 | PostgreSQL 16 + Redis 7 |
| 部署 | Docker Compose（多阶段构建、tini 信号处理、非 root 用户）|

## 目录结构

```
.
├── apps/
│   ├── web/                Vue 3 前端 + nginx 静态托管 + /api 反代
│   ├── api/                Next.js Route Handlers
│   └── worker/             BullMQ 分析 worker
├── packages/
│   ├── shared/             跨端共享 DTO 与 Prompt 默认值
│   └── db/                 Prisma schema / client
├── docker-compose.yml          开发环境
├── docker-compose.prod.yml     生产环境
├── deploy.sh                   一键部署脚本
├── DEPLOYMENT.md               生产部署详细文档
├── .env.example                开发模板
└── .env.production.example     生产模板
```

## 本地开发

```bash
cp .env.example .env
docker compose up -d                  # 起 postgres / redis
pnpm install
pnpm db:generate
pnpm --filter @review-ai/web dev      # 前端 :5173
pnpm --filter @review-ai/api dev      # API   :3001
pnpm --filter @review-ai/worker dev   # Worker
```

或者全 Docker 开发：

```bash
docker compose up -d --build
# 访问 http://localhost:5173
```

## 文档

- 详细部署 / 运维 / HTTPS 配置 / 备份：[DEPLOYMENT.md](./DEPLOYMENT.md)
- 评论采集浏览器插件（独立仓库）：用于从 Shopee TH / Lazada TH / TikTok Shop TH 商品页抓评论导出 CSV，配合本平台使用

## License

MIT
