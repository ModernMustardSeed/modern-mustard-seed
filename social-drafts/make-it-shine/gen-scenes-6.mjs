#!/usr/bin/env node
// Six dusk scene plates for the Lit Window set, one per featured build.
// Same painterly scaffold as art/storefront-dusk.png. Blank signage everywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEY = fs.readFileSync(path.join(process.env.USERPROFILE, '.claude', 'fal.env'), 'utf8').trim();
const MODEL = 'fal-ai/bytedance/seedream/v4/text-to-image';

const STYLE =
  'Cinematic editorial illustration, painterly and richly colored, blue-hour dusk, warm golden light glowing from inside and spilling outward, deep teal evening sky, atmospheric depth, inviting. All signage completely blank, no lettering anywhere. Absolutely no text, no letters, no numbers, no words, no watermark.';

const SCENES = [
  { key: 'scene-honey', prompt: `A roadside honey farm stand at dusk, warm light glowing across wooden shelves lined with amber honey jars, string lights under the stand roof, wildflower meadow around it, a blank wooden hanging sign. ${STYLE}` },
  { key: 'scene-apparel', prompt: `A small boutique clothing storefront at dusk, garments silhouetted warm in the big display window, striped awning, a blank sign board above the glass. ${STYLE}` },
  { key: 'scene-roofing', prompt: `A craftsman house at dusk with a brand-new shingle roof catching the last light, warm porch light glowing, a work ladder leaning against the eave, blue evening street. ${STYLE}` },
  { key: 'scene-restaurant', prompt: `A small family restaurant storefront at dusk, red paper lanterns glowing warm over the doorway, steam drifting in the bright window, a blank sign board. ${STYLE}` },
  { key: 'scene-lodge', prompt: `A small timber lodge entrance at dusk in the mountains, warm cabin windows glowing, pines behind, a blank hanging wooden sign by the gravel path. ${STYLE}` },
  { key: 'scene-garden', prompt: `A garden nursery greenhouse glowing warm at dusk, plants silhouetted inside the glass panes, string lights along the ridge, wheelbarrow by the door, a blank sandwich-board sign. ${STYLE}` },
];

async function run(job) {
  const res = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: job.prompt, image_size: { width: 1024, height: 1536 }, num_images: 1 }),
  });
  const sub = await res.json();
  if (!res.ok || !sub.status_url) throw new Error(`submit ${res.status}: ${JSON.stringify(sub).slice(0, 200)}`);
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 150000) throw new Error(`${job.key}: timed out`);
    const st = await (await fetch(sub.status_url, { headers: { Authorization: `Key ${KEY}` } })).json();
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.detail) throw new Error(`${job.key}: ${JSON.stringify(st).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const result = await (await fetch(sub.response_url, { headers: { Authorization: `Key ${KEY}` } })).json();
  const buf = Buffer.from(await (await fetch(result.images[0].url)).arrayBuffer());
  fs.writeFileSync(path.join(HERE, 'art', `${job.key}.png`), buf);
  console.log(`OK ${job.key} (${(buf.length / 1024).toFixed(0)} KB)`);
}

// probe with the first, then the rest at concurrency 3
await run(SCENES[0]);
let i = 1;
const fails = [];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    for (;;) {
      const n = i++;
      if (n >= SCENES.length) return;
      try { await run(SCENES[n]); } catch (e) { fails.push(e.message); console.error('FAIL', e.message); }
    }
  }),
);
if (fails.length) process.exit(1);
console.log('all scenes written');
