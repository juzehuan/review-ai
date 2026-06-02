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
WEB_PORT=8001
API_PORT=8002
POSTGRES_IMAGE=postgres:16
REDIS_IMAGE=redis:7
DOCKER_REGISTRY_MIRRORS=https://docker.1ms.run,https://docker.1panel.live,https://docker.m.daocloud.io
APT_MIRROR=http://mirrors.aliyun.com/debian
APT_SECURITY_MIRROR=http://mirrors.aliyun.com/debian-security
NPM_REGISTRY=https://registry.npmmirror.com
PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
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

## 镜像拉取失败

如果服务器无法从 Docker Hub 拉取官方镜像，可以指定可访问的镜像仓库：

```bash
sudo DOCKER_REGISTRY_MIRRORS='https://docker.1ms.run,https://docker.1panel.live,https://docker.m.daocloud.io' \
  bash scripts/ubuntu-deploy.sh deploy
```

脚本会写入 `/etc/docker/daemon.json` 并备份旧文件。公益镜像源可能波动，也可以替换成你自己的阿里云、腾讯云或私有镜像源。

如果你已经手动维护 Docker 配置，不希望脚本改镜像源：

```bash
sudo DISABLE_DOCKER_MIRRORS=true bash scripts/ubuntu-deploy.sh deploy
```

仍然拉取失败时，也可以把 `POSTGRES_IMAGE`、`REDIS_IMAGE` 写入 `.env`，换成你服务器能访问的私有仓库镜像。

## Python 和 Playwright 换源

API 镜像构建时会安装系统 Chromium 和 Python 爬虫依赖。浏览器不再从 Playwright CDN 下载，镜像内会通过 Debian 包安装系统 Chromium，并默认使用：

```bash
SCRAPLING_CHROMIUM_EXECUTABLE=/usr/bin/chromium
```

apt 和 Python 依赖默认使用国内源：
apt、npm/pnpm 和 Python 依赖默认使用国内源：

```bash
APT_MIRROR=http://mirrors.aliyun.com/debian
APT_SECURITY_MIRROR=http://mirrors.aliyun.com/debian-security
NPM_REGISTRY=https://registry.npmmirror.com
PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn
```

也可以部署时覆盖：

```bash
sudo APT_MIRROR='http://mirrors.aliyun.com/debian' \
  APT_SECURITY_MIRROR='http://mirrors.aliyun.com/debian-security' \
  NPM_REGISTRY='https://registry.npmmirror.com' \
  PIP_INDEX_URL='https://mirrors.aliyun.com/pypi/simple/' \
  PIP_TRUSTED_HOST='mirrors.aliyun.com' \
  bash scripts/ubuntu-deploy.sh deploy
```

备份文件默认保存在：

```text
/opt/review-ai-platform/backups
```
