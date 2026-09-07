#!/usr/bin/env bash
set -euo pipefail

read -r -s -p "Enter OPENAI_API_KEY: " OPENAI_API_KEY
printf "\n"
read -r -p "Enter MERCHANT_URL: " MERCHANT_URL
read -r -s -p "Enter LINEAR_API_KEY: " LINEAR_API_KEY
printf "\n"
read -r -s -p "Enter R2_ACCESS_KEY: " R2_ACCESS_KEY
printf "\n"

gh secret set OPENAI_API_KEY --body "$OPENAI_API_KEY"
gh secret set MERCHANT_URL --body "$MERCHANT_URL"
gh secret set LINEAR_API_KEY --body "$LINEAR_API_KEY"
gh secret set R2_ACCESS_KEY --body "$R2_ACCESS_KEY"

echo "Secrets have been configured."
