# Ubuntu 一键部署脚本

脚本位置：

```bash
scripts/ubuntu-deploy.sh
```

## 首次部署

```bash
sudo bash scripts/ubuntu-deploy.sh deploy
```

默认会：

- 安装 Docker、Docker Compose、Git 等基础依赖
- 拉取或使用当前项目代码
- 创建 `.env`
- 构建并启动 Postgres、Redis、API、Worker、Web。也可以通过外部数据库变量跳过内置 Postgres/Redis
- 执行数据库初始化和唯一超管账号种子

默认超管：

```text
账号：admin
密码：123456
```

## 常用命令

```bash
bash scripts/ubuntu-deploy.sh update
bash scripts/ubuntu-deploy.sh start
bash scripts/ubuntu-deploy.sh stop
bash scripts/ubuntu-deploy.sh restart
bash scripts/ubuntu-deploy.sh status
bash scripts/ubuntu-deploy.sh logs
bash scripts/ubuntu-deploy.sh logs api
bash scripts/ubuntu-deploy.sh backup
bash scripts/ubuntu-deploy.sh restore /opt/review-ai-platform/backups/review-ai-db-YYYYmmdd-HHMMSS.sql.gz
```

## 常用变量

```bash
APP_DIR=/opt/review-ai-platform
REPO_URL=https://github.com/juzehuan/review-ai.git
DEPLOY_BRANCH=codex/saas-analysis-core
WEB_PORT=8080
API_PORT=3999
POSTGRES_PORT=15432
REDIS_PORT=16379
```

示例：

```bash
sudo APP_DIR=/opt/review-ai-platform DEPLOY_BRANCH=main bash scripts/ubuntu-deploy.sh deploy
```

## 使用已有数据库服务

如果服务器上已经有可用的 PostgreSQL 或 Redis，可以显式启用外部服务模式：

```bash
sudo USE_EXTERNAL_POSTGRES=true \
  EXTERNAL_DATABASE_URL='postgresql://user:password@127.0.0.1:5432/review_ai' \
  USE_EXTERNAL_REDIS=true \
  EXTERNAL_REDIS_URL='redis://127.0.0.1:6379' \
  bash scripts/ubuntu-deploy.sh deploy
```

启用后脚本会跳过对应的内置容器，迁移、启动、备份和恢复都会使用外部连接串。

备份文件默认保存在：

```text
/opt/review-ai-platform/backups
```
