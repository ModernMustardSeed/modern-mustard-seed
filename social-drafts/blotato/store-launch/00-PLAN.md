# MMS Store Launch — Announcement

Generated 2026-05-29. Single-day launch post for the four shipped playbooks
on modernmustardseed.com/store. Slots in **before** the existing Wave 1
campaign (June 7-13) so the store can warm up first.

## Schedule

| When | Channel | How |
|------|---------|-----|
| Mon 2026-06-01 10:00 AM Mountain (16:00 UTC) | LinkedIn | Auto via Blotato — run `bash run.sh` |
| Mon 2026-06-01 10:00 AM Mountain | Facebook | Manual paste from `FACEBOOK-COPY.md` |

## What ships in this announcement

The four playbooks that are live + buyable right now:

1. **The Claude Code Masterclass** — $67, 27 pages
2. **The GEO and AI Commerce Playbook** — $67, 30 pages
3. **The Brand Studio Playbook** — $67, 20 pages
4. **The AI Sales Machine** — $47, 18 pages

Tease the three coming soon (Blueprint, Native Playbook, Shopify) without
naming a date.

## Why this slot

- Today is Fri 2026-05-29. Monday June 1 gives us 3 days for any final
  store polish + a self-test buy.
- Wave 1 starts Sun June 7. Store launch on June 1 means the store has
  been "out" for a week before Wave 1 lands, so the audience already
  knows the catalog exists when wave-driven traffic shows up.
- Wave 2 (June 14-20) includes a dedicated GEO playbook callout on
  Tue June 16. The store-launch post primes that.

## How to run

```bash
cd ~/modern-mustard-seed/social-drafts/blotato/store-launch
# Reuse the parent .blotato.env (LinkedIn account ID lives there)
ln -s ../.blotato.env .blotato.env
bash run.sh --dry-run     # preview JSON, do not post
bash run.sh               # actually schedule
```

After running, copy the matching Facebook post from `FACEBOOK-COPY.md`
into the MMS Facebook page on the same day at the same hour.

## OG card

Reuses `https://modernmustardseed.com/og/blue-sky-mustard-seed.png` for
visual cohesion with Wave 1 and Wave 2.
