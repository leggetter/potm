# AGENTS.md

Guidelines for AI agents working on this codebase.

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

- All tables (app + Better Auth) are defined in `src/db/schema.ts`. Auth tables (`user`, `session`, `account`, `verification`) are managed by Better Auth at runtime but included in the schema so `drizzle-kit push` sees them and does not drop them.
- Use raw SQL via the `sqlite` export from `src/db/index.ts` when joining with Better Auth tables (e.g. `user`).
- **Schema changes:** run `npx drizzle-kit push` (or `npm run db:push`). Run Better Auth migrate first on a new DB: `npx auth@latest migrate --config ./src/lib/auth.ts --yes`.
- SQLite pragmas: `journal_mode = WAL`, `foreign_keys = ON`
- All timestamps are stored as integer (unix milliseconds). Auth tables use the same; Better Auth creates them with compatible types.
- Optional: migrations in `drizzle/` can be generated with `npx drizzle-kit generate` for versioned SQL; push is the primary workflow. For existing DBs that had nullable `game_date`, run `sqlite3 data/potm.db < drizzle/0002_fixture_game_date_required.sql` once before push.

### Authentication & Authorization

- `src/middleware.ts` populates `Astro.locals.user` on every request
- Protected pages check `Astro.locals.user` and redirect to `/login` if null
- Squad access control uses `requireSquadAdmin()` from `src/lib/squads.ts` which returns `{ squad, role }` or `null`
- Roles: `owner` (full control) and `admin` (can manage players/fixtures, cannot remove admins or delete squad)

### Routing

- Squad routes are under `src/pages/[squadSlug]/`
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

## Things to Watch Out For

- Drizzle's `.where()` does NOT stack — use `and()` / `or()` to combine conditions
- Better Auth's sign-in and sign-out are POST endpoints, not GET
- The `potm_voter` cookie (UUID, 1-year) is the stable browser identifier for vote deduplication; `voted_{fixture_id}` is the per-fixture "already voted" flag
- Squad slugs are permanent — changing the squad name does not change the slug
