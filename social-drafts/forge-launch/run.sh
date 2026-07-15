#!/usr/bin/env bash
# Forge Under Your Flag launch posts (X, LinkedIn, FB, IG).
# STAGED 2026-07-14: the shared Blotato key is DEAD (401). Refresh it in
# ../blotato/.blotato.env (Blotato dashboard > Settings > API), then:
#   bash run.sh --dry-run   # inspect
#   bash run.sh             # post now
# Mirrors ../blotato/post-partner-video.sh (media upload -> per-platform post).
set -euo pipefail
cd "$(dirname "$0")"

DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
API="https://backend.blotato.com/v2"
ENV_FILE="../blotato/.blotato.env"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
: "${BLOTATO_API_KEY:?Set BLOTATO_API_KEY in $ENV_FILE (key was dead 401 on 2026-07-14; grab a fresh one)}"
H_KEY=(-H "blotato-api-key: $BLOTATO_API_KEY" -H "Content-Type: application/json")

ACCOUNTS=$(curl -sS "$API/users/me/accounts" "${H_KEY[@]:0:2}")
echo "$ACCOUNTS" | grep -qi unauthorized && { echo "Blotato key still dead (401)."; exit 1; }
acct_for() { echo "$ACCOUNTS" | jq -r --arg p "$1" '[.items[] | select(.platform==$p) | select((.name // "" | test("mustard|scarano"; "i")) or true)][0].id // empty'; }

# Upload the launch art once.
ART_B64=$(base64 -w0 forge-ticket-art-v2.png)
MEDIA_URL=$(curl -sS -X POST "$API/media" "${H_KEY[@]}" -d "$(jq -nc --arg b "data:image/png;base64,$ART_B64" '{url:$b}')" | jq -r '.url // empty')
[[ -z "$MEDIA_URL" && $DRY -eq 0 ]] && { echo "media upload failed"; exit 1; }

post() { # $1 platform  $2 target_json  $3 caption_file
  local plat="$1" target="$2" text; text=$(cat "$3")
  local acct; acct=$(acct_for "$plat")
  [[ -z "$acct" ]] && { echo "  SKIP $plat (no account)"; return; }
  local body; body=$(jq -nc --arg acct "$acct" --arg text "$text" --arg p "$plat" --arg m "${MEDIA_URL:-}" --argjson target "$target" \
    '{post:{accountId:$acct,content:{text:$text,mediaUrls:[$m],platform:$p},target:$target}}')
  if [[ $DRY -eq 1 ]]; then echo "  DRY $plat acct=$acct"; return; fi
  curl -sS -X POST "$API/posts" "${H_KEY[@]}" -d "$body" | jq -c '{platform:$p, ok:(.id//empty|length>0)}' --arg p "$plat"
}

post twitter   '{"targetType":"twitter"}'                                          caption-x.txt
post linkedin  '{"targetType":"linkedin"}'                                         caption-linkedin.txt
post facebook  "$(jq -nc --arg p "${FACEBOOK_PAGE_ID:-}" '{targetType:"facebook",pageId:$p}')" caption-facebook.txt
post instagram '{"targetType":"instagram"}'                                        caption-instagram.txt
echo "done"
