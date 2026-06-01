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
- 构建并启动 Postgres、Redis、API、Worker、Web
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
WEB_PORT=5173
API_PORT=3001
```

示例：

```bash
sudo APP_DIR=/opt/review-ai-platform DEPLOY_BRANCH=main bash scripts/ubuntu-deploy.sh deploy
```

备份文件默认保存在：

```text
/opt/review-ai-platform/backups
```
