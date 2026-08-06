# The Suite Film

One walkthrough film per lead, cut from that lead's own suite.

Sarah, 2026-08-01: *"On the demo forge video that is in the demo suite that goes out
to clients, it is supposed to show a new video of THEIR site and agent and command
center. It is currently just playing Wills Electric's video and that is not what I
want."*

Before this, `/demo/hub/<id>` played one house film for everybody, shot on the Wills
Electric build. Now the forge records a fresh one per business: their website, a
**live call to their own voice agent**, and their own command center, with narration
written from their own row.

## Where it sits in the forge

```
site build finishes  ->  cutSuiteFilm()  ->  /api/hooks/suite-ready  ->  email + text
   (demo-site-worker)     THE FILM             the announcement
```

**The film is the publish gate.** `suite-ready` refuses to send without
`suite_film_status = 'ready'`, so nobody is ever pointed at a suite whose
walkthrough is still being made. Until it lands, the hub says so in plain words
and promises it within the hour, instead of playing a tour of someone else's
business.

## Running one by hand

```bash
node scripts/suite-film/build.mjs --lead <leadId>      # or --hub <hubDemoId>
node scripts/suite-film/build.mjs --lead <leadId> --keep   # leave the work dir
```

Work dir: `~/mms-suite-films/<leadId>/`. Output lands in the private `booth`
bucket at `suite/<leadId>.mp4` and `suite/<leadId>.jpg`, signed fresh on every
hub render (same pattern as Sarah's founder videos).

Needs, on the machine that runs it: Playwright chromium, `ffmpeg` + `ffprobe` on
PATH, `edge-tts` (`python -m pip install edge-tts`), and `.env.local` with the
Supabase service role key. `VAPI_API_KEY` is optional but strongly wanted (see below).

**A funded fal wallet is NOT required.** `tts.mjs` runs the free Edge neural voices by
default and only falls back to fal's minimax when edge-tts is missing or the network
refuses it. Verified 2026-08-06: a full Kylers cut completed with the fal wallet locked
(`403 User is locked. Reason: Exhausted balance`). Do not let a dry fal wallet stop you
from cutting a film.

## The five files

| file | what it owns |
|---|---|
| `lines.mjs` | the script: narration per beat, and what the staged caller says per trade |
| `tts.mjs` | the two voices, free Edge neural voices first, fal `minimax/speech-02-hd` as fallback. Returns `duration_ms` either way |
| `cards.mjs` | the pop-art open and close cards |
| `record.mjs` | the camera: drives the real surfaces, makes the call, captures both sides of it |
| `compose.mjs` | the cut: ffmpeg, plus the caller's fake-microphone WAV |

## Five things that will bite you

**1. The trim is tail-anchored.** Chromium's screencast starts a few hundred ms
after the browser context does, and that lead-in varies per run. The score ends
immediately before close, so the END of the raw file is the landmark. A
start-anchored trim drifts and every narration line lands late.

**2. The picture is cut to the voice, not the other way round.** fal returns
`duration_ms` per line, so the recorder holds each beat for exactly as long as its
narration takes to say. That is the only reason this needs no editing pass. Beat
ids are the contract between all three of `lines.mjs`, `record.mjs` and
`compose.mjs`; do not rename one alone.

**3. The caller's lead silence is load-bearing and it is long.** Chromium starts
playing the fake-microphone file the moment the page opens the mic, which Vapi does
at the *start* of its connect sequence, not when the agent starts talking. Measured:
~9s of connect, then a ~20s demo greeting. The first cut used a 5s lead, so both
caller turns were spent before the agent could hear anything, the call transcribed
zero `User:` turns, and it looked exactly like Krisp deafness. 30s of lead clears
connect plus the whole greeting. Silence is free.

**4. A call that connects is not a call that works.** Krisp deafness and the Daily
teardown race both produce calls that look live and transcribe nothing (see
`lib/vapi-web.ts` and memory `debugging_vapi_web_voice`). So the Vapi call id is
captured off `POST /call/web` and the transcript is asserted to contain `User:`
turns before the film is allowed to exist. A film of an agent ignoring a customer
would lose the sale on its own. Note the transcript finalizes *after* the call
ends, so `status: 'ended'` is not permission to judge it.

**5. The call mix must go through Web Audio.** Putting a remote WebRTC track into
`new MediaStream([track])` and handing that to `MediaRecorder` records **digital
silence** in Chrome, while the local mic track in the same stream records perfectly.
A finished, uploaded film shipped that way: 28 seconds of nothing where the agent's
greeting should have been, then the caller audible, then nothing again where the
agent answered. Every other signal was green (the Vapi transcript proved the
conversation happened, the file existed and had a duration, the encode was clean),
so only measuring it caught it. Every stream now goes through an
`AudioContext.createMediaStreamSource()` into a `MediaStreamDestination`, and
`build.mjs` **fails the film if the capture is under 35% sound**
(`audibleFraction`). A healthy take measures ~60%.

## Optional

Drop a `assets/bed.mp3` in this directory and it becomes a quiet music bed under
the whole film (7.5%, faded in and out). Absent, the film is narration and the call
alone, which is the substance anyway.
