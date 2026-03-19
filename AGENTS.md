# AGENTS.md

Guidelines for AI agents working on this codebase.

## Running commands

**Prefer running commands yourself.** Do not prompt the user to run commands in their terminal. When a task requires installs, builds, deploys, or remote operations (e.g. Fly.io), run them in the tool: use the shell with the permissions the command needs (e.g. `network`, `all` for Fly CLI or write access). Request elevated privileges when needed rather than asking the user to run the command.

## Project Overview

POTM is a "Player of the Match" voting app built with Astro (SSR) + SQLite + Drizzle ORM + Better Auth + Tailwind CSS v4.

## Tech Stack

- **Framework**: Astro 5 with `output: "server"` and `@astrojs/node` standalone adapter
- **Database**: SQLite via `better-sqlite3`, queried through Drizzle ORM
- **Auth**: Better Auth with Google OAuth. Auth tables (`user`, `session`, `account`, `verification`) are managed by Better Auth — do not modify them with Drizzle migrations
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin (not `@astrojs/tailwind`)
- **TypeScript**: Strict mode

## Key Conventions

### Forms & Interactivity

All forms use standard HTML form submissions with POST handling in Astro frontmatter. Zero client-side JS frameworks — only small inline `<script is:inline>` blocks for copy-to-clipboard and sign-in/sign-out.

### Database

- App tables are defined in `src/db/schema.ts` using Drizzle ORM. Better Auth's tables are NOT in the Drizzle schema — use raw SQL via the `sqlite` export from `src/db/index.ts` when joining with Better Auth tables (e.g. `user`).
- **Schema changes:** add a migration with `npx drizzle-kit generate`, then apply with `npm run db:migrate` (or `npx drizzle-kit migrate`). Migrations are tracked in `__drizzle_migrations` and only unapplied ones run. On Fly, startup runs `scripts/bootstrap-drizzle-migrations.js` (seeds the migrations table for DBs created with push), then `drizzle-kit migrate`, then `scripts/ensure-results-visible-at.js` (adds `fixtures.results_visible_at` if missing). Run Better Auth migrate on a new DB: `npx auth@latest migrate --config ./src/lib/auth.ts --yes`. Use `npm run db:push` only for local prototyping if needed.
- SQLite pragmas: `journal_mode = WAL`, `foreign_keys = ON`
- All timestamps are stored as integer (unix milliseconds)

### Authentication & Authorization

- `src/middleware.ts` populates `Astro.locals.user` on every request
- Protected pages check `Astro.locals.user` and redirect to `/login` if null
- Squad access control uses `requireSquadAdmin()` from `src/lib/squads.ts` which returns `{ squad, role }` or `null`
- Roles: `owner` (full control) and `admin` (can manage players/fixtures, cannot remove admins or delete squad)

### Routing

- Squad routes are under `src/pages/[squadSlug]/`
- **Single fixture URL**: `/[squadSlug]/fixture/[fixtureSlug]` — info when voting not open, vote form / thanks / results when voting open (by state). No separate `/vote` path. OG image at `/[squadSlug]/fixture/[fixtureSlug]/og`.
- System routes (`/`, `/about`, `/login`, `/dashboard`, `/new`, `/api`, `/uploads`) cannot collide with squad slugs because slugs always contain a UUID suffix

### Uploads

- Stored on disk in `data/uploads/` (gitignored)
- Served via `/uploads/[...path].ts` endpoint
- Validated server-side: JPEG, PNG, WebP only, 2MB max
- Path traversal is prevented in the upload endpoint

## Build & Run

```bash
npm install              # Install dependencies
npx drizzle-kit push     # Apply app schema to SQLite
npx auth@latest migrate --config ./src/lib/auth.ts --yes  # Create Better Auth tables (user, session, account, verification)
npx astro dev            # Dev server on :4321
npx astro build          # Production build
npx astro check          # Type checking
```

## File Organization

- `src/lib/` — Business logic (auth config, squad helpers, fixture queries, upload handling)
- `src/db/` — Schema and database connection
- `src/components/` — Reusable Astro components
- `src/layouts/` — Page layout wrapper
- `src/pages/` — File-based routing
- `scripts/` — Restore and Fly startup: `restore-to-fly.sh` (mirror:fly; uses checkpoint-db.js, validate-restored-db.js), `fly-start.sh` (Docker CMD; uses validate-restored-db.js, has-table.js, ensure-auth-tables.js, bootstrap-drizzle-migrations.js, drizzle-kit migrate, ensure-results-visible-at.js), `reassign-squad-admins-by-email.js` (one-off on server), `backup-fly-db.sh`, `setup-gcp.sh`

## Things to Watch Out For

- **Production data:** Fly startup (`scripts/fly-start.sh`) is additive-only: it never drops or truncates tables. Do not add startup steps that delete or overwrite existing DB data. For schema changes that might be destructive, back up first (e.g. `./scripts/backup-fly-db.sh`) or use Fly volume snapshots.
- **Restore and WAL:** Restore uploads a single SQLite file. If the local DB is in WAL mode, the main file alone can be inconsistent (recent data may be only in the `-wal` file). `restore-to-fly.sh` runs `scripts/checkpoint-db.js` first so the main file contains all data before upload; do not remove that step.
- **Fly scale-to-zero:** With `min_machines_running = 0`, scaling to zero destroys machines. Scaling back up creates new machines, which get new volumes by default, so existing volume data can be effectively "lost" (old volume may be unattached). Prefer `min_machines_running = 1` for production if you need to avoid that risk.
- Drizzle's `.where()` does NOT stack — use `and()` / `or()` to combine conditions
- Better Auth's sign-in and sign-out are POST endpoints, not GET
- **Voting**: `fixtures.votingOpenedAt` — when set, voting is open; `deadline` is optional until voting is opened, then required. Admins can close voting (set `votingOpenedAt` to null). Results are shown when `resultsVisibleAt` is set (admin clicks "Show results") or after the deadline when voting was open. Joint POTM: multiple players can tie for top votes; all get the POTM badge.
- **Fixture status**: `fixtures.status` is `scheduled` (default), `postponed`, or `cancelled`. Postponed/cancelled are treated the same in code (no voting, no results; show badge and message). UI shows the label "Postponed" or "Cancelled". Admins set status on the edit page; they can reschedule by editing date and setting status back to scheduled, or leave as-is and create a new fixture.
- The `potm_voter` cookie (UUID, 1-year) is the stable browser identifier for vote deduplication; `voted_{fixture_id}` is the per-fixture "already voted" flag
- Squad slugs have a human-readable prefix (from the name) and a short unique ID suffix; changing the squad name updates the prefix and redirects to the new URL; the ID stays the same
