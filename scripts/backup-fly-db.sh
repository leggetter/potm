#!/usr/bin/env sh
# Backup the production SQLite DB from Fly to local backups/ (additive; never overwrites production).
# Usage: ./scripts/backup-fly-db.sh [app-name]
# Requires: flyctl, app running with volume at /data/potm.db
set -e
APP="${1:-potm-voting}"
mkdir -p backups
FILE="backups/potm-$(date +%Y%m%d-%H%M%S).db"
echo "Backing up to $FILE ..."
fly ssh sftp get /data/potm.db "$FILE" -a "$APP"
echo "Done. Backup: $FILE"
