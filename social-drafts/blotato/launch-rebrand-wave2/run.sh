#!/usr/bin/env bash
# MMS Rebrand Launch — Wave 2 (LinkedIn only)
#
# Sarah only has Blotato auto-post permissions for LinkedIn right now.
# This script schedules ONLY the LinkedIn variant of each post.
# Facebook copy is in FACEBOOK-COPY.md for manual posting.
#
# Usage:
#   cd ~/modern-mustard-seed/social-drafts/blotato/launch-rebrand-wave2
#   cp ../.blotato.env .blotato.env   # (or symlink)
#   bash run.sh --dry-run              # preview JSON, don't post
#   bash run.sh                        # actually schedule
#
# Requires BLOTATO_API_KEY and LINKEDIN_ACCOUNT_ID in .blotato.env

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

# ---------------------------------------------------------------------------
# Schedule (UTC, 10 AM Mountain during MDT)
# ---------------------------------------------------------------------------
SCHED_01="2026-06-14T16:00:00.000Z"
SCHED_02="2026-06-15T16:00:00.000Z"
SCHED_03="2026-06-16T16:00:00.000Z"
SCHED_04="2026-06-17T16:00:00.000Z"
SCHED_05="2026-06-18T16:00:00.000Z"
SCHED_06="2026-06-19T16:00:00.000Z"
SCHED_07="2026-06-20T16:00:00.000Z"

# ---------------------------------------------------------------------------
# Post bodies
# ---------------------------------------------------------------------------
read -r -d '' LI_01 <<'POST' || true
Modern Mustard Seed has a new face. There is now an AI assistant in the corner of every page on the site. Her name is Mustard Seed. You can talk to her right now at modernmustardseed.com.

Three things you should know.

She is trained on the studio. Ask her what we build, who we built it for, what the engagements actually include. She answers in our voice with our real pricing. No links. No FAQ search.

She qualifies leads. Tell her your pain point and she writes you a 5-step playbook on the spot, emailed to your inbox, tailored to your specific business.

She books calls. Tell her you want to talk to me and she pulls my real calendar. You pick a slot. The calendar invite lands in your inbox while you are still in the chat.

This is the same kind of agent we embed for every Full-Service Business Build client. The one talking to you is the one we would build for you.

modernmustardseed.com
POST

read -r -d '' LI_02 <<'POST' || true
Booking a call with me used to mean a redirect to Zoho. Then a calendar UI. Then a confirmation email. Three contexts, three URLs, three places to drop off.

Now you just talk to Mustard Seed in the chat.

"I want to book a discovery call."
"Here are Sarah's next openings. Friday 11 AM MT. Friday 11:30 AM. Friday 12 PM."
"11:30 works."
"Booked. Calendar invite on its way."

The whole thing takes 30 seconds. The invite lands while you are still in the conversation, with the .ics attached so it auto-adds to your calendar.

This is what every Mustard Seed booking flow looks like for clients we build for. One conversation. One transaction. No tab-hopping.

The chat is in the corner of modernmustardseed.com if you want to try it.
POST

read -r -d '' LI_03 <<'POST' || true
New free tool. Drop your website URL. Get a real grade in under a minute.

0 to 100 score. Letter grade. Honest one-sentence headline. Three things to fix first. Full to-do list ranked by priority.

What gets graded:

1. Brand. Can a stranger tell what you do in three seconds?
2. Trust. Real names, real photos, social proof, contact info.
3. SEO. Title tag, meta description, JSON-LD, alt text, sitemap.
4. GEO (AI search). llms.txt, ai.txt, FAQ schema. Most sites score F here because they were built before LLM search mattered.
5. AI features. Embedded chatbot. Voice agent. Personalization.
6. Conversion. Hero CTA above the fold. Form simplicity. Pricing visibility.
7. Design. Typography. Mobile. Modern feel.

The audit is graded by Anthropic Claude. No email required to see the result. Free.

Run it on your site: modernmustardseed.com/website-audit
POST

read -r -d '' LI_04 <<'POST' || true
New engagement: Seed Site. $2,500 to $5,000. 14 days.

Not every business needs the full engine. Some businesses just need a real online home. Beautiful site. Loads fast. Looks like a legitimate business. Captures the contact info or the booking when someone shows up ready to buy.

What it includes:
Brand identity. A 3 to 5 page production site. Mobile-optimized, Lighthouse 90+. Booking or payment integration. Real copy. SEO foundation. Launch assets. Full handoff with every credential in your name.

What it does not include:
AI agents. SDR. Funnels. Lead magnets. Back office. The whole engine. Those live one tier up, in the Full-Service Business Build at $8,500 to $22,000.

For when the site is the bottleneck, not the system around it.

Five engagement tiers now. Seed Site. Full-Service Business Build. Idea to Product. AI-Proof Your Business. Fractional AI Partner. Match your situation to the tier.

modernmustardseed.com/work-with-us
POST

read -r -d '' LI_05 <<'POST' || true
I ran the free Website Audit on my own site this week. We scored 94 out of 100. Grade A.

Here is what hit, and what would still cost us a point or two.

What scored A or A+:

Brand. "Apps, sites, and specialty AI tools" is direct and unmistakable.

GEO. llms.txt, ai.txt, FAQ schema, citable claims throughout. Most sites score F here. This is the differentiator that compounds for the next decade.

AI features. Mustard Seed chatbot embedded. In-chat booking. AI-graded audit (the tool itself).

What scored B:

Trust. We have testimonials in the case studies but not above the fold. Could be sharper.

The actual headline the audit returned: "Cinematic brand, sophisticated GEO foundation, in-chat AI agents. A+ across the board with minor trust gaps."

If you want to know exactly where you are losing points, drop your URL: modernmustardseed.com/website-audit

Free. No email required. You will get a real number.
POST

read -r -d '' LI_06 <<'POST' || true
Five ways to work with Modern Mustard Seed. From small to big. Match your situation to a tier.

1. Seed Site. $2,500 to $5,000. 14 days. Beautiful site, no engine. For when you need a real online home and that is it.

2. Full-Service Business Build. $8,500 to $22,000. 30 days. Site plus booking plus CRM plus AI SDR plus funnels plus back office plus embedded agents. The whole engine. For when you want the system, not just the storefront.

3. Idea to Product. $15,000 to $45,000 plus. 30 days. Full MVP build for founders with a new product idea. Engineering, AI integration, branded launch.

4. AI-Proof Your Business. $5,000 to $15,000. 8 to 12 weeks. Defensive engagement for established operators. Audit, harden, re-equip. For when you have revenue to protect.

5. Fractional AI Partner. From $1,500 per month. 3-month minimum. Ongoing strategy and build retainer. For established operators who want a partner inside the business.

Match your situation. Pick a tier. Apply.

modernmustardseed.com/work-with-us
POST

read -r -d '' LI_07 <<'POST' || true
Four builds per quarter. By design.

Two slots remain for the next cycle. If any of this week sounded like the partner you have been looking for, apply.

You drop your idea or your pain point. I read every submission personally and reply within 3 business days. If we are the right fit, the next step is a 30-minute scoping call. You walk away from that call with a fixed scope, a fixed timeline, and a fixed quote. No decks.

"If you have faith as small as a mustard seed, nothing will be impossible for you." Matthew 17:20.

You bring the seed. We build the tree.

modernmustardseed.com/build-queue
POST

# ---------------------------------------------------------------------------
# Caller
# ---------------------------------------------------------------------------
post_linkedin () {
  local idx="$1" sched="$2" body="$3"
  local payload
  payload=$(jq -n \
    --arg accountId "$LINKEDIN_ACCOUNT_ID" \
    --arg text "$body" \
    --arg media "$OG_IMG" \
    --arg scheduledTime "$sched" \
    '{
      post: {
        accountId: $accountId,
        content: { text: $text, platform: "linkedin", mediaUrls: [$media] },
        target: { targetType: "linkedin" }
      },
      scheduledTime: $scheduledTime
    }')

  if $DRY; then
    echo "----- DRY [$idx] scheduled $sched -----"
    echo "$payload" | jq .
    return
  fi

  local resp
  resp=$(curl -sS -X POST "$BLOTATO_BASE/posts" \
    -H "Content-Type: application/json" \
    -H "blotato-api-key: $BLOTATO_API_KEY" \
    -d "$payload")
  echo "[$idx] $sched → $(echo "$resp" | jq -r '.id // .error // .message // "?"')"
}

# ---------------------------------------------------------------------------
# Schedule all 7
# ---------------------------------------------------------------------------
post_linkedin 01 "$SCHED_01" "$LI_01"
post_linkedin 02 "$SCHED_02" "$LI_02"
post_linkedin 03 "$SCHED_03" "$LI_03"
post_linkedin 04 "$SCHED_04" "$LI_04"
post_linkedin 05 "$SCHED_05" "$LI_05"
post_linkedin 06 "$SCHED_06" "$LI_06"
post_linkedin 07 "$SCHED_07" "$LI_07"

echo "Done."
