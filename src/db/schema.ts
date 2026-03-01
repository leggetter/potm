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
  description: text("description"),
  gameDate: integer("game_date", { mode: "number" }).notNull(),
  deadline: integer("deadline", { mode: "number" }),
  votingOpenedAt: integer("voting_opened_at", { mode: "number" }),
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

// ── Better Auth tables (managed by Better Auth CLI; included here so Drizzle push does not drop them) ──

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "number" }).notNull(),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "number" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "number" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "number" }).notNull(),
  token: text("token").notNull(),
  createdAt: integer("createdAt", { mode: "number" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "number" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "number" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "number" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "number" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "number" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "number" }).notNull(),
  createdAt: integer("createdAt", { mode: "number" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "number" }).notNull(),
});
