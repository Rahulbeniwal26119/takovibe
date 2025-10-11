#!/bin/bash
set -euo pipefail

# ==== Config ====
APP_NAME="takovibe-crm"
REPO_DIR="/home/ubuntu/blog"
CRM_DIR="/var/www/crm.takovibe.com"
ADMIN_SRC="$REPO_DIR/public/admin"
USERS_FILE="$REPO_DIR/decap-users.yml"
PORT=8081

# ==== Helpers ====
log()  { printf "\033[0;32m[%s] %s\033[0m\n" "$(date '+%F %T')" "$*"; }
warn() { printf "\033[1;33m[%s] WARN: %s\033[0m\n" "$(date '+%F %T')" "$*"; }
err()  { printf "\033[0;31m[%s] ERROR: %s\033[0m\n" "$(date '+%F %T')" "$*" >&2; exit 1; }

# ==== Pre-flight checks ====
command -v pm2 >/dev/null 2>&1 || err "pm2 not found. Install with: npm i -g pm2"
command -v npx >/dev/null 2>&1 || err "npx not found (install Node properly)."
[ -d "$ADMIN_SRC" ] || err "Admin UI not found at $ADMIN_SRC"
[ -f "$USERS_FILE" ] || err "Users file not found at $USERS_FILE"

log "🚀 Starting CRM Deployment..."

# 1) Ensure directory structure + perms
log "📂 Ensuring CRM directory structure at $CRM_DIR"
sudo mkdir -p "$CRM_DIR/public/admin"
sudo chown -R "$USER:$USER" "$CRM_DIR"

# 2) Install deps if missing (Decap runs via npx but repo may require libs)
cd "$REPO_DIR"
if [ ! -d "node_modules" ]; then
  log "📦 Installing dependencies (one-time)…"
  npm install --omit=optional
fi

# 3) Sync Decap Admin UI + users file
log "🗂️ Syncing Decap Admin UI → $CRM_DIR/public/admin/"
rsync -a --delete "$ADMIN_SRC/" "$CRM_DIR/public/admin/"

log "👥 Syncing users file"
cp -f "$USERS_FILE" "$CRM_DIR/"

# 4) Free the port if something is stuck
if sudo lsof -ti:$PORT >/dev/null 2>&1; then
  warn "Port $PORT is in use — freeing it…"
  sudo fuser -k "$PORT"/tcp || true
fi

# 5) Start/Restart Decap backend with PM2 (correct npx usage)
cd "$CRM_DIR"
if pm2 list | grep -qE "^\\s*\\d+\\s+$APP_NAME\\s"; then
  log "♻️ Removing previous PM2 process: $APP_NAME"
  pm2 delete "$APP_NAME" || true
fi

log "🟢 Starting Decap CMS backend on :$PORT"
pm2 start npx --name "$APP_NAME" -- decap-server --port "$PORT" --local-backend=false --users "$CRM_DIR/$(basename "$USERS_FILE")"
pm2 save

# 6) Nginx reload (assumes site config already points / → admin UI and /api/ → backend)
if command -v nginx >/dev/null 2>&1; then
  log "🌐 Reloading Nginx"
  sudo nginx -t && sudo systemctl reload nginx || warn "Nginx reload failed; check config"
else
  warn "Nginx not installed or not in PATH — skipping reload"
fi

# 7) Health checks
sleep 2
BE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT")
if [ "$BE_CODE" = "200" ] || [ "$BE_CODE" = "404" ]; then
  log "✅ Backend reachable on http://127.0.0.1:$PORT (HTTP $BE_CODE)"
else
  warn "Backend check returned HTTP $BE_CODE — inspect logs:"
  echo "    pm2 logs $APP_NAME --lines 80"
fi

log "✨ CRM deployed. Open: https://crm.takovibe.com"
