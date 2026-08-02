#!/usr/bin/env node
// Set thirteen: THE MUSTARD SEED TWENTY. Twenty WPA-style Kingdom-trade poster
// plates, generated on the Codex subscription (free), one at a time (machine-wide lock).
// Sister set to main-street-twenty: same style constant, faith scenes.
// Usage: node gen-art.mjs           -> art/<key>.png (skips plates already on disk)
//        node gen-art.mjs 09-gardener -> regenerate just that plate

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
  ['01-sower', 'A farmer in denim overalls striding across a plowed hillside field at sunrise, broadcasting seed in great sweeping arcs, the seed as golden geometric dots scattering over every kind of ground, stylized mountains behind.'],
  ['02-shepherd', 'A shepherd with a lantern and crook climbing a dark snowy hillside at night away from a full sheepfold below, searching, one small lost sheep on a distant rocky crag, falling stylized snowflakes.'],
  ['03-fisherman', 'A fisherman standing in a small wooden boat at dawn casting a circular throw net, the net opening as a geometric mesh against an enormous stylized rising sun, calm lake water in flat bands.'],
  ['04-vinedresser', 'A vinedresser pruning a heavy grapevine row with hand shears, cut canes on the ground, enormous stylized grape clusters, terraced vineyard hills rolling behind in flat layered bands.'],
  ['05-builder', 'A builder standing in a deep foundation trench laying a massive cornerstone onto exposed bedrock, soil strata in bold flat bands above the rock, the timber skeleton of a house rising against the sky.'],
  ['06-baker', 'A woman baker kneading a great mound of dough at a wooden table before dawn, three flour sacks beside her, bowls of rising dough, warm lamplight and stylized window light.'],
  ['07-carpenter', 'A carpenter planing a long beam at a workshop bench, curled shavings flying, hand tools hung on the wall in bold flat shapes, a single dove perched on the sunlit windowsill.'],
  ['08-potter', 'A potter at a kick wheel re-centering a slumped clay vessel with both hands, shelves of finished jars and pitchers behind in bold flat shapes, wet clay sheen, warm workshop light.'],
  ['09-gardener', 'A woman gardener kneeling among dew-heavy garden rows at first light beside an old stone wall, a great shaft of golden sunrise breaking over the wall, tools at her side, an empty garden path behind her.'],
  ['10-harvester', 'A woman harvester binding sheaves of wheat with a sickle at her belt in a vast golden field, a few tiny distant figures working far away, an enormous sky with stylized clouds.'],
  ['11-lamplighter', 'A lamplighter on a wooden ladder lighting a cast iron street lamp at dusk on a small town main street, the lamp casting a warm geometric cone, a row of already-lit lamps glowing down the street.'],
  ['12-pearl-merchant', 'A merchant at a wooden counter holding one enormous luminous pearl up to the lamplight with both hands, emptied display trays and open cases all around the shop, everything else sold off.'],
  ['13-treasure-finder', 'A joyful man kneeling in a freshly plowed field lifting the lid of an old buried strongbox, warm golden light flooding up from inside it, a spade stuck in the earth, a giant stylized sunburst behind.'],
  ['14-net-mender', 'Two fishermen seated on a wooden dock at morning mending an enormous draped fishing net with wooden needles, the net as sweeping geometric mesh, moored boats and flat water bands behind.'],
  ['15-tentmaker', 'A tentmaker stitching heavy canvas across a workbench by lamplight, bolts of woven cloth stacked in bold flat shapes, awl and cords hanging, a finished tent silhouette outside the window.'],
  ['16-dyer', 'A woman dyer lifting a dripping length of deep royal purple cloth from a stone dye vat, long purple lengths drying on lines overhead, the single rich purple accent glowing against the limited palette, warm courtyard light.'],
  ['17-seamstress', 'A woman seamstress at a treadle sewing machine in warm lamplight, finished coats and tunics hanging on wall hooks around her in bold flat shapes, spools of thread lined on the sill.'],
  ['18-watchman', 'A watchman with a lantern standing on a high city wall walkway before dawn, silhouetted against an immense sky where the first band of golden morning light breaks the horizon, sleeping rooftops below.'],
  ['19-physician', 'A woman physician with a leather satchel climbing farmhouse porch steps in the rain at night, a warm lit doorway open and waiting above her, her free hand on the rail, stylized rain in geometric strokes.'],
  ['20-mustard-seed', 'An enormous stylized mustard tree towering over a hillside, its branches filled with flocks of nesting birds in bold flat shapes, a tiny lone sower figure at its roots, a giant golden sun behind the crown.'],
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
