# The Flathead door drop

One audited business, one half page, her name on it, in her hand.

This is the paper version of the audit that closed Built Right Montana. Nothing
is pre-built for these businesses. We read their live website, grade it, name the
three things to fix first, and say we will do all of it and take the whole thing
to an A+. That is the entire pitch, and every claim on the paper came out of the
engine that read their site.

## What runs

```powershell
# proof run: twelve businesses, whatever audits are already fresh
npx tsx scripts/door-drop/build.mts

# the real run: re-read every site first, then print everything that passes
npx tsx scripts/door-drop/build.mts --all --refresh --out artifacts/door-drop/full

# fill in street addresses so the route sheet has somewhere to send her
node scripts/door-drop/addresses.mjs --apply

# the sheet that goes to the printer with the file
npx tsx scripts/door-drop/spec.mts --out artifacts/door-drop/full --copies-each 25
```

Flags on `build.mts`:

| Flag | Default | What it does |
| --- | --- | --- |
| `--all` | off | every business that passes, not just the first twelve |
| `--limit N` | 12 | how many to print |
| `--cities A,B` | the seven towns | which towns, north to south |
| `--refresh` | off | re-read every site whose audit has aged out, free, on the Max subscription |
| `--max-age-days N` | 21 | how old an audit may be and still go on paper |
| `--allow-stale` | off | print an older audit anyway. For proofing only |
| `--copies N` | 2 | copies per business in the office 2-up file |
| `--concurrency N` | 6 | parallel audits during a refresh |
| `--no-proofs` | off | skip the PNG proofs |

## What comes out

```
artifacts/door-drop/<date>/
  press/flyers-press.pdf    the printer's file. 8.75 x 5.75 with bleed and crop marks
  press/printer-spec.pdf    the one page that goes with it
  office/flyers-2up.pdf     letter, 2-up, duplex LONG edge, one horizontal cut
  route/route-sheet.pdf     town by town with a box to tick
  route/route-sheet.csv     the same, for a phone
  proof/*.png               every flyer, both sides, plus an imposed sheet
  manifest.json             who is in the box, their grade, their QR target
  skipped.csv               who is not, and which gate they hit
```

## The piece

8.5 by 5.5 inches, landscape, two sides.

**Front is the diagnosis.** Their name in the largest type on the page, their own
domain under it, the audit's one honest sentence, then the three weakest
categories in the engine's own words. On the right, the grade and the seven bars
that add up to it. A grade with no working shown is an insult. A grade with the
bars beside it is a report.

**Back is the prescription.** The three highest-leverage fixes, each with why it
matters and what to actually do, then one line: we will do all three and take the
whole site to an A+. The offer is one sentence, after the receipts, never instead
of them.

The QR on both sides opens `modernmustardseed.com/audit/<lead id>`, which is the
full report, live today, free whether they call or not.

## Why landscape

Two portrait halves side by side look tidy until they are printed on both sides.
A long-edge duplex flip mirrors the sheet left to right, so the back of the left
flyer lands on the right. Two landscape halves stack instead, and a long-edge
flip leaves top on top. One horizontal cut, no mirroring, nothing for a copy shop
to set wrong.

## The gates

A flyer is handed over in person and cannot be recalled, so every lead passes six
gates and every rejection is written to `skipped.csv` with its reason.

0. **Ours.** Not a client, not one we already won, not Cross + Covenant. The lead
   list remembers every business it ever found, buyers included.
1. **Reachable.** Has a website, not a duplicate, not a test row, not
   unsubscribed, not on `skip.txt`.
2. **Local.** Not a national chain. A franchisee cannot buy a website.
3. **Owned.** The audit ran against the same host as the website on file.
4. **Complete.** The report has all seven categories and three fixes.
5. **Fresh.** The audit is younger than `--max-age-days`.

Gate 5 is also what keeps the site-facts law honest. Nothing on the paper says a
site lacks hours, an address or a phone unless the engine read the live site and
did not find it, this month.

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

It paces itself on purpose. Past roughly a hundred rapid place loads Google
serves a panel with an empty h1, which throws nothing and looks exactly like a
broken selector. Start it and leave it.
