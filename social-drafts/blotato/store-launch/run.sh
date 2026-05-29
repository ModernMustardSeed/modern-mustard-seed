#!/usr/bin/env bash
# MMS Store Launch — Single LinkedIn post via Blotato.
# Facebook copy is in FACEBOOK-COPY.md for manual paste.
#
# Usage:
#   cd ~/modern-mustard-seed/social-drafts/blotato/store-launch
#   cp ../.blotato.env .blotato.env   # (or symlink)
#   bash run.sh --dry-run             # preview, do not post
#   bash run.sh                       # schedule

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$HERE/.blotato.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy or symlink ../.blotato.env first." >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

: "${BLOTATO_API_KEY:?BLOTATO_API_KEY missing from .blotato.env}"
: "${LINKEDIN_ACCOUNT_ID:?LINKEDIN_ACCOUNT_ID missing from .blotato.env}"

DRY=false
[[ "${1:-}" == "--dry-run" ]] && DRY=true

BLOTATO_BASE="${BLOTATO_BASE:-https://backend.blotato.com/v2}"
OG_IMG="https://modernmustardseed.com/og/blue-sky-mustard-seed.png"

# Monday 2026-06-01, 10:00 AM Mountain (MDT = UTC-6)
SCHEDULED_TIME="2026-06-01T16:00:00.000Z"

read -r -d '' LI_POST <<'POST' || true
The store is open.

Four playbooks. $47 to $67. Instant PDF download. Built from the same systems we ship to $225/hour consulting clients at Modern Mustard Seed.

The Claude Code Masterclass. $67. Everything you need to ship production apps from your terminal with Claude Code as your AI development partner. 100+ production-tested prompts. Two full project walkthroughs. You do not need to be a developer. You need a terminal and this playbook.

The GEO and AI Commerce Playbook. $67. Get found by AI. Get cited by AI. Get sold by AI. The new rules for search, discovery, and commerce in 2026. ChatGPT Shopping. Gemini AI Mode. Perplexity. Google AI Overviews. Most operators are blind to this shift. The ones who are not will own the next decade.

The Brand Studio Playbook. $67. What used to cost $15,000 to $50,000 from a branding agency now costs a weekend and this playbook. Voice document, visual identity, brand vault, content production system. Built using the same system that created Cross + Covenant and Modern Mustard Seed.

The AI Sales Machine. $47. Automated outreach, qualification, and proposal system that books calls while you sleep. ICP scorecard. Outreach engine. Proposal generator that turns a discovery call into a custom PDF in 4 minutes. 30 fewer hours of admin per week.

One catch worth knowing.

Every dollar you spend in the store credits toward any Modern Mustard Seed build. So if you read the playbook, run the worksheets, and decide you would rather have us ship the system for you, you bring the credit and we go to work. Seed Site ($2,500 to $5,000) or Full-Service Business Build ($8,500 to $22,000).

Three more playbooks (AI-Ready Business Blueprint, AI-Native Business Playbook, Shopify Store with Claude Code) drop in the next two weeks.

modernmustardseed.com/store
POST

# ---------------------------------------------------------------------------
# Post
# ---------------------------------------------------------------------------
payload=$(jq -n \
  --arg accountId "$LINKEDIN_ACCOUNT_ID" \
  --arg text "$LI_POST" \
  --arg media "$OG_IMG" \
  --arg scheduledTime "$SCHEDULED_TIME" \
  '{
    post: {
      accountId: $accountId,
      content: { text: $text, platform: "linkedin", mediaUrls: [$media] },
      target: { targetType: "linkedin" }
    },
    scheduledTime: $scheduledTime
  }')

if $DRY; then
  echo "----- DRY: store launch scheduled for $SCHEDULED_TIME -----"
  echo "$payload" | jq .
  exit 0
fi

resp=$(curl -sS -X POST "$BLOTATO_BASE/posts" \
  -H "Content-Type: application/json" \
  -H "blotato-api-key: $BLOTATO_API_KEY" \
  -d "$payload")

echo "store-launch scheduled $SCHEDULED_TIME → $(echo "$resp" | jq -r '.id // .error // .message // "?"')"
