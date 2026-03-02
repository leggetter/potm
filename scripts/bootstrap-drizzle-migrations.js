#!/usr/bin/env node
/**
 * One-time bootstrap for DBs that were created with `drizzle-kit push` (or manual setup)
 * and have no __drizzle_migrations records. Seeds __drizzle_migrations so that
 * `drizzle-kit migrate` will skip already-applied migrations instead of failing.
 *
 * Run with DB_PATH env. Only inserts when:
 * - __drizzle_migrations table exists and has 0 rows
 * - squads table exists (indicates app schema already present)
 *
 * Uses the same hash (SHA256 of migration file content) as Drizzle's migrator.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || "";
const migrationsFolder = path.resolve(process.env.MIGRATIONS_FOLDER || path.join(process.cwd(), "drizzle"));

if (!dbPath) {
  console.error("DB_PATH is required");
  process.exit(1);
}

const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
if (!fs.existsSync(journalPath)) {
  console.error("Journal not found:", journalPath);
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
  const hasSquads = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='squads'"
  ).get();
  const migrationsTable = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
  ).get();
  const count = migrationsTable
    ? db.prepare("SELECT count(*) as n FROM __drizzle_migrations").get().n
    : 0;

  if (!hasSquads || count > 0) {
    process.exit(0);
  }

  if (!migrationsTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER
      )
    `);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  // Seed all but the last migration so the latest one is always run by migrate.
  // (Existing DBs from push have older schema; we must not mark the newest migration as applied.)
  const toSeed = journal.entries.slice(0, -1);
  if (toSeed.length === 0) {
    process.exit(0);
  }
  const now = Date.now();
  const insert = db.prepare(
    "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)"
  );

  for (const entry of toSeed) {
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlPath)) {
      console.error("Migration file not found:", sqlPath);
      process.exit(1);
    }
    const query = fs.readFileSync(sqlPath, "utf8");
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    insert.run(hash, now);
  }

  console.log("Bootstrapped __drizzle_migrations with", journal.entries.length, "entries");
} finally {
  db.close();
}
