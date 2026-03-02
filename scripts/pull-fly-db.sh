#!/usr/bin/env sh
# Pull the production SQLite DB from Fly into local data/potm.db (overwrites local).
# Usage: ./scripts/pull-fly-db.sh [app-name]
# Requires: flyctl, app with volume at /data/potm.db (starts VM if scaled to zero)
set -e
APP="${1:-potm-voting}"
mkdir -p data backups

if [ -f data/potm.db ]; then
  BACKUP="backups/potm-local-$(date +%Y%m%d-%H%M%S).db"
  cp data/potm.db "$BACKUP"
  echo "Backed up local DB to $BACKUP"
fi

# Start a VM if none running (e.g. scale-to-zero)
if ! fly status -a "$APP" 2>/dev/null | grep -q "started"; then
  echo "No VM running; starting one..."
  fly scale count 1 -a "$APP"
  echo "Waiting for VM to be ready..."
  sleep 20
fi

# Checkpoint DB on server so main file has all data (WAL is not downloaded)
echo "Checkpointing DB on server..."
fly ssh console -a "$APP" -C "sh -c 'DB_PATH=/data/potm.db node /app/scripts/checkpoint-db.js'" 2>/dev/null || true

TMP="data/potm.db.from-fly"
fly ssh sftp get /data/potm.db "$TMP" -a "$APP"
mv "$TMP" data/potm.db
echo "Local DB is now a copy of $APP production."

