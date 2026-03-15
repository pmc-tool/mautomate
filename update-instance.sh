#!/bin/bash
# update-instance.sh — White-label one-click update script (pre-built artifacts)
# Usage: bash /home/ratul/update-repo/update-instance.sh [/path/to/branding.json]
#
# This script deploys PRE-BUILT artifacts from /update-repo/built/
# No compilation happens here — just rsync + prisma migrate + PM2 restart (~30 sec)

set -euo pipefail

UPDATE_REPO="/home/ratul/update-repo"
BUILT_DIR="$UPDATE_REPO/built"
LOCK_FILE="$UPDATE_REPO/.update-lock"
BACKUP_DIR="/home/ratul/backups"

# ---------------------------------------------------------------------------
# Lock management
# ---------------------------------------------------------------------------

cleanup() {
  rm -f "$LOCK_FILE"
}

acquire_lock() {
  if [ -f "$LOCK_FILE" ]; then
    local pid
    pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "ERROR: Another update is in progress (PID $pid)"
      exit 1
    else
      echo "Removing stale lock file (PID $pid no longer running)"
      rm -f "$LOCK_FILE"
    fi
  fi
  echo $$ > "$LOCK_FILE"
  trap cleanup EXIT
}

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BRANDING_JSON="${1:-}"

if [ -n "$BRANDING_JSON" ] && [ -f "$BRANDING_JSON" ]; then
  echo "Using branding config: $BRANDING_JSON"
  APP_NAME=$(python3 -c "import json; print(json.load(open('$BRANDING_JSON'))['appName'])")
  SOURCE_DIR=$(python3 -c "import json; print(json.load(open('$BRANDING_JSON'))['sourceDir'])")
  PRODUCTION_DIR=$(python3 -c "import json; print(json.load(open('$BRANDING_JSON'))['productionDir'])")
  PM2_NAME=$(python3 -c "import json; print(json.load(open('$BRANDING_JSON'))['pm2Name'])")
else
  echo "No branding config — updating mAutomate directly"
  APP_NAME="mAutomate"
  SOURCE_DIR="/home/ratul/mautomate-app"
  PRODUCTION_DIR="/home/ratul/mautomate"
  PM2_NAME="mautomate"
  BRANDING_JSON=""
fi

# ---------------------------------------------------------------------------
# Version check
# ---------------------------------------------------------------------------

echo "=== Checking versions ==="

CURRENT_VERSION=0
if [ -f "$SOURCE_DIR/VERSION" ]; then
  CURRENT_VERSION=$(cat "$SOURCE_DIR/VERSION" | tr -d '[:space:]')
fi

AVAILABLE_VERSION=0
if [ -f "$UPDATE_REPO/VERSION" ]; then
  AVAILABLE_VERSION=$(cat "$UPDATE_REPO/VERSION" | tr -d '[:space:]')
fi

echo "Current version: $CURRENT_VERSION"
echo "Available version: $AVAILABLE_VERSION"

if [ "$AVAILABLE_VERSION" -le "$CURRENT_VERSION" ]; then
  echo "Already up to date (v$CURRENT_VERSION). Nothing to do."
  echo "=== UPDATE COMPLETE ==="
  exit 0
fi

# ---------------------------------------------------------------------------
# Verify pre-built artifacts exist
# ---------------------------------------------------------------------------

if [ ! -d "$BUILT_DIR/server/bundle" ] || [ ! -d "$BUILT_DIR/client" ]; then
  echo "ERROR: Pre-built artifacts not found at $BUILT_DIR"
  echo "The main instance (mAutomate) needs to be deployed first to generate artifacts."
  echo "=== UPDATE FAILED ==="
  exit 1
fi

echo "Pre-built artifacts found at $BUILT_DIR"

# ---------------------------------------------------------------------------
# Acquire lock
# ---------------------------------------------------------------------------

acquire_lock
echo "Lock acquired (PID $$)"

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------

echo ""
echo "=== Creating backup ==="
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/$(basename "$SOURCE_DIR")-v${CURRENT_VERSION}-$(date +%Y%m%d%H%M%S).tar.gz"
# Only backup production dir (much smaller than source)
if [ -d "$PRODUCTION_DIR/.wasp/out/server/bundle" ]; then
  tar -czf "$BACKUP_FILE" \
    -C "$PRODUCTION_DIR" ".wasp/out/server/bundle" ".wasp/out/server/package.json" \
    -C "$PRODUCTION_DIR" "build" 2>/dev/null || true
  echo "Backup saved to: $BACKUP_FILE"
else
  echo "No existing deployment to backup — fresh install"
fi

# ---------------------------------------------------------------------------
# Sync source code (for VERSION file and any config references)
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 1/5: Syncing source code ==="

EXCLUDE_ARGS="--exclude=node_modules --exclude=.wasp/out --exclude=.wasp/data --exclude=.wasp/node_modules --exclude=deploy.sh --exclude=branding.json --exclude=.update-log --exclude=deploy-remote.sh"

if [ -n "$BRANDING_JSON" ] && [ -f "$BRANDING_JSON" ]; then
  PROTECTED_FILES=$(python3 -c "
import json
data = json.load(open('$BRANDING_JSON'))
for f in data.get('protectedFiles', []):
    print(f)
" 2>/dev/null || true)

  while IFS= read -r pf; do
    if [ -n "$pf" ]; then
      EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$pf"
    fi
  done <<< "$PROTECTED_FILES"
fi

eval rsync -av --delete $EXCLUDE_ARGS "$UPDATE_REPO/latest/" "$SOURCE_DIR/"
cp "$UPDATE_REPO/VERSION" "$SOURCE_DIR/VERSION"
echo "Source synced, VERSION updated to $AVAILABLE_VERSION"

# ---------------------------------------------------------------------------
# Deploy pre-built server
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 2/5: Deploying pre-built server ==="
mkdir -p "$PRODUCTION_DIR/.wasp/out/server"
rsync -a --delete "$BUILT_DIR/server/bundle/" "$PRODUCTION_DIR/.wasp/out/server/bundle/"
cp "$BUILT_DIR/server/package.json" "$PRODUCTION_DIR/.wasp/out/server/package.json"
rsync -a "$BUILT_DIR/server/node_modules/" "$PRODUCTION_DIR/.wasp/out/server/node_modules/"

# Install any new server dependencies
cd "$PRODUCTION_DIR/.wasp/out/server" && npm install --omit=dev 2>&1 | tail -3
# Ensure hoisted packages that aren't in package.json are present
npm install express-rate-limit --save 2>&1 | tail -1
cd -

# Apply server patches
BUNDLE="$PRODUCTION_DIR/.wasp/out/server/bundle/server.js"
sed -i 's/avatarUrl:z.string().max(5e5)/avatarUrl:z.string().max(5e6)/g' "$BUNDLE" 2>/dev/null || true
echo "Server deployed + patches applied"

# ---------------------------------------------------------------------------
# Deploy pre-built client
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 3/5: Deploying pre-built client ==="
mkdir -p "$PRODUCTION_DIR/build/assets"
# Clean old asset hashes to avoid stale files
rm -f "$PRODUCTION_DIR/build/assets/index-"*.js "$PRODUCTION_DIR/build/assets/index-"*.css
rsync -a "$BUILT_DIR/client/" "$PRODUCTION_DIR/build/"

# Ensure story-video symlink
mkdir -p "$PRODUCTION_DIR/build/api" "$PRODUCTION_DIR/story-videos"
ln -sfn "$PRODUCTION_DIR/story-videos" "$PRODUCTION_DIR/build/api/story-video"
echo "Client deployed"

# ---------------------------------------------------------------------------
# Apply branding replacements to pre-built artifacts
# ---------------------------------------------------------------------------

if [ -n "$BRANDING_JSON" ] && [ -f "$BRANDING_JSON" ]; then
  echo ""
  echo "=== Step 3b: Applying branding replacements ==="

  # Read replacements from branding.json
  REPLACEMENTS=$(python3 -c "
import json
data = json.load(open('$BRANDING_JSON'))
for old, new in data.get('replacements', {}).items():
    print(f'{old}|||{new}')
" 2>/dev/null || true)

  if [ -n "$REPLACEMENTS" ]; then
    while IFS= read -r line; do
      OLD_STR="${line%%|||*}"
      NEW_STR="${line##*|||}"
      if [ -n "$OLD_STR" ] && [ -n "$NEW_STR" ]; then
        echo "  Replacing: $OLD_STR → $NEW_STR"

        # Replace in client build (JS/CSS/HTML files)
        find "$PRODUCTION_DIR/build" -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) \
          -exec sed -i "s|${OLD_STR}|${NEW_STR}|g" {} + 2>/dev/null || true

        # Replace in server bundle
        sed -i "s|${OLD_STR}|${NEW_STR}|g" "$PRODUCTION_DIR/.wasp/out/server/bundle/server.js" 2>/dev/null || true
      fi
    done <<< "$REPLACEMENTS"
    echo "Branding replacements applied"
  else
    echo "No replacements found in branding.json"
  fi

  # Restore protected static files (replace Vite-hashed versions too)
  PROTECTED_FILES=$(python3 -c "
import json
data = json.load(open('$BRANDING_JSON'))
for f in data.get('protectedFiles', []):
    print(f)
" 2>/dev/null || true)

  while IFS= read -r pf; do
    if [ -n "$pf" ] && [ -f "$SOURCE_DIR/$pf" ]; then
      case "$pf" in
        src/client/static/*)
          BUILT_NAME="${pf#src/client/static/}"
          BASE="${BUILT_NAME%.*}"
          EXT="${BUILT_NAME##*.}"
          # Replace the Vite-hashed version (e.g. logo-DKMjoG6-.png)
          for hashed in "$PRODUCTION_DIR/build/assets/${BASE}-"*".${EXT}"; do
            if [ -f "$hashed" ]; then
              cp "$SOURCE_DIR/$pf" "$hashed"
              echo "  Restored: $(basename "$hashed") ← $BUILT_NAME"
            fi
          done
          # Also copy to build root
          cp "$SOURCE_DIR/$pf" "$PRODUCTION_DIR/build/$BUILT_NAME" 2>/dev/null || true
          ;;
        public/*)
          BUILT_NAME="${pf#public/}"
          cp "$SOURCE_DIR/$pf" "$PRODUCTION_DIR/build/$BUILT_NAME" 2>/dev/null || true
          echo "  Restored: $BUILT_NAME"
          ;;
      esac
    fi
  done <<< "$PROTECTED_FILES"
  # Cache-bust: rename JS/CSS/logo so browsers re-download after branding changes
  echo ""
  echo "  Cache-busting assets..."
  CACHE_SUFFIX="$(date +%s)"
  JS_FILE=""
  for asset in "$PRODUCTION_DIR/build/assets/index-"*.js "$PRODUCTION_DIR/build/assets/index-"*.css; do
    if [ -f "$asset" ]; then
      DIR=$(dirname "$asset")
      OLDNAME=$(basename "$asset")
      EXT="${OLDNAME##*.}"
      NEWNAME="index-${APP_NAME,,}${CACHE_SUFFIX}.${EXT}"
      mv "$asset" "$DIR/$NEWNAME"
      sed -i "s|$OLDNAME|$NEWNAME|g" "$PRODUCTION_DIR/build/index.html"
      echo "  Renamed: $OLDNAME → $NEWNAME"
      if [ "$EXT" = "js" ]; then JS_FILE="$DIR/$NEWNAME"; fi
    fi
  done
  # Also cache-bust the logo PNG (browser caches it with immutable headers)
  if [ -n "$JS_FILE" ] && [ -f "$JS_FILE" ]; then
    OLD_LOGO=$(grep -oP 'logo-[A-Za-z0-9_-]+\.png' "$JS_FILE" | head -1)
    if [ -n "$OLD_LOGO" ] && [ -f "$PRODUCTION_DIR/build/assets/$OLD_LOGO" ]; then
      NEW_LOGO="logo-${APP_NAME,,}${CACHE_SUFFIX}.png"
      cp "$PRODUCTION_DIR/build/assets/$OLD_LOGO" "$PRODUCTION_DIR/build/assets/$NEW_LOGO"
      sed -i "s|$OLD_LOGO|$NEW_LOGO|g" "$JS_FILE"
      echo "  Renamed: $OLD_LOGO → $NEW_LOGO"
    fi
  fi

  # Fix OG/meta image tags in index.html to use the proxy endpoint
  # (nginx serves index.html as static, so meta tags must be correct on disk)
  # The /api/branding/og-image endpoint proxies S3 images and falls back to public-banner.webp
  DOMAIN=$(python3 -c "import json; print(json.load(open('$BRANDING_JSON')).get('domain', ''))" 2>/dev/null || true)
  if [ -n "$DOMAIN" ] && [ -f "$PRODUCTION_DIR/build/index.html" ]; then
    sed -i "s|content='https://${DOMAIN}/public-banner.webp'|content='https://${DOMAIN}/api/branding/og-image'|g" "$PRODUCTION_DIR/build/index.html"
    sed -i "s|content=\"https://${DOMAIN}/public-banner.webp\"|content=\"https://${DOMAIN}/api/branding/og-image\"|g" "$PRODUCTION_DIR/build/index.html"
    echo "  Fixed OG image meta tags → /api/branding/og-image"
  fi
else
  echo ""
  echo "=== Step 3b: No branding config — skipping replacements ==="
fi

# ---------------------------------------------------------------------------
# Run DB migrations
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 4/5: Syncing database schema ==="
mkdir -p "$PRODUCTION_DIR/.wasp/out/db"
cp "$BUILT_DIR/db/schema.prisma" "$PRODUCTION_DIR/.wasp/out/db/schema.prisma"

# Get DB URL from the instance's own .env
DB_URL=""
if [ -f "$PRODUCTION_DIR/.wasp/out/server/.env" ]; then
  DB_URL=$(grep ^DATABASE_URL "$PRODUCTION_DIR/.wasp/out/server/.env" | cut -d'"' -f2)
fi

if [ -n "$DB_URL" ]; then
  cd "$PRODUCTION_DIR/.wasp/out/db"
  DATABASE_URL="$DB_URL" npx prisma db push --schema=schema.prisma --accept-data-loss 2>&1 | tail -5
  echo "DB schema synced"

  # Seed branding defaults from branding.json (INSERT only — never overwrites user changes)
  if [ -n "$BRANDING_JSON" ] && [ -f "$BRANDING_JSON" ]; then
    python3 -c "
import json, subprocess, sys, os, uuid
from datetime import datetime

with open('$BRANDING_JSON') as f:
    data = json.load(f)

defaults = data.get('brandingDefaults', {})
if not defaults:
    sys.exit(0)

db_url = '$DB_URL'
now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')

sql_lines = []
for key, value in defaults.items():
    uid = str(uuid.uuid4())
    safe_val = value.replace(\"'\", \"''\")
    sql_lines.append(
        f\"INSERT INTO \\\"Setting\\\" (id, \\\"createdAt\\\", \\\"updatedAt\\\", key, value) \"
        f\"VALUES ('{uid}', '{now}', '{now}', '{key}', '{safe_val}') \"
        f\"ON CONFLICT (key) DO NOTHING;\"
    )

sql = '\n'.join(sql_lines)

env = os.environ.copy()
env['DATABASE_URL'] = db_url
result = subprocess.run(
    ['npx', 'prisma', 'db', 'execute', '--stdin', '--schema=schema.prisma'],
    input=sql, capture_output=True, text=True, env=env
)
if result.returncode == 0:
    print(f'Branding defaults seeded ({len(sql_lines)} keys, new only)')
else:
    print(f'WARNING: Branding seed failed: {result.stderr[:200]}')
" 2>/dev/null || echo "WARNING: Could not seed branding defaults"
  fi
else
  echo "WARNING: No DATABASE_URL found — skipping DB migration"
fi

# ---------------------------------------------------------------------------
# Restart PM2
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 5/5: Restarting application ==="

# Write completion marker BEFORE restart so the polling frontend can read it
# (PM2 restart kills the server process that serves the polling endpoint)
echo ""
echo "=== UPDATE COMPLETE ==="
echo "Successfully updated $APP_NAME to v$AVAILABLE_VERSION"

# Give the log file a moment to flush, then restart
sleep 2
pm2 restart "$PM2_NAME" 2>/dev/null || \
  pm2 start "node --enable-source-maps -r dotenv/config bundle/server.js" \
    --name "$PM2_NAME" \
    --cwd "$PRODUCTION_DIR/.wasp/out/server/"
pm2 save 2>/dev/null || true
