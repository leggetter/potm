#!/bin/sh
set -e
# If a restored DB was uploaded, validate it (must have user, squads, verification tables) then use it.
RESTORED="${DB_PATH}.restored"
if [ -n "$DB_PATH" ] && [ -f "$RESTORED" ]; then
  if RESTORED_PATH="$RESTORED" DB_PATH="$DB_PATH" node /app/scripts/validate-restored-db.js 2>/dev/null; then
    if [ -f "$DB_PATH" ]; then
      cp -f "$DB_PATH" "${DB_PATH}.before-restore" 2>/dev/null || true
    fi
    rm -f "$DB_PATH" "${DB_PATH}-shm" "${DB_PATH}-wal"
    mv "$RESTORED" "$DB_PATH"
  else
    mv "$RESTORED" "${RESTORED}.rejected" 2>/dev/null || true
  fi
fi
if [ -n "$DB_PATH" ] && [ -f "$DB_PATH" ]; then
  # Ensure Better Auth tables exist (sign-in fails with "no such table: verification" otherwise).
  if ! DB_PATH="$DB_PATH" TABLE_NAME=verification node /app/scripts/has-table.js 2>/dev/null; then
    DB_PATH="$DB_PATH" node /app/scripts/ensure-auth-tables.js 2>/dev/null || true
  fi
  # Run Drizzle migrations (idempotent: only unapplied migrations run).
  # Bootstrap seeds __drizzle_migrations for DBs that were created with push so migrate skips them.
  DB_PATH="$DB_PATH" node /app/scripts/bootstrap-drizzle-migrations.js 2>/dev/null || true
  DB_PATH="$DB_PATH" npx drizzle-kit migrate
fi
exec node dist/server/entry.mjs
