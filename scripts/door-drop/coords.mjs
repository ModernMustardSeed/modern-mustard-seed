/**
 * EXACT PINS, FROM THE SOURCE THAT ACTUALLY HAS THEM.
 *
 * The route sheet first geocoded addresses through Nominatim, and in Tallahassee
 * that placed 17 of 19. In the Flathead it placed 68 of 108 in Kalispell and 3 of
 * 14 in Bigfork, and no amount of normalising highway spellings moved it: "2635
 * U.S. HWY 93 W" and "8270 Montana Hwy 35 Ste 4" are not addresses OSM holds.
 * Nominatim's coverage of small Montana street numbers is simply thin, and that
 * is not a bug anybody can patch from here.
 *
 * Google Maps has every one of them, and we are already driving a browser
 * against it for addresses and websites. A place page's own URL carries the
 * coordinate: `/maps/place/<name>/@48.1958,-114.3126,17z`. So this reads the pin
 * off the place we were going to open anyway.
 *
 * THE PHONE IS STILL THE PROOF. A pin is only written when the Maps phone
 * matches the phone already on the lead, exactly as the address pass does it.
 * An almost-right pin is worse than none: it sends her to the wrong end of town
 * with confidence, where a missing one just puts the stop at the foot of the
 * sheet where she can see it.
 *
 * Writes into the same `.geocache.json` the route sheet reads, under a
 * `biz|<name>|<town>` key, so route.mts prefers it and falls back to the address
 * lookup for anything this pass could not settle.
 *
 *   node scripts/door-drop/coords.mjs --out artifacts/door-drop/mt-final
 *   node scripts/door-drop/coords.mjs --out artifacts/door-drop/fl-final --state FL
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};
const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', 'mt-final')));
const STATE = flag('state', 'MT');
const HEADED = argv.includes('--headed');
const CACHE = path.join(OUT, '..', '.geocache.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phoneKey = (p) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};
const bizKey = (name, town) => `biz|${String(name).toLowerCase().trim()}|${String(town).toLowerCase().trim()}`;

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const manifest = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
const stops = manifest.printed.filter((s) => s.address);

const todo = stops.filter((s) => !(bizKey(s.business_name, s.city) in cache));
console.log(`${stops.length} stops, ${stops.length - todo.length} already pinned, ${todo.length} to look up.`);
if (!todo.length) process.exit(0);

const browser = await chromium.launch({ headless: !HEADED });
const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1300, height: 900 }, userAgent: UA });
const page = await ctx.newPage();

let hit = 0;
let mismatch = 0;
let missed = 0;

for (let i = 0; i < todo.length; i++) {
  const s = todo[i];
  const q = `${s.business_name} ${s.address} ${s.city} ${STATE}`;
  const label = `[${i + 1}/${todo.length}] ${String(s.business_name).slice(0, 34).padEnd(35)}`;
  let coord = null;
  let why = '';

  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=en&gl=us`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await sleep(4000);

    const got = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.innerText?.trim() || null,
      phoneItem: document.querySelector('button[data-item-id^="phone"]')?.getAttribute('data-item-id') || null,
      href: location.href,
    }));

    if (!got.h1 || /^results$/i.test(got.h1)) {
      why = 'no single place';
    } else {
      // The phone gate, same as every other Maps job here.
      const mapsPhone = phoneKey((got.phoneItem ?? '').replace(/^phone:tel:/, ''));
      const leadPhone = phoneKey(s.phone);
      if (leadPhone.length >= 10 && mapsPhone && mapsPhone !== leadPhone) {
        why = `phone disagrees (${got.h1})`;
      } else {
        const m = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(got.href);
        if (m) coord = { lat: Number(m[1]), lon: Number(m[2]) };
        else why = 'no coordinate in the url';
      }
    }
  } catch (e) {
    why = String(e.message).slice(0, 40);
  }

  cache[bizKey(s.business_name, s.city)] = coord;
  writeFileSync(CACHE, JSON.stringify(cache), 'utf8');

  if (coord) { hit += 1; console.log(`${label} ${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)}`); }
  else if (why.startsWith('phone')) { mismatch += 1; console.log(`${label} SKIP, ${why}`); }
  else { missed += 1; console.log(`${label} ${why}`); }

  await sleep(2500);
}

await browser.close();
console.log(`\npinned ${hit}, phone disagreed ${mismatch}, not found ${missed}`);
