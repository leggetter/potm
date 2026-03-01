#!/usr/bin/env node
/**
 * Exit 0 if path (RESTORED_PATH or DB_PATH + ".restored") has Better Auth and app
 * tables (user, squads, verification). On success prints "squads_count users_count"
 * to stdout for scripting. Exit 1 otherwise (incomplete backup - do not use for restore).
 */
const Database = require("better-sqlite3");
const path = process.env.RESTORED_PATH || (process.env.DB_PATH && process.env.DB_PATH + ".restored") || "";

if (!path) {
  process.exit(1);
}

let db;
try {
  db = new Database(path, { readonly: true });
} catch (_) {
  process.exit(1);
}

try {
  const hasUser = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='user'").get();
  const hasSquads = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='squads'").get();
  const hasVerification = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='verification'").get();
  if (!hasUser || !hasSquads || !hasVerification) {
    process.exit(1);
  }
  const squads = db.prepare("SELECT COUNT(*) AS n FROM squads").get().n;
  const users = db.prepare("SELECT COUNT(*) AS n FROM user").get().n;
  console.log(squads, users);
  process.exit(0);
} finally {
  db.close();
}
