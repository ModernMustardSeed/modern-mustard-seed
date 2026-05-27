#!/usr/bin/env bash
# Modern Mustard Seed Blotato scheduler. Reads .blotato.env in the same folder,
# uploads the brand OG card once, then schedules 7 days of posts across X,
# LinkedIn, Facebook, and Instagram.
#
# Run from inside C:\Users\moder\modern-mustard-seed\social-drafts\blotato via Git Bash:
#   bash run.sh --dry-run   # preview, no API writes
#   bash run.sh             # live schedule
#
# Safe to re-run? No. It creates new posts every time. Always --dry-run first.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

DRY=0
if [ "${1:-}" = "--dry-run" ]; then DRY=1; fi

# shellcheck disable=SC1091
[ -f .blotato.env ] || { echo "ERROR: .blotato.env not found. Copy .blotato.env.example and fill it in."; exit 1; }
set -a; . ./.blotato.env; set +a

: "${BLOTATO_API_KEY:?missing in .blotato.env}"
: "${X_ACCOUNT_ID:?missing in .blotato.env}"
: "${FACEBOOK_ACCOUNT_ID:?missing in .blotato.env}"
: "${FACEBOOK_PAGE_ID:?missing in .blotato.env}"
: "${INSTAGRAM_ACCOUNT_ID:?missing in .blotato.env}"
# LINKEDIN_ACCOUNT_ID is optional. Empty = skip LinkedIn.

API="https://backend.blotato.com/v2"
H_KEY=(-H "blotato-api-key: $BLOTATO_API_KEY" -H "Content-Type: application/json")

# Upload an image URL to Blotato. Returns Blotato-hosted URL.
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
  # $1 account_id  $2 target_json  $3 platform  $4 caption_text  $5 scheduled  $6..N media_urls
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

# Captions. Stored as variables (heredoc to a var) to keep escaping sane.
# X: under 280. LinkedIn: long-form, no hashtags. Facebook: narrative. Instagram: max 5 hashtags (Blotato hard cap).

read -r -d '' P1_X <<'EOF' || true
Tiny seed. Real system. Measurable fruit.

We build apps, sites, and specialty AI tools for your business. Shipped in 30 days. Four builds per quarter.

Start with the free AI Audit.

modernmustardseed.com/audit
EOF

read -r -d '' P1_LI <<'EOF' || true
Tiny seed. Real system. Measurable fruit.

That is the entire Modern Mustard Seed thesis in seven words.

We are a one-person product studio for founders and small business owners who do not have time to become AI experts. You bring the vision. We turn it into a live product in 30 days.

Fixed scope. Fixed timeline. Fixed quote.

Four builds per quarter. By design. The work is the work, and the work is good.

If your business has a problem AI can solve but the path is not clear, start with the free AI Audit. We will tell you in 60 minutes whether AI is the right move, what to build first, and what it would cost.

No pitch. No pressure. Just a map.

modernmustardseed.com/audit
EOF

read -r -d '' P1_FB <<'EOF' || true
Tiny seed. Real system. Measurable fruit.

That is the Modern Mustard Seed thesis.

We build custom apps, websites, and specialty AI tools for founders and small businesses. Fixed scope. Fixed timeline. Shipped in 30 days.

Four builds per quarter. Serious clients only.

Where are you stuck? A messy workflow you cannot scale. A website that does not sell. An idea you have not been able to ship. We have built for real estate investors, churches, fashion brands, title and escrow, voice agents, hospitality, and more.

Start with the free AI Audit. We will show you exactly where AI fits in your business and what to build first.

modernmustardseed.com/audit
EOF

read -r -d '' P1_IG <<'EOF' || true
Tiny seed. Real system. Measurable fruit.

That is the Modern Mustard Seed thesis. We build apps, sites, and specialty AI tools for your business. Shipped in 30 days.

Four builds per quarter. Serious clients only.

Start with the free AI Audit. Link in bio.

modernmustardseed.com/audit

#AIForBusiness #SmallBusinessAI #FoundersJourney #AIAgency #BuiltToShip
EOF

read -r -d '' P2_X <<'EOF' || true
A chatbot answers questions.

An agent does the work.

Most "AI for small business" is the first one. We build the second.

modernmustardseed.com/audit
EOF

read -r -d '' P2_LI <<'EOF' || true
A chatbot answers questions.

An agent does the work.

Most "AI for small business" tools you have been pitched are the first one. A friendly widget that quotes hours, locations, and FAQs. Useful. Not transformative.

A real business agent looks like this:

It picks up the phone when no one else can.
It qualifies the lead and writes the notes.
It books the appointment on the right calendar.
It sends the follow up email three days later.
It updates the CRM so nothing falls through.

That is a different category of software. Not a chatbot. An operator that never sleeps.

If your business is leaking calls, missing follow up, or losing leads to slow response, the first thing to build is not a chatbot. It is an agent.

Free AI Audit tells you in 60 minutes whether you need one, what it would replace, and what it would cost.

modernmustardseed.com/audit
EOF

read -r -d '' P2_FB <<'EOF' || true
A chatbot answers questions. An agent does the work.

Most "AI for business" is just a friendly widget on a website that answers FAQs. Useful. Not transformative.

A real business agent picks up the phone, qualifies the lead, books the appointment, sends the follow up, and updates the CRM. It is an operator that never sleeps.

If your business is missing calls, losing leads, or drowning in repetitive follow up, you do not need a chatbot. You need an agent.

Free AI Audit tells you exactly what to build first.

modernmustardseed.com/audit
EOF

read -r -d '' P2_IG <<'EOF' || true
A chatbot answers questions.

An agent does the work.

Most "AI for business" tools are the first one. We build the second. The kind that picks up the phone, books the appointment, and sends the follow up while you sleep.

Free AI Audit tells you what to build first.

modernmustardseed.com/audit

#AIForBusiness #VoiceAI #SmallBusinessOwner #AIAgent #FoundersJourney
EOF

read -r -d '' P3_X <<'EOF' || true
Missed calls = missed revenue.

We built VoiceStaff: an AI voice agent that answers, qualifies, books, and updates the CRM. 24/7 phone coverage without hiring a receptionist.

Live case study:

modernmustardseed.com/work/voicestaff
EOF

read -r -d '' P3_LI <<'EOF' || true
Service businesses lose more money to missed calls than to bad reviews.

The math is brutal. The average small business misses 24 percent of inbound calls. Of those callers, 80 percent never call back. They call the next business on the list.

If you average even five missed calls a week and your average ticket is $400, that is $80,000 a year on the floor.

So we built VoiceStaff. A live AI voice agent that:

Answers 24/7 in your brand voice.
Qualifies the caller against your real criteria.
Books the appointment on the right calendar.
Sends the confirmation and reminder.
Logs everything in your CRM.

It is not a chatbot. It is an operator that never sleeps, never gets sick, and never forgets to follow up.

This is what we mean when we say "specialty AI tools for your business." Not a generic chatbot. A specific agent that solves a specific revenue leak.

Case study:

modernmustardseed.com/work/voicestaff
EOF

read -r -d '' P3_FB <<'EOF' || true
Service businesses lose more money to missed calls than to bad reviews.

Average small business misses 24% of inbound calls. 80% of those callers never call back. They call the next business on the list.

We built VoiceStaff for exactly that problem. A live AI voice agent that answers 24/7, qualifies the caller, books the appointment, and logs everything in your CRM. No more missed revenue while you sleep.

This is the kind of build we ship in 30 days.

modernmustardseed.com/work/voicestaff
EOF

read -r -d '' P3_IG <<'EOF' || true
Missed calls equal missed revenue.

We built VoiceStaff for service businesses bleeding leads to voicemail. AI voice agent. Answers 24/7. Books appointments. Updates the CRM.

Live case study at the link in bio.

modernmustardseed.com/work/voicestaff

#VoiceAI #SmallBusiness #AIAgent #ServiceBusiness #BuiltToShip
EOF

read -r -d '' P4_X <<'EOF' || true
You do not need an AI strategy.

You need to stop doing this one task manually.

Free 60-minute AI Audit. We name the task. You decide if it is worth solving.

modernmustardseed.com/audit
EOF

read -r -d '' P4_LI <<'EOF' || true
You do not need an AI strategy.

You need to stop doing this one task manually.

I see it every week on discovery calls. A business owner pulls up their week, and 8 to 12 hours are stuck inside the same 3 tasks:

The follow up email after every consult.
The intake form data getting copied into the CRM.
The proposal that gets retyped from a template every time.
The Friday invoicing run.
The lead routing from form to inbox to text.

None of these need a strategy. They need to be solved.

A 4 hour build can free up 40 hours a month. That is one workweek of your life back, every month, forever.

The free AI Audit does one thing: we look at your week, name the three highest-leverage tasks to automate, and give you a build estimate. No pitch.

If you take the build, great. If you take the list to someone cheaper, also great. The point is to stop bleeding time you will never get back.

modernmustardseed.com/audit
EOF

read -r -d '' P4_FB <<'EOF' || true
You do not need an AI strategy.

You need to stop doing this one task manually.

Most small business owners have 3 tasks eating 8 to 12 hours of their week. The follow up email. The CRM data entry. The proposal that gets retyped from a template every time.

A 4 hour build can free up 40 hours a month. Forever.

The free AI Audit names those tasks for you in 60 minutes. No pitch.

modernmustardseed.com/audit
EOF

read -r -d '' P4_IG <<'EOF' || true
You do not need an AI strategy.

You need to stop doing this one task manually.

Most small business owners have 3 tasks eating 8 to 12 hours of their week. A 4 hour build can free up 40 hours a month. Forever.

Free 60-minute AI Audit. We name the task.

modernmustardseed.com/audit

#SmallBusinessOwner #AIAutomation #TimeIsMoney #FoundersJourney #BuiltToShip
EOF

read -r -d '' P5_X <<'EOF' || true
Real estate investor needed deal analysis to take 30 seconds, not 30 minutes.

We built PTG AI Deal Analyzer. Address in. Comps, ARV, MAO, repair estimate, ROI out.

30-day build.

modernmustardseed.com/work/ptg-deal-analyzer
EOF

read -r -d '' P5_LI <<'EOF' || true
The brief was simple: "Deal analysis takes me 30 minutes per address. I want it to take 30 seconds."

The build was the PTG AI Deal Analyzer.

You paste in an address. It pulls comps, calculates ARV, estimates repair cost, computes Maximum Allowable Offer using the 70 percent rule, surfaces ROI scenarios, and outputs a one-page underwriting brief.

Stack: Next.js, Supabase, RentCast for data, Anthropic Claude for the underwriting reasoning, Vercel for deploy. Built and shipped in 30 days.

The investor went from analyzing 4 deals a week to analyzing 40. Same person. Same hours. Ten times the throughput.

This is what specialty AI tools actually do. They do not replace expertise. They compound it.

If your business has a workflow where the bottleneck is your own time on a repeatable analysis, that is exactly the shape of build we ship.

Case study:

modernmustardseed.com/work/ptg-deal-analyzer
EOF

read -r -d '' P5_FB <<'EOF' || true
"Deal analysis takes 30 minutes per address. I want it to take 30 seconds."

We built the PTG AI Deal Analyzer. Paste an address, get comps, ARV, repair estimate, Maximum Allowable Offer, and ROI in one pass.

The investor went from 4 deals a week to 40. Same person. Same hours. Ten times the throughput.

This is what specialty AI tools actually do. They compound expertise. They do not replace it.

modernmustardseed.com/work/ptg-deal-analyzer
EOF

read -r -d '' P5_IG <<'EOF' || true
Real estate investor brief: deal analysis takes me 30 minutes. I want it to take 30 seconds.

We shipped PTG AI Deal Analyzer in 30 days. Address in. Comps, ARV, repair estimate, MAO, and ROI out.

4 deals a week to 40. Same person. Same hours.

modernmustardseed.com/work/ptg-deal-analyzer

#RealEstateInvesting #AIForBusiness #PropTech #BuiltToShip #FoundersJourney
EOF

read -r -d '' P6_X <<'EOF' || true
Three offers. No fluff.

1. Online Presence Build. New brand, real site, paid in.
2. Idea to Product. Your app or AI tool, live in 30 days.
3. AI-Proof Your Business. Audit, harden, re-equip.

Plus a fractional partnership for the long haul.

modernmustardseed.com/services
EOF

read -r -d '' P6_LI <<'EOF' || true
Most "AI agency" offers are confusing. Here are ours. Three engagements, one retainer, fixed scope, fixed timeline, fixed quote.

1. Online Presence Build (30 days)
Your first real online home. Brand identity, production-grade site, booking or payments, real copy, SEO foundation, full handoff. For small businesses, creators, and service pros who need to actually show up online.

2. Idea to Product (30 days)
Your app, tool, or specialty AI product. Full UI, full-stack engineering, AI integration where it fits, branded marketing site, deployment, and 30 days of post-launch support. For founders ready to ship.

3. AI-Proof Your Business (8 to 12 weeks)
Three phases. Audit the AI shift against your business. Harden the surfaces AI will hit first. Re-equip your team. For owners with revenue to protect.

4. Fractional AI Partner (monthly)
Embedded fractional CTO and AI lead. Weekly sessions, hands-on building, continuous roadmap. For operators who want a long-term partner inside the business.

Four builds per quarter. Always quoted before any work starts. Free discovery call.

modernmustardseed.com/services
EOF

read -r -d '' P6_FB <<'EOF' || true
Most "AI agency" offers are confusing. Ours are not.

1. Online Presence Build. 30 days. Your first real online home.
2. Idea to Product. 30 days. Your app or specialty AI tool, live.
3. AI-Proof Your Business. 8 to 12 weeks. Audit, harden, re-equip.
4. Fractional AI Partner. Monthly. Embedded CTO and AI lead.

Fixed scope, fixed timeline, fixed quote on every engagement. Free discovery call before any commitment.

modernmustardseed.com/services
EOF

read -r -d '' P6_IG <<'EOF' || true
Three offers. No fluff.

1. Online Presence Build. New brand, real site.
2. Idea to Product. Your app or AI tool, live in 30 days.
3. AI-Proof Your Business. Audit, harden, re-equip.

Plus a fractional partnership. Fixed scope, fixed timeline, fixed quote.

modernmustardseed.com/services

#AIAgency #FoundersJourney #SmallBusinessAI #ProductStudio #BuiltToShip
EOF

read -r -d '' P7_X <<'EOF' || true
Four builds per quarter.

We do not overlap engagements. The work is the work.

Two slots remain for the next cycle.

Apply for the build queue.

modernmustardseed.com/build-queue
EOF

read -r -d '' P7_LI <<'EOF' || true
Four builds per quarter.

That is the entire Modern Mustard Seed production capacity. By design. We do not overlap engagements. The work is the work, and the work is good.

Two slots remain in the next cycle.

If you have an app idea you have not been able to ship.
If your business has a workflow eating your week.
If your website does not look like the business you actually run.
If you are tired of "AI strategy" decks that never become software.

Apply.

You submit your idea or your problem. Sarah reviews every submission personally and replies within 3 business days. If we are not the right fit, we will tell you that too.

modernmustardseed.com/build-queue
EOF

read -r -d '' P7_FB <<'EOF' || true
Four builds per quarter. By design.

We do not overlap engagements. The work is the work, and the work is good.

Two slots remain for the next cycle.

If you have an app idea you have not been able to ship, a workflow eating your week, or a website that does not look like the business you actually run, apply for the build queue.

Sarah reviews every submission personally within 3 business days.

modernmustardseed.com/build-queue
EOF

read -r -d '' P7_IG <<'EOF' || true
Four builds per quarter. By design.

We do not overlap engagements. Two slots remain in the next cycle.

If you have an idea you cannot ship, a workflow eating your week, or a site that does not look like the business you actually run, apply.

modernmustardseed.com/build-queue

#FoundersJourney #AIAgency #ProductStudio #BuildInPublic #BuiltToShip
EOF

# ---- Media: every post uses the canonical OG card. Override by setting MEDIA_N. ----
OG="${MEDIA_OG:-https://modernmustardseed.com/opengraph-image}"

# ---- Schedule: 10:00 MDT (16:00 UTC), Sat 2026-05-30 to Fri 2026-06-05 ----
S=(
  "2026-05-30T16:00:00Z"
  "2026-05-31T16:00:00Z"
  "2026-06-01T16:00:00Z"
  "2026-06-02T16:00:00Z"
  "2026-06-03T16:00:00Z"
  "2026-06-04T16:00:00Z"
  "2026-06-05T16:00:00Z"
)

# Targets per platform.
T_X=$(jq -nc '{targetType:"twitter"}')
T_LI=$(jq -nc '{targetType:"linkedin"}')
T_FB=$(jq -nc --arg p "$FACEBOOK_PAGE_ID" '{targetType:"facebook",pageId:$p}')
T_IG=$(jq -nc '{targetType:"instagram"}')

post_one () {
  local idx="$1" sched="$2" capX="$3" capLI="$4" capFB="$5" capIG="$6"
  echo "Post $idx ($sched) uploading media..."
  local og; og=$(upload_url "$OG")
  echo "Post $idx scheduling..."
  create_post "$X_ACCOUNT_ID"                   "$T_X"  "twitter"   "$capX"  "$sched" "$og"
  create_post "${LINKEDIN_ACCOUNT_ID:-}"        "$T_LI" "linkedin"  "$capLI" "$sched" "$og"
  create_post "$FACEBOOK_ACCOUNT_ID"            "$T_FB" "facebook"  "$capFB" "$sched" "$og"
  create_post "$INSTAGRAM_ACCOUNT_ID"           "$T_IG" "instagram" "$capIG" "$sched" "$og"
}

echo "=== MMS Blotato run. dry=$DRY ==="
post_one 1 "${S[0]}" "$P1_X" "$P1_LI" "$P1_FB" "$P1_IG"
post_one 2 "${S[1]}" "$P2_X" "$P2_LI" "$P2_FB" "$P2_IG"
post_one 3 "${S[2]}" "$P3_X" "$P3_LI" "$P3_FB" "$P3_IG"
post_one 4 "${S[3]}" "$P4_X" "$P4_LI" "$P4_FB" "$P4_IG"
post_one 5 "${S[4]}" "$P5_X" "$P5_LI" "$P5_FB" "$P5_IG"
post_one 6 "${S[5]}" "$P6_X" "$P6_LI" "$P6_FB" "$P6_IG"
post_one 7 "${S[6]}" "$P7_X" "$P7_LI" "$P7_FB" "$P7_IG"
echo "=== done ==="
