#!/usr/bin/env node
// Set fourteen: THE TWELVE WINDOWS. Stained glass plates for twelve KJV verses,
// generated on the Codex subscription (free), one at a time (machine-wide lock).
// Plate 01 is the approved direction-study sample (scripture-study/art/glass.png),
// copied in by this script. Symbolic glass only: no depiction of Jesus, ever.
// Usage: node gen-art.mjs            -> art/<key>.png (skips plates already on disk)
//        node gen-art.mjs 03-eagle   -> regenerate just that plate

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage } from '../../scripts/codex-image.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(HERE, 'art');
fs.mkdirSync(ART, { recursive: true });

// Window 01 is the approved study sample, carried over untouched.
const SAMPLE = path.join(HERE, '..', 'scripture-study', 'art', 'glass.png');
const PLATE01 = path.join(ART, '01-lamp.png');
if (!fs.existsSync(PLATE01) && fs.existsSync(SAMPLE)) {
  fs.copyFileSync(SAMPLE, PLATE01);
  console.log('COPY 01-lamp (approved study sample)');
}

const STYLE =
  'Luminous stained glass window panel in rich jewel tones: ruby, amber, emerald, deep cobalt and violet cathedral glass pieces separated by bold black lead came lines, ' +
  'light streaming through the glass from behind, subtle glass texture and bubbles, radiant glow, full-bleed composition, museum-quality cathedral window art. ' +
  'Absolutely no text, no lettering, no words, no numbers anywhere. No human faces. ';

const PLATES = [
  ['02-shepherd', 'A shepherd\'s crook and a single white lamb resting in a glass meadow of emerald hills under an amber morning sky, a small stream of cobalt glass.'],
  ['03-eagle', 'A great eagle rising on outstretched wings into an enormous amber and gold glass sun, wind currents as sweeping curved lead lines, cobalt sky.'],
  ['04-be-still', 'A perfectly still mountain lake in deep cobalt and violet night glass, one bright morning star reflected in the water, dark emerald pines at the shore.'],
  ['05-rest', 'A wooden yoke laid down at the foot of an olive tree, a white dove descending in a shaft of amber glass light, dawn glass in soft rose and gold.'],
  ['06-paths', 'A winding path of golden glass forking through emerald hills, a single radiant star above casting a beam that lights one branch of the fork.'],
  ['07-strength', 'A mighty oak tree in a storm, branches bending but trunk unbroken, its roots glowing amber and reaching deep into the rock beneath, wind as silver curved lead lines.'],
  ['08-shine', 'A lantern blazing on a tall stand above a small city on a hill at dusk, its amber rays reaching every rooftop, deep cobalt evening glass around it.'],
  ['09-hills', 'A range of great violet and cobalt glass mountains at dawn, a burst of golden light breaking over the highest peak, a small figure silhouette looking up from the valley.'],
  ['10-courage', 'A burning torch held high before a wide river crossing, the far bank glowing with promise in amber and emerald glass, deep water in bold cobalt pieces.'],
  ['11-light', 'An enormous radiant sun of amber and gold glass rising over a dark sleeping world, its rays as great wedges of light glass driving back deep violet night pieces.'],
  ['12-mustard-tree', 'An immense mustard tree in full glory as the center of a round rose window, branches filled with nesting birds of every color, a tiny seed glowing at its roots, radiating petals of amber and ruby glass.'],
];

const only = process.argv[2];
const jobs = only ? PLATES.filter(([k]) => k === only) : PLATES;
if (!jobs.length && only !== '01-lamp') { console.error(`no plate named ${only}`); process.exit(1); }

let failed = 0;
for (const [key, scene] of jobs) {
  const out = path.join(ART, `${key}.png`);
  if (!only && fs.existsSync(out) && fs.statSync(out).size > 50_000) {
    console.log(`SKIP ${key} (exists)`);
    continue;
  }
  const t = Date.now();
  const r = await generateImage({
    prompt: `${STYLE}Scene: ${scene}`,
    out,
    width: 1280,
    height: 1000,
    format: 'png',
    log: (m) => console.error(`[${key}] ${m}`),
  });
  if (r.ok) console.log(`OK ${key} ${Math.round((Date.now() - t) / 1000)}s ${r.bytes} bytes`);
  else { console.log(`FAIL ${key}: ${r.error}`); failed++; }
}
console.log(failed ? `DONE with ${failed} failures` : 'DONE all plates');
process.exit(failed ? 1 : 0);
