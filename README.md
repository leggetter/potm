# POTM — Player of the Match

A simple voting app for sports teams. After a match, share a link with your team and let everyone vote for their player of the match — no sign-up required for voters.

## Features

- **Squad management** — Create squads, add players, upload a header image
- **Multi-admin** — Invite others to help manage your squad via shareable invite links
- **Fixture creation** — Set up matches with opponent name, player selection, and voting deadline
- **Public voting** — Anyone with the link can vote (name + player pick). Cookie-based deduplication prevents double votes
- **Results** — Admins see full breakdown (vote counts, voter names, bar chart) at any time. Public sees winner(s) only after the deadline

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

# Apply schema (app + auth tables; safe to run anytime)
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

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `BETTER_AUTH_SECRET` | Random secret for session signing |
| `BETTER_AUTH_URL` | App base URL (e.g. `http://localhost:4321`) |

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
  layouts/
    BaseLayout.astro   # HTML shell + Tailwind
  components/
    NavBar.astro       # Top nav with auth state
    SquadHeader.astro  # Squad header image + name
    ResultsDisplay.astro # Vote results bar chart
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
          index.astro                    # Admin results view
          vote.astro                     # Public voting page
data/                                    # Gitignored: DB + uploads
  potm.db
  uploads/
```

## Deployment (Fly.io)

The app includes a `Dockerfile` and `fly.toml` for deployment to [Fly.io](https://fly.io/).

```bash
# Create the app and volume
fly apps create potm-voting
fly volumes create potm_data --region lhr --size 1

# Set secrets
fly secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... BETTER_AUTH_SECRET=... BETTER_AUTH_URL=https://potm-voting.fly.dev

# Deploy
fly deploy
```

The SQLite database and uploaded images are stored on a persistent volume mounted at `/data`.

## License

MIT
