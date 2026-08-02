#!/usr/bin/env node
// Direction study for set fourteen: SCRIPTURE ON THE CARD. Three sample plates,
// one per direction, same verse subject (Psalm 119:105, lamp and path) so the
// choice is about the world, not the content.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage } from '../../scripts/codex-image.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(HERE, 'art');
fs.mkdirSync(ART, { recursive: true });

const PLATES = [
  ['glass', 'Luminous stained glass window panel in rich jewel tones: a radiant golden oil lamp above a winding path through deep cobalt night hills, ruby and amber and emerald cathedral glass pieces separated by bold black lead came lines, light streaming through the glass from behind, subtle glass texture and bubbles, full-bleed composition. Absolutely no text, no lettering, no words, no numbers anywhere.'],
  ['woodcut', 'Antique woodcut broadside print illustration: a burning oil lamp on a stone beside a winding path through wheat fields toward distant hills, heavy hand-carved black ink linework with visible wood grain and rough chisel texture on warm cream paper, a single vermillion red accent in the lamp flame and sun, in the manner of early hymnal and almanac woodcuts, full-bleed. Absolutely no text, no lettering, no words, no numbers anywhere.'],
  ['illumination', 'Illuminated manuscript ornament panel: a gilded golden oil lamp medallion at center surrounded by intricate gold leaf filigree vines, ivy scrolls and small gold stars on a deep midnight blue ground, fine red and cream accent details, burnished gold leaf catching light, in the manner of medieval book of hours illumination, full-bleed ornamental composition. Absolutely no text, no lettering, no words, no numbers anywhere.'],
];

let failed = 0;
for (const [key, scene] of PLATES) {
  const out = path.join(ART, `${key}.png`);
  if (fs.existsSync(out) && fs.statSync(out).size > 50_000) {
    console.log(`SKIP ${key} (exists)`);
    continue;
  }
  const t = Date.now();
  const r = await generateImage({
    prompt: scene,
    out,
    width: 1280,
    height: 1000,
    format: 'png',
    log: (m) => console.error(`[${key}] ${m}`),
  });
  if (r.ok) console.log(`OK ${key} ${Math.round((Date.now() - t) / 1000)}s`);
  else { console.log(`FAIL ${key}: ${r.error}`); failed++; }
}
console.log(failed ? `DONE with ${failed} failures` : 'DONE all samples');
process.exit(failed ? 1 : 0);
