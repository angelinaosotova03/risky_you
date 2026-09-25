#!/usr/bin/env bash
# Провижининг + деплой на сервер. Идемпотентный: безопасно запускать повторно —
# на второй и последующие разы просто обновляет код и перезапускает контейнеры.
# Вызывается из .github/workflows/deploy.yml по SSH, но можно и вручную:
#   DOMAIN=твой-домен.ru ./deploy/provision.sh
set -euo pipefail

REPO_URL="https://github.com/angelinaosotova03/risky_you.git"
APP_DIR="/opt/risky-you"
DOMAIN="${DOMAIN:-localhost}"

log() { echo "[provision] $*"; }

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

# 1. Docker + Compose plugin — ставим, только если ещё не установлены.
#    Postgres отдельно ставить не нужно: он поднимается контейнером
#    из docker-compose.yml (сервис "db"), на хосте не нужен.
if ! command -v docker >/dev/null 2>&1; then
  log "Docker не найден, устанавливаю..."
  curl -fsSL https://get.docker.com | sh
  $SUDO systemctl enable --now docker
else
  log "Docker уже установлен — пропускаю"
fi

if ! command -v git >/dev/null 2>&1; then
  log "git не найден, устанавливаю..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y git
fi

# 2. Папка проекта: клонируем при первом деплое, дальше только обновляем
if [ ! -d "$APP_DIR/.git" ]; then
  log "Папка $APP_DIR не найдена — клонирую репозиторий"
  $SUDO mkdir -p "$APP_DIR"
  $SUDO chown "$(id -un)" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  log "Обновляю $APP_DIR из origin/main"
fi

cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main

# 3. .env создаём один раз (генерируем случайный пароль от базы) и больше не
#    трогаем — иначе каждый деплой сбрасывал бы пароль и ронял бы Postgres.
if [ ! -f .env ]; then
  log "Создаю .env (первый деплой на этом сервере)"
  {
    echo "DOMAIN=${DOMAIN}"
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
  } > .env
else
  log ".env уже существует — не трогаю (чтобы не сбросить пароль от базы)"
fi

# 4. Поднимаем/обновляем контейнеры
log "docker compose up -d --build"
$SUDO docker compose up -d --build
$SUDO docker image prune -f
log "Готово"
