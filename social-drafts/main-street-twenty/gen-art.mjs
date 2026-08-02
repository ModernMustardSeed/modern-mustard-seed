#!/usr/bin/env node
// Set twelve: THE MAIN STREET TWENTY. Twenty WPA-style trade poster plates,
// generated on the Codex subscription (free), one at a time (machine-wide lock).
// Usage: node gen-art.mjs           -> art/<key>.png (skips plates already on disk)
//        node gen-art.mjs 03-roofer -> regenerate just that plate

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage } from '../../scripts/codex-image.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(HERE, 'art');
fs.mkdirSync(ART, { recursive: true });

const STYLE =
  'Flat screenprint poster illustration in the 1930s WPA Federal Art Project style. ' +
  'Bold simplified shapes, flat layered ink colors with subtle print misregistration, coarse paper-grain texture. ' +
  'Limited palette only: warm cream paper #F2EAD8, deep pine ink #26321F, golden mustard #F5B700, burnt rust #C86A45, lake blue #3B6B8A, muted sage #8FA98F. ' +
  'Heroic low angle, monumental dignified worker, strong diagonal composition, stylized geometric light. ' +
  'Absolutely no text, no lettering, no words, no signage, no logos, no numbers anywhere in the image. ' +
  'Full-bleed composition with the figure weighted toward the center, museum-quality vintage travel poster art.';

const PLATES = [
  ['01-plumber', 'A plumber kneeling under an old farmhouse kitchen sink, pipe wrench raised to a copper joint, geometric radiating pipes across the wall, a toolbox open on checkered linoleum, warm lamplight.'],
  ['02-electrician', 'A line electrician high on a wooden utility pole at sunrise, silhouetted against a giant stylized mustard sun with radiating power lines sweeping to the horizon of a small town below.'],
  ['03-roofer', 'A roofer astride the steep ridge of a gabled roof driving a nail, courses of shingles as bold geometric bands, an enormous stylized sun with flat rays behind, small town rooftops below.'],
  ['04-hvac', 'An HVAC technician carrying a heavy condenser unit up exterior wooden stairs in falling stylized snowflakes, breath visible, warm glowing windows of the house above, cold lake-blue dusk.'],
  ['05-landscaper', 'A landscaper planting a young sapling tree on a terraced hillside lawn, wheelbarrow of soil beside, rolled sod in geometric spirals, stylized clouds and a low mustard sun.'],
  ['06-painter', 'A house painter high on a wooden ladder cutting a crisp band of mustard paint across the clapboard siding of a tall Victorian house, drop cloths below, brush mid-stroke.'],
  ['07-carpenter', 'A carpenter at a sawhorse driving a hand plane along a long timber beam, curled wood shavings flying, the geometric skeleton of a timber-framed barn rising behind against the sky.'],
  ['08-mechanic', 'A mechanic standing under a vintage pickup truck raised on a shop lift, work lamp casting a cone of warm light, wrench in hand, tires and tools in bold flat shapes around the garage.'],
  ['09-barber', 'A barber mid-snip behind a classic barber chair with a caped customer, scissors and comb raised, a striped barber pole motif and a wall of geometric mirrors, warm shop light.'],
  ['10-baker', 'A baker before dawn pulling a wooden peel of round bread loaves from a glowing brick deck oven, stylized curls of steam rising, sacks of flour stacked in bold flat shapes.'],
  ['11-florist', 'A florist at a wooden workbench gathering an enormous armful of stylized blooms, galvanized buckets of cut stems at their feet, hanging dried bundles above, soft morning window light.'],
  ['12-cafe', 'A barista working a vintage lever espresso machine, geometric curls of steam rising past a big front window with morning sun rays, cups stacked in bold flat shapes on the counter.'],
  ['13-welder', 'A welder in a dropped mask kneeling at a steel beam joint, a magnificent geometric shower of mustard sparks fanning upward, heavy gloves, dark workshop with lake-blue shadows.'],
  ['14-cleaner', 'A house cleaner throwing open tall curtains so a great shaft of stylized sunlight floods a tidy room, dust motes as geometric flecks in the beam, a caddy of supplies at their feet.'],
  ['15-mover', 'Two movers carrying a large sofa up the diagonal of a brownstone stoop, bodies in strong counterpoise, stacked boxes below, a moving truck with open ramp at the curb.'],
  ['16-excavator', 'An operator in the cab of an excavator carving a clean bench of earth from a hillside, layered soil strata in bold flat bands, stylized mountain range and big sky behind.'],
  ['17-plow', 'A snow plow truck with wing blade throwing a great sculptural wave of snow along a small town main street before dawn, streetlamps as glowing geometric cones, driver silhouetted in the cab.'],
  ['18-rancher', 'A rancher on horseback pushing cattle through a frosted meadow at first light, fence line running to stylized mountains, an enormous pale mustard sun, breath of horse and cattle visible.'],
  ['19-cook', 'A short-order cook at a glowing flat-top grill seen through a diner pass window, spatula raised, stylized steam and flame curls, plates lined on the pass, warm tungsten light.'],
  ['20-handyman', 'A handyman on a step ladder at golden hour fixing a porch light on a craftsman house, tool belt heavy with flat-shaped tools, the fixed lamp casting warm geometric rays into blue dusk.'],
];

const only = process.argv[2];
const jobs = only ? PLATES.filter(([k]) => k === only) : PLATES;
if (!jobs.length) { console.error(`no plate named ${only}`); process.exit(1); }

let failed = 0;
for (const [key, scene] of jobs) {
  const out = path.join(ART, `${key}.png`);
  if (!only && fs.existsSync(out) && fs.statSync(out).size > 50_000) {
    console.log(`SKIP ${key} (exists)`);
    continue;
  }
  const t = Date.now();
  const r = await generateImage({
    prompt: `${STYLE} Scene: ${scene}`,
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
