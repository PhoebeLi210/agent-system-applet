#!/usr/bin/env bash
set -euo pipefail

# deploy.sh - 拉取最新代码、备份数据库、安装依赖并重启 pm2 进程
# 用法：在服务器上作为部署脚本运行（确保已配置好 SSH/权限）

# 可通过环境变量覆盖
APP_DIR=${APP_DIR:-/www/wwwroot/agent-system}
REPO=${REPO:-https://github.com/<yourname>/<your-repo>.git}
BRANCH=${BRANCH:-main}
PM2_NAME=${PM2_NAME:-agent-system}
BACKUP_DIR=${BACKUP_DIR:-${APP_DIR}/backups}

echo "Deploying to ${APP_DIR} (branch ${BRANCH})"

if [ ! -d "$APP_DIR" ]; then
  echo "App dir does not exist, cloning..."
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

echo "Backing up database if exists..."
mkdir -p "$BACKUP_DIR"
if [ -f "data/agent-system.db" ]; then
  ts=$(date +%Y%m%d%H%M%S)
  cp data/agent-system.db "$BACKUP_DIR/agent-system.db.$ts" || true
  echo "Database backed up to $BACKUP_DIR/agent-system.db.$ts"
fi

echo "Fetching latest from origin/${BRANCH}"
git fetch origin "$BRANCH" && git reset --hard "origin/${BRANCH}"

echo "Installing dependencies (production)..."
if command -v npm >/dev/null 2>&1; then
  npm ci --only=production
else
  echo "npm not found, please install Node.js/npm before running this script."
  exit 1
fi

echo "Restarting PM2 process: $PM2_NAME"
if command -v pm2 >/dev/null 2>&1; then
  pm2 describe "$PM2_NAME" >/dev/null 2>&1 && pm2 reload "$PM2_NAME" || pm2 start server.js --name "$PM2_NAME" --env production
  pm2 save
else
  echo "pm2 not found, please install pm2 (npm i -g pm2) and re-run."
  exit 1
fi

echo "Deployment complete."
