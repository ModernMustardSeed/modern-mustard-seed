# The studio readback standard

**The text moved. It lives in `lib/readback-standard.ts` now.**

It was here as markdown, read by one script. Then the Client Factory needed the
same rules for every agent it builds, and a second hand-typed copy is how two
versions of a rule start disagreeing the first time one of them is corrected.
So the rules live in TypeScript beside the code that uses them, and three
surfaces read that one file:

| Surface | How it gets the rules |
| --- | --- |
| Every live agent on the Vapi org | `node scripts/vapi-spelling.mjs --apply` installs the block, idempotently |
| Every agent the Client Factory builds | `lib/factory/agent.ts` appends it after BASE_RULES, where no tenant can configure it away |
| Mr. Mustard | `scripts/setup-vapi-mustard.mjs` carries a longer superset, and is excluded from the installer because his prompt is generated |

This page keeps the evidence, because the evidence is what stops somebody
"simplifying" the rules back into the thing that broke.

## Anchored spelling was measured, not chosen

On 2026-08-18 the same email address was rendered through a live agent voice in
four phrasings, and each recording was fed straight back through speech
recognition at studio quality and again at phone quality:

| Phrasing | What came back |
| --- | --- |
| `b as in boy. i as in igloo. z as in zebra.` | letter perfect, both qualities |
| `b, i, z` (bare letters) | mostly survived |
| `bee, eye, zee` (letter sounds) | **wrong**, "ay" was heard as I |
| the address said as ordinary words | perfect, both qualities |

The letter-sound form is the dangerous one because it fails silently: the agent
sounds careful, the caller hears a plausible letter, and the wrong address goes
in the database. It shipped on the flagship line for about an hour.

## The rest was learned on live calls, one defect at a time

**No numerals in speech.** A numeral can be re-read by a number formatter and a
word cannot. Written as digits, `2023` came back as a year and `200` as "two
hundred". A lone zero came back as a noise that was not a word at all.

**Never say the joined-up version.** The ugliest one, because the spelling was
already correct. The agent read the anchors back perfectly three times, then
appended "so that's b b I z I I 2023" with letters dropped and doubled. The
caller heard only the broken half and corrected an address that had been right.
Every extra restatement is a fresh chance to be wrong and not one of them ever
made anything clearer.

**Two strikes.** Making a caller spell their own address a fourth time loses a
sale that was already won. Take the phone number instead: ten digits transcribe
reliably where an address does not.

## Changing the rules

Edit `lib/readback-standard.ts` and **bump the version in the heading line**.
The installer decides whether an agent is current by matching that heading, so
an edit without a bump reaches nobody. Then:

```
node scripts/vapi-spelling.mjs            # what would change
node scripts/vapi-spelling.mjs --apply    # write it to every live agent
```

It is safe to re-run. A block from an older version is replaced in place rather
than stacked, and Mr. Mustard and the `__probe` artifacts are skipped by name.
