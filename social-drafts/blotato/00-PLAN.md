# MMS Blotato Schedule. Locked plan.

Generated 2026-05-27. Ready to fire once `.blotato.env` is populated.

This is a 7-day Modern Mustard Seed campaign that mirrors the CXC pattern. It runs Saturday 2026-05-30 through Friday 2026-06-05, all at 10:00 AM Mountain (16:00 UTC during MDT).

Platforms: X, LinkedIn, Facebook (page), Instagram.

## Setup

1. In Blotato, connect the MMS accounts you want to post from:
   - X: @modmustardseed (the MMS brand handle, Blotato 22771)
   - LinkedIn: Sarah Scarano (personal) and/or Modern Mustard Seed company page
   - Facebook: Modern Mustard Seed page
   - Instagram: @modernmustardseed
2. From Git Bash inside this folder, run `bash discover-accounts.sh`. It lists every account on your Blotato user with its `id`, `platform`, `username`. Copy the MMS account IDs into `.blotato.env` (template at `.blotato.env.example`).
3. Confirm credentials in `.blotato.env`:

```
BLOTATO_API_KEY=...                   # same key as CXC, in cross-covenant/.env.local
X_ACCOUNT_ID=...
LINKEDIN_ACCOUNT_ID=...               # optional. omit to skip LinkedIn
FACEBOOK_ACCOUNT_ID=...
FACEBOOK_PAGE_ID=...                  # the Modern Mustard Seed FB page ID
INSTAGRAM_ACCOUNT_ID=...
```

4. Dry run first: `bash run.sh --dry-run`. Verify all 4 platforms x 7 days = 28 scheduled posts.
5. Live: `bash run.sh`.

## Schedule (10:00 AM Mountain, 16:00 UTC since MDT is active)

| # | Date | Theme | Pillar | Media |
|---|------|-------|--------|-------|
| 1 | Sat 2026-05-30 | Tiny Seed, Real System | Brand thesis | OG card |
| 2 | Sun 2026-05-31 | Chatbot vs. business agent | AI Made Plain | OG card |
| 3 | Mon 2026-06-01 | VoiceStaff receipts | Receipts | OG card |
| 4 | Tue 2026-06-02 | The one task you should stop doing manually | Founder Therapy | OG card |
| 5 | Wed 2026-06-03 | PTG AI Deal Analyzer case | Receipts | OG card |
| 6 | Thu 2026-06-04 | Three offers, no fluff | Offer clarity | OG card |
| 7 | Fri 2026-06-05 | Now booking new builds. Apply. | Sales close | OG card |

Each post ships in 4 platform variants. X is short (under 280). LinkedIn is long-form and operator voice. Facebook is medium narrative. Instagram is medium with a strict 5-hashtag ceiling (Blotato enforces this at the API level).

Media: every post uses the Modern Mustard Seed OG card (`https://modernmustardseed.com/opengraph-image`) as a brand-consistent visual. Swap in unique post images later by editing the `MEDIA_N` variables in `run.sh`.

## Captions

All captions live in `captions/` as `post{N}-{platform}.txt`. The runner reads them verbatim. No em dashes anywhere (Sarah rule).

CTAs cycle to spread traffic:
- 4 posts route to `/audit` (the free AI Audit)
- 2 posts route to `/build-queue`
- 1 post routes to `/services` (the offer page)

Every caption includes `modernmustardseed.com` as the canonical URL.

## Post 1. Tiny Seed. Sat 2026-05-30 10:00 MT

Brand thesis. The single line the whole company is built on. Faith without being preachy.

CTA: `modernmustardseed.com/audit`

## Post 2. Chatbot vs Agent. Sun 2026-05-31 10:00 MT

The AI Made Plain pillar. Most small business owners conflate chatbots with agents. We define the difference in 60 seconds and route them to the audit.

CTA: `modernmustardseed.com/audit`

## Post 3. VoiceStaff Receipts. Mon 2026-06-01 10:00 MT

The Receipts pillar. Concrete product, concrete outcome: 24/7 phone coverage without hiring a receptionist. Links to the VoiceStaff case study.

CTA: `modernmustardseed.com/work/voicestaff`

## Post 4. Founder Therapy. Tue 2026-06-02 10:00 MT

"You don't need an AI strategy. You need to stop doing this one task manually." The most converting line in the campaign. Drives audit signups.

CTA: `modernmustardseed.com/audit`

## Post 5. PTG Deal Analyzer. Wed 2026-06-03 10:00 MT

Second case study. Spreadsheet to live web app in 30 days. Real estate investors are a high-LTV niche the audit recommends targeting.

CTA: `modernmustardseed.com/work/ptg-deal-analyzer`

## Post 6. Three Offers. Thu 2026-06-04 10:00 MT

Offer clarity. We name the three engagement paths plus the retainer, with timelines. No hedging.

CTA: `modernmustardseed.com/services`

## Post 7. Apply. Fri 2026-06-05 10:00 MT

Direct close. Now booking new builds. Apply now.

CTA: `modernmustardseed.com/build-queue`

## Notes

- LinkedIn posts skip if `LINKEDIN_ACCOUNT_ID` is empty in the env file. Same pattern works for any platform: omit the ID, runner skips it.
- All scheduled times are absolute UTC. Daylight time changes do not affect already-scheduled posts.
- If a post fails (network blip, account de-auth), re-run that single post by editing the bottom of `run.sh` to comment out the others.
- Posts are not idempotent. Running `run.sh` twice creates 14 days of duplicate posts. Use `--dry-run` first.
