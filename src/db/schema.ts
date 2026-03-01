import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ── App Tables ──────────────────────────────────────────────────────────────

export const squads = sqliteTable("squads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  headerImage: text("header_image"),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const squadAdmins = sqliteTable("squad_admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  squadId: integer("squad_id")
    .notNull()
    .references(() => squads.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["owner", "admin"] }).notNull(),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const squadInvites = sqliteTable("squad_invites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  squadId: integer("squad_id")
    .notNull()
    .references(() => squads.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by").notNull(),
  expiresAt: integer("expires_at", { mode: "number" }).notNull(),
  acceptedAt: integer("accepted_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  squadId: integer("squad_id")
    .notNull()
    .references(() => squads.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  archivedAt: integer("archived_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const fixtures = sqliteTable("fixtures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  squadId: integer("squad_id")
    .notNull()
    .references(() => squads.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  opponent: text("opponent").notNull(),
  deadline: integer("deadline", { mode: "number" }).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const fixturePlayers = sqliteTable("fixture_players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fixtureId: integer("fixture_id")
    .notNull()
    .references(() => fixtures.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
});

export const votes = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fixtureId: integer("fixture_id")
    .notNull()
    .references(() => fixtures.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  voterName: text("voter_name").notNull(),
  voterToken: text("voter_token").notNull(),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
