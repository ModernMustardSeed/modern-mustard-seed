#!/usr/bin/env bash
# Enumerate every social account on your Blotato user. Use this to grab the MMS
# account IDs once you have connected them in the Blotato dashboard.
#
# Run from inside C:\Users\moder\modern-mustard-seed\social-drafts\blotato via Git Bash:
#   bash discover-accounts.sh
#
# Pulls BLOTATO_API_KEY from .blotato.env in this folder if present, otherwise
# from the CXC env file.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

if [ -f .blotato.env ]; then
  set -a; . ./.blotato.env; set +a
elif [ -f "$HOME/cross-covenant/.env.local" ]; then
  BLOTATO_API_KEY=$(grep '^BLOTATO_API_KEY=' "$HOME/cross-covenant/.env.local" | cut -d= -f2-)
  export BLOTATO_API_KEY
fi

: "${BLOTATO_API_KEY:?missing. Add to .blotato.env or cross-covenant/.env.local}"

API="https://backend.blotato.com/v2"
echo "Querying $API/users/me/accounts..."
curl -sS -X GET "$API/users/me/accounts" -H "blotato-api-key: $BLOTATO_API_KEY" \
  | jq -r '.accounts[] | "\(.platform | ascii_downcase)\t\(.id)\t\(.username // .name // "?")"' \
  | sort -k1,1 -k3,3 \
  | column -t -s $'\t'

echo
echo "Copy the MMS account IDs into .blotato.env."
echo "Then dry-run with: bash run.sh --dry-run"
