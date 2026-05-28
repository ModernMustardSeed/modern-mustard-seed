# MMS Rebrand + Full-Service Build Launch Campaign

Generated 2026-05-28. 7-day campaign announcing the new brand and the
expanded full-service business offer.

This sits alongside the original `social-drafts/blotato/` campaign and
uses the same `.blotato.env`, same `discover-accounts.sh`, same runner
pattern. Just a different content set.

## Schedule (10:00 AM Mountain, 16:00 UTC during MDT)

Run from Sun 2026-06-07 through Sat 2026-06-13 (after the original
campaign Sat 05-30 to Fri 06-05 has completed):

| # | Date | Theme | Pillar |
|---|------|-------|--------|
| 1 | Sun 2026-06-07 | The brand has a new face | Announcement |
| 2 | Mon 2026-06-08 | Your site should work FOR you | Offer pivot |
| 3 | Tue 2026-06-09 | Built-in AI SDR receipts | Feature deep-dive |
| 4 | Wed 2026-06-10 | Funnels and lead magnets, day one | Feature deep-dive |
| 5 | Thu 2026-06-11 | A back office that surfaces what matters | Feature deep-dive |
| 6 | Fri 2026-06-12 | Embedded AI agents (both sides of the wall) | Feature deep-dive |
| 7 | Sat 2026-06-13 | Apply: two slots left | Sales close |

Each day publishes to X, LinkedIn, Facebook, Instagram. Every IG
caption is pre-trimmed to exactly 5 hashtags (Blotato API hard cap).
Media: the new OG card (blue sky + Matthew 17:20) as default.

## How to run

```bash
cd ~/modern-mustard-seed/social-drafts/blotato/launch-rebrand
# Reuse the same .blotato.env file from the parent directory
ln -s ../.blotato.env .blotato.env
bash run.sh --dry-run
bash run.sh
```

## Voice

This campaign threads two stories at once:
- The brand has a new face (rebrand)
- The offer just expanded substantially (full-service build)

Tone: celebratory, partnership-forward, scripture-anchored. The verse
that names the brand (Matthew 17:20) shows up explicitly in two posts.
No hedging. No buzzword soup. The product is now an "engine" not a
"site" and the posts say so.
