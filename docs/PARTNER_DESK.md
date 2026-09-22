# The Partner Desk

Where partners come from. Built 2026-09-21, the same shape as the Cross + Covenant ambassador desk that pulls five creator inquiries a week.

## The two halves

**The public side, `/partners`.** The program as it is paid today: 25% of every monthly invoice for 12 months on every referred subscription ($99.25 a month, $1,191 a year, per Talking Website), 10% to 20% on custom builds, 50% on playbooks. The numbers are computed in `lib/partner-desk/letters.ts` (`partnerMath`) from `lib/demo-order.ts` and `lib/affiliate.ts`, so a price move moves the page, the calculator and every letter together. `/ambassadors`, `/ambassador`, `/affiliates`, `/affiliate`, `/referral-program` and `/referrals` all redirect here. "Partner Program" sits in the site menu under Company.

**The desk, `/admin/partner-desk`.** One table, `partner_prospects` (migration 138). Three panels:

1. **Find creators.** A keyword search against the YouTube Data API, returning channel, size, and the business email creators publish in their description. Needs one of: `YOUTUBE_API_KEY` in Vercel (Google Cloud, YouTube Data API v3, free at 10,000 units a day; a search page is about 100), or the @modernmustardseed channel connected at `/admin/youtube`, whose grant already carries `youtube.readonly`. Neither present, the panel says so and the rest of the desk works.
2. **Add to the book.** One person by hand, or a pasted CSV (`name,email,kind,handle,platform,followers,niche,website`, header optional). Duplicates by email, handle or channel URL are skipped.
3. **The book.** Every prospect, due follow-ups first. Open a row: the letter due next (subject and body, editable), Send, the four DMs to copy, profile and research links, status buttons, notes, history.

## The letters

Three touches per person: day 0, day 4, day 10. A voice per kind: creator, referral pro (bookkeepers, insurance agents, realtors, sign shops, coaches), community (chambers, groups, church business ministries). `lib/partner-desk/letters.ts`. Pure functions, no LLM.

Every letter is sent by hand from the desk, from `sarah@modernmustardseed.com`, one at a time, after Sarah has read it. There is no cron, no drip and no bulk header. The root domain carries one-to-one mail only (`lib/send-email.ts`, 2026-09-18) and this desk honours that. "Follow-up due" is a signal on screen, never a send.

## Status

`queued` (in the book, nothing sent) → `emailed` (a letter went out; `next_at` says when the next is due) or `dm_sent` (a DM was copied) → `replied`, `joined`, `passed` (set by hand). An application on `/partners` from an email in the book marks that row `joined` on its own.

## Routes

- `GET /api/admin/partner-desk` the book, the header numbers, what is configured
- `POST /api/admin/partner-desk` `{ prospect }`, `{ prospects: [] }` or `{ csv }`
- `PATCH /api/admin/partner-desk/[id]` fields, status, `note`
- `DELETE /api/admin/partner-desk/[id]`
- `GET /api/admin/partner-desk/[id]/letter?step=` the letter, DMs, links
- `POST /api/admin/partner-desk/[id]/send` `{ subject, body }` sends and advances the step
- `POST /api/admin/partner-desk/discover` `{ query, minSubscribers, pages }` or with `add: [{ channelId }]`
