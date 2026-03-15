#!/bin/bash
# Deploy script for mautomate.ai
# Usage: ./deploy.sh
#
# What it does:
#   1. Syncs source code to server
#   2. Runs wasp build on server (generates SDK, server bundle, client)
#   3. Builds client with production API URL
#   4. Applies server patches (email auto-verify, avatar size)
#   5. Restarts server via PM2
#   6. Publishes pre-built artifacts for white-label instances
#
# After making ANY code change, just run: ./deploy.sh

set -e

SERVER="ratul@192.168.200.201"
REMOTE_SRC="/home/ratul/mautomate-app"
REMOTE_DEPLOY="/home/ratul/mautomate"

echo "=== Syncing source code to server ==="
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.wasp/out' \
  --exclude '.wasp/data' \
  --exclude '.wasp/node_modules' \
  --exclude 'deploy.sh' \
  "$(dirname "$0")/" \
  "$SERVER:$REMOTE_SRC/"
echo "✅ Code synced"

echo ""
echo "=== Publishing update snapshot (source) ==="
rsync -avz --delete \
  --exclude 'node_modules' --exclude '.wasp/out' --exclude '.wasp/data' \
  --exclude '.wasp/node_modules' --exclude 'deploy.sh' --exclude 'branding.json' \
  "$(dirname "$0")/" "$SERVER:/home/ratul/update-repo/latest/"
scp "$(dirname "$0")/VERSION" "$(dirname "$0")/version.json" "$SERVER:/home/ratul/update-repo/"
scp "$(dirname "$0")/update-instance.sh" "$SERVER:/home/ratul/update-repo/update-instance.sh"
ssh "$SERVER" "chmod +x /home/ratul/update-repo/update-instance.sh"
echo "✅ Update snapshot published"

echo ""
echo "=== Running deploy on server ==="
ssh "$SERVER" "bash $REMOTE_SRC/deploy.sh"

echo ""
echo "=== Publishing pre-built artifacts for white-label instances ==="
ssh "$SERVER" "bash -s" << 'REMOTE_SCRIPT'
set -e

BUILT_DIR="/home/ratul/update-repo/built"
SRC="/home/ratul/mautomate-app"
PROD="/home/ratul/mautomate"

# Clean and create structure
rm -rf "$BUILT_DIR"
mkdir -p "$BUILT_DIR/server/bundle"
mkdir -p "$BUILT_DIR/server/node_modules"
mkdir -p "$BUILT_DIR/client"
mkdir -p "$BUILT_DIR/db"
mkdir -p "$BUILT_DIR/sdk"

# 1. Server bundle (compiled JS)
rsync -a "$PROD/.wasp/out/server/bundle/" "$BUILT_DIR/server/bundle/"
cp "$PROD/.wasp/out/server/package.json" "$BUILT_DIR/server/package.json"
cp "$PROD/.wasp/out/server/package-lock.json" "$BUILT_DIR/server/package-lock.json" 2>/dev/null || true
# Server node_modules (production deps)
rsync -a "$PROD/.wasp/out/server/node_modules/" "$BUILT_DIR/server/node_modules/"

# Ensure hoisted packages are present in built artifacts
# (npm workspaces hoists some deps to parent node_modules, so they're missing from server dir)
if [ -d "$SRC/node_modules/express-rate-limit" ]; then
  cp -r "$SRC/node_modules/express-rate-limit" "$BUILT_DIR/server/node_modules/express-rate-limit"
  echo "  Copied express-rate-limit from workspace root"
elif [ -d "$PROD/node_modules/express-rate-limit" ]; then
  cp -r "$PROD/node_modules/express-rate-limit" "$BUILT_DIR/server/node_modules/express-rate-limit"
  echo "  Copied express-rate-limit from production root"
else
  echo "  WARNING: express-rate-limit not found — white-label instances may need manual install"
fi

# 2. Client build (static files)
rsync -a "$PROD/build/" "$BUILT_DIR/client/"

# 3. DB schema (for prisma migrate)
cp "$SRC/.wasp/out/db/schema.prisma" "$BUILT_DIR/db/schema.prisma"

# 4. SDK (needed for prisma client generation)
rsync -a "$SRC/.wasp/out/sdk/" "$BUILT_DIR/sdk/" --exclude 'node_modules'

# 5. Copy .env template marker (instances keep their own .env)
echo "# Pre-built artifacts — do not edit" > "$BUILT_DIR/.built-marker"
date -Iseconds >> "$BUILT_DIR/.built-marker"

echo "✅ Pre-built artifacts published to $BUILT_DIR"
ls -lh "$BUILT_DIR/"
REMOTE_SCRIPT
echo "✅ White-label artifacts ready"
