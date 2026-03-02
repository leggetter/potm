#!/usr/bin/env node
/**
 * Idempotent: add fixtures.results_visible_at if missing (e.g. migration 0006 didn't run).
 * Run with DB_PATH env. Exits 0.
 */
const Database = require("better-sqlite3");
const dbPath = process.env.DB_PATH || "";

if (!dbPath) {
  console.error("DB_PATH is required");
  process.exit(1);
}

let db;
try {
  db = new Database(dbPath);
} catch (e) {
  console.error("Cannot open DB:", e.message);
  process.exit(1);
}

try {
  const cols = db.prepare("PRAGMA table_info(fixtures)").all();
  const hasColumn = cols.some((c) => c.name === "results_visible_at");
  if (!hasColumn) {
    db.exec("ALTER TABLE fixtures ADD COLUMN results_visible_at integer");
    console.log("Added fixtures.results_visible_at column");
  }
} finally {
  db.close();
}
