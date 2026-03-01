#!/usr/bin/env node
/**
 * One-off admin script: reassign squad admins by email so that after a DB restore,
 * squads owned by "old" user ids (e.g. local) are reassigned to the user with the
 * same email in the current DB (e.g. production).
 *
 * - For each squad_admin row, we look up the referenced user's email, then pick
 *   the "canonical" user for that email (one with a session if any, else latest
 *   updatedAt) and update squad_admin to that user id if different.
 * - Optionally: squads with no admins (or only admins whose user_id is not in the
 *   user table) can be assigned to a user by email. Set ORPHAN_SQUAD_OWNER_EMAIL
 *   to that email; the script will add that user as owner for every squad that
 *   has no admin in the user table.
 *
 * Usage (run from project root, or set DB_PATH):
 *   DB_PATH=/data/potm.db node scripts/reassign-squad-admins-by-email.js
 *   ORPHAN_SQUAD_OWNER_EMAIL=phil@example.com DB_PATH=/data/potm.db node scripts/reassign-squad-admins-by-email.js
 */
const Database = require("better-sqlite3");
const path = process.env.DB_PATH || "./data/potm.db";

const orphanOwnerEmail = process.env.ORPHAN_SQUAD_OWNER_EMAIL || null;

let db;
try {
  db = new Database(path, { readonly: false });
} catch (e) {
  console.error("Failed to open DB at", path, e.message);
  process.exit(1);
}

// Better Auth user table: id, email, updatedAt (camelCase in schema)
const users = db.prepare("SELECT id, email, updatedAt FROM user").all();
const sessions = db.prepare("SELECT userId FROM session").all();
const sessionUserIds = new Set(sessions.map((r) => r.userId));

// For each email, pick canonical user: one with a session if any, else latest updatedAt
const userIdToEmail = new Map(users.map((u) => [u.id, u.email]));
const byEmail = new Map();
for (const u of users) {
  if (!byEmail.has(u.email)) byEmail.set(u.email, []);
  byEmail.get(u.email).push({
    id: u.id,
    updatedAt: u.updatedAt,
    hasSession: sessionUserIds.has(u.id),
  });
}
const emailToCanonicalId = new Map();
for (const [email, list] of byEmail) {
  list.sort((a, b) => {
    if (a.hasSession !== b.hasSession) return a.hasSession ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
  emailToCanonicalId.set(email, list[0].id);
}

// Reassign squad_admins by email
const adminRows = db.prepare("SELECT id, squad_id, user_id, role FROM squad_admins").all();
let updated = 0;
const updateStmt = db.prepare("UPDATE squad_admins SET user_id = ? WHERE id = ?");
for (const row of adminRows) {
  const email = userIdToEmail.get(row.user_id);
  if (email === undefined) continue; // user no longer in user table
  const canonicalId = emailToCanonicalId.get(email);
  if (canonicalId === undefined || canonicalId === row.user_id) continue;
  updateStmt.run(canonicalId, row.id);
  updated++;
}
console.log("Reassigned", updated, "squad_admin row(s) by email.");

// Orphan squads: no squad_admin row whose user_id exists in the user table
const squadIdsWithAdminInUserTable = new Set(
  db
    .prepare(
      "SELECT DISTINCT squad_id FROM squad_admins WHERE user_id IN (SELECT id FROM user)"
    )
    .all()
    .map((r) => r.squad_id)
);
const allSquadIds = db.prepare("SELECT id FROM squads").all().map((r) => r.id);
const orphanSquadIds = allSquadIds.filter((id) => !squadIdsWithAdminInUserTable.has(id));

if (orphanSquadIds.length > 0) {
  if (orphanOwnerEmail) {
    const ownerUser = db.prepare("SELECT id FROM user WHERE email = ?").get(orphanOwnerEmail);
    if (!ownerUser) {
      console.error("No user found with email", orphanOwnerEmail, "- skipping orphan squad assignment.");
    } else {
      const now = Date.now();
      const deleteStmt = db.prepare("DELETE FROM squad_admins WHERE squad_id = ?");
      const insertStmt = db.prepare(
        "INSERT INTO squad_admins (squad_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)"
      );
      for (const squadId of orphanSquadIds) {
        deleteStmt.run(squadId);
        insertStmt.run(squadId, ownerUser.id, now);
      }
      console.log("Assigned", orphanSquadIds.length, "orphan squad(s) to", orphanOwnerEmail);
    }
  } else {
    console.log(
      "Found",
      orphanSquadIds.length,
      "squad(s) with no admin in user table. Set ORPHAN_SQUAD_OWNER_EMAIL to assign an owner by email."
    );
  }
}

db.close();
