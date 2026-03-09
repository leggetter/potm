# POTM — Player of the Match

A simple voting app for sports teams. After a match, share a link with your team and let everyone vote for their player of the match — no sign-up required for voters.

## Features

- **Squad management** — Create squads, add players, upload a header image
- **Multi-admin** — Invite others to help manage your squad via shareable invite links
- **Fixture creation** — Set up matches with opponent name, player selection, optional details (markdown), and optional deadline. You can open voting when creating or later from the fixture page.
- **Voting** — Admins open voting (and set a deadline) when ready. One link per fixture: before voting opens visitors see fixture info; when open they can vote (name + player pick). Cookie-based deduplication prevents double votes. Admins can close voting early; results stay hidden until the admin clicks "Show results" or the deadline passes.
- **Results** — Admins see full breakdown (vote counts, voter names, bar chart) at any time. Public sees winner(s) after the deadline or when the admin has shown results. Joint POTM is supported (multiple players can tie for top votes).

## Tech Stack

- [Astro](https://astro.build/) (SSR, server output)
- [SQLite](https://www.sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/) (Google OAuth)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Node.js](https://nodejs.org/) adapter (`@astrojs/node` standalone)

## Getting Started

### Prerequisites

- Node.js 20+
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) (for the setup script)

### Setup

```bash
# Install dependencies
npm install

# Create GCP project + Google OAuth credentials (interactive)
./scripts/setup-gcp.sh

# Or reuse an existing GCP project
./scripts/setup-gcp.sh --project your-project-id

# Create Better Auth tables first (user, session, account, verification)
npx auth@latest migrate --config ./src/lib/auth.ts --yes

# Apply schema (app tables). For existing DBs with schema changes, run migrations in drizzle/ if needed.
npx drizzle-kit push

# Start the dev server
npx astro dev
```

For schema changes, edit `src/db/schema.ts` and run `npx drizzle-kit push` again.

The setup script will:
1. Create a GCP project and enable the People API
2. Walk you through creating OAuth clients for local dev and production
3. Write `.env` (local) and `.env.production` with your credentials
4. Print the `fly secrets set` command for production deployment

Run `./scripts/setup-gcp.sh --help` for all options (`--prod-url`, `--dev-url`, `--support-email`).

### Environment Variables

Local dev uses `.env`; production uses `.env.production` (and on Fly.io, secrets are set from that file).

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `BETTER_AUTH_SECRET` | Random secret for session signing |
| `BETTER_AUTH_URL` | App base URL (e.g. `http://localhost:4321` locally; `https://potm-voting.fly.dev` in production) |
| `DB_PATH` | Optional. SQLite path (default `./data/potm.db`; on Fly set to `/data/potm.db`) |
| `UPLOAD_DIR` | Optional. Uploads directory (default `./data/uploads`; on Fly set to `/data/uploads` so uploads live on the volume) |
| `POSTHOG_API_KEY` | Optional. PostHog project API key (server-side). If unset, server-side capture is a no-op. On Fly, set via `fly secrets set POSTHOG_API_KEY=phx_...` |
| `POSTHOG_HOST` | Optional. PostHog host (default `https://eu.i.posthog.com`). Set if using a different region or self-hosted. |
| `PUBLIC_POSTHOG_KEY` | Optional. PostHog public key for client-side (browser) analytics. Inlined at build time. |
| `PUBLIC_POSTHOG_HOST` | Optional. PostHog host for client (default typically same as server). |

## Project Structure

```
src/
  db/
    schema.ts          # Drizzle table definitions
    index.ts           # DB connection (WAL mode, foreign keys)
  lib/
    auth.ts            # Better Auth server config
    auth-client.ts     # Better Auth browser client
    squads.ts          # Squad access control helpers
    fixtures.ts        # Fixture creation and results queries
    uploads.ts         # Image upload validation and storage
    description.ts     # Markdown description rendering
  layouts/
    BaseLayout.astro   # HTML shell + Tailwind
  components/
    NavBar.astro       # Top nav with auth state
    SquadHeader.astro  # Squad header image + name
    ResultsDisplay.astro # Vote results bar chart
    DescriptionEditor.astro # Markdown toolbar for fixture details
  pages/
    index.astro                          # Landing page
    login.astro                          # Google sign-in
    about.astro                          # About / how-to
    dashboard/index.astro                # User's squads
    new.astro                            # Create squad
    api/auth/[...all].ts                 # Better Auth handler
    uploads/[...path].ts                 # Serve uploaded images
    [squadSlug]/
      index.astro                        # Squad home (players + fixtures)
      settings.astro                     # Edit squad
      admins/
        index.astro                      # Manage admins
        invite/[token].astro             # Accept invite
      fixture/
        new.astro                        # Create fixture
        [fixtureSlug]/
          index.astro                    # Single page: info / vote / results (by state)
          og.ts                          # OG image for sharing
          edit.astro                     # Edit fixture (admin)
      player/
        [playerId]/
          edit.astro                     # Edit player name (admin)
data/                                    # Gitignored: DB + uploads
  potm.db
  uploads/
```

## Deployment (Fly.io)

The app includes a `Dockerfile` and `fly.toml` for deployment to [Fly.io](https://fly.io/).

Use **`.env.production`** for production config. The setup script writes it when you create OAuth clients; it should have `BETTER_AUTH_URL` set to your production URL (e.g. `https://potm-voting.fly.dev`).

```bash
# Create the app and volume (add --org YOUR_ORG if needed)
fly apps create potm-voting
fly volumes create potm_data --region lhr --size 1

# Sync secrets from .env.production (sets GOOGLE_*, BETTER_AUTH_*, and optional POSTHOG_* if present).
./scripts/sync-fly-secrets.sh

# Or set them manually (DB_PATH and UPLOAD_DIR are already in fly.toml [env]):
# fly secrets set GOOGLE_CLIENT_ID="$(grep GOOGLE_CLIENT_ID .env.production | cut -d= -f2-)" ...

# Check what's on Fly (should match .env.production for auth vars):
# fly secrets list -a potm-voting

# Deploy
fly deploy
```

The SQLite database and uploaded images are stored on a persistent volume mounted at `/data`.

**Data persistence:** The startup script is additive-only: it never drops or truncates tables. It (1) creates Better Auth tables if missing (`CREATE TABLE IF NOT EXISTS`), (2) bootstraps `__drizzle_migrations` for DBs that were created with push (so migrate can skip already-applied migrations), (3) runs `drizzle-kit migrate` so new migrations run automatically and re-runs are no-ops, and (4) runs `ensure-results-visible-at.js` to add the `results_visible_at` column if it was missed. Existing users, sessions, squads, and votes are preserved across deploys and restarts. The only way production data is replaced is if you explicitly upload a file as `potm.db.restored` and restart.

**Backups:** To avoid losing auth or app data, back up the volume periodically.

- **Quick backup (DB file):** From your machine, run `./scripts/backup-fly-db.sh` (or `./scripts/backup-fly-db.sh potm-voting`). This downloads `/data/potm.db` to `backups/potm-YYYYMMDD-HHMMSS.db`. The app can stay running; the copy may be a few seconds behind if the DB is busy.
- **Point-in-time volume snapshot (Fly):** For a consistent snapshot of the whole volume (DB + uploads), use [Fly volume snapshots](https://fly.io/docs/reference/volumes/#creating-a-volume-snapshot): `fly volumes snapshots create vol_XXXXX -a potm-voting` (get the volume ID from `fly volumes list -a potm-voting`). You can create a new volume from a snapshot if you ever need to restore.

**Mirroring local data to Fly (restore):** To make the deployed app use your local DB, run **on your machine** (where `data/potm.db` is your source of truth), not from CI:

```bash
npm run mirror:fly                   # default app: potm-voting
./scripts/restore-to-fly.sh my-app   # or pass app name
```

The script checkpoints the local DB (so one file has all data), validates it (user, squads, verification tables), uploads it to Fly as `potm.db.restored`, and syncs **data/uploads** to **/data/uploads** on the server (so squad header images and other uploads referenced in the DB are present). Then it restarts the app. On startup the app validates the uploaded file; if incomplete it is rejected and the existing DB is unchanged. If valid, the current DB is backed up to `potm.db.before-restore` and the restored file is used. After restore, run the one-off **reassign-by-email** script (see below) so squad admins are reassigned from restored user ids to the user with the same email in the current auth.

**One-off: reassign squad admins by email** (after a restore, or when squads have no active admin):

- Reassigns every `squad_admins` row so the referenced user is the "canonical" user for that email (same-email users are consolidated: prefer the one with a session, else latest `updatedAt`). Run once on the **deployed** DB (e.g. via `fly ssh console`).
- Squads with no admin in the `user` table (orphans) can be assigned to a user by email by setting `ORPHAN_SQUAD_OWNER_EMAIL`.

```bash
# From your machine (run on the Fly app's filesystem via SSH)
fly ssh console -a potm-voting -C "sh -c 'DB_PATH=/data/potm.db node /app/scripts/reassign-squad-admins-by-email.js'"

# Assign orphan squads to a specific email
fly ssh console -a potm-voting -C "sh -c 'ORPHAN_SQUAD_OWNER_EMAIL=phil@leggetter.co.uk DB_PATH=/data/potm.db node /app/scripts/reassign-squad-admins-by-email.js'"
```

The script is included in the Docker image, so deploy first (`fly deploy`) if you added it recently.

**If you get 403 when signing in:** ensure (1) `BETTER_AUTH_URL` is set to your app URL with no trailing slash (e.g. `https://potm-voting.fly.dev`), and (2) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) your OAuth client has this authorized redirect URI: `https://YOUR_APP_URL/api/auth/callback/google`.

## License

MIT
