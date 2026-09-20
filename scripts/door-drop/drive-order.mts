/**
 * DRIVING ORDER, SHARED BY EVERYTHING IN THE BOX.
 *
 * The press file, the office file, the route sheet and the manifest must come
 * out in ONE order, because the order is how she works: page 7 is stop 7. When
 * the pages were alphabetical and the route sheet was a real route, she would
 * have been hunting the stack at every door.
 *
 * So the ordering lives here and both callers use it: build.mts sorts the run
 * with it before anything renders, and route.mts prints the per-town sheets
 * from the same math.
 *
 *   1. Each address becomes a coordinate (Nominatim, cached on disk), with a
 *      pin read off the business's own Maps page preferred when coords.mjs has
 *      written one.
 *   2. Nearest neighbour from the town centre builds a first route.
 *   3. 2-opt runs over it until no swap shortens the loop, which is what turns
 *      a greedy chain into something that does not cross itself.
 *
 * A stop that cannot be placed is never dropped. It sorts to the end of its own
 * town with the address printed, because a business we know the street of is
 * still a business she can find.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export type Pin = { lat: number; lon: number };
export type Placeable = { business_name: string; city: string | null; address: string | null; lat?: number; lon?: number };

const UA = 'ModernMustardSeed-DoorDrop/1.0 (sarah@modernmustardseed.com)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clean = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** One cache file for every pass, so a second run pays nothing. */
export class GeoCache {
  private readonly file: string;
  private readonly map: Record<string, Pin | null>;

  constructor(file: string) {
    this.file = file;
    this.map = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  }

  pin(key: string): Pin | null | undefined {
    return this.map[key];
  }

  /** Nominatim asks for one request a second and a real contact in the agent. Both honoured. */
  async geocode(q: string): Promise<Pin | null> {
    if (q in this.map) return this.map[q];
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
      if (!r.ok) { this.map[q] = null; return null; }
      const j = (await r.json()) as { lat: string; lon: string }[];
      this.map[q] = j.length ? { lat: Number(j[0].lat), lon: Number(j[0].lon) } : null;
    } catch {
      this.map[q] = null;
    }
    writeFileSync(this.file, JSON.stringify(this.map), 'utf8');
    await sleep(1100);
    return this.map[q];
  }
}

/**
 * Suite numbers are what a geocoder chokes on, and highways are most of what a
 * Montana address is. Each address is tried in four forms, widest last, and the
 * first hit wins. A stop placed at the middle of its own street beats a stop
 * dropped to the bottom of the sheet.
 */
export function addressForms(addr: string): string[] {
  const a = clean(addr);
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
  const street = m ? m[2].split(',')[0].trim() : '';
  return [...new Set([road(a), noUnit, bare, street].filter(Boolean))];
}

/** Straight-line miles. Good enough to order stops; nobody is navigating by it. */
export function miles(a: { lat?: number; lon?: number }, b: { lat?: number; lon?: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad((b.lat ?? 0) - (a.lat ?? 0));
  const dLon = toRad((b.lon ?? 0) - (a.lon ?? 0));
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat ?? 0)) * Math.cos(toRad(b.lat ?? 0)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Twenty five miles is generous for a town and tight enough to catch a pin in the next county. */
export function nearTown(p: Pin, centre: Pin | null): boolean {
  if (!centre) return true;
  return miles(p, centre) <= 25;
}

/** Greedy chain from the town centre. Fast, and wrong in a predictable way. */
export function nearestNeighbour<T extends Placeable>(stops: T[], start: Pin): T[] {
  const left = [...stops];
  const out: T[] = [];
  let here: { lat?: number; lon?: number } = { ...start };
  while (left.length) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < left.length; i++) {
      const d = miles(here, left[i]);
      if (d < bestD) { bestD = d; best = i; }
    }
    here = left[best];
    out.push(left[best]);
    left.splice(best, 1);
  }
  return out;
}

/** 2-opt: reverse any span that shortens the route, until nothing does. */
export function twoOpt<T extends Placeable>(route: T[]): T[] {
  const len = (r: T[]) => r.reduce((sum, s, i) => (i ? sum + miles(r[i - 1], s) : 0), 0);
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

/**
 * Place every stop in one town and return them in driving order, unplaced ones
 * last. `onMark` prints a character per stop so a slow geocode looks like work
 * rather than a hang.
 */
export async function orderTown<T extends Placeable>(
  town: string,
  stops: T[],
  cache: GeoCache,
  state: string,
  onMark?: (c: string) => void,
): Promise<{ ordered: T[]; unplaced: T[]; miles: number }> {
  const centre = await cache.geocode(`${town}, ${state}, USA`);
  for (const s of stops) {
    if (!s.address) continue;
    const pinned = cache.pin(`biz|${s.business_name.toLowerCase().trim()}|${String(s.city ?? '').toLowerCase().trim()}`);
    if (pinned && nearTown(pinned, centre)) { s.lat = pinned.lat; s.lon = pinned.lon; onMark?.('*'); continue; }
    if (pinned) onMark?.('!');
    let hit: Pin | null = null;
    for (const form of addressForms(s.address)) {
      hit = await cache.geocode(`${form}, ${town}, ${state}, USA`);
      if (hit) break;
    }
    if (hit) { s.lat = hit.lat; s.lon = hit.lon; }
    onMark?.(hit ? '.' : 'x');
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
  return { ordered, unplaced, miles: total };
}
