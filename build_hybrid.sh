#!/bin/bash
set -e

# --- Colors ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_NAME="takovibe"
BUILD_DIR="dist"
DEPLOY_DIR="/var/www/takovibe.com"
NODE_ENTRY="$DEPLOY_DIR/server/entry.mjs"

log()  { echo -e "${GREEN}[$(date '+%F %T')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%F %T')] WARN: $1${NC}"; }
error(){ echo -e "${RED}[$(date '+%F %T')] ERROR: $1${NC}" >&2; exit 1; }

# --- Helpers ---------------------------------------------------------------
safe_install() {
  if [ -f package-lock.json ]; then
    npm ci --omit=optional || { warn "npm ci failed → retrying with npm install"; npm install --omit=optional; }
  else
    warn "No lockfile found → using npm install"
    npm install --omit=optional
  fi
}

rollup_fix() {
  warn "Fixing Rollup binary issue..."
  rm -rf node_modules package-lock.json
  npm cache clean --force
  npm install
  npm install @rollup/rollup-linux-x64-gnu || npm install @rollup/rollup-linux-x64-musl || true
}

# --- Steps -----------------------------------------------------------------
clean() {
  log "Cleaning old build..."
  rm -rf "$BUILD_DIR" .cache || true
}

install_deps() {
  log "Installing local dependencies..."
  safe_install 2>npm_error.log || true
  if grep -q "@rollup/rollup-linux" npm_error.log 2>/dev/null; then rollup_fix; fi
}

build() {
  log "Building Astro (hybrid mode)..."
  export NODE_ENV=production
  if ! npm run build 2>build_error.log; then
    if grep -q "@rollup/rollup-linux" build_error.log 2>/dev/null; then rollup_fix && npm run build; else error "Astro build failed"; fi
  fi
}

deploy() {
  log "Deploying to $DEPLOY_DIR..."
  sudo mkdir -p "$DEPLOY_DIR"
  sudo chown -R "$USER":"$USER" "$DEPLOY_DIR"
  rm -rf "$DEPLOY_DIR"/*

  cp -r "$BUILD_DIR"/* package.json package-lock.json "$DEPLOY_DIR"/
  cd "$DEPLOY_DIR"
  log "Installing production dependencies..."
  if [ -f package-lock.json ]; then
    npm ci --omit=dev || { warn "npm ci failed → npm install"; npm install --omit=dev; }
  else
    npm install --omit=dev
  fi
  sudo chown -R "$USER":"$USER" "$DEPLOY_DIR"
}

restart_server() {
  log "Restarting PM2..."
  if pm2 list | grep -q "$APP_NAME"; then pm2 restart "$APP_NAME" --update-env; else pm2 start "$NODE_ENTRY" --name "$APP_NAME"; fi
  pm2 save
}

reload_nginx() {
  log "Reloading Nginx..."
  sudo nginx -t && sudo systemctl reload nginx || warn "Nginx reload failed"
}

main() {
  local start=$(date +%s)
  log "🚀 Starting full Astro build + deploy"
  clean
  install_deps
  build
  deploy
  restart_server
  reload_nginx
  local end=$(date +%s)
  log "✅ Deployment finished in $((end-start)) s"
  echo -e "${YELLOW}Your site is live at https://takovibe.com${NC}"
}

main
