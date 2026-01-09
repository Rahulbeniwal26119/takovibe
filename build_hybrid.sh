#!/bin/bash
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# --- Colors ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_NAME="takovibe"
BUILD_DIR="dist"
DEPLOY_DIR="/var/www/takovibe.com"
NODE_ENTRY="$DEPLOY_DIR/server/entry.mjs"
NPM_CACHE="/home/ubuntu/.npm-cache"

log() { echo -e "${GREEN}[$(date '+%F %T')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%F %T')] WARN: $1${NC}"; }
error() {
  echo -e "${RED}[$(date '+%F %T')] ERROR: $1${NC}" >&2
  exit 1
}

# --- Detect package manager ------------------------------------------------
detect_pm() {
  if command -v bun >/dev/null 2>&1; then
    PM="bun"
    log "✅ Using Bun ($(bun --version))"
  else
    PM="npm"
    log "⚙️  Bun not found, using npm ($(npm --version))"
  fi
}

prepare_env() {
  log "Preparing environment..."
  mkdir -p "$NPM_CACHE"
  [ "$PM" = "npm" ] && npm config set cache "$NPM_CACHE" --global
  export NODE_ENV=production
  export VIPS_CONCURRENCY=$(nproc)
  export SHARP_IGNORE_GLOBAL_LIBVIPS=1
  export NODE_OPTIONS=--max_old_space_size=4096
}

clean() {
  log "Cleaning old build artifacts..."
  rm -rf "$BUILD_DIR" .astro .cache || true
}

install_deps() {
  log "Installing dependencies with $PM..."
  if [ "$PM" = "bun" ]; then
    bun install --prefer-offline --no-frozen-lockfile
  else
    if [ -f package-lock.json ]; then
      npm ci --prefer-offline --no-audit --no-fund --omit=optional || npm install --prefer-offline --no-audit --no-fund --omit=optional
    else
      npm install --prefer-offline --no-audit --no-fund --omit=optional
    fi
  fi
}

build() {
  log "Building Astro (hybrid mode)..."
  if [ "$PM" = "bun" ]; then
    bun run build
  else
    npm run build
  fi
}

deploy() {
  log "Deploying to $DEPLOY_DIR..."
  sudo mkdir -p "$DEPLOY_DIR"
  sudo chown -R "$USER":"$USER" "$DEPLOY_DIR"

  rsync -a --delete "$BUILD_DIR"/ "$DEPLOY_DIR"/dist/
  rsync -a node_modules/ "$DEPLOY_DIR"/node_modules/
  cp -f package*.json "$DEPLOY_DIR"/

  sudo chown -R "$USER":"$USER" "$DEPLOY_DIR"
}

restart_server() {
  if [ -f "$NODE_ENTRY" ]; then
    log "Restarting PM2..."
    if pm2 list | grep -q "$APP_NAME"; then
      pm2 restart "$APP_NAME" --update-env
    else
      pm2 start "$NODE_ENTRY" --name "$APP_NAME"
    fi
    pm2 save
  else
    warn "Server entry not found ($NODE_ENTRY)"
  fi
}

reload_nginx() {
  log "Reloading Nginx..."
  sudo nginx -t && sudo systemctl reload nginx || warn "Nginx reload failed"
}

reload_pm2() {
  log "Reloading PM2"
  pm2 restart takovibe
}

main() {
  local start=$(date +%s)
  log "🚀 Starting Astro build + deploy"
  detect_pm
  prepare_env
  clean
  install_deps
  build
  deploy
  restart_server
  reload_nginx
  reload_pm2
  log "✅ Finished in $(($(date +%s) - start))s"
  echo -e "${YELLOW}Live at https://takovibe.com${NC}"
}

main
