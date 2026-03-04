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
echo "=== Running deploy on server ==="
ssh "$SERVER" "bash $REMOTE_SRC/deploy.sh"
