#!/usr/bin/env sh
# Push local data/potm.db to Fly and restart. Run this on your machine (where your real DB lives).
# Usage: ./scripts/restore-to-fly.sh [app-name]
set -e
APP="${1:-potm-voting}"
DB="data/potm.db"

if [ ! -f "$DB" ]; then
  echo "Error: $DB not found. Run this from the project root where data/potm.db exists."
  exit 1
fi

echo "Checkpointing local $DB (so a single file has all data) ..."
DB_PATH="$DB" node scripts/checkpoint-db.js

echo "Validating local $DB ..."
STATS=$(RESTORED_PATH="$DB" node scripts/validate-restored-db.js 2>/dev/null) || true
if [ -z "$STATS" ]; then
  echo "Validation failed: $DB must contain user, squads, and verification tables. Fix your local DB."
  exit 1
fi
read -r SQUADS USERS << EOF
$STATS
EOF
echo "  OK. Squads: $SQUADS, Users: $USERS"

echo "Uploading to Fly as /data/potm.db.restored ..."
fly ssh console -a "$APP" -C "rm -f /data/potm.db.restored" 2>/dev/null || true
fly ssh sftp put "$DB" /data/potm.db.restored -a "$APP"

if [ -d "data/uploads" ]; then
  echo "Uploading data/uploads to Fly /data/uploads ..."
  TMP=$(mktemp 2>/dev/null || echo "/tmp/potm-uploads-$$")
  rm -f "$TMP"
  TARBALL="${TMP}.tar.gz"
  tar -czf "$TARBALL" -C data uploads
  fly ssh sftp put "$TARBALL" /data/potm-uploads.tar.gz -a "$APP"
  fly ssh console -a "$APP" -C "sh -c 'cd /data && rm -rf uploads && mkdir -p uploads && tar -xzf potm-uploads.tar.gz && rm -f potm-uploads.tar.gz'"
  rm -f "$TARBALL"
fi

echo "Restarting app so it picks up the restored DB ..."
MACHINE=$(fly machine list -a "$APP" -q | head -1 | awk '{print $1}')
if [ -z "$MACHINE" ]; then
  echo "Error: No machine found. Start the app first (fly scale count 1 -a $APP --yes)."
  exit 1
fi
fly machine restart "$MACHINE" -a "$APP"

echo "Done. After the app restarts, sign out and sign in at https://${APP}.fly.dev so your session matches the restored DB. Then run the reassign-by-email script if needed (see README)."
