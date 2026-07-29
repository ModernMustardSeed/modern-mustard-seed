#!/usr/bin/env node
// Regenerate the three plates that failed text-check on the first pass.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEY = fs.readFileSync(path.join(process.env.USERPROFILE, '.claude', 'fal.env'), 'utf8').trim();
const MODEL = 'fal-ai/bytedance/seedream/v4/text-to-image';

const JOBS = [
  {
    out: 'reviews/art/03-fresh-ink.png', w: 1024, h: 1536,
    prompt:
      'Vintage engraved illustration for a prestige film poster. A bill poster worker with a brush pasting a fresh completely blank white poster sheet over layers of older torn blank posters on a brick wall, every poster surface plain and empty. Fine crosshatched etching linework, dramatic single light source, deep warm-black ink on aged bone paper (hex F2EDE3), subtle antique gold spot accents only on the fresh sheet. Full-bleed composition, artwork fills the entire frame edge to edge with no border, no frame line, no caption area, no engraving caption, no artist signature. Absolutely no text, no letters, no numbers, no words, no watermark.',
  },
  {
    out: 'ask-mustard/art/01-every-day.png', w: 1024, h: 1024,
    prompt:
      'Vintage newspaper editorial spot illustration, hand-engraved woodcut style, pure black ink linework on a plain pure-white background, single subject centered with wide empty margins. A rooster standing on a wooden fence post, head thrown back mid-crow. Absolutely no text, no letters, no numbers, no words, no watermark.',
  },
  {
    out: 'ask-mustard/art/06-slow-season.png', w: 1024, h: 1024,
    prompt:
      'Vintage newspaper editorial spot illustration, hand-engraved woodcut style, pure black ink linework on a plain pure-white background, single subject centered with wide empty margins. A garden trowel standing upright in a small mound of soil with a tiny sprouting seedling of two leaves beside it. Absolutely no text, no letters, no numbers, no words, no watermark.',
  },
];

for (const job of JOBS) {
  const res = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: job.prompt, image_size: { width: job.w, height: job.h }, num_images: 1 }),
  });
  const sub = await res.json();
  if (!res.ok || !sub.status_url) throw new Error(`submit ${res.status}: ${JSON.stringify(sub).slice(0, 300)}`);
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 180000) throw new Error(`${job.out}: timed out`);
    const st = await (await fetch(sub.status_url, { headers: { Authorization: `Key ${KEY}` } })).json();
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.detail) throw new Error(`${job.out}: ${JSON.stringify(st).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const result = await (await fetch(sub.response_url, { headers: { Authorization: `Key ${KEY}` } })).json();
  const buf = Buffer.from(await (await fetch(result.images[0].url)).arrayBuffer());
  fs.writeFileSync(path.join(HERE, '..', job.out), buf);
  console.log(`OK  ${job.out}  (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log('retries done');
