/**
 * CUT A HUNDREDFOLD FILM.
 *
 *   node scripts/hundredfold-film/build.mjs --cut hero
 *   node scripts/hundredfold-film/build.mjs --cut webinar
 *   node scripts/hundredfold-film/build.mjs --cut hero --keep     (leave the work dir)
 *   node scripts/hundredfold-film/build.mjs --cut hero --dry      (voice only, no camera)
 *
 * Order of operations, and it matters: THE VOICE IS RECORDED FIRST. Every beat
 * is then held on camera for exactly as long as its own narration runs, so the
 * finished film needs no editing pass. Cutting picture first and trying to fit
 * words to it is how you end up hand-trimming twenty scenes.
 *
 * Output lands in public/video/, which is what components/hundredfold/
 * HundredfoldFilm.tsx checks for on disk. Until a cut exists that component
 * shows a real invitation instead of a dead play button, so a failed run here
 * degrades to the state the page is already in rather than breaking it.
 *
 * Needs: playwright chromium, ffmpeg + ffprobe on PATH, edge-tts
 * (`python -m pip install edge-tts`), and .env.local with CLIENT_SESSION_SECRET
 * (the portal cannot be filmed without a real member session).
 */

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, statSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { shoot, memberSessionCookie, readEnv, W, H } from './capture.mjs';
import { CUTS, MUSTARD } from './lines.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const has = (n) => argv.includes(`--${n}`);

const CUT = flag('cut', 'hero');
const BASE = flag('base', 'https://modernmustardseed.com');
const beatsSpec = CUTS[CUT];
if (!beatsSpec) throw new Error(`unknown cut "${CUT}". Try: ${Object.keys(CUTS).join(', ')}`);

const env = readEnv();
const PYTHON = process.env.PYTHON || 'python';
const MEMBER = 'dana@whitakermedspa.demo';
/** The real live tool the factory built for the demo member on 2026-08-07. */
const TOOL_SLUG = flag('tool', 'whitaker-med-spa-the-treatment-price-estimator-a723');

const workDir = path.join(os.homedir(), 'mms-hundredfold-film', CUT);
const outName = CUT === 'hero' ? 'hundredfold-film' : 'hundredfold-webinar';
const publicDir = path.join(process.cwd(), 'public', 'video');

const log = (s) => console.log(s);
const run = (cmd, args, { quiet = true } = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: quiet ? ['ignore', 'ignore', 'pipe'] : 'inherit', windowsHide: true });
    let err = '';
    if (quiet) p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', (e) => reject(new Error(`${cmd} could not start: ${e.message}`)));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.trim().slice(-400)}`))));
  });

const durationMs = (file) =>
  new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { windowsHide: true });
    let s = '';
    p.stdout.on('data', (d) => { s += d.toString(); });
    p.on('error', reject);
    p.on('close', () => {
      const n = Number(s.trim());
      if (!Number.isFinite(n) || n <= 0) reject(new Error(`could not measure ${path.basename(file)}`));
      else resolve(Math.round(n * 1000));
    });
  });

/* -------------------------------------------------------------------------- */
/* 1. The voice                                                                */
/* -------------------------------------------------------------------------- */

async function speak(text, outFile) {
  await run(PYTHON, ['-m', 'edge_tts', '--voice', MUSTARD.edge, `--rate=${MUSTARD.rate}`, '--text', text, '--write-media', outFile]);
  // A zero exit with an empty file is the failure worth guarding: the module
  // writes the file before it has audio to put in it.
  if (!existsSync(outFile) || statSync(outFile).size < 1200) throw new Error('edge-tts wrote no audio');
  return durationMs(outFile);
}

/* -------------------------------------------------------------------------- */
/* 2. The cards                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Open and close cards, in the house pop-art language (ink slab, mustard rule,
 * editorial serif). Rendered as a real page so the camera never has to composite
 * anything: what is filmed is what ships.
 */
const card = ({ eyebrow, headline, sub, kicker }) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  @keyframes rise { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
  html,body{margin:0;height:100%}
  body{background:#161616;color:#FBF6EA;display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
  .w{max-width:1000px;padding:0 72px;text-align:center}
  .e{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;letter-spacing:.42em;
     font-weight:700;color:#F5B700;text-transform:uppercase;margin-bottom:26px;animation:rise .7s both}
  h1{font-family:Georgia,'Times New Roman',serif;font-weight:900;font-size:68px;line-height:1.04;
     letter-spacing:-.02em;margin:0;animation:rise .7s .15s both}
  .r{width:64px;height:5px;background:#F5B700;margin:30px auto;animation:rise .7s .3s both}
  p{font-size:21px;line-height:1.55;color:rgba(251,246,234,.74);margin:0;animation:rise .7s .45s both}
  .k{margin-top:30px;font-family:ui-monospace,monospace;font-size:13px;letter-spacing:.22em;
     color:rgba(251,246,234,.5);text-transform:uppercase;animation:rise .7s .6s both}
</style></head><body><div class="w">
  ${eyebrow ? `<div class="e">${eyebrow}</div>` : ''}
  <h1>${headline}</h1>
  <div class="r"></div>
  ${sub ? `<p>${sub}</p>` : ''}
  ${kicker ? `<div class="k">${kicker}</div>` : ''}
</div></body></html>`;

/* -------------------------------------------------------------------------- */
/* 3. The scenes                                                               */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ TWO RULES SHAPE EVERY SCENE HERE.
 *
 * 1. A scene sizes its motion from `cam.remaining()`, never from a fixed
 *    number. The beat's budget is its narration's length and navigation is
 *    spent out of that same budget, so a glide written as `ms - 400` overruns
 *    by however long the page took to load.
 * 2. A scene NEVER types a travel distance. It gives `cam.creep()` a speed, and
 *    the shot covers whatever that speed reaches. 21 to 50 px/s reads as film.
 *    The first version of this rig travelled at 110 to 215 px/s, which is the
 *    exact thing Sarah called nauseating on another cut the same day.
 *
 * The CUTS do the travelling. When a beat needs to start somewhere far down a
 * page, it is placed there with `cam.placeAt()` immediately after a navigation
 * or a tab click, where the viewer is not watching the page move.
 */

/** Show a card. The beat loop holds it for whatever is left. */
const showCard = (html) => async (cam) => {
  await cam.page.setContent(html, { waitUntil: 'load' });
  await cam.holdOut();
};

/** Go to a portal tab and creep down it. `at` places the shot behind the cut. */
const portalTab = (label, { at = 0, speed = 34 } = {}) => async (cam) => {
  if (!cam.page.url().includes('/portal/hundredfold')) {
    await cam.go('/portal/hundredfold', { wait: 2000 });
  }
  await cam.click(`button:has-text("${label}")`, { settle: 550 });
  await cam.placeAt(at);
  await cam.creep(speed);
  await cam.holdOut();
};

/** Stay on the same page and keep creeping from where the last beat left off. */
const keepCreeping = (speed = 34) => async (cam) => {
  await cam.creep(speed);
  await cam.holdOut();
};

/** Open a public page, place the shot, and creep. */
const publicPage = (url, { at = 0, speed = 34, wait = 1500 } = {}) => async (cam) => {
  await cam.go(url, { wait });
  if (at) await cam.placeAt(at);
  await cam.creep(speed);
  await cam.holdOut();
};

function scenesFor(base) {
  const OPEN = card({
    eyebrow: 'Modern Mustard Seed',
    headline: 'HUNDREDFOLD',
    sub: 'The scaling program that builds the machine with you.',
    kicker: 'A walkthrough',
  });
  const DISCLOSURE = card({
    eyebrow: 'About what you are about to see',
    headline: 'A real system,<br>an invented business',
    sub: 'Whitaker Med Spa does not exist. It was run through the same engine a member gets, so every screen in this film is real work on a made-up company.',
  });
  const CLOSE = card({
    eyebrow: 'Hundredfold',
    headline: 'Start with the interview',
    sub: 'It is free, it takes about twenty minutes, and it will tell you more about your business than the rest of this film did.',
    kicker: 'modernmustardseed.com/hundredfold',
  });

  return {
    open: showCard(OPEN),
    'demo-disclosure': showCard(DISCLOSURE),

    'why-constraint': showCard(
      card({
        eyebrow: 'The idea underneath',
        headline: 'One thing is<br>capping you',
        sub: 'Leads, sales, delivery, cash, offer, or the owner. Fixing anything else changes nothing until you fix that one.',
      }),
    ),

    'roadmap-tool': publicPage('/scaling-roadmap', { speed: 30 }),
    'roadmap-limit': keepCreeping(34),

    // The anchor lands the browser at the interview off camera, so the cut does
    // the travelling and the shot only has to creep.
    interview: publicPage('/hundredfold#interview', { speed: 26, wait: 2000 }),
    'interview-why': keepCreeping(30),

    // Each of these is placed behind the tab click, then held.
    'plan-constraint': portalTab('The roadmap', { at: 260, speed: 30 }),
    'plan-windows': keepCreeping(38),
    'plan-gate': keepCreeping(38),

    offer: portalTab('Your offer', { at: 300, speed: 32 }),
    'offer-why': keepCreeping(36),

    arsenal: portalTab('Your arsenal', { at: 300, speed: 30 }),
    'build-live': keepCreeping(36),
    // ⚠️ A full portalTab, not a keepCreeping. In the webinar cut this beat
    // comes AFTER `tool-live`, which navigates away to the published tool, so a
    // scene that assumed "we are still on the arsenal" quietly filmed the wrong
    // page. Beats are reordered between cuts; scenes must not assume the beat
    // before them.
    'arsenal-limits': portalTab('Your arsenal', { at: 700, speed: 34 }),

    'tool-live': publicPage(`/built/${TOOL_SLUG}`, { at: 240, speed: 34, wait: 1600 }),

    coach: portalTab('Your coach', { at: 240, speed: 24 }),

    guarantee: showCard(
      card({
        eyebrow: 'The First Window Guarantee',
        headline: 'Thirty days,<br>or month two is free',
        sub: 'Your offer, your roadmap, and your first working system inside thirty days. If all three are not in your hands, you do not pay the second month and you keep everything we made.',
      }),
    ),

    close: showCard(CLOSE),
  };
}

/* -------------------------------------------------------------------------- */
/* 4. Run it                                                                   */
/* -------------------------------------------------------------------------- */

async function main() {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(path.join(workDir, 'vo'), { recursive: true });
  log(`\nHUNDREDFOLD FILM · cut "${CUT}" · ${beatsSpec.length} beats\n`);

  /* --- voice first, because the picture is cut to it --- */
  log('1. narration');
  const beats = [];
  for (const [i, b] of beatsSpec.entries()) {
    const file = path.join(workDir, 'vo', `${String(i).padStart(2, '0')}-${b.id}.mp3`);
    const ms = await speak(b.say, file);
    beats.push({ ...b, file, ms });
    log(`   ${String(i + 1).padStart(2)}. ${b.id.padEnd(18)} ${(ms / 1000).toFixed(1)}s`);
  }
  const totalMs = beats.reduce((s, b) => s + b.ms, 0);
  log(`   narration total: ${(totalMs / 1000 / 60).toFixed(2)} min\n`);

  const voList = path.join(workDir, 'vo.txt');
  writeFileSync(voList, beats.map((b) => `file '${b.file.replace(/\\/g, '/')}'`).join('\n'));
  const voTrack = path.join(workDir, 'narration.m4a');
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', voList, '-c:a', 'aac', '-b:a', '192k', voTrack]);
  const voMs = await durationMs(voTrack);
  log(`   narration track: ${(voMs / 1000).toFixed(1)}s`);

  if (has('dry')) {
    log('\n--dry: stopping before the camera. Narration is in ' + workDir);
    return;
  }

  /* --- picture --- */
  log('\n2. camera');
  const cookie = await memberSessionCookie(MEMBER, env.CLIENT_SESSION_SECRET);
  const { raw, timeline, scoreMs } = await shoot({
    workDir,
    base: BASE,
    cookie,
    beats,
    scenes: scenesFor(BASE),
    log,
  });
  const rawMs = await durationMs(raw);
  log(`   raw take: ${(rawMs / 1000).toFixed(1)}s (score ${(scoreMs / 1000).toFixed(1)}s)`);

  // ⚠️ TAIL-ANCHORED TRIM. Chromium's screencast starts a few hundred ms after
  // the context and the lead-in varies per run, so the END of the raw file is
  // the only landmark that does not drift. Taking `voMs + tail` from the end
  // lands beat one's first frame on narration line one's first word.
  const TAIL_MS = 400;
  const fromEnd = (voMs + TAIL_MS) / 1000;
  if (rawMs < voMs) throw new Error(`the take (${rawMs}ms) is shorter than the narration (${voMs}ms)`);

  log('\n3. cut');
  const out = path.join(workDir, `${outName}.mp4`);
  await run('ffmpeg', [
    '-y',
    '-sseof', `-${fromEnd.toFixed(3)}`,
    '-i', raw,
    '-i', voTrack,
    '-map', '0:v:0',
    '-map', '1:a:0',
    // Rule 1's other half: the take was recorded at viewport size, so the
    // upscale to 1080p happens HERE, where lanczos can do it properly.
    //
    // ⚠️ 25fps, NOT 30. Playwright's screencast captures a rock-steady 25.0fps,
    // so encoding to 30 duplicates every fifth frame and lays a periodic hitch
    // over exactly the slow creeps this film is made of. Verify with
    // `ffprobe -count_frames`. [[mms-site-film-rig]]
    '-vf', `scale=1920:1080:flags=lanczos,fps=25,format=yuv420p`,
    '-t', (voMs / 1000).toFixed(3),
    // Screen recordings are mostly static and compress far better than the
    // preset a photographic source needs: crf 20 shipped a 29MB file that crf
    // 24 renders at 17MB with no visible difference on flat UI.
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    out,
  ]);
  const outMs = await durationMs(out);
  log(`   ${path.basename(out)}: ${(outMs / 1000 / 60).toFixed(2)} min, ${(statSync(out).size / 1e6).toFixed(1)} MB`);

  // The poster is pulled from a beat that shows the PRODUCT, not a card, so the
  // play button sits over something worth pressing play on.
  const posterBeat = timeline.find((t) => t.id === 'arsenal') ?? timeline.find((t) => t.id === 'plan-constraint') ?? timeline[2];
  const posterAt = Math.max(0, (posterBeat.startMs + posterBeat.endMs) / 2 - (scoreMs - voMs));
  const poster = path.join(workDir, `${outName}.jpg`);
  await run('ffmpeg', ['-y', '-ss', (posterAt / 1000).toFixed(2), '-i', out, '-frames:v', '1', '-q:v', '3', poster]);

  mkdirSync(publicDir, { recursive: true });
  copyFileSync(out, path.join(publicDir, `${outName}.mp4`));
  copyFileSync(poster, path.join(publicDir, `${outName}.jpg`));
  log(`\n4. shipped to public/video/${outName}.mp4 + .jpg`);

  if (!has('keep')) log(`   (work dir kept at ${workDir}; pass --keep to stop this note)`);
  log('');
}

main().catch((e) => {
  console.error(`\nFILM FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
