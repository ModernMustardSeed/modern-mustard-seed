# @modernmustardseed — Faceless YouTube Studio

The operating system for the Modern Mustard Seed channel. Faceless video, your real voice, AI visuals. Faith-driven AI founder brand, balanced funnel (audience + MMS leads + store), long-form plus Shorts.

## What is here

| File | What it is |
|------|------------|
| `BRAND_BIBLE.md` | Positioning, pillars, voice, visual language, channel setup specs, the funnel |
| `CONTENT_CALENDAR.md` | First 10 video concepts + 30-day schedule + Shorts formula |
| `PRODUCTION_PIPELINE.md` | The full SOP and tool setup |
| `scripts/` | Ready-to-produce scripts with frontmatter shot lists |
| `pipeline/produce.mjs` | The engine: script -> cloned voiceover -> Higgsfield shots -> ffmpeg assembly |

## Quickstart

1. Read `BRAND_BIBLE.md` once. It is the source of truth.
2. Set up tools (one time):
   ```bash
   npm install -g @higgsfield/cli
   higgsfield auth login
   winget install Gyan.FFmpeg          # ffmpeg, Windows
   ```
3. Clone your voice in ElevenLabs (3-5 min sample), then:
   ```bash
   cd pipeline
   cp .env.example .env                # fill ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID
   npm install
   ```
4. Produce your first video:
   ```bash
   node produce.mjs ../scripts/04-is-it-a-sin-to-use-ai.md
   ```
   (Output lands in `pipeline/out/<slug>/`. The manifesto, #01, is `voice: self` — record that one yourself.)
5. Finish in Descript or CapCut: burned captions, timing, then cut 3-5 Shorts.
6. Publish with the synthetic-content disclosure on and the pillar-matched CTA.

## Writing a new script

Ask Claude Code: "Write the script for [concept from CONTENT_CALENDAR.md] following BRAND_BIBLE.md voice, with a frontmatter shot list." Save to `scripts/<nn>-<slug>.md`. Then run `produce.mjs` on it.

## Rules that do not bend

- Real voice, real proof. Screen-record actual builds. Do not fake the work.
- One CTA per video, matched to the pillar.
- Brand palette on every visual. Never the generic stock-AI look.
- Set YouTube's altered/synthetic content disclosure when AI voice or video is used.
- No em dashes anywhere.
