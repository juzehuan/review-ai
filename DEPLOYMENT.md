# 生产环境部署指南

只暴露 1 个端口（80），DB / Redis / API 全部走内部网络。Web 容器内置 nginx 反代 `/api` 到 API 服务。

## 前置要求

- 一台 Linux 服务器（≥ 2C4G 推荐）
- Docker ≥ 24
- Docker Compose v2（`docker compose version` 验证）
- 域名（可选；用于 HTTPS）
- 端口 80（如需 HTTPS 加 443）开放

## 部署步骤

```bash
# 1. 把代码上传到服务器（git clone 或 scp 都行）
git clone <你的仓库> review-ai && cd review-ai

# 2. 准备环境变量
cp .env.production.example .env.production
# 编辑：至少要把 POSTGRES_PASSWORD 改掉
nano .env.production

# 3. 一键启动（首次会自动构建镜像）
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 4. 查看启动状态
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api worker
```

启动后访问 `http://服务器IP/` 即可。

## 首次配置 AI

1. 打开 `http://服务器IP/settings`
2. 选择服务商（火山引擎 / OpenAI / DeepSeek / Moonshot / 通义千问 / 智谱 / Anthropic / 自定义）
3. 填入 API Key，选择模型
4. （可选）调整三个 Prompt 模板
5. 点 **保存配置**
6. 回到任务列表，导入 CSV 即可开始分析

> AI 配置写入数据库 `ai_config` 表（singleton 单行）。每次分析任务启动时从 DB 读最新配置，改完立即生效，无需重启容器。

## 添加 HTTPS（推荐）

最简单的方法：在 web 容器前面挂一个 Caddy 自动获取 Let's Encrypt 证书。

把以下 service 加进 `docker-compose.prod.yml`：

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
    networks:
      - backend

# volumes 段加上：
#   caddy_data:
#   caddy_config:
```

然后把 `web` 服务的 `ports` 那段改成（不再对外暴露 80）：

```yaml
  web:
    # ports: []   ← 删掉或注释
    expose:
      - "80"
```

新建 `Caddyfile`（与 docker-compose.prod.yml 同级目录）：

```
yourdomain.com {
  encode gzip zstd
  reverse_proxy web:80
}
```

`docker compose ... up -d --build` 即自动签证书。

## 常用运维命令

```bash
# 滚动更新代码
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 仅重启某服务
docker compose -f docker-compose.prod.yml restart api

# 查看日志
docker compose -f docker-compose.prod.yml logs -f --tail=200 worker

# 备份数据库
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres review_ai | gzip > backup-$(date +%Y%m%d).sql.gz

# 恢复数据库
gunzip -c backup-20260101.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d review_ai

# 进入数据库 shell
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d review_ai

# 清空 Redis 队列（任务卡住时使用）
docker compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL

# 查看占用空间
docker system df
docker volume ls
```

## 安全检查清单

- [ ] `.env.production` 已加入 `.gitignore`，**不要提交到代码仓库**
- [ ] `POSTGRES_PASSWORD` 是强随机串（≥ 24 字符，建议 `openssl rand -base64 32`）
- [ ] 防火墙只放行 80 / 443 / SSH，不要放行 5432 / 6379 / 3001
- [ ] 域名走 HTTPS（Caddy 自动签发或上 Cloudflare）
- [ ] 服务器开了 unattended-upgrades 自动安全更新
- [ ] 定期 `docker compose pull && up -d` 更新基础镜像（postgres / redis / nginx / node）
- [ ] 定期备份 `postgres_data` 卷

## 资源占用参考

正常空闲：
- postgres：~50 MB RAM
- redis：~20 MB RAM
- api：~150 MB RAM
- worker：~150 MB RAM（分析期间会涨到 300-500 MB）
- web (nginx)：~5 MB RAM

总计稳态 ~400 MB，分析峰值 ~800 MB。2C4G 服务器够用。

如果想加资源限制，每个服务下加：

```yaml
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.5'
```

## 已知问题与排错

- **api 启动失败：`Migration failed`** → 通常是 schema 推送被中断。`docker compose exec api sh -c "cd /app/packages/db && pnpm prisma:push"` 手动重试。
- **worker 一直 Idle** → 检查 Redis 是否健康；`docker compose logs redis worker`。
- **AI 分析报 `429` 或 `RGV587`** → 该平台限流。在 Settings 里换更高配额的服务商，或调慢节奏（修改代码 `BATCH_SIZE` / `clickIntervalMs`）。
- **数据库连接池耗尽** → Prisma 默认连接池 10。高并发可在 `DATABASE_URL` 后加 `?connection_limit=20`。

## 文件结构

```
review-ai-platform/
├── docker-compose.yml             # 开发用
├── docker-compose.prod.yml        # 生产用（本指南）
├── .env.example                   # 开发模板
├── .env.production.example        # 生产模板（本指南）
├── DEPLOYMENT.md                  # 本文件
├── apps/
│   ├── api/Dockerfile             # 多阶段构建，非 root，tini 信号
│   ├── worker/Dockerfile          # 同上
│   └── web/
│       ├── Dockerfile             # nginx 静态托管
│       └── nginx.conf             # /api 反代 + gzip + cache
└── packages/
    ├── db/prisma/schema.prisma    # 启动时自动 push
    └── shared/                    # 跨端 DTO
```
