#!/usr/bin/env node
// Generate the 12 art plates for sets six and eight on fal (Seedream v4).
// Probe rule per media-generation-pipeline.md: run ONE job first with a 90s
// ceiling; IN_QUEUE that never advances = locked wallet, stop immediately.
// Usage: node gen-art.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEY = fs.readFileSync(path.join(process.env.USERPROFILE, '.claude', 'fal.env'), 'utf8').trim();
const MODEL = 'fal-ai/bytedance/seedream/v4/text-to-image';

const FILM = (scene, gold) =>
  `Vintage engraved illustration for a prestige film poster. ${scene} Fine crosshatched etching linework, dramatic single light source, deep warm-black ink on aged bone paper (hex F2EDE3), subtle antique gold spot accents only on ${gold}. Centered composition with generous empty margins top and bottom for typography. Absolutely no text, no letters, no numbers, no words, no watermark.`;

const SPOT = (subject) =>
  `Vintage newspaper editorial spot illustration, hand-engraved woodcut style, pure black ink linework on a plain pure-white background, single subject centered with wide empty margins. ${subject} Absolutely no text, no letters, no numbers, no words, no watermark.`;

const JOBS = [
  // Set six: Now Showing (reviews), portrait film plates
  { out: 'reviews/art/01-everyone.png', w: 1024, h: 1536, prompt: FILM('A packed 1940s cinema audience seen from behind, rows of silhouetted heads all facing a glowing blank movie screen.', 'the screen glow') },
  { out: 'reviews/art/02-four-stars.png', w: 1024, h: 1536, prompt: FILM('A single five-pointed star trophy on a marble pedestal under one hard spotlight beam, heavy art deco theater curtain behind it.', 'the star') },
  { out: 'reviews/art/03-fresh-ink.png', w: 1024, h: 1536, prompt: FILM('A bill poster worker with a brush pasting a fresh blank poster sheet over layers of older torn and faded blank posters on a brick wall.', 'the fresh sheet') },
  { out: 'reviews/art/04-box-office.png', w: 1024, h: 1536, prompt: FILM('An ornate 1930s cinema box office ticket booth at night, warm light glowing from inside the window, a velvet rope in front, empty street.', 'the booth trim') },
  { out: 'reviews/art/05-say-something.png', w: 1024, h: 1536, prompt: FILM('A standing microphone alone on an empty stage in one hard spotlight, dark theater seats faintly visible in the foreground.', 'the microphone head') },
  { out: 'reviews/art/06-take-two.png', w: 1024, h: 1536, prompt: FILM('A completely blank wooden film clapperboard held mid-clap by two hands, close up, no chalk writing on the slate.', 'the clapper stripes') },
  // Set eight: The Column (ask-mustard), square woodcut spots
  { out: 'ask-mustard/art/01-every-day.png', w: 1024, h: 1024, prompt: SPOT('A stack of folded newspapers tied with twine.') },
  { out: 'ask-mustard/art/02-tiktok.png', w: 1024, h: 1024, prompt: SPOT('An old tabletop television set with rabbit-ear antennas and a blank screen.') },
  { out: 'ask-mustard/art/03-what-it-costs.png', w: 1024, h: 1024, prompt: SPOT('A classic two-pan balance scale, slightly tipped.') },
  { out: 'ask-mustard/art/04-the-robot.png', w: 1024, h: 1024, prompt: SPOT('A friendly vintage tin robot politely tipping a bowler hat.') },
  { out: 'ask-mustard/art/05-the-gloves.png', w: 1024, h: 1024, prompt: SPOT('A pair of worn leather boxing gloves hanging by their laces from a single nail.') },
  { out: 'ask-mustard/art/06-slow-season.png', w: 1024, h: 1024, prompt: SPOT('A paper seed packet with a garden trowel and a few spilled seeds.') },
];

async function submit(job) {
  const res = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: job.prompt, image_size: { width: job.w, height: job.h }, num_images: 1 }),
  });
  const body = await res.json();
  if (!res.ok || !body.status_url) throw new Error(`submit ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function waitAndSave(job, sub, ceilingMs) {
  const t0 = Date.now();
  let sawProgress = false;
  for (;;) {
    if (Date.now() - t0 > ceilingMs && !sawProgress) throw new Error('IN_QUEUE past ceiling, treat as locked');
    if (Date.now() - t0 > 300000) throw new Error('timed out at 5 minutes');
    const st = await (await fetch(sub.status_url, { headers: { Authorization: `Key ${KEY}` } })).json();
    if (st.status === 'COMPLETED') break;
    if (st.status === 'IN_PROGRESS') sawProgress = true;
    if (st.status === 'FAILED' || st.detail) throw new Error(`status: ${JSON.stringify(st).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const result = await (await fetch(sub.response_url, { headers: { Authorization: `Key ${KEY}` } })).json();
  const url = result.images?.[0]?.url;
  if (!url) throw new Error(`no image url: ${JSON.stringify(result).slice(0, 300)}`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const outPath = path.join(HERE, '..', job.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log(`OK  ${job.out}  (${(buf.length / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

// Probe: first job alone, 90s IN_QUEUE ceiling.
console.log('probe:', JOBS[0].out);
await waitAndSave(JOBS[0], await submit(JOBS[0]), 90000);

// Batch the rest, concurrency 3. A mid-batch failure reports and continues so
// already-billed requests are never re-run blindly.
const rest = JOBS.slice(1);
const failures = [];
let idx = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    for (;;) {
      const i = idx++;
      if (i >= rest.length) return;
      const job = rest[i];
      try {
        await waitAndSave(job, await submit(job), 120000);
      } catch (e) {
        failures.push(`${job.out}: ${e.message}`);
        console.error(`FAIL ${job.out}: ${e.message}`);
      }
    }
  }),
);

if (failures.length) {
  console.error(`\n${failures.length} failed:\n` + failures.join('\n'));
  process.exit(1);
}
console.log('\nall 12 plates written');
