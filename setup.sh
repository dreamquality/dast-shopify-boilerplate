#!/usr/bin/env bash
set -euo pipefail

read -r -s -p "Enter OPENAI_API_KEY: " OPENAI_API_KEY
printf "\n"
read -r -p "Enter MERCHANT_URL: " MERCHANT_URL
read -r -s -p "Enter LINEAR_API_KEY: " LINEAR_API_KEY
printf "\n"
read -r -s -p "Enter R2_ACCESS_KEY: " R2_ACCESS_KEY
printf "\n"

set_secret() {
  local name="$1"
  local value="$2"
  local body_file
  body_file="$(mktemp)"
  trap 'rm -f "$body_file"' RETURN
  printf '%s' "$value" > "$body_file"
  gh secret set "$name" --body-file "$body_file"
}

set_secret OPENAI_API_KEY "$OPENAI_API_KEY"
set_secret MERCHANT_URL "$MERCHANT_URL"
set_secret LINEAR_API_KEY "$LINEAR_API_KEY"
set_secret R2_ACCESS_KEY "$R2_ACCESS_KEY"

echo "Secrets have been configured."
