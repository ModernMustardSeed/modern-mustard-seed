# The Flathead door drop

One audited business, one page, her name on it, in her hand.

This is the paper version of the audit that closed Built Right Montana. Nothing
is pre-built for these businesses. We read their live website, grade it, name the
three things to fix first, and say we will do all of it and take the whole thing
to an A+. That is the entire pitch, and every claim on the paper came out of the
engine that read their site.

## What runs

The order that produced the 2026-09-11 run, start to finish:

```powershell
# 1. fill in addresses and settle the website question, one Maps page load each
node scripts/door-drop/addresses.mjs --apply

# 2. re-read every site whose audit has aged out, then build everything
npx tsx scripts/door-drop/build.mts --all --refresh --out artifacts/door-drop/final

# 3. the sheet that goes to the printer with the file
npx tsx scripts/door-drop/spec.mts --out artifacts/door-drop/final --copies-each 3
```

Other runs:

```powershell
# proof run: twelve businesses, whatever audits are already fresh
npx tsx scripts/door-drop/build.mts

# the old half page, two sides, two up on letter
npx tsx scripts/door-drop/build.mts --all --format half

# just one piece or the other
npx tsx scripts/door-drop/build.mts --all --audit-only
npx tsx scripts/door-drop/build.mts --all --nosite-only
```

Flags on `build.mts`:

| Flag | Default | What it does |
| --- | --- | --- |
| `--format` | `page` | `page` is one side of letter. `half` is 8.5 x 5.5, two sides, two up |
| `--all` | off | every business that passes, not just the first twelve |
| `--limit N` | 12 | how many to print |
| `--cities A,B` | the seven towns | which towns, north to south |
| `--refresh` | off | re-read every site whose audit has aged out, free, on the Max subscription |
| `--max-age-days N` | 21 | how old an audit may be and still go on paper |
| `--allow-stale` | off | print an older audit anyway. For proofing only |
| `--copies N` | 2 | copies per business in the office file |
| `--concurrency N` | 6 | parallel audits during a refresh |
| `--audit-only` | off | only the graded businesses |
| `--nosite-only` | off | only the businesses with no website |
| `--no-proofs` | off | skip the PNG proofs |

`spec.mts` takes `--copies-each` and the same `--format`. Every number on it is
read back off the run's own manifest, so the spec and the press file cannot drift
apart.

## The 2026-09-11 run

203 businesses across the seven towns: 188 graded, 15 with no website of their
own. 203 press pages, one side each. Nobody scored above a C+.

| Grade | Count |
| --- | --- |
| C+ / C / C- | 21 |
| D+ / D | 54 |
| F | 113 |
| no website | 15 |

24 dropped at the gates, 18 left out because their site could not be read at all,
44 printed without a street address because the Maps phone disagreed and the
route sheet says so rather than guessing.

Six of the graded businesses live on a booking platform, and the engine read
each one correctly rather than grading the platform: *"This is not your website.
It is Booksy's, and it rents you one page."*

## What comes out

```
artifacts/door-drop/<date>/
  press/flyers-press.pdf    the printer's file. 8.75 x 11.25 with bleed and crop marks
  press/printer-spec.pdf    the one page that goes with it
  office/flyers-letter.pdf  letter, trim size, no marks. What her own printer wants
  route/route-sheet.pdf     town by town with a box to tick
  route/route-sheet.csv     the same, for a phone
  proof/*.png               every flyer, plus the route sheet and the spec
  manifest.json             who is in the box, which piece, their grade, their scan link
  skipped.csv               who is not, and which gate they hit
```

Under `--format half` the press file is 8.75 x 5.75 and two pages per business,
and the office file becomes `flyers-2up.pdf`.

## Why one side

The half page put the diagnosis on the front and the close on the back. Clean
design, resting on one bad assumption: that the paper gets turned over. Handed
across a counter to somebody mid-shift, it often does not. He reads his own name,
he reads the F, and if the paper never flips he has been told his website is
failing and never told what to do about it. The three fixes and the offer are the
only reason the grade is on there.

One side removes that failure, and with it the duplex setting, the long-edge flip
and the cut, which are the three things a print shop can get wrong. A full sheet
also reads like an inspection notice, which is what it is. A half page reads like
a coupon.

The cost argument goes the same way, which was the surprise. 203 businesses at
three apiece is 609 simplex letter sheets and no finishing, against 406 duplex
sheets plus a guillotine pass. Colour duplex runs close to double colour simplex
at any shop, so the sheet count roughly cancels and the cutting charge does not.

The half page is kept behind `--format half`. It is the right piece for a counter
display or a windshield, where the size is the point.

## Two pieces, one route

Both travel in the same press file, the same office file and the same route
sheet. She is driving one route and carrying one box, so sorting them into
separate piles would only mean driving Whitefish twice.

### The audit page

For a business whose website was read and graded. Their name in the largest type
on the page, their own domain, the audit's one honest sentence, the grade, and
the seven bars that add up to it. Then the three weakest categories in the
engine's own words, then the three highest-leverage fixes, then one line saying
we do all three and take the whole thing to an A+.

A grade with no working shown is an insult. A grade with the bars beside it is a
report. The offer is one sentence, after the receipts, never instead of them.

The fix cards carry the title and the how, not the why. On one page the findings
sit directly above them and make the same argument in the engine's own words, and
printing both cost half an inch of trim to repeat itself.

### The no-website page

For a business whose Google listing was opened and found to carry no website of
its own. Roughly thirty of these in the seven towns, and they are the easiest
sale in the valley, which is why they get a piece instead of a rejection.

Where the grade panel sits on the other piece, this one says **None** under
"Websites You Own". Beside it, their listing as it stands: phone ticked, address
ticked, website crossed. Then what that costs them, then the three moves, then
the same offer.

The three moves are fixed copy. When a business has no website the work is the
same work every time, and dressing it in their trade name to look bespoke would
be the mail-merge tell this campaign exists to avoid.

"You have no website" never prints off an empty database column. A blank
`website` field is just as likely to mean nobody ever looked. The piece is built
only for a lead whose listing was opened and stamped
`NO WEBSITE: confirmed on Google Maps <date>`, and the date it prints is that
date. An undated confirmation from an older run is sent back to the Maps pass
rather than printed with today's date.

Seven of the fifteen have a Facebook page or a Square booking link on the
listing, and the piece names it: *"your Google listing points at a Facebook
page"*, with the URL printed underneath so it can be checked in ten seconds. That
survives the owner saying "yes I do, it's on Facebook". The generic version did
not.

## The scan

The QR square points at `modernmustardseed.com/s/<lead id>`, which records the
scan and then sends the reader on: to their own report if they have one, to the
free-build door at `/demos` if the flyer they are holding is the no-website one.

That moment is the hottest signal the acquisition engine can receive. A cold
email click can be a mail security gateway. Nothing scans a QR square off a piece
of paper except a person with a phone in their hand. So the scan puts the
business at the top of **Follow Up** with its own reason, "Go back. They held the
paper and scanned it," and it never sets `contacted`, which means a person spoke
to a person and nothing automated may ever write it.

Crawlers are classified by `lib/acq/bots.ts` and recorded as machines rather than
dropped, so the count of real scans stays clean and a leaked URL is visible
instead of silent. `/s/` is disallowed in robots.txt and every response carries
`X-Robots-Tag: noindex`.

The report they land on books through `/book`, the real page with real slots, and
offers the ranch line as a `tel:` link underneath. It used to point at `/?book=1`,
which opens the chat launcher on the homepage: fine for somebody already reading
the homepage, and a bounce for somebody who just scanned a code and wants a time.

## The gates

A flyer is handed over in person and cannot be recalled, so every lead passes six
gates and every rejection is written to `skipped.csv` with its reason.

0. **Ours.** Not a client, not one we already won, not Cross + Covenant. The lead
   list remembers every business it ever found, buyers included.
1. **Reachable.** Not a duplicate, not a test row, not unsubscribed, not on
   `skip.txt`. No website is not a rejection here, it is the other piece.
2. **Local.** Not a national chain. A franchisee cannot buy a website. Two lists:
   distinctive names match anywhere on word boundaries, ordinary words that
   happen to be a brand only match when they are essentially the whole name, so
   Michaels is a craft store and Michaels Auto Body is a body shop.
3. **Owned.** The audit ran against the same host as the website on file.
4. **Complete.** The report has all seven categories and three fixes.
5. **Fresh.** The audit is younger than `--max-age-days`.

Gate 5 is also what keeps the site-facts law honest. Nothing on the paper says a
site lacks hours, an address or a phone unless the engine read the live site and
did not find it, this month.

## Fitting the page

The build reports overflow **by how much, in inches**. That is not decoration:
the first two attempts at the full page were guesses at padding, and "it
overflows by 0.74in" sized the fix on the first try after that.

One sheet in 203 still ran long, because one business drew three unusually long
fixes at once. Shaving the layout again for that one would make 202 pages worse,
so the page gives itself the space back: the `how` under each fix drops a line at
a time until the sheet fits, stopping at four, landing on a line boundary so it
never cuts mid word.

## Hand skip list

`scripts/door-drop/skip.txt`, one business name per line exactly as it appears in
`business_name`. Lines starting with `#` are ignored. Use it for anyone she knows
personally, anyone mid-conversation, and anyone who asks.

## The addresses

The Flathead rows predate the Maps lead finder, so they carry a phone, a website
and a grade but no street address. `addresses.mjs` fills that in from Google Maps
under the rule the acquisition engine already paid for: **the phone is the
proof.** An address is written only when the Maps phone matches the phone already
on the lead. It caught Alpine Laundry on the first dry run, whose Maps result is
a different business called Glacier Wash and Fold.

It settles the website question on the same page load, because the Maps panel
carries both and opening it twice is the expensive part. Either it finds a real
website and records it, which moves the lead into the audit campaign, or it finds
none and date-stamps that, which moves the lead into the no-website campaign.

The Maps link goes through `badDomain` from `lib/enrich.ts` first. The first
version of this pass did not, and wrote seven Facebook pages into the `website`
column: those businesses left the campaign they belonged in, and the audit engine
would have graded facebook.com under their name. Reuse the bundle, never
re-implement the rules.

It paces itself on purpose. Past roughly a hundred rapid place loads Google
serves a panel with an empty h1, which throws nothing and looks exactly like a
broken selector. Start it and leave it.
