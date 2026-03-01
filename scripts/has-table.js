#!/usr/bin/env node
/**
 * Exit 0 if DB (DB_PATH env) contains a table (TABLE_NAME env or first arg).
 * Exit 1 otherwise. Used by fly-start.sh to decide whether to run ensure-auth-tables or drizzle-kit push.
 */
const Database = require("better-sqlite3");
const path = process.env.DB_PATH || "";
const table = process.env.TABLE_NAME || process.argv[2] || "";

if (!path || !table) {
  process.exit(1);
}

let db;
try {
  db = new Database(path, { readonly: true });
} catch (_) {
  process.exit(1);
}

try {
  const row = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
  ).get(table);
  process.exit(row ? 0 : 1);
} finally {
  db.close();
}
