# The Mailer

The channel that cannot bounce.

## Why it exists

On 2026-08-30 the funnel read:

| | |
|---|---|
| Leads in `outbound_leads` | 9,730 |
| With a built demo | 246 |
| Ever reached a live Stripe checkout | **1** (Murrell Dental, never paid) |
| Live Stripe revenue, all time | **$14.99** |
| Leads carrying a consent record | **6** |

The machine is not broken. The demo builder works, the checkout works, the
webhook works, the partner commission works. It has simply never had enough
real humans in front of it, because every path to a card ran through cold
email, and cold email is finished here: 5.2% hard bounce, the recorded "clicks"
were mail security gateways, and the From address on ~37 sends does not exist.

Mr. Mustard can only dial against a live consent record. Six exist. So the
calling machine, which is the thing that actually closes, has been starving.

Mail has no spam filter, no sender reputation, no bounce and no consent gate.

## What it does, in one line

Prints a business their own finished website on a 6x9 postcard, with a seven
character code on the back, and the visit to that code is the consent record
everything else has been waiting for.

## The one thing it is not

**The card does not close anybody.** A $497 + $497/mo decision does not happen
off paper. The card buys a hand raise. The close happens on the phone, on a
lead who has already seen their own website, where the rate is not 4% but
something worth calling for.

## Why a preview and not a real build

A real demo build is 24 to 60 minutes of headless Claude (median 29). Twelve
thousand postcards would be six thousand hours of compute. So the card shows a
PREVIEW: a real, rendered, trade-correct homepage assembled from the lead row by
pure functions in about two milliseconds at zero marginal cost
(`lib/mailer/preview.ts` + `lib/mailer/site-html.ts`).

The 29-minute build fires **after** somebody pays, for a customer, through the
existing demo-order lifecycle. The offer never runs ahead of demand.

## The pieces

| Path | What it is |
|---|---|
| `lib/mailer/preview.ts` | A lead row becomes a design. Deterministic, so the paper and the screen never disagree. |
| `lib/mailer/site-html.ts` | The preview site as one self-contained HTML document. ONE function; the card and the page both call it. |
| `lib/mailer/postcard-html.ts` | Front and back at 300 DPI, with the USPS address block and its clear zone. |
| `lib/mailer/code.ts` | The seven character code. No 0/O, no 1/I/L, no vowels, and the reader forgives the four confusions anyway. |
| `lib/mailer/provider.ts` | Lob. Artwork posted as multipart, never as a public URL. |
| `lib/mailer/lookup.ts` | Code to lead, and the write that records the hand raise. |
| `lib/mailer/desk.ts` | What `/admin/mailer` reads. |
| `scripts/mailer/backfill-zip.mts` | Census geocoder. Turns 4,400 addresses into verified mailable ones. Free. |
| `scripts/mailer/render.mts` | One card, to disk, with a ruler-accurate `proof.pdf`. |
| `scripts/mailer/run-campaign.mts` | The drop. |
| `app/y/[code]` | Where the card lands. noindex, always. |
| `app/api/mailer/claim` | The card becomes a subscription, through the existing `demo-order` webhook branch. |
| `app/admin/mailer` | The desk. The Follow Up list is the point. |

## Running it

### 1. Make the list mailable (free, do it once, then weekly)

```powershell
npx tsx scripts/mailer/backfill-zip.mts               # dry run, 25 rows
npx tsx scripts/mailer/backfill-zip.mts --apply --limit 2000
```

Every row ends `mailable` or `undeliverable`. A transport error leaves the
verdict null so the next run retries it: a busy geocoder must never silently
retire a good address. Observed rate on the first 400: **79% mailable, 21%
undeliverable**, which is 21% of postage not spent.

### 2. Look at a card before anybody pays for one

```powershell
npx tsx scripts/mailer/render.mts --fixture roofing --guides
```

`--guides` draws the trim and safe lines. `proof.pdf` prints at exact size:
hold it against a ruler.

### 3. Prove the artwork against the provider (free)

```powershell
npx tsx scripts/mailer/run-campaign.mts --campaign proof --limit 1 --send
```

Test key. Costs nothing, prints nothing, and returns Lob's own validator
errors verbatim. **Do this before the first paid drop.** Bleed specs are the
provider's to change, not ours to remember.

### 4. Drop

```powershell
npx tsx scripts/mailer/run-campaign.mts --campaign sep-w1 --limit 500 --send --live
```

### The four guards

1. `--live` is never implied. Without it, the test key is used, full stop.
2. `MAILER_MAX_SPEND_CENTS` caps one invocation. Default $250.
3. `mail_pieces` has a unique index on `(outbound_lead_id, campaign)`. The
   database refuses a duplicate even if the script runs twice at once.
4. The piece row is written **before** the provider is called. A crash
   mid-drop leaves a `queued` row, never a silent double-send.

## What it needs that does not exist yet

One credential:

```
LOB_API_KEY_TEST=test_...      free, unlimited, prints nothing
LOB_API_KEY_LIVE=live_...      spends real postage
```

Optional, with sane defaults:

```
MAILER_RETURN_ADDRESS=Modern Mustard Seed|PO Box 1373|Kalispell, MT 59903
MAILER_MAX_SPEND_CENTS=25000
```

The return address above is a placeholder and **must be a real address you
control** before a live drop: undeliverable cards come back to it, and returns
are the cheapest address hygiene there is.

## The economics

Per card, all in: about **$0.70**.

| | |
|---|---|
| Offer | The Talking Website, $497 setup + $497/mo |
| First payment | $994 |
| Break-even on a 1,000 card drop | **1 client** |

The setup fee is the cash; the MRR is the prize. 88 clients at $497/mo is
$43,736 a month, which is $10,000 a week that arrives whether or not anything
is mailed that week.

## Traps

**The USPS block on the back is not decoration.** Artwork that paints into it
is rejected by the printer, after the postage is spent. Nothing may be drawn in
the bottom-right 4.5in x 2.75in.

**The city is stored SHOUTED.** The Census geocoder standardizes to
"SAN ANTONIO" because that is what a mailing label wants. `placeOf()`
title-cases it for the website. Print the stored form on the envelope, the
title-cased form on the page.

**The card shot must match `PREVIEW_SHOT`'s aspect ratio.** Any other shape and
`object-fit: cover` crops it, and it always crops through the middle of the
hero buttons: the one place on the card where a cut reads as a mistake.

**Never letter a business name onto a building, truck, sign or shirt** in any
imagery. Same law as the demo builder. Their name appears in the site's own
chrome, which is honest, and nowhere else.

**`/y/*` is noindex and robots-disallowed.** These are private pages about
named businesses that never asked to be on the internet. A Google-indexed
directory of "websites we built for people who did not hire us" would be a real
harm, not a growth hack.
