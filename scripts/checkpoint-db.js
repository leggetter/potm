#!/usr/bin/env node
/**
 * Checkpoint the SQLite DB at DB_PATH so all WAL data is in the main file.
 * Use before copying/uploading the DB so the single file is consistent.
 */
const Database = require("better-sqlite3");
const path = process.env.DB_PATH || "./data/potm.db";

const db = new Database(path);
db.pragma("wal_checkpoint(TRUNCATE)");
db.close();
