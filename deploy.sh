#!/usr/bin/env bash
# Review AI Platform — 一键部署脚本
# 用法: ./deploy.sh           # 首次部署或更新
#       ./deploy.sh stop      # 停止
#       ./deploy.sh restart   # 重启
#       ./deploy.sh logs      # 查看日志
#       ./deploy.sh backup    # 备份数据库

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/.env.production"
ENV_EXAMPLE="$ROOT_DIR/.env.production.example"

C_RESET='\033[0m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[1;33m'
C_RED='\033[0;31m'
C_CYAN='\033[0;36m'
C_BOLD='\033[1m'

log()  { echo -e "${C_CYAN}▶ $*${C_RESET}"; }
ok()   { echo -e "${C_GREEN}✓ $*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}⚠ $*${C_RESET}"; }
err()  { echo -e "${C_RED}✗ $*${C_RESET}"; exit 1; }

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "缺少 $1，请先安装。"
  fi
}

check_prereqs() {
  require docker
  if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
    warn "建议升级到 Docker Compose v2（docker compose）。"
  else
    err "未检测到 docker compose，请安装 Docker Compose v2。"
  fi
  ok "依赖检查通过：$(docker --version)"
}

prepare_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ ! -f "$ENV_EXAMPLE" ]]; then
      err "缺少 $ENV_EXAMPLE，无法生成配置。"
    fi
    log "首次部署：生成 $ENV_FILE"
    cp "$ENV_EXAMPLE" "$ENV_FILE"

    # 自动生成强密码替换占位符
    if command -v openssl >/dev/null 2>&1; then
      local new_pwd
      new_pwd="$(openssl rand -base64 32 | tr -d '\n=+/' | cut -c1-32)"
      # 用 sed 替换占位符（兼容 macOS / Linux 的 sed）
      if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s|please-change-me-to-a-strong-random-password|$new_pwd|" "$ENV_FILE"
      else
        sed -i "s|please-change-me-to-a-strong-random-password|$new_pwd|" "$ENV_FILE"
      fi
      ok "已自动生成 POSTGRES_PASSWORD（长度 32 位随机串）"
    else
      warn "未检测到 openssl，请手动编辑 $ENV_FILE 修改 POSTGRES_PASSWORD"
      read -r -p "按回车继续，或 Ctrl+C 退出去编辑..." _
    fi

    echo ""
    echo -e "${C_BOLD}配置文件已生成：$ENV_FILE${C_RESET}"
    echo "如需配置 AI Key，可以编辑该文件，或部署完成后通过 Web 端 /settings 页面动态配置。"
    echo ""
  fi

  # 校验密码不再是默认值
  if grep -q "please-change-me-to-a-strong-random-password" "$ENV_FILE"; then
    err "$ENV_FILE 中 POSTGRES_PASSWORD 仍为占位符，请修改后再运行。"
  fi
  ok "环境配置就绪"
}

action_up() {
  check_prereqs
  prepare_env

  log "构建镜像（首次会比较慢，请耐心等待）..."
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

  log "启动服务..."
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

  log "等待服务健康（最多 90 秒）..."
  local waited=0
  local max_wait=90
  while [[ $waited -lt $max_wait ]]; do
    sleep 5
    waited=$((waited + 5))
    local unhealthy
    unhealthy=$($COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json 2>/dev/null \
      | grep -E '"Health":"(starting|unhealthy)"' || true)
    if [[ -z "$unhealthy" ]]; then
      ok "所有服务就绪（耗时 ${waited}s）"
      break
    fi
    echo "  …等待中（已等 ${waited}s）"
  done

  echo ""
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
  echo ""

  local web_port
  web_port=$(grep -E '^WEB_PORT=' "$ENV_FILE" | cut -d= -f2 | tr -d ' "' || echo "")
  web_port=${web_port:-5201}

  echo -e "${C_GREEN}${C_BOLD}╔════════════════════════════════════════╗${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}║   Review AI Platform 部署成功 🎉      ║${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}╚════════════════════════════════════════╝${C_RESET}"
  echo ""
  echo -e "  访问地址：${C_CYAN}http://<服务器IP>:${web_port}/${C_RESET}"
  echo -e "  AI 配置：${C_CYAN}http://<服务器IP>:${web_port}/settings${C_RESET}"
  echo ""
  echo "  常用命令："
  echo "    ./deploy.sh logs    查看日志"
  echo "    ./deploy.sh stop    停止服务"
  echo "    ./deploy.sh backup  备份数据库"
  echo ""
}

action_stop() {
  check_prereqs
  log "停止服务..."
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
  ok "已停止"
}

action_restart() {
  check_prereqs
  log "重启服务..."
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

action_logs() {
  check_prereqs
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=200 "${@:2}"
}

action_status() {
  check_prereqs
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

action_backup() {
  check_prereqs
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local backup_dir="$ROOT_DIR/backups"
  mkdir -p "$backup_dir"
  local file="$backup_dir/review-ai-$stamp.sql.gz"

  log "备份数据库到 $file ..."
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    pg_dump -U postgres review_ai | gzip > "$file"

  if [[ -s "$file" ]]; then
    ok "备份完成：$file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file"
    err "备份失败（输出为空）"
  fi
}

action_update() {
  check_prereqs
  log "拉取最新代码（如果在 git 仓库）..."
  if [[ -d "$ROOT_DIR/.git" ]]; then
    git -C "$ROOT_DIR" pull --ff-only
  else
    warn "当前不是 git 仓库，跳过 git pull"
  fi
  action_up
}

usage() {
  cat <<EOF
Review AI Platform 部署脚本

用法:
  ./deploy.sh                      # 首次部署或重新构建并启动
  ./deploy.sh up                   # 同上
  ./deploy.sh stop                 # 停止所有服务
  ./deploy.sh restart              # 重启
  ./deploy.sh logs [service]       # 查看日志（可指定 api / worker / web 等）
  ./deploy.sh status               # 查看运行状态
  ./deploy.sh backup               # 备份数据库到 backups/ 目录
  ./deploy.sh update               # git pull 并重新部署
  ./deploy.sh help                 # 显示此帮助
EOF
}

case "${1:-up}" in
  ""|up|deploy)    action_up ;;
  stop|down)       action_stop ;;
  restart)         action_restart ;;
  logs)            action_logs "$@" ;;
  status|ps)       action_status ;;
  backup)          action_backup ;;
  update|upgrade)  action_update ;;
  -h|--help|help)  usage ;;
  *)               usage; exit 1 ;;
esac
