# Production Pipeline — Faceless Channel with Your Real Voice

This is the repeatable machine. Higgsfield CLI for visuals, ElevenLabs for the cloned voice, your own recordings for hero videos, ffmpeg for assembly. Claude Code drives the whole thing from this folder.

---

## One-time setup

### 1. Install the tools
```bash
npm install -g @higgsfield/cli        # Higgsfield CLI (video + image gen)
higgsfield auth login                  # 5-second browser OAuth
higgsfield account                     # confirm credit balance
```

ffmpeg (assembly). On Windows:
```powershell
winget install Gyan.FFmpeg
```

### 2. Voice setup (ElevenLabs)
- Create an account, then **Instant Voice Clone**: upload 3-5 minutes of clean speech (one mic, no music, no background). This becomes your scalable narration voice.
- Grab your `voice_id` (Voices → your voice → ID) and an API key.
- Put both in `pipeline/.env` (copy from `.env.example`).

**Hybrid rule:** hero/long-form anchor videos = record yourself for max authenticity. Shorts, repurposed cuts, and high-volume narration = the clone. The script files have a `voice` field per segment so you choose per line.

### 3. Optional: train a Soul of your brand motif
If you want a consistent recurring visual character (a stylized figure, or a signature object), train it once:
```bash
higgsfield soul-id create --name mms-motif --soul-2 --image ./ref1.jpg --image ./ref2.jpg --image ./ref3.jpg
higgsfield soul-id wait <soul_id>
```
Then reuse with `--soul-id <soul_id>` on image gen. For a faceless faith-AI channel this is optional; the cinematic B-roll palette usually carries the brand without it.

---

## The weekly loop (about 3-4 focused hours)

1. **Brief → Script.** Pick a concept from `CONTENT_CALENDAR.md`. Ask Claude Code: "Write the script for [concept] following BRAND_BIBLE.md voice." Output goes to `scripts/<slug>.md` (long-form) and a shot list.
2. **Voiceover.** Run the pipeline. ElevenLabs renders narration per segment with your cloned voice (or you drop in your own recording for hero lines).
3. **Visuals.**
   - BUILD/SYSTEMS: screen-record the real work (OBS or built-in). This is the proof, do not fake it with AI.
   - Cinematic B-roll, intros, STEWARD/STORY: Higgsfield CLI generates from the shot list.
4. **Assemble.** ffmpeg stitches clips to the narration timeline. Burn captions.
5. **Thumbnail.** Higgsfield image gen + the thumbnail template overlay.
6. **Cut Shorts.** Pull 3-5 vertical 30-60s moments from the long-form. Re-narrate hooks with the clone as needed.
7. **Publish.** Set the synthetic-content disclosure, pillar-matched CTA, pinned link.

---

## Running the pipeline

From `youtube/pipeline/`:
```bash
npm install
node produce.mjs ../scripts/<slug>.md
```

What it does:
- Parses the script's frontmatter shot list + narration segments.
- Renders narration via ElevenLabs (cloned voice) into `out/<slug>/audio/`.
- Generates each Higgsfield shot (image or video) into `out/<slug>/clips/`.
- Stitches everything with ffmpeg into `out/<slug>/<slug>.mp4`.
- Writes a `manifest.json` so you can re-run a single step.

Flags:
- `--audio-only` render narration only
- `--visuals-only` generate Higgsfield shots only
- `--no-assemble` skip ffmpeg (when you finish editing in CapCut/Descript instead)
- `--model kling3_0` override the default video model

Higgsfield models to reach for:
- Stills / thumbnails / hero frames: `nano_banana_2`, `flux_2`, `soul_2`
- Motion B-roll: `kling3_0`, `veo_3_1`, `seedance_2_0` (max 15s clips, plan shots accordingly)
Run `higgsfield model list` for the live catalog and parameter schemas.

---

## Cost reality (monthly)

- Higgsfield plan (credits, video gen): the heaviest line, scale with output.
- ElevenLabs Creator: ~$11-22/mo for the cloned voice.
- ffmpeg, OBS: free.
- Optional captions/editor (Descript/CapCut): $0-35.

Roughly $60-130/mo all-in for daily-capable faceless production. Cheaper than one freelance video.

---

## Quality gates (do not publish if any fail)

- Hook lands in the first 10 seconds with a concrete promise.
- Narration sounds like you, not a robot (re-render or record if it drifts).
- Visuals are in the brand palette, never generic stock-AI.
- Captions are burned in and accurate.
- Synthetic-content disclosure is set.
- Exactly one CTA, matched to the pillar.
- Zero em dashes in title, description, captions.
