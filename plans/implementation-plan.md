# POTM Voting App - Implementation Plan

## Context

Build a "Player of the Match" voting application from scratch in an empty repository. The app lets team managers create accounts, manage squads of players, and create fixtures with shareable POTM voting links. Anyone with the link can vote for their player of the match — no login required, just enter a name. Votes are deduplicated via cookies and results are visible to admins always, and publicly after a deadline.

**Tech stack:** Astro (SSR) + SQLite (better-sqlite3 + Drizzle ORM) + TypeScript + Tailwind CSS v4

**Auth:** Google sign-in via Better Auth (handles OAuth, sessions, user management out of the box).

**Design:** Mobile-first responsive. All layouts designed for small screens first, scaling up with Tailwind breakpoints (`sm:`, `md:`, `lg:`). Public voting page especially must be thumb-friendly — large tap targets, minimal scrolling.

## Database Schema

Better Auth manages its own tables (`user`, `session`, `account`, `verification`). We define the following app tables in `src/db/schema.ts`:

| Table | Key Columns | Notes |
|---|---|---|
| `squads` | id, slug (unique), name, description (nullable), header_image (nullable), created_at | slug format: `{name-slugified}-{short-uuid}`, e.g., `sunday-league-fc-a1b2c3` |
| `squad_admins` | id, squad_id → squads, user_id → user (Better Auth), role ('owner' or 'admin'), created_at | Multi-admin support. Owner = creator. (unique on squad+user) |
| `squad_invites` | id, squad_id → squads, email, token (UUID, unique), invited_by → user, expires_at, accepted_at (nullable), created_at | Pending admin invitations |
| `players` | id, squad_id → squads, name, archived_at (nullable), created_at | Soft-delete via archived_at |
| `fixtures` | id, squad_id → squads, slug (unique within squad), opponent, deadline, created_by → user, created_at | A fixture/match that includes a POTM vote. Slug: `vs-{opponent-slugified}-{short-id}` |
| `fixture_players` | id, fixture_id → fixtures, player_id → players | Which players were in this fixture (unique on fixture+player) |
| `votes` | id, fixture_id → fixtures, player_id → players, voter_name, voter_token, created_at | Individual POTM votes (unique on fixture+voter_token) |

All timestamps stored as integer (unix ms). SQLite pragmas: `journal_mode = WAL`, `foreign_keys = ON`.

## Routes

All squad routes are nested under the squad's slug. This gives each squad a branded, shareable URL space.

| Route | Auth | Purpose |
|---|---|---|
| `/` | No | Landing page |
| `/login` | No | "Sign in with Google" button |
| `/api/auth/[...all]` | No | Better Auth catch-all handler (OAuth flow, session management) |
| `/dashboard` | Yes | Overview: list of user's squads, recent fixtures |
| `/new` | Yes | Create a new squad |
| `/{squad-slug}` | Yes | Squad home: player list, recent fixtures, squad header |
| `/{squad-slug}/settings` | Yes | Edit squad name/description/header image |
| `/{squad-slug}/admins` | Yes (admin+) | Manage admins: list, invite by email. Owner can also remove admins. |
| `/{squad-slug}/admins/invite/{token}` | Yes | Accept an admin invitation |
| `/{squad-slug}/fixture/new` | Yes | Create new fixture: opponent, pick players, set voting deadline |
| `/{squad-slug}/fixture/{fixture-slug}` | Yes | Admin view of fixture + POTM results (always visible to admins) |
| `/{squad-slug}/fixture/{fixture-slug}/vote` | No | **Public** POTM voting page + results after deadline |
| `/about` | No | About page: overview, how-to-use instructions, GitHub repo link |
| `/uploads/{...path}` | No | Serve uploaded squad header images |

System routes (`/`, `/about`, `/login`, `/dashboard`, `/new`, `/api`, `/uploads`) are reserved — squad slugs cannot collide because they always contain a UUID suffix.

All forms use standard HTML form submissions with POST handling in Astro frontmatter. Zero client-side JS except small inline scripts (copy link, etc.).

## Key Implementation Details

### Authentication — Better Auth
- Better Auth handles everything: Google OAuth flow, user creation, session management, cookies
- Configure with SQLite adapter (via Drizzle) and Google provider
- Astro middleware: Better Auth provides session validation; we populate `Astro.locals.user` from it
- Protected pages check `Astro.locals.user` and redirect to `/login` if null
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- Better Auth's API routes are mounted at `/api/auth/[...all]`
- First Google sign-in auto-creates the user (no separate registration)

### Squad Customisation (`/{squad-slug}/settings`)
- Edit form: name (required), description (optional textarea), header image (optional file upload)
- Changing the name does NOT change the slug (slug is permanent once created)
- Header images stored on disk in `data/uploads/` directory (gitignored), filename: `squad-{id}-{timestamp}.{ext}`
- DB stores relative path in `header_image` column
- Images served via Astro endpoint at `/uploads/{...path}`
- Accepted formats: JPEG, PNG, WebP. Max size: 2MB. Validated server-side.
- **Upload guidance** shown on the form: "Recommended: 1200x400px landscape image (3:1 ratio). JPEG, PNG, or WebP, max 2MB." No hard dimension enforcement — images are displayed with `object-cover` CSS so any aspect ratio works, but the 3:1 landscape ratio looks best in the header slot.
- Header image displayed on the squad page and on the public voting page

### Multi-Admin & Invitations (`/{squad-slug}/admins`)
- When a squad is created, `squad_admins` row inserted with role `owner`
- Both owners and admins can invite new admins by email → creates `squad_invites` row with UUID token, 7-day expiry
- Invite URL displayed for the inviter to copy/share: `/{squad-slug}/admins/invite/{token}` (no email sending in MVP)
- Invitee visits URL → must be logged in (redirect to `/login?redirect=...` if not) → email must match → confirm page → POST accepts → `squad_admins` row created
- **Owner**: everything — edit squad, manage players, invite/remove admins, create fixtures, delete squad
- **Admin**: edit squad, manage players, invite new admins, create fixtures. Cannot remove other admins or delete squad.
- `squad_admins` table is the source of truth for all access control
- Owner can remove admins (not themselves). Admins can leave voluntarily.

### Fixture Creation (`/{squad-slug}/fixture/new`)
- Select which active players from the squad are in this fixture (checkboxes)
- Enter opponent name
- Set voting deadline (datetime-local input)
- On submit: generate fixture slug (`vs-{opponent}-{short-id}`), insert `fixtures` + `fixture_players` rows
- Redirect to `/{squad-slug}/fixture/{fixture-slug}` (admin results view with shareable vote link)

### Public Voting Page (`/{squad-slug}/fixture/{fixture-slug}/vote`) — State Machine
1. **Not found** → 404
2. **After deadline** → Show winner(s) only (player name + "POTM winner" badge). No full vote breakdown.
3. **Before deadline + `voted_{fixture_id}` cookie exists** → "Already voted" message
4. **Before deadline + no cookie** → Voting form (name input + player radio buttons)

POST handler: validate inputs, check/create `potm_voter` cookie (UUID, 1-year, stable browser ID), insert vote (DB unique constraint as backstop), set `voted_{fixture_id}` cookie, redirect to GET.

### Results Display
- **Admin view** (`/{squad-slug}/fixture/{fixture-slug}`): Full results at all times — vote counts per player, voter names, CSS bar chart. Squad header image at top. This is the dedicated admin results page.
- **Public vote page** (`/{squad-slug}/fixture/{fixture-slug}/vote` after deadline):
  - **Non-admins**: Only see the **winner(s)** — the player name(s) with a "POTM Winner" badge. No vote counts, no voter names, no breakdown of other players. Ties show all joint winners.
  - **Logged-in admins** (squad admin visiting the vote page): See the winner announcement PLUS a full vote breakdown below (counts, voter names, bar chart) — same detail as the admin results page.
- SQL: JOIN fixture_players → players, LEFT JOIN votes, GROUP BY player, ORDER BY vote_count DESC

## File Structure

```
data/                              # Gitignored — DB + uploads
  potm.db
  uploads/                         # Squad header images
src/
  env.d.ts                         # App.Locals type
  middleware.ts                    # Better Auth session → Astro.locals.user
  db/
    schema.ts                      # App table definitions (squads, players, fixtures, votes, etc.)
    index.ts                       # DB connection singleton
  lib/
    auth.ts                        # Better Auth instance + config
    auth-client.ts                 # Better Auth client (for login page)
    squads.ts                      # Squad access control (getSquadRole, requireSquadAdmin, etc.)
    fixtures.ts                    # Fixture creation, slug generation, results queries
    uploads.ts                     # File upload handling (validate, save, delete)
  layouts/
    BaseLayout.astro               # HTML shell, Tailwind, mobile-first nav
  components/
    NavBar.astro                   # Top nav (sign in / user avatar+name)
    SquadHeader.astro              # Header image + name + description
    ResultsDisplay.astro           # Vote results bar chart
  pages/
    index.astro                    # Landing page
    about.astro                    # About: overview, instructions, GitHub link
    login.astro                    # "Sign in with Google" button
    api/auth/[...all].ts           # Better Auth catch-all endpoint
    dashboard/index.astro          # User's squads overview
    new.astro                      # Create squad form
    [...slug].astro                # Squad home (catch-all for squad routes — see note)
    uploads/[...path].ts           # Serve uploaded images
```

**Squad route handling:** The `[...slug].astro` catch-all parses the path to determine which squad sub-page to render. Alternatively, use Astro's dynamic routing with nested directories. The exact structure will depend on how Astro handles nested dynamic segments — likely we'll use:
```
pages/
  [squadSlug]/
    index.astro                    # Squad home
    settings.astro                 # Edit squad
    admins/
      index.astro                  # Manage admins
      invite/[token].astro         # Accept invitation
    fixture/
      new.astro                    # Create fixture
      [fixtureSlug]/
        index.astro                # Admin fixture + results view
        vote.astro                 # Public voting page
```

## Implementation Order

### Phase 1: Scaffolding
- Init Astro project, install deps (`@astrojs/node`, `better-auth`, `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, Tailwind v4)
- Configure `astro.config.mjs` (output: server, node adapter standalone), `drizzle.config.ts`, `.gitignore`, `.env`
- Add `Dockerfile` (Node.js, build Astro, run standalone) and `fly.toml` (single machine, persistent volume at `/data`)

### Phase 2: Database
- Write schema in `src/db/schema.ts`, connection in `src/db/index.ts`
- Generate and run migrations with drizzle-kit (app tables only — Better Auth manages its own)

### Phase 3: Auth (Better Auth + Google)
- `src/lib/auth.ts` (Better Auth server config: Google provider, SQLite adapter)
- `src/lib/auth-client.ts` (Better Auth client for login page)
- `/api/auth/[...all].ts` catch-all endpoint
- `src/middleware.ts` — validate session, populate `Astro.locals.user`
- `src/env.d.ts` — type `App.Locals`
- BaseLayout (mobile-first), NavBar (Google avatar + name when logged in)
- `/login` page, `/logout` (via Better Auth's signOut)

### Phase 4: Squad Management
- `/dashboard` — list user's squads
- `/new` — create squad form (name, description, header image)
- `/{squad-slug}` — squad home with player list and recent fixtures
- `/{squad-slug}/settings` — edit squad details
- `src/lib/uploads.ts` for image validation/saving, `/uploads/{...path}.ts` endpoint
- Player add/archive/unarchive/delete via POST actions on squad home page
- On squad creation: generate slug, insert `squads` + `squad_admins` (role: owner)
- `src/lib/squads.ts` — `getSquadRole(squadId, userId)` returns `'owner' | 'admin' | null`

### Phase 5: Multi-Admin & Invitations
- `/{squad-slug}/admins` — list admins, invite form, remove buttons
- `/{squad-slug}/admins/invite/{token}` — accept invitation page
- Invite creates `squad_invites` row, displays URL for owner to copy/share
- Accept flow: login check → email match → confirmation → insert `squad_admins`

### Phase 6: Fixture Creation & Admin Views
- `src/lib/fixtures.ts` — create fixture, generate slug, query results
- `/{squad-slug}/fixture/new` — create fixture form
- `/{squad-slug}/fixture/{fixture-slug}` — admin results view with shareable vote link

### Phase 7: Public Voting
- `/{squad-slug}/fixture/{fixture-slug}/vote` — full state machine
- Cookie-based duplicate prevention
- Results display after deadline

### Phase 8: About Page
- `/about` — static page, no auth required, linked from NavBar and landing page
- Content: (1) Brief overview of what POTM is and how it works, (2) Step-by-step instructions (create account → create squad → add players → create fixture → share vote link → view results), (3) Link to the GitHub repository

### Phase 9: Polish
- Consistent Tailwind styling across all pages (mobile-first)
- Form validation error messages
- Copy-link button (inline script)
- Edge case handling (empty squads, past deadlines, etc.)

## Dependencies

```
dependencies: astro, @astrojs/node, better-auth, drizzle-orm, better-sqlite3
devDependencies: @types/better-sqlite3, drizzle-kit, typescript, @astrojs/tailwind, tailwindcss
```

## Verification

1. **Auth flow:** Click "Sign in with Google" → consent → session created → visit protected page → sign out → redirect
2. **Squad flow:** Create squad (with name, description, header image) → see it on dashboard → add players → archive → unarchive → delete
3. **Multi-admin flow:** Invite admin by email → invitee signs in → accepts invite → can manage squad and create fixtures. Owner removes admin → loses access.
4. **Fixture + vote flow:** Create fixture → copy vote link → open in incognito → vote → see "already voted" → different browser → vote again → admin results show both votes
5. **Deadline:** Create fixture with short deadline → wait → public page shows results
6. **Security:** Access another user's squad by URL → 404; double-vote → blocked; non-owner cannot manage admins

## Deployment — Fly.io

- **Platform:** Fly.io free tier (3 shared VMs, persistent volumes, custom domains)
- **Adapter:** `@astrojs/node` in standalone mode (already configured)
- **Database:** SQLite file on a Fly persistent volume mounted at `/data`
- **Config:** `fly.toml` with a single machine, persistent volume for `data/` directory
- **Image uploads:** Stored on the same persistent volume under `data/uploads/`
- **Environment vars:** Set via `fly secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... BETTER_AUTH_SECRET=... BETTER_AUTH_URL=...`
- **Dockerfile:** Simple Node.js image, copy built Astro output, run with `node dist/server/entry.mjs`
- Add `Dockerfile` and `fly.toml` in Phase 1 scaffolding

## Future Considerations

- **Pre-game fixtures:** Allow creating a fixture ahead of the match with a date, time, and location. The fixture page could show match details before the game, then transition to POTM voting after kick-off. This would make the app useful for match day coordination (directions, kick-off time reminders) not just voting.
- **Email notifications:** Send invite emails, voting reminders, and results summaries.
- **Player statistics:** Track POTM wins per player over time, leaderboards per squad.
