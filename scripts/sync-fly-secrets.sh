#!/usr/bin/env bash
# Set Fly secrets from .env.production (non-empty, uncommented vars from the list below).
# Run from repo root: ./scripts/sync-fly-secrets.sh
set -e

ENV_FILE="${1:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Usage: $0 [path-to-.env.production]"
  echo "File not found: $ENV_FILE"
  exit 1
fi

# Vars we sync (optional ones can be commented out in .env.production)
KEYS=(GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET BETTER_AUTH_SECRET BETTER_AUTH_URL POSTHOG_API_KEY POSTHOG_HOST PUBLIC_POSTHOG_KEY PUBLIC_POSTHOG_HOST)

args=()
for key in "${KEYS[@]}"; do
  line=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null || true)
  if [[ -z "$line" ]]; then
    continue
  fi
  val="${line#*=}"
  if [[ -n "$val" ]]; then
    echo "Including $key (value length ${#val})"
    args+=("$key=$val")
  fi
done

if [[ ${#args[@]} -eq 0 ]]; then
  echo "No secrets to set (all vars missing or commented out in $ENV_FILE)."
  exit 0
fi

echo "Setting ${#args[@]} secret(s) in one call (single deploy)..."
fly secrets set "${args[@]}" -a potm-voting

echo "Done. List current secrets: fly secrets list -a potm-voting"
