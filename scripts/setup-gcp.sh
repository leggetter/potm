#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# setup-gcp.sh — Provision Google OAuth credentials for POTM
#
# Automates what it can (project creation, enabling APIs) and
# walks you through the manual steps (OAuth consent screen and
# client creation). Writes credentials to .env and .env.production.
#
# Prerequisites: gcloud CLI installed and authenticated
#   brew install google-cloud-sdk   # macOS
#   gcloud auth login
#
# Usage:
#   ./scripts/setup-gcp.sh                              # interactive
#   ./scripts/setup-gcp.sh --project potm-voting-12345  # reuse project
# ──────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults
GCP_PROJECT=""
PROD_URL="https://potm-voting.fly.dev"
DEV_URL="http://localhost:4321"
SUPPORT_EMAIL=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --project ID        Reuse an existing GCP project instead of creating one
  --prod-url URL      Production base URL (default: $PROD_URL)
  --dev-url URL       Local dev base URL (default: $DEV_URL)
  --support-email E   Support email for consent screen (default: gcloud account email)
  -h, --help          Show this help message
EOF
  exit 0
}

# ── Parse arguments ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)       GCP_PROJECT="$2"; shift 2 ;;
    --prod-url)      PROD_URL="$2"; shift 2 ;;
    --dev-url)       DEV_URL="$2"; shift 2 ;;
    --support-email) SUPPORT_EMAIL="$2"; shift 2 ;;
    -h|--help)       usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

# ── Preflight checks ────────────────────────────────────────
if ! command -v gcloud &>/dev/null; then
  echo "Error: gcloud CLI is not installed."
  echo "Install it from https://cloud.google.com/sdk/docs/install"
  exit 1
fi

ACCOUNT=$(gcloud config get-value account 2>/dev/null || true)
if [[ -z "$ACCOUNT" ]]; then
  echo "Error: Not authenticated. Run 'gcloud auth login' first."
  exit 1
fi

if [[ -z "$SUPPORT_EMAIL" ]]; then
  SUPPORT_EMAIL="$ACCOUNT"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   POTM — Google OAuth Setup             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Account:    $ACCOUNT"
echo "  Dev URL:    $DEV_URL"
echo "  Prod URL:   $PROD_URL"
echo ""

# ── 1. Create or select GCP project ─────────────────────────
if [[ -z "$GCP_PROJECT" ]]; then
  RANDOM_SUFFIX=$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n')
  GCP_PROJECT="potm-voting-${RANDOM_SUFFIX}"

  echo "[1/3] Creating GCP project: $GCP_PROJECT ..."
  gcloud projects create "$GCP_PROJECT" --name="POTM Voting" --quiet
  echo "      Done."
else
  echo "[1/3] Using existing project: $GCP_PROJECT"
  if ! gcloud projects describe "$GCP_PROJECT" &>/dev/null; then
    echo "Error: Project '$GCP_PROJECT' not found or not accessible."
    exit 1
  fi
fi

gcloud config set project "$GCP_PROJECT" --quiet
echo ""

# ── 2. Enable required APIs ─────────────────────────────────
echo "[2/3] Enabling People API ..."
gcloud services enable people.googleapis.com --quiet
echo "      Done."
echo ""

# ── 3. Guide through OAuth console setup ────────────────────
echo "[3/3] OAuth client setup (manual — Google requires this via the Console)"
echo ""

CONSOLE_URL="https://console.cloud.google.com/apis/credentials?project=$GCP_PROJECT"

# Try to open the browser
if command -v open &>/dev/null; then
  open "$CONSOLE_URL" 2>/dev/null || true
elif command -v xdg-open &>/dev/null; then
  xdg-open "$CONSOLE_URL" 2>/dev/null || true
fi

cat <<EOF

  Open this URL if it didn't open automatically:
  $CONSOLE_URL

┌─────────────────────────────────────────────────────────────┐
│  Step 1: Configure the OAuth Consent Screen                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Click "OAuth consent screen" in the left sidebar        │
│  2. User type: External -> Create                           │
│  3. App name: POTM Voting                                   │
│  4. Support email: $SUPPORT_EMAIL
│  5. Developer contact email: $SUPPORT_EMAIL
│  6. Click "Save and Continue" through remaining steps       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Step 2: Create OAuth Client — LOCAL DEV                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Credentials -> + Create Credentials -> OAuth client ID  │
│  2. Application type: Web application                       │
│  3. Name: POTM Local Dev                                    │
│  4. Authorized JavaScript origins:                          │
│       $DEV_URL
│  5. Authorized redirect URIs:                               │
│       ${DEV_URL}/api/auth/callback/google
│  6. Click Create and copy the Client ID & Secret            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Step 3: Create OAuth Client — PRODUCTION                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. + Create Credentials -> OAuth client ID                 │
│  2. Application type: Web application                       │
│  3. Name: POTM Production                                   │
│  4. Authorized JavaScript origins:                          │
│       $PROD_URL
│  5. Authorized redirect URIs:                               │
│       ${PROD_URL}/api/auth/callback/google
│  6. Click Create and copy the Client ID & Secret            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

EOF

# ── Collect credentials interactively ────────────────────────
echo "Paste the credentials you just created:"
echo ""
read -rp "  Local Dev — Client ID:     " DEV_CLIENT_ID
read -rp "  Local Dev — Client Secret:  " DEV_CLIENT_SECRET
echo ""
read -rp "  Production — Client ID:     " PROD_CLIENT_ID
read -rp "  Production — Client Secret:  " PROD_CLIENT_SECRET
echo ""

# ── Generate BETTER_AUTH_SECRET ──────────────────────────────
BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# ── Write .env (local development) ───────────────────────────
ENV_FILE="$PROJECT_ROOT/.env"

cat > "$ENV_FILE" <<EOF
GOOGLE_CLIENT_ID=$DEV_CLIENT_ID
GOOGLE_CLIENT_SECRET=$DEV_CLIENT_SECRET
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
BETTER_AUTH_URL=$DEV_URL
EOF

echo "Wrote $ENV_FILE"

# ── Write .env.production ────────────────────────────────────
PROD_ENV_FILE="$PROJECT_ROOT/.env.production"

cat > "$PROD_ENV_FILE" <<EOF
GOOGLE_CLIENT_ID=$PROD_CLIENT_ID
GOOGLE_CLIENT_SECRET=$PROD_CLIENT_SECRET
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
BETTER_AUTH_URL=$PROD_URL
EOF

echo "Wrote $PROD_ENV_FILE"

# ── Print summary ────────────────────────────────────────────
cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Local dev is ready:
    npx astro dev

  To deploy to production, set Fly.io secrets:

    fly secrets set \\
      GOOGLE_CLIENT_ID=$PROD_CLIENT_ID \\
      GOOGLE_CLIENT_SECRET=$PROD_CLIENT_SECRET \\
      BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \\
      BETTER_AUTH_URL=$PROD_URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GCP Project:  $GCP_PROJECT
  Console:      $CONSOLE_URL

Done!
EOF
