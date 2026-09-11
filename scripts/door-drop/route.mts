/**
 * ONE SHEET PER TOWN, IN DRIVING ORDER.
 *
 * The combined route sheet grouped stops by town and then sorted them
 * alphabetically inside each one, which is the worst possible order for a person
 * in a truck. Alphabetical sends you from Airport Road to Baker Avenue to
 * Central to Second Street and back across town four times. On 138 Kalispell
 * stops that is most of a day spent driving past places you have already been.
 *
 * So this geocodes every stop and solves the order properly:
 *
 *   1. Each address becomes a coordinate (Nominatim, cached on disk).
 *   2. Nearest neighbour from the town centre builds a first route.
 *   3. 2-opt runs over it until no swap shortens the loop, which is what turns
 *      a greedy chain into something that does not cross itself.
 *
 * Nearest neighbour alone typically runs about a quarter longer than optimal and
 * its failure mode is exactly the one that hurts here: it strands one far stop
 * and drives the whole town to reach it at the end. 2-opt costs a few
 * milliseconds and removes most of that.
 *
 * A stop that cannot be geocoded is NOT dropped. It goes to the foot of its own
 * sheet under "address we could not place", with the address printed, because a
 * business we know the street name of is still a business she can find. Silently
 * losing it would be the worse failure.
 *
 *   npx tsx scripts/door-drop/route.mts --out artifacts/door-drop/mt-final
 *   npx tsx scripts/door-drop/route.mts --out artifacts/door-drop/fl-final --region florida
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { REGIONS, type Region } from './select.mts';
import { INK, CREAM, MUSTARD, CRIMSON, clean } from './flyer.mts';

const argv = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};
const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', 'mt-final')));
const REGION: Region = REGIONS[(flag('region', 'montana') || 'montana').toLowerCase()] ?? REGIONS.montana;

/** Nominatim asks for one request a second and a real contact in the agent. Both honoured. */
const UA = 'ModernMustardSeed-DoorDrop/1.0 (sarah@modernmustardseed.com)';
const CACHE = path.join(OUT, '..', '.geocache.json');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Stop = {
  business_name: string;
  city: string;
  address: string | null;
  phone: string | null;
  grade: string | null;
  flyer: string;
  lat?: number;
  lon?: number;
};

type Manifest = { printed: Stop[]; generated_at: string };

const cache: Record<string, { lat: number; lon: number } | null> =
  existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

async function geocode(q: string): Promise<{ lat: number; lon: number } | null> {
  if (q in cache) return cache[q];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
    if (!r.ok) { cache[q] = null; return null; }
    const j = (await r.json()) as { lat: string; lon: string }[];
    cache[q] = j.length ? { lat: Number(j[0].lat), lon: Number(j[0].lon) } : null;
  } catch {
    cache[q] = null;
  }
  writeFileSync(CACHE, JSON.stringify(cache), 'utf8');
  await sleep(1100);
  return cache[q];
}

/**
 * Suite numbers are what a geocoder chokes on.
 *
 * The first Tallahassee pass placed 12 of 19, and the seven it missed all looked
 * like "2615 Centennial Blvd Ste 101" or "1704 Riggins Rd #4". Nominatim wants a
 * street number and a street. So each address is tried in three forms, widest
 * last, and the first hit wins: as given, with the unit stripped, and finally as
 * bare number plus street. A suite number is useless for routing anyway; she is
 * driving to the building.
 */
function addressForms(addr: string): string[] {
  const a = clean(addr);

  /**
   * Highways are most of what a Montana address is, and none of the spellings
   * Google hands back are the one Nominatim indexes. "2635 U.S. HWY 93 W",
   * "5600 U.S. 93 S" and "1725 Montana Hwy 35" are all the same kind of road and
   * all three came back empty. Normalising them to "US Highway 93" and "Montana
   * Highway 35" is what places them.
   */
  const road = (t: string) =>
    t
      .replace(/\bU\.?\s?S\.?\s*(?:HWY|HIGHWAY|HW|RTE|ROUTE)?\s*(\d+)\b/gi, 'US Highway $1')
      .replace(/\b(?:MT|MONTANA|FL|FLORIDA)[-\s]*(?:HWY|HIGHWAY|STATE\s+ROAD|SR)\.?\s*(\d+)\b/gi, 'State Highway $1')
      .replace(/\b(?:MT|FL)-(\d+)\b/gi, 'State Highway $1')
      .replace(/\bHwy\b\.?/gi, 'Highway')
      .replace(/\s+/g, ' ')
      .trim();

  const noUnit = road(
    a
      .replace(/[,]?\s*(?:ste|suite|unit|apt|apartment|bldg|building|rm|room|fl|floor)\.?\s*[\w-]*\s*$/i, '')
      .replace(/[,]?\s*#\s*[\w-]+\s*$/i, '')
      .trim(),
  );

  const m = /^(\d+[A-Za-z]?)\s+(.+)$/.exec(noUnit);
  const bare = m ? `${m[1]} ${m[2].split(',')[0]}` : '';

  /**
   * LAST RESORT: the street with no number at all.
   *
   * 41 of 108 Kalispell stops came back empty with a house number attached, and
   * Nominatim's coverage of small-town street numbers is simply thinner than its
   * coverage of the streets themselves. Being on the right street is nearly all
   * of the routing value: it puts the stop in the right corridor and in the
   * right order relative to everything else on that road. A stop placed at the
   * middle of its own street beats a stop dropped to the bottom of the sheet.
   */
  const street = m ? m[2].split(',')[0].trim() : '';

  return [...new Set([road(a), noUnit, bare, street].filter(Boolean))];
}

/** Straight-line miles. Good enough to order stops; nobody is navigating by it. */
function miles(a: Stop, b: Stop): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad((b.lat ?? 0) - (a.lat ?? 0));
  const dLon = toRad((b.lon ?? 0) - (a.lon ?? 0));
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat ?? 0)) * Math.cos(toRad(b.lat ?? 0)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Twenty five miles is generous for a town and tight enough to catch a pin
 *  that landed in the next county. */
function nearTown(p: { lat: number; lon: number }, centre: { lat: number; lon: number } | null): boolean {
  if (!centre) return true;
  return miles({ lat: p.lat, lon: p.lon } as Stop, { lat: centre.lat, lon: centre.lon } as Stop) <= 25;
}

/** Greedy chain from the town centre. Fast, and wrong in a predictable way. */
function nearestNeighbour(stops: Stop[], start: { lat: number; lon: number }): Stop[] {
  const left = [...stops];
  const out: Stop[] = [];
  let here = { ...start } as Stop;
  while (left.length) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < left.length; i++) {
      const d = miles(here, left[i]);
      if (d < bestD) { bestD = d; best = i; }
    }
    here = left[best];
    out.push(here);
    left.splice(best, 1);
  }
  return out;
}

/**
 * 2-opt: reverse any span that shortens the route, until nothing does.
 *
 * This is the pass that stops the sheet doubling back on itself. Capped at a
 * few hundred sweeps because the route is a hundred stops at most and the point
 * is a good order, not a proven optimal one.
 */
function twoOpt(route: Stop[]): Stop[] {
  const len = (r: Stop[]) => r.reduce((sum, s, i) => (i ? sum + miles(r[i - 1], s) : 0), 0);
  let best = [...route];
  let bestLen = len(best);
  for (let sweep = 0; sweep < 200; sweep++) {
    let improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const trial = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const l = len(trial);
        if (l < bestLen - 0.0001) { best = trial; bestLen = l; improved = true; }
      }
    }
    if (!improved) break;
  }
  return best;
}

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sheet(town: string, ordered: Stop[], unplaced: Stop[], milesTotal: number, when: string): string {
  const row = (s: Stop, n: number | null) => `<tr>
    <td class="n">${n ?? ''}</td>
    <td class="tick"><span class="box"></span></td>
    <td class="biz">${esc(clean(s.business_name))}${s.flyer === 'nosite' ? '<span class="tag">no website</span>' : ''}</td>
    <td class="g">${s.grade ? `<span class="chip">${esc(s.grade)}</span>` : '<span class="chip none">No site</span>'}</td>
    <td class="addr">${s.address ? esc(clean(s.address)) : ''}</td>
    <td class="mono">${esc(s.phone ?? '')}</td>
  </tr>`;

  return `<section class="town">
  <header class="th">
    <div>
      <div class="eyebrow">Door Drop &middot; ${esc(when)}</div>
      <h1>${esc(town)}</h1>
    </div>
    <div class="count">
      <span class="big">${ordered.length + unplaced.length}</span>
      <span class="lbl">stops</span>
      ${milesTotal > 0 ? `<span class="lbl" style="margin-top:3pt">${milesTotal.toFixed(0)} mi of driving</span>` : ''}
    </div>
  </header>
  <p class="lede">In driving order, not alphabetical. Work down the list and tick each one as the flyer is
  handed over. The grade is what we read on their live site, so if they ask, it is on the sheet.</p>
  <table>
    <thead><tr><th class="n">#</th><th class="tick"></th><th>Business</th><th class="g">Grade</th><th>Address</th><th>Phone</th></tr></thead>
    <tbody>${ordered.map((s, i) => row(s, i + 1)).join('')}</tbody>
  </table>
  ${unplaced.length ? `<h2 class="warn">Address we could not place on the map</h2>
  <table><tbody>${unplaced.map((s) => row(s, null)).join('')}</tbody></table>` : ''}
  <div class="foot">Modern Mustard Seed &middot; ${esc(REGION.phone)} &middot; <b>modernmustardseed.com</b></div>
</section>`;
}

async function main() {
  const m = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) as Manifest;
  const when = m.generated_at.slice(0, 10);

  const byTown = new Map<string, Stop[]>();
  for (const s of m.printed) {
    const t = (s.city ?? 'Unknown').trim();
    if (!byTown.has(t)) byTown.set(t, []);
    byTown.get(t)!.push(s);
  }

  const order = REGION.towns.map((t) => t.toLowerCase());
  const towns = [...byTown.keys()].sort(
    (a, b) => (order.indexOf(a.toLowerCase()) + 1 || 99) - (order.indexOf(b.toLowerCase()) + 1 || 99),
  );

  const sheets: string[] = [];
  for (const town of towns) {
    const stops = byTown.get(town)!;
    /**
     * The town centre, resolved first because the pin sanity check needs it.
     *
     * A Maps lookup that finds the wrong business returns a real coordinate for
     * a real place, and a wrong pin is worse than a missing one: it sends her to
     * the far end of the county with confidence. "Aspire Massage" in Whitefish
     * came back at 48.88, which is fifty miles north near Eureka. The phone gate
     * in coords.mjs catches this only when Maps shows a phone at all, so the
     * route sheet checks the geography too: a stop more than 25 miles from the
     * middle of its own town is not in that town.
     */
    const centre = await geocode(`${town}, ${REGION.state}, USA`);
    process.stdout.write(`${town}: geocoding ${stops.length} `);
    for (const s of stops) {
      if (!s.address) continue;
      /**
       * A pin read off the business's own Google Maps place page beats any
       * address lookup, and scripts/door-drop/coords.mjs writes those into this
       * same cache under a `biz|` key. Nominatim placed 3 of 14 Bigfork stops;
       * Maps has every one of them. The address forms below stay as the fallback
       * for anything the Maps pass could not settle on the phone.
       */
      const pinned = cache[`biz|${s.business_name.toLowerCase().trim()}|${s.city.toLowerCase().trim()}`];
      if (pinned && nearTown(pinned, centre)) { s.lat = pinned.lat; s.lon = pinned.lon; process.stdout.write('*'); continue; }
      if (pinned) process.stdout.write('!');
      let hit: { lat: number; lon: number } | null = null;
      for (const form of addressForms(s.address)) {
        hit = await geocode(`${form}, ${town}, ${REGION.state}, USA`);
        if (hit) break;
      }
      if (hit) { s.lat = hit.lat; s.lon = hit.lon; }
      process.stdout.write(hit ? '.' : 'x');
    }
    const placed = stops.filter((s) => s.lat != null);
    const unplaced = stops.filter((s) => s.lat == null).sort((a, b) => a.business_name.localeCompare(b.business_name));

    let ordered = placed;
    let total = 0;
    if (placed.length > 1) {
      const from = centre ?? { lat: placed[0].lat!, lon: placed[0].lon! };
      ordered = twoOpt(nearestNeighbour(placed, from));
      total = ordered.reduce((sum, s, i) => (i ? sum + miles(ordered[i - 1], s) : 0), 0);
    }
    console.log(` -> ${ordered.length} placed, ${unplaced.length} not, ${total.toFixed(0)} mi`);
    sheets.push(sheet(town, ordered, unplaced, total, when));
  }

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500;700&display=block" rel="stylesheet">
<style>
@page { size: 8.5in 11in; margin: 0.5in 0.5in 0.45in; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: 'DM Sans', sans-serif; color: ${INK}; background: ${CREAM};
  font-feature-settings: 'liga' 0, 'clig' 0; }
.town { page-break-after: always; break-after: page; }
.town:last-child { page-break-after: auto; break-after: auto; }
.th { display: flex; align-items: flex-end; justify-content: space-between; gap: 18pt;
  border-bottom: 2pt solid ${INK}; padding-bottom: 7pt; }
.eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 7pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.2em; color: ${CRIMSON}; }
h1 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 30pt; margin: 2pt 0 0;
  letter-spacing: -0.02em; line-height: 1; }
.count { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
.count .big { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 26pt; line-height: 1; }
.count .lbl { font-family: 'JetBrains Mono', monospace; font-size: 6.6pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.14em; color: rgba(22,22,22,0.55); }
.lede { font-size: 8.6pt; color: #3A3733; margin: 8pt 0 10pt; max-width: 5.4in; line-height: 1.4; }
h2.warn { font-family: 'JetBrains Mono', monospace; font-size: 7pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.16em; color: ${CRIMSON}; margin: 14pt 0 2pt; }
table { width: 100%; border-collapse: collapse; }
th { font-family: 'JetBrains Mono', monospace; font-size: 6.4pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.14em; color: rgba(22,22,22,0.5); text-align: left; padding: 4pt 5pt; }
td { padding: 5.5pt 5pt; border-top: 0.5pt solid rgba(22,22,22,0.16); vertical-align: top; font-size: 9pt; }
tr { break-inside: avoid; }
.n { width: 20pt; font-family: 'JetBrains Mono', monospace; font-size: 8pt; font-weight: 700;
  color: rgba(22,22,22,0.45); text-align: right; padding-right: 3pt; }
.tick { width: 20pt; } .box { display: block; width: 12pt; height: 12pt; border: 1.2pt solid ${INK};
  border-radius: 2pt; background: #fff; margin-top: 1pt; }
.biz { font-weight: 700; }
.tag { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 6.2pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em; color: ${CRIMSON}; margin-left: 5pt; vertical-align: 1pt; }
.g { width: 42pt; } .chip { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 8pt;
  font-weight: 700; border: 1.2pt solid ${INK}; border-radius: 3pt; padding: 0.5pt 4pt; background: ${MUSTARD}; }
.chip.none { background: ${CRIMSON}; color: #FFFDF6; font-size: 6.6pt; }
.addr { font-size: 8.6pt; color: #3A3733; }
.mono { font-family: 'JetBrains Mono', monospace; font-size: 7.8pt; white-space: nowrap; }
.foot { margin-top: 14pt; border-top: 1pt solid ${INK}; padding-top: 6pt;
  font-family: 'JetBrains Mono', monospace; font-size: 6.6pt; letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(22,22,22,0.5); }
.foot b { color: ${MUSTARD}; }
</style></head><body>${sheets.join('\n')}</body></html>`;

  mkdirSync(path.join(OUT, 'route'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 850, height: 1100 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: path.join(OUT, 'route', 'route-by-town.pdf'),
    format: 'Letter', printBackground: true, preferCSSPageSize: true,
  });
  if (existsSync(path.join(OUT, 'proof'))) {
    await page.screenshot({ path: path.join(OUT, 'proof', 'route-by-town.png'), fullPage: true });
  }
  await browser.close();
  console.log(`\nroute-by-town.pdf: ${towns.length} town sheet(s), ${m.printed.length} stops.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
