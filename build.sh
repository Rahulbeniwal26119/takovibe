#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BUILD_DIR="dist"
NGINX_SITE_DIR="/var/www/takovibe.com"
ENV="prod"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
    exit 1
}

# Clean previous build
clean() {
    log "Cleaning previous build..."
    rm -rf "$BUILD_DIR" || error "Failed to clean build directory"
    rm -rf .cache || error "Failed to clean cache"
}

# Install dependencies
install_deps() {
    log "Installing dependencies..."
    # Use clean install and only production dependencies
    npm ci --only=production --no-audit || error "Failed to install dependencies"
}

# Build the application
build() {
    log "Building application..."
    # Set production environment
    export NODE_ENV=production

    # Build with optimization flags
    npm run build || error "Build failed"
}

# Optimize assets
optimize() {
    log "Optimizing assets..."

    # Optimize images if imagemin-cli is installed
    if command -v imagemin &> /dev/null; then
        find "$BUILD_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -exec imagemin {} -o {} \;
    fi
}

# Deploy to nginx directory
deploy() {
    log "Deploying to Nginx..."

    # Create directory if it doesn't exist
    sudo mkdir -p "$NGINX_SITE_DIR"

    # Copy files
    sudo cp -r "$BUILD_DIR"/* "$NGINX_SITE_DIR"/ || error "Failed to copy files"

    # Set permissions
    sudo chown -R www-data:www-data "$NGINX_SITE_DIR"
    sudo chmod -R 755 "$NGINX_SITE_DIR"

    # Reload Nginx
    sudo systemctl reload nginx || error "Failed to reload Nginx"
}

# Main build process
main() {
    local start_time=$(date +%s)

    log "Starting build process..."

    clean
    install_deps
    build
    optimize
    deploy

    local end_time=$(date +%s)
    local elapsed=$((end_time - start_time))

    log "Build and deployment completed in ${elapsed} seconds"
    echo -e "${YELLOW}Site is now live at https://takovibe.com${NC}"
}

# Execute with error handling
main || error "Build process failed"
