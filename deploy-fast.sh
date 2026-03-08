#!/bin/bash
# Fast deploy — server-only, skips wasp build + client build
# Use when you ONLY changed src/ server code (operations, services, etc.)
# For schema.prisma or main.wasp changes, use ./deploy.sh (full deploy)
#
# Usage: ./deploy-fast.sh         # server code only
#        ./deploy-fast.sh --db    # server code + DB schema push
#        ./deploy-fast.sh --full  # fallback to full deploy

set -e

SERVER="ratul@192.168.200.201"
REMOTE_SRC="/home/ratul/mautomate-app"
REMOTE_DEPLOY="/home/ratul/mautomate"
START=$(date +%s)

if [ "$1" = "--full" ]; then
  echo "⚡ Full deploy requested"
  exec ./deploy.sh
fi

echo "⚡ Fast deploy — server only"

# Step 1: Sync source (fast — rsync only sends diffs)
echo "── Syncing code..."
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude '.wasp/out' \
  --exclude '.wasp/data' \
  --exclude '.wasp/node_modules' \
  --exclude 'deploy.sh' \
  --exclude 'deploy-fast.sh' \
  "$(dirname "$0")/" \
  "$SERVER:$REMOTE_SRC/" 2>&1 | tail -1
echo "✅ Synced"

# Step 2: Rebuild server bundle on remote (Rollup only, no wasp build)
# Rollup reads src/ directly via relative imports (../../../../../src/)
# so syncing src/ to project root is all we need — no ext-src copy required
echo "── Building server bundle..."
ssh "$SERVER" "bash -s" <<'REMOTE_SCRIPT'
set -e
cd /home/ratul/mautomate-app

# Bundle server (rollup picks up src/ changes via relative imports)
cd .wasp/out/server
npx rollup -c 2>&1 | tail -3
cd /home/ratul/mautomate-app

# Deploy bundle to production directory
rsync -a .wasp/out/server/bundle/ /home/ratul/mautomate/.wasp/out/server/bundle/
echo "✅ Bundle built & deployed"
REMOTE_SCRIPT

# Step 2b: DB schema push (optional)
if [ "$1" = "--db" ]; then
  echo "── Pushing DB schema..."
  ssh "$SERVER" "bash -s" <<'DB_SCRIPT'
  set -e
  cp /home/ratul/mautomate-app/.wasp/out/db/schema.prisma /home/ratul/mautomate/.wasp/out/db/schema.prisma
  cd /home/ratul/mautomate/.wasp/out/db
  DATABASE_URL="$(grep ^DATABASE_URL /home/ratul/mautomate/.wasp/out/server/.env | cut -d'"' -f2)" npx prisma db push --schema=schema.prisma --accept-data-loss 2>&1 | tail -2
DB_SCRIPT
  echo "✅ DB schema pushed"
fi

# Step 3: Apply patches + restart
echo "── Restarting server..."
ssh "$SERVER" "bash -s" <<'RESTART_SCRIPT'
set -e
BUNDLE=/home/ratul/mautomate/.wasp/out/server/bundle/server.js
sed -i 's/avatarUrl:z.string().max(5e5)/avatarUrl:z.string().max(5e6)/g' $BUNDLE 2>/dev/null || true
pm2 restart mautomate
pm2 save 2>/dev/null
RESTART_SCRIPT

END=$(date +%s)
echo ""
echo "🚀 Fast deploy done in $((END - START))s — https://mautomate.ai"
