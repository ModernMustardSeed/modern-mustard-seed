#!/usr/bin/env bash
# Modern Mustard Seed Rebrand + Full-Service Build launch campaign.
#
# Reads .blotato.env in this folder (symlink to ../.blotato.env is fine).
# Schedules 7 posts across X, LinkedIn, Facebook, Instagram.
# Runs Sun 2026-06-07 through Sat 2026-06-13 at 10:00 AM Mountain.
#
# Usage from Git Bash:
#   ln -s ../.blotato.env .blotato.env   # one-time
#   bash run.sh --dry-run                # preview
#   bash run.sh                          # live schedule
#
# Safe to re-run? No. Each run creates new posts. Always --dry-run first.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

DRY=0
if [ "${1:-}" = "--dry-run" ]; then DRY=1; fi

[ -f .blotato.env ] || { echo "ERROR: .blotato.env not found. Symlink ../.blotato.env or copy it."; exit 1; }
set -a; . ./.blotato.env; set +a

: "${BLOTATO_API_KEY:?missing in .blotato.env}"
: "${X_ACCOUNT_ID:?missing in .blotato.env}"
: "${FACEBOOK_ACCOUNT_ID:?missing in .blotato.env}"
: "${FACEBOOK_PAGE_ID:?missing in .blotato.env}"
: "${INSTAGRAM_ACCOUNT_ID:?missing in .blotato.env}"

API="https://backend.blotato.com/v2"
H_KEY=(-H "blotato-api-key: $BLOTATO_API_KEY" -H "Content-Type: application/json")

upload_url () {
  local src="$1"
  if [ "$DRY" = "1" ]; then echo "https://dry-run/og.png"; return; fi
  local body; body=$(jq -nc --arg u "$src" '{url:$u}')
  local resp; resp=$(curl -sS -X POST "$API/media" "${H_KEY[@]}" -d "$body")
  local url; url=$(echo "$resp" | jq -er '.url' 2>/dev/null) || { echo "UPLOAD FAIL: $resp" >&2; return 1; }
  echo "$url"
  sleep 1
}

create_post () {
  local acct="$1" target="$2" platform="$3" text="$4" sched="$5"; shift 5
  if [ -z "$acct" ]; then printf "  %-9s skipped (no account id)\n" "$platform"; return; fi
  local media_json; media_json=$(printf '%s\n' "$@" | jq -R . | jq -s .)
  local body; body=$(jq -nc \
    --arg acct "$acct" \
    --arg platform "$platform" \
    --arg text "$text" \
    --arg sched "$sched" \
    --argjson target "$target" \
    --argjson media "$media_json" \
    '{post:{accountId:$acct,content:{text:$text,mediaUrls:$media,platform:$platform},target:$target},scheduledTime:$sched}')
  if [ "$DRY" = "1" ]; then
    printf "  DRY %-9s @ %s  imgs=%s\n" "$platform" "$sched" "$(echo "$media_json" | jq length)"
    return
  fi
  local resp; resp=$(curl -sS -X POST "$API/posts" "${H_KEY[@]}" -d "$body")
  local id; id=$(echo "$resp" | jq -r '.postSubmissionId // .error // .message // "?"')
  printf "  %-9s scheduled  id=%s\n" "$platform" "$id"
  sleep 2
}

# ---- Captions (no em dashes anywhere) ----

read -r -d '' P1_X <<'EOF' || true
Modern Mustard Seed has a new face.

Blue sky. The verse that named the brand. And an offer that grew up:
we no longer ship websites. We ship business engines.

modernmustardseed.com
EOF

read -r -d '' P1_LI <<'EOF' || true
Modern Mustard Seed has a new face today.

The site is blue sky and white clouds now. The verse that named the brand sits above the fold: "If you have faith as small as a mustard seed, nothing will be impossible for you." Matthew 17:20.

But the bigger change is what we are actually offering.

Modern Mustard Seed no longer ships websites. We ship business engines. A working system with the site as the front door, plus:

A built-in AI sales-development rep that captures every lead the moment it lands, 24/7.

Funnels and lead magnets live on day one, not someday.

A back office that surfaces leads, revenue, content, and ops in one view.

AI agents embedded on the public site AND inside the back office. Same brain, both sides of the wall.

The site is the storefront. The engine is what we actually build.

modernmustardseed.com
EOF

read -r -d '' P1_FB <<'EOF' || true
Modern Mustard Seed has a new face.

The site is now blue sky with white clouds. The verse that named the brand sits above the fold. And the offer grew up.

We no longer ship websites. We ship business engines: a working system with the site as the front door, a built-in AI sales-development rep, funnels and lead magnets live on day one, a back office that surfaces what matters, and AI agents embedded on both sides of the wall.

The site is just the storefront. The engine is what we actually build.

modernmustardseed.com
EOF

read -r -d '' P1_IG <<'EOF' || true
New face. New offer.

We no longer ship websites. We ship business engines: site + AI SDR + funnels + lead magnets + back office + embedded AI agents.

The site is the storefront. The engine is what we build.

modernmustardseed.com

#AIForBusiness #BusinessSystem #FoundersJourney #BuiltToShip #SmallBusinessAI
EOF

read -r -d '' P2_X <<'EOF' || true
Your website should not just sit there looking nice.

It should capture every lead. Qualify them. Book the call. Update the CRM. Write the follow up. While you sleep.

That is what Modern Mustard Seed actually builds.

modernmustardseed.com
EOF

read -r -d '' P2_LI <<'EOF' || true
Your website should not just sit there looking nice.

Most small business sites do exactly that. Beautiful. Brand-aligned. And totally inert. The leads land somewhere. They sit. The owner gets to them on Sunday night if they are lucky.

A Modern Mustard Seed build does the work instead.

The site captures every lead the moment it arrives. An AI sales-development rep qualifies the lead against your real criteria. Books the call onto the right calendar. Updates the CRM with notes. Sends the confirmation. Writes the follow up at the 24-hour mark. And again at the 72-hour mark if the lead has not engaged.

You wake up to qualified appointments, not a stack of unread form submissions.

Your site should work FOR you. Not just sit there.

modernmustardseed.com
EOF

read -r -d '' P2_FB <<'EOF' || true
Your website should not just sit there looking nice.

Most small business sites are beautiful and totally inert. The leads land somewhere. They sit. You get to them on Sunday night.

A Modern Mustard Seed build does the work instead. The site captures the lead. The built-in AI sales-development rep qualifies it, books the call, updates your CRM, and sends the follow up. You wake up to qualified appointments, not a stack of unread emails.

modernmustardseed.com
EOF

read -r -d '' P2_IG <<'EOF' || true
Your website should not just sit there looking nice.

It should capture the lead, qualify it, book the call, write the follow up. While you sleep.

That is what we build.

modernmustardseed.com

#BusinessSystem #AIForBusiness #SmallBusinessOwner #BuiltToShip #FoundersJourney
EOF

read -r -d '' P3_X <<'EOF' || true
Built-in AI SDR.

Captures every lead. Qualifies against your criteria. Books the call. Drops notes into your CRM. Sends the follow up.

24/7. Never sleeps. Never lets a warm lead go cold.

Every Modern Mustard Seed build, day one.

modernmustardseed.com
EOF

read -r -d '' P3_LI <<'EOF' || true
The single highest-leverage thing we put inside every Modern Mustard Seed build is the AI sales-development rep.

What it does:

Captures every lead the moment it submits the form.

Qualifies the lead against your real criteria, not some generic template. (Right zip code? Budget? Timeline? Decision maker?)

Books the call onto the right calendar.

Drops the lead into your CRM with notes and the recommended next step.

Sends the confirmation email and the reminder.

Fires the follow up sequence at 24 hours, 72 hours, one week, two weeks.

Routes the unqualified leads to a self-serve resource so your calendar stays clean.

24 hours a day. Seven days a week. Never gets tired. Never lets a warm lead go cold while you sleep.

Most service businesses miss 24 percent of inbound leads to slow response time. An always-on SDR closes that gap permanently. It is the difference between a website that sits and a website that ships you appointments.

Every Modern Mustard Seed build includes one. Day one of launch.

modernmustardseed.com
EOF

read -r -d '' P3_FB <<'EOF' || true
The single highest-leverage thing inside every Modern Mustard Seed build is the AI sales-development rep.

It captures every lead. Qualifies it against your real criteria. Books the call. Drops the lead in your CRM with notes. Sends the follow up sequence. 24/7. Never sleeps.

Most service businesses miss 24% of inbound leads to slow response time. An always-on SDR closes that gap permanently.

Every Modern Mustard Seed build includes one, live on day one of launch.

modernmustardseed.com
EOF

read -r -d '' P3_IG <<'EOF' || true
Built-in AI SDR.

Captures every lead. Qualifies it. Books the call. Updates your CRM. Sends the follow up.

24/7. Never sleeps.

Every Modern Mustard Seed build, day one.

modernmustardseed.com

#AISDR #LeadGeneration #SmallBusinessAI #FoundersJourney #BuiltToShip
EOF

read -r -d '' P4_X <<'EOF' || true
Funnels and lead magnets, live on day one of launch.

Not "coming soon". Not "phase two". Live. Tested. Converting.

The primary funnel for the buyer who is ready. The secondary funnel for the slower buyer. A lead magnet that turns strangers into subscribers.

modernmustardseed.com
EOF

read -r -d '' P4_LI <<'EOF' || true
Every Modern Mustard Seed build ships with the funnels and lead magnets live on day one.

Not coming-soon. Not phase two. Live, tested, and converting before launch.

What that means in practice:

A primary funnel for the buyer who is already ready. (Hot lead, fast path to the call, fewer questions.)

A secondary funnel for the slower buyer. (Education, nurture, social proof, the slower decision lap.)

A lead magnet (or three) that turns a stranger into an email subscriber on the first visit. A real one. Not a "join the newsletter" box.

An email sequence behind every lead magnet that warms the subscriber over the next 5 to 14 days into a discovery call.

Most agencies hand you a beautiful site and call it done. We hand you a site plus the entire funnel ecosystem that makes the site profitable.

modernmustardseed.com
EOF

read -r -d '' P4_FB <<'EOF' || true
Every Modern Mustard Seed build ships with the funnels and lead magnets LIVE on day one of launch.

Not coming-soon. Not phase two. Live, tested, converting.

The primary funnel for the ready buyer. The secondary funnel for the slower one. A real lead magnet that turns strangers into subscribers. An email sequence that warms them into a call.

Most agencies hand you a site and call it done. We hand you the funnel ecosystem that makes the site profitable.

modernmustardseed.com
EOF

read -r -d '' P4_IG <<'EOF' || true
Funnels and lead magnets, LIVE on day one.

Not coming-soon. Not phase two. Working before launch.

Primary funnel + secondary funnel + lead magnet + email sequence.

modernmustardseed.com

#LeadGeneration #SalesFunnels #SmallBusinessGrowth #FoundersJourney #BuiltToShip
EOF

read -r -d '' P5_X <<'EOF' || true
Back office that surfaces what matters.

Leads, revenue, content, social schedule, and ops in one view.

One dashboard. Yours. Owned by you.

The eight SaaS subscriptions you are paying for? Gone.

modernmustardseed.com
EOF

read -r -d '' P5_LI <<'EOF' || true
Every Modern Mustard Seed build includes a back office that surfaces the right thing.

Not 47 SaaS tabs. One dashboard. Built for the way you actually run the business, not the way the SaaS company decided.

In one view:

Inbound leads from every form, every funnel, every channel. Triaged and prioritized by the AI SDR.

Revenue. What is closing this week. What is in the pipeline. What is at risk.

Content queue. What is going live. What is scheduled. What still needs a draft.

Social schedule across X, LinkedIn, Facebook, Instagram. (Blotato or your scheduler of choice plugged in.)

Operational health. Site uptime. Form conversion. Funnel performance. Top sources.

You stop opening eight tabs. You start opening one. The back office tells you what to do today before you have your coffee.

Most solopreneurs spend $300 to $700 a month on SaaS subscriptions that overlap, never integrate cleanly, and never tell you the right thing. A custom back office costs once and runs forever.

modernmustardseed.com
EOF

read -r -d '' P5_FB <<'EOF' || true
Every Modern Mustard Seed build includes a back office that surfaces the right thing.

One dashboard. Leads, revenue, content queue, social schedule, operational health, in one view. Built for the way you actually run the business.

The eight SaaS subscriptions you are paying for and barely using? Gone.

modernmustardseed.com
EOF

read -r -d '' P5_IG <<'EOF' || true
A back office that surfaces what matters.

Leads. Revenue. Content. Social. Ops. One view. Yours.

The eight SaaS subscriptions you barely use? Gone.

modernmustardseed.com

#BusinessOS #BackOffice #SmallBusinessOwner #BuiltToShip #FoundersJourney
EOF

read -r -d '' P6_X <<'EOF' || true
AI agents on BOTH sides of the wall.

Public-facing: answer questions, qualify leads, recommend next steps.

Internal: draft your follow-ups, summarize your week, triage your inbox.

Same brain. Both sides.

modernmustardseed.com
EOF

read -r -d '' P6_LI <<'EOF' || true
Modern Mustard Seed embeds AI agents on BOTH sides of the wall.

Public-facing agents that live on your site:

Answer prospect questions in your brand voice.

Qualify leads against your criteria before they ever touch your calendar.

Recommend the right next step for each visitor (book a call, read the case study, download the lead magnet).

Capture the conversation into a transcript that drops into the back office.

Internal agents that live inside your back office:

Draft your follow-up emails in your voice.

Summarize your week (what closed, what stalled, what needs you).

Triage your inbox so you only open what matters.

Generate weekly content from a 30-minute voice memo.

Surface the next three things to do, ranked.

Same brain. Both sides of the wall. The agents that talk to your customers learn from the agents that run your operations. The agents that run your operations learn from the conversations the public-facing agents are having.

This is the part most AI sites do not have. It is the part that makes the build feel alive.

modernmustardseed.com
EOF

read -r -d '' P6_FB <<'EOF' || true
Modern Mustard Seed embeds AI agents on BOTH sides of the wall.

Public-facing agents that answer customer questions, qualify leads, and recommend the right next step. Internal agents that draft your follow-ups, summarize your week, and triage your inbox.

Same brain, both sides. The customer-facing agents learn from your operations. Your operations learn from the customer conversations.

This is the part most AI sites do not have. It is the part that makes the build feel alive.

modernmustardseed.com
EOF

read -r -d '' P6_IG <<'EOF' || true
AI agents on BOTH sides of the wall.

Public: answer, qualify, recommend.
Internal: draft, summarize, triage.

Same brain. Both sides.

The part most AI sites do not have.

modernmustardseed.com

#EmbeddedAI #AIForBusiness #SmallBusinessGrowth #BuiltToShip #FoundersJourney
EOF

read -r -d '' P7_X <<'EOF' || true
Now booking new Full-Service Business Builds.

We would love to build yours.

If you have faith as small as a mustard seed, nothing will be impossible. (Matthew 17:20)

Bring us your dream. We will build the engine.

modernmustardseed.com/build-queue
EOF

read -r -d '' P7_LI <<'EOF' || true
Now booking new Full-Service Business Builds. By design.

We would love to build yours.

If you have an idea you cannot ship. A site that does not work for you. A business that depends on you opening eight tabs every morning to keep running. A dream that has been sitting in a notebook for a year.

Bring it. We will build the engine that makes it real.

The site. The AI SDR. The funnels. The lead magnets. The back office. The embedded agents. All of it. Yours, fully, in 30 days.

"If you have faith as small as a mustard seed, nothing will be impossible for you." (Matthew 17:20)

You bring the seed. We build the tree.

Apply at modernmustardseed.com/build-queue. Sarah reviews every submission personally and replies within 3 business days.

modernmustardseed.com/build-queue
EOF

read -r -d '' P7_FB <<'EOF' || true
Now booking new Full-Service Business Builds.

If you have a dream sitting in a notebook, a business that depends on you opening eight tabs every morning, or a site that does not work for you, bring it. We will build the engine that makes it real.

Apply for the build queue. Sarah reviews every submission personally.

"If you have faith as small as a mustard seed, nothing will be impossible for you." (Matthew 17:20)

modernmustardseed.com/build-queue
EOF

read -r -d '' P7_IG <<'EOF' || true
Now booking new Full-Service Business Builds. Apply any time.

You bring the seed. We build the tree.

"If you have faith as small as a mustard seed..." Matthew 17:20

Apply: modernmustardseed.com/build-queue

#FoundersJourney #BuildInPublic #AIForBusiness #SmallBusinessGrowth #FaithDriven
EOF

# ---- Media: every post uses the canonical OG card ----
OG="${MEDIA_OG:-https://modernmustardseed.com/opengraph-image}"

# ---- Schedule: 10:00 MDT (16:00 UTC), Sun 2026-06-07 to Sat 2026-06-13 ----
S=(
  "2026-06-07T16:00:00Z"
  "2026-06-08T16:00:00Z"
  "2026-06-09T16:00:00Z"
  "2026-06-10T16:00:00Z"
  "2026-06-11T16:00:00Z"
  "2026-06-12T16:00:00Z"
  "2026-06-13T16:00:00Z"
)

T_X=$(jq -nc '{targetType:"twitter"}')
T_LI=$(jq -nc '{targetType:"linkedin"}')
T_FB=$(jq -nc --arg p "$FACEBOOK_PAGE_ID" '{targetType:"facebook",pageId:$p}')
T_IG=$(jq -nc '{targetType:"instagram"}')

post_one () {
  local idx="$1" sched="$2" capX="$3" capLI="$4" capFB="$5" capIG="$6"
  echo "Post $idx ($sched) uploading media..."
  local og; og=$(upload_url "$OG")
  echo "Post $idx scheduling..."
  create_post "$X_ACCOUNT_ID"            "$T_X"  "twitter"   "$capX"  "$sched" "$og"
  create_post "${LINKEDIN_ACCOUNT_ID:-}" "$T_LI" "linkedin"  "$capLI" "$sched" "$og"
  create_post "$FACEBOOK_ACCOUNT_ID"     "$T_FB" "facebook"  "$capFB" "$sched" "$og"
  create_post "$INSTAGRAM_ACCOUNT_ID"    "$T_IG" "instagram" "$capIG" "$sched" "$og"
}

echo "=== MMS rebrand-launch Blotato run. dry=$DRY ==="
post_one 1 "${S[0]}" "$P1_X" "$P1_LI" "$P1_FB" "$P1_IG"
post_one 2 "${S[1]}" "$P2_X" "$P2_LI" "$P2_FB" "$P2_IG"
post_one 3 "${S[2]}" "$P3_X" "$P3_LI" "$P3_FB" "$P3_IG"
post_one 4 "${S[3]}" "$P4_X" "$P4_LI" "$P4_FB" "$P4_IG"
post_one 5 "${S[4]}" "$P5_X" "$P5_LI" "$P5_FB" "$P5_IG"
post_one 6 "${S[5]}" "$P6_X" "$P6_LI" "$P6_FB" "$P6_IG"
post_one 7 "${S[6]}" "$P7_X" "$P7_LI" "$P7_FB" "$P7_IG"
echo "=== done ==="
