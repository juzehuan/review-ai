#!/usr/bin/env bash
set -Eeuo pipefail

# ReviewIQ Cloud Ubuntu deployment helper.
# Usage:
#   bash scripts/ubuntu-deploy.sh deploy
#   bash scripts/ubuntu-deploy.sh update
#   bash scripts/ubuntu-deploy.sh start|stop|restart|status|logs
#   bash scripts/ubuntu-deploy.sh backup
#   bash scripts/ubuntu-deploy.sh restore /path/to/backup.sql.gz
#
# Optional environment variables:
#   APP_DIR=/opt/review-ai-platform
#   REPO_URL=https://github.com/juzehuan/review-ai.git
#   DEPLOY_BRANCH=codex/saas-analysis-core
#   WEB_PORT=5173 API_PORT=3001 POSTGRES_PORT=15432 REDIS_PORT=16379

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${SCRIPT_ROOT}/docker-compose.yml" ]]; then
  DEFAULT_APP_DIR="${SCRIPT_ROOT}"
else
  DEFAULT_APP_DIR="/opt/review-ai-platform"
fi

APP_DIR="${APP_DIR:-${DEFAULT_APP_DIR}}"
REPO_URL="${REPO_URL:-https://github.com/juzehuan/review-ai.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-codex/saas-analysis-core}"
BACKUP_DIR="${BACKUP_DIR:-${APP_DIR}/backups}"
ENV_FILE="${APP_DIR}/.env"

log() {
  printf '\033[1;34m[review-ai]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[review-ai][warn]\033[0m %s\n' "$*" >&2
}

fail() {
  printf '\033[1;31m[review-ai][error]\033[0m %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<EOF
ReviewIQ Cloud Ubuntu deployment helper

Usage:
  $0 install                 Install Docker, Git and base tools
  $0 deploy                  Install deps, clone/pull code, create .env, build and start
  $0 update                  Backup database, pull code, rebuild and restart
  $0 start                   Start services
  $0 stop                    Stop services without removing containers
  $0 down                    Stop and remove containers, keep volumes
  $0 restart                 Restart services
  $0 status                  Show container status
  $0 logs [service]          Follow logs, optionally api|web|worker|postgres|redis
  $0 backup                  Backup Postgres database and .env
  $0 restore <file.sql.gz>   Restore a database backup
  $0 migrate                 Run database migration and admin seed
  $0 pull                    Fetch and checkout the deploy branch
  $0 env                     Create .env if missing and print its path

Environment:
  APP_DIR=${APP_DIR}
  REPO_URL=${REPO_URL}
  DEPLOY_BRANCH=${DEPLOY_BRANCH}
  BACKUP_DIR=${BACKUP_DIR}
EOF
}

need_root_for_install() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "install/deploy must run as root or with sudo on a fresh Ubuntu server."
  fi
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    fail "Docker Compose is not installed."
  fi
}

run_in_app() {
  [[ -f "${APP_DIR}/docker-compose.yml" ]] || fail "docker-compose.yml not found in ${APP_DIR}"
  cd "${APP_DIR}"
  "$@"
}

install_system_deps() {
  need_root_for_install
  log "Installing base packages..."
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    gzip \
    openssl \
    rsync \
    tar

  if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker Engine..."
    curl -fsSL https://get.docker.com | sh
  fi

  if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
    log "Installing Docker Compose plugin..."
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin
  fi

  systemctl enable --now docker
  log "Docker is ready."
}

ensure_repo() {
  if [[ -d "${APP_DIR}/.git" ]]; then
    log "Using existing repository: ${APP_DIR}"
    return
  fi

  if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
    warn "${APP_DIR} exists but is not a git repository; using it as-is."
    return
  fi

  log "Cloning ${REPO_URL} (${DEPLOY_BRANCH}) into ${APP_DIR}..."
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${DEPLOY_BRANCH}" "${REPO_URL}" "${APP_DIR}"
}

pull_code() {
  ensure_repo
  if [[ ! -d "${APP_DIR}/.git" ]]; then
    warn "Skipping git pull because ${APP_DIR} is not a git repository."
    return
  fi

  run_in_app git fetch origin
  run_in_app git checkout "${DEPLOY_BRANCH}"
  run_in_app git pull --ff-only origin "${DEPLOY_BRANCH}"
}

random_secret() {
  openssl rand -hex 16
}

env_get() {
  local key="$1"
  if [[ -f "${ENV_FILE}" ]]; then
    grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2- || true
  fi
}

env_set() {
  local key="$1"
  local value="$2"
  if [[ -f "${ENV_FILE}" ]] && grep -qE "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
  fi
}

env_set_if_empty() {
  local key="$1"
  local value="$2"
  local current
  current="$(env_get "${key}")"
  if [[ -z "${current}" ]]; then
    env_set "${key}" "${value}"
  fi
}

ensure_env() {
  [[ -f "${APP_DIR}/docker-compose.yml" ]] || ensure_repo
  mkdir -p "${APP_DIR}"

  if [[ ! -f "${ENV_FILE}" ]]; then
    log "Creating ${ENV_FILE}..."
    if [[ -f "${APP_DIR}/.env.example" ]]; then
      cp "${APP_DIR}/.env.example" "${ENV_FILE}"
    else
      touch "${ENV_FILE}"
    fi
  fi

  local db_password
  db_password="$(env_get POSTGRES_PASSWORD)"
  if [[ -z "${db_password}" || "${db_password}" == "postgres" ]]; then
    db_password="$(random_secret)"
    env_set POSTGRES_PASSWORD "${db_password}"
  fi

  env_set_if_empty POSTGRES_DB "review_ai"
  env_set_if_empty POSTGRES_USER "postgres"
  env_set_if_empty POSTGRES_PORT "${POSTGRES_PORT:-15432}"
  env_set_if_empty REDIS_PORT "${REDIS_PORT:-16379}"
  env_set_if_empty API_PORT "${API_PORT:-3001}"
  env_set_if_empty WEB_PORT "${WEB_PORT:-5173}"

  local db_name db_user db_port redis_port
  db_name="$(env_get POSTGRES_DB)"
  db_user="$(env_get POSTGRES_USER)"
  db_port="$(env_get POSTGRES_PORT)"
  redis_port="$(env_get REDIS_PORT)"
  env_set DATABASE_URL "postgresql://${db_user}:${db_password}@127.0.0.1:${db_port}/${db_name}"
  env_set REDIS_URL "redis://127.0.0.1:${redis_port}"

  env_set_if_empty DEFAULT_ADMIN_EMAIL "admin"
  env_set_if_empty DEFAULT_ADMIN_PASSWORD "123456"
  env_set_if_empty DEFAULT_ADMIN_NAME "admin"
  env_set_if_empty DEFAULT_WORKSPACE_NAME "Admin Workspace"
  env_set_if_empty DEFAULT_WORKSPACE_SLUG "admin-workspace"

  env_set_if_empty OPENAI_API_KEY ""
  env_set_if_empty OPENAI_MODEL "gpt-4.1-mini"
  env_set_if_empty ENABLE_MOCK_AI "true"
  env_set_if_empty AI_PROVIDER "openai"
  env_set_if_empty VOLC_ARK_API_KEY ""
  env_set_if_empty DEEPSEEK_API_KEY ""
  env_set_if_empty MOONSHOT_API_KEY ""
  env_set_if_empty DASHSCOPE_API_KEY ""
  env_set_if_empty ZHIPU_API_KEY ""

  env_set_if_empty SCRAPLING_ENABLED "true"
  env_set_if_empty SCRAPLING_PROXY ""
  env_set SCRAPLING_CHANNELS "browser_intercept"
  env_set SCRAPLING_DEFAULT_SOURCE "YouTube"
  env_set_if_empty SCRAPLING_DEFAULT_MAX_REVIEWS "200"
  env_set_if_empty SCRAPLING_TIMEOUT_SEC "180"
  env_set SHOPEE_COOKIE ""

  chmod 600 "${ENV_FILE}" || true
  log ".env is ready: ${ENV_FILE}"
}

start_core() {
  run_in_app compose up -d postgres redis
  wait_for_postgres
}

wait_for_postgres() {
  local db_name db_user
  db_name="$(env_get POSTGRES_DB)"
  db_user="$(env_get POSTGRES_USER)"

  log "Waiting for Postgres..."
  for _ in $(seq 1 60); do
    if run_in_app compose exec -T postgres pg_isready -U "${db_user}" -d "${db_name}" >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done

  fail "Postgres is not ready after waiting."
}

run_migrate() {
  ensure_env
  log "Running database migration and admin seed..."
  run_in_app compose up --build migrate
}

start_app() {
  ensure_env
  log "Starting ReviewIQ services..."
  run_in_app compose up -d --build postgres redis
  run_migrate
  run_in_app compose up -d --build api worker web
  log "Started. Web: http://127.0.0.1:$(env_get WEB_PORT)"
}

deploy() {
  install_system_deps
  ensure_repo
  pull_code
  ensure_env
  start_app
}

update() {
  ensure_repo
  ensure_env
  backup || warn "Backup failed; continuing with update."
  pull_code
  start_app
}

stop_services() {
  run_in_app compose stop
}

down_services() {
  run_in_app compose down
}

restart_services() {
  run_in_app compose restart
}

show_status() {
  run_in_app compose ps
}

show_logs() {
  local service="${1:-}"
  if [[ -n "${service}" ]]; then
    run_in_app compose logs -f --tail=200 "${service}"
  else
    run_in_app compose logs -f --tail=200
  fi
}

backup() {
  ensure_env
  mkdir -p "${BACKUP_DIR}"

  local stamp db_name db_user db_file env_file manifest_file
  stamp="$(date +%Y%m%d-%H%M%S)"
  db_name="$(env_get POSTGRES_DB)"
  db_user="$(env_get POSTGRES_USER)"
  db_file="${BACKUP_DIR}/review-ai-db-${stamp}.sql.gz"
  env_file="${BACKUP_DIR}/review-ai-env-${stamp}.env"
  manifest_file="${BACKUP_DIR}/review-ai-backup-${stamp}.txt"

  log "Backing up database to ${db_file}..."
  start_core
  run_in_app compose exec -T postgres pg_dump --clean --if-exists --no-owner -U "${db_user}" -d "${db_name}" | gzip -9 > "${db_file}"
  cp "${ENV_FILE}" "${env_file}"
  chmod 600 "${env_file}" || true

  {
    echo "created_at=$(date -Is)"
    echo "app_dir=${APP_DIR}"
    echo "branch=${DEPLOY_BRANCH}"
    echo "db_file=${db_file}"
    echo "env_file=${env_file}"
  } > "${manifest_file}"

  log "Backup complete:"
  log "  ${db_file}"
  log "  ${env_file}"
}

restore() {
  local file="${1:-}"
  [[ -n "${file}" ]] || fail "restore requires a .sql.gz file."
  [[ -f "${file}" ]] || fail "Backup file not found: ${file}"

  ensure_env
  local db_name db_user
  db_name="$(env_get POSTGRES_DB)"
  db_user="$(env_get POSTGRES_USER)"

  warn "This will replace data in database ${db_name}."
  read -r -p "Type RESTORE to continue: " answer
  [[ "${answer}" == "RESTORE" ]] || fail "Restore cancelled."

  start_core
  log "Restoring ${file}..."
  run_in_app compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "${db_user}" -d "${db_name}" \
    -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  gunzip -c "${file}" | run_in_app compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "${db_user}" -d "${db_name}"
  log "Restore complete."
}

main() {
  local cmd="${1:-help}"
  shift || true

  case "${cmd}" in
    install) install_system_deps ;;
    deploy) deploy ;;
    update) update ;;
    start|run) start_app ;;
    stop) stop_services ;;
    down) down_services ;;
    restart) restart_services ;;
    status|ps) show_status ;;
    logs) show_logs "${1:-}" ;;
    backup) backup ;;
    restore) restore "${1:-}" ;;
    migrate) run_migrate ;;
    pull) pull_code ;;
    env) ensure_env ;;
    help|-h|--help) usage ;;
    *) usage; fail "Unknown command: ${cmd}" ;;
  esac
}

main "$@"
