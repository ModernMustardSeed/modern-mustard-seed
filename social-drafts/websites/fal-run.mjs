#!/usr/bin/env node
// Seedream v4 art-plate runner for the MMS "storefront" (website) social set.
// Same locked screenprint style as ../missed-calls so the two sets read as one
// family. Usage: node fal-run.mjs <plateKey|all>

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

// NOTE: these keys MUST match the `motif` field on each card in render.mjs.
// render.mjs uses art/<key>.png when the file exists and falls back to its flat
// SVG motif when it does not.
const PLATES = {
  'google-first':
    'A single hand holding a mid-century handheld device flat like a small window. Rising up out of the screen, built of light, stands a tiny complete storefront with an awning, a display window and an open door, glowing warm mustard. Two other small plain storefronts stand dark to either side of it. The rest of the frame is calm empty cream paper.',
  'window-and-door':
    'The exterior of one small American shop seen straight on. On the left a large plate-glass display window with a neat arrangement of goods behind it. On the right the front door standing wide open with warm mustard light spilling across the sidewalk. A single customer walks past the window and turns their body toward the open door. Long afternoon shadows, confident poster composition.',
  'blank-facade':
    'A shuttered small storefront seen straight on, its sign board above the door completely blank and empty, roll shutter halfway down, no lights inside, a scrap of paper blowing past on the empty sidewalk. Cold cobalt blue shadow across the whole facade. Desolate, quiet, high-contrast poster framing with heavy negative space above.',
  'awning-shop':
    'One small American shop seen straight on from the sidewalk, filling the frame. A bold striped awning in mustard and signal red runs across the top, a clean plate-glass display window on the left, and a warm mustard front door standing slightly open on the right. A hand-lettered blank sign hangs above. Confident symmetrical poster composition, generous cream sky above the awning.',
  'card-catalog':
    'A wall of vintage library card catalog drawers filling the frame, dense grid of small brass-handled drawers. One drawer is pulled open at the center and a single index card is being lifted out by a calm simplified mechanical robot hand made of clean geometric segments. The open drawer glows warm mustard from inside. Warm and human rather than cold or futuristic.',
  'clipboard-grade':
    'A wooden desk seen from above at a slight angle. On it a clipboard holding a checklist of simple ruled lines, a hand marking one large confident check mark in signal red. Beside the clipboard sits a small architectural model of a storefront, the size of a toy, lit warm mustard. A pencil and a coffee ring on the desk. Honest workbench energy.',
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
  fs.mkdirSync(ART, { recursive: true });
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
