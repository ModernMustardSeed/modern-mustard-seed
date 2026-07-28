#!/usr/bin/env node
// Seedream v4 art-plate runner for the MMS "missed calls" social set.
// Usage: node fal-run.mjs <plateKey|all>
// Submits to fal queue, polls the status_url the submit hands back (never a
// hand-built URL), downloads the PNG into ./art. Treats a stuck IN_QUEUE as a
// locked wallet after 90s and exits non-zero instead of hanging.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(HERE, 'art');
const MODEL = 'fal-ai/bytedance/seedream/v4/text-to-image';
const KEY = fs.readFileSync('C:/Users/moder/.claude/fal.env', 'utf8').trim();

const STYLE = [
  'Mid-century modern American screenprint poster illustration, 1955 commercial advertising art.',
  'Risograph print texture with visible halftone dot fields and slight offset misregistration on the edges.',
  'Strictly limited four-color palette: warm cream paper background (#FBF6EA), deep ink black linework (#161616),',
  'mustard yellow (#F5B700), signal red (#E0301E), sparing cobalt blue accents (#1E50C8).',
  'Flat color fills, absolutely no gradients, confident inked outlines, simplified geometric shapes,',
  'bold poster composition with generous negative space, grainy printed-paper feel.',
  'No text, no lettering, no numbers, no signage, no logos, no watermark, no captions, no UI.',
].join(' ');

const PLATES = {
  'phone-counter':
    'The counter of a small American shop, empty, nobody behind it. A black mid-century rotary desk phone sits ringing on the wooden counter, receiver in its cradle, three small motion arcs beside it to show it is ringing. Warm afternoon light rakes across from a window. A closed ledger and a coffee mug beside the phone. The composition centers the phone with wide empty space above it.',
  'under-sink':
    'A tradesperson lying on their back under a kitchen sink, only their torso, arm and work boots visible, gripping a pipe wrench, cabinet doors open around them. Above and to the right, on the counter edge, a phone lies ringing with small motion arcs radiating from it, out of their reach. Toolbox open on the floor. Honest working-hands energy.',
  'night-shop':
    'A small storefront seen from the dark street at night, lights off inside, chairs stacked, a hand-lettered blank sign hanging in the door. Through the glass, one single object glows warm on the counter: a telephone, lit from within like a lamp, casting a mustard pool of light. Deep ink-black night, stars as tiny halftone specks.',
  'switchboard':
    'A vintage telephone exchange switchboard seen head-on, dense grid of jacks and patch holes, a tangle of curling cables, two calm human hands plugging a cable into a jack. Warm and human rather than industrial, one cable glowing mustard yellow as the connection completes. Confident poster symmetry.',
  'receiver-burst':
    'A single black telephone handset receiver floating at a dynamic diagonal in the center of the frame, curled cord whipping behind it, with bold concentric halftone rings radiating outward from the earpiece across the whole poster like a sound burst. Heroic, graphic, high-contrast, poster-scale.',
  'two-doors':
    'A customer standing on a sidewalk holding a phone to their ear, seen from behind at three-quarter view, facing two adjacent storefronts. The left shop is dark with its door shut. The right shop has its door standing wide open with warm mustard light spilling out onto the pavement, and the customer is turning toward it. Long afternoon shadows.',
};

const HEADERS = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };

async function makePlate(key) {
  const prompt = `${PLATES[key]} ${STYLE}`;
  const submit = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      prompt,
      image_size: { width: 1536, height: 1152 },
      num_images: 1,
      enable_safety_checker: false,
    }),
  });
  const job = await submit.json();
  if (!job.request_id) throw new Error(`${key}: submit failed ${JSON.stringify(job).slice(0, 300)}`);
  console.log(`[${key}] queued ${job.request_id}`);

  const deadline = Date.now() + 95_000;
  let status;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const res = await fetch(job.status_url, { headers: HEADERS });
    status = await res.json();
    if (status.status === 'COMPLETED') break;
    if (status.detail) throw new Error(`[${key}] ${JSON.stringify(status.detail).slice(0, 200)}`);
  }
  if (status?.status !== 'COMPLETED') {
    throw new Error(`[${key}] stuck in ${status?.status} past 95s. Treat the fal wallet as LOCKED.`);
  }

  const out = await (await fetch(job.response_url, { headers: HEADERS })).json();
  const url = out?.images?.[0]?.url;
  if (!url) throw new Error(`[${key}] no image in result ${JSON.stringify(out).slice(0, 300)}`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const file = path.join(ART, `${key}.png`);
  fs.writeFileSync(file, buf);
  console.log(`[${key}] saved ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
  return file;
}

const arg = process.argv[2];
const keys = !arg || arg === 'all' ? Object.keys(PLATES) : arg.split(',');
const results = await Promise.allSettled(keys.map(makePlate));
let failed = 0;
results.forEach((r, i) => {
  if (r.status === 'rejected') {
    failed++;
    console.error(`FAILED ${keys[i]}: ${r.reason.message}`);
  }
});
process.exit(failed ? 1 : 0);
