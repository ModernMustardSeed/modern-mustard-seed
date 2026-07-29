# Now Showing (Set six · Reviews) — art plate brief

STATUS: DONE 2026-07-29. All six plates generated on fal (Seedream v4) and
verified text-free (03 needed one retry with full-bleed anti-caption language).

Six engraved "film still" plates. The render script works without them
(typographic laurel layout) and upgrades automatically when a plate exists at
`art/<key>.png`. Per-card crop positions live in render.mjs (`pos`).

## Rules
- Generate all six in ONE chat session so the style stays consistent.
- **Absolutely no text, letters, numbers, words, or watermarks in the image.**
  All type is set in code on top. If Codex sneaks lettering in, regenerate.
- Size: portrait **1024x1536**.
- Save as the exact filenames below, drop into `social-drafts/reviews/art/`.

## Plates

| File | Card | Subject |
|---|---|---|
| `01-everyone.png` | 97% read the reviews | Packed vintage cinema audience from behind, glowing blank screen |
| `02-four-stars.png` | 68% require 4+ stars | Star trophy on a pedestal under a spotlight |
| `03-fresh-ink.png` | 74% only trust the last 3 months | Bill poster pasting a fresh blank sheet over torn old layers |
| `04-box-office.png` | 71% check Google for reviews | Ornate 1930s box office ticket booth at night |
| `05-say-something.png` | Dare: reply to your oldest unanswered review | Standing microphone alone in a hard spotlight on an empty stage |
| `06-take-two.png` | A bad review is take two | Blank wooden clapperboard held mid-clap, close up |

Prompts (self-contained, one per image) live in the chat log from 2026-07-29
and follow this template:

> Vintage engraved illustration for a prestige film poster. [SCENE]. Fine
> crosshatched etching linework, dramatic single light source, deep warm-black
> ink on aged bone paper (hex F2EDE3), subtle antique gold spot accents only on
> [ONE DETAIL]. Centered composition with generous empty margins top and bottom
> for typography. Absolutely no text, no letters, no numbers, no words, no
> watermark. Portrait orientation.
