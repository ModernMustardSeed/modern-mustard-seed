/**
 * Backfill websites onto outbound leads using OpenStreetMap, for free.
 *
 * WHY THIS SHAPE. The obvious idea is "search the web for each lead". That does
 * not work and is not worth retrying: DuckDuckGo, Bing and Google all answer an
 * automated request with a CAPTCHA ("select all squares containing a duck"), and
 * solving those is off the table. Overpass name-regex queries (one per lead) are
 * legitimate but far too heavy for the free endpoint, returning 504 and 429.
 *
 * What IS cheap is a bounding-box query: "every named thing within 25km of here
 * that has a website tag" answers in about two seconds and returns hundreds of
 * businesses. So this groups leads by city, spends ONE query per city, and does
 * the matching locally. 100 cities is 100 queries instead of 4000.
 *
 * Every candidate still goes through the SAME gates the live button uses,
 * imported straight from lib/enrich.ts so the two can never drift: the scored
 * name match (`isSameBusiness`), the directory/chain domain gate (`badDomain`),
 * and the page-level proof check (`verifySite` via `enrichProspect`). OSM being
 * a volunteer database is exactly why: it will happily tell you a website that
 * belongs to the chain a franchise sits under, so nothing is trusted on the
 * strength of the tag alone.
 *
 * Overpass is a free service run on donations. It is rate limited to roughly two
 * queries a minute, so this paces itself and backs off on 429. Expect it to take
 * a while and leave it running.
 *
 *   node scripts/enrich-osm.mjs                 (dry run, prints what it found)
 *   node scripts/enrich-osm.mjs --apply         (write verified sites to leads)
 *   node scripts/enrich-osm.mjs --limit 5       (only the 5 biggest cities)
 */
import { readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const LIMIT = Number(process.argv[process.argv.indexOf('--limit') + 1]) || 0;

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const sb = createClient(
  env.SUPABASE_URL || env.supabase_url,
  env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key,
  { auth: { persistSession: false } },
);

// Compile the live gates rather than keeping a second, staler copy of them.
const BUNDLE = path.join(process.cwd(), '.enrich-osm-lib.mjs');
execFileSync('npx', ['--no-install', 'esbuild', 'lib/enrich.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${BUNDLE}`],
  { stdio: 'pipe', shell: process.platform === 'win32' });
const gates = await import(pathToFileURL(BUNDLE).href);
const { isSameBusiness, badDomain, hostOf, verifyCandidateSite } = gates;

const UA = 'ModernMustardSeed-Tracker/1.0 (sarah@modernmustardseed.com)';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAll(table, columns, filter) {
  const page = 1000;
  const rows = [];
  for (let from = 0; ; from += page) {
    let q = sb.from(table).select(columns).order('id', { ascending: true }).range(from, from + page - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows;
}

async function geocode(city) {
  try {
    const r = await fetch(`${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(city)}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const a = await r.json();
    return a.length ? { lat: parseFloat(a[0].lat), lon: parseFloat(a[0].lon) } : null;
  } catch { return null; }
}

/** One bbox query. Retries on 429/504, which the free endpoint uses liberally. */
async function osmBusinesses(lat, lon) {
  const q = `[out:json][timeout:25];nwr(around:25000,${lat},${lon})["name"]["website"];out tags 800;`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(OVERPASS, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(q)}`,
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 429 || r.status === 504) { await sleep(30000 * (attempt + 1)); continue; }
      if (!r.ok) return [];
      const j = await r.json();
      return (j.elements ?? [])
        .map((e) => e.tags ?? {})
        .filter((t) => t.name && (t.website || t['contact:website']))
        .map((t) => ({
          name: t.name,
          website: t.website || t['contact:website'],
          email: t.email || t['contact:email'] || null,
          phone: t.phone || t['contact:phone'] || null,
        }));
    } catch { await sleep(15000); }
  }
  return [];
}

const leads = await fetchAll(
  'outbound_leads',
  'id, business_name, city, state, phone, website, email, status',
  (q) => q.is('website', null).neq('status', 'dnc'),
);
console.log(`leads with no website: ${leads.length}`);

const byCity = new Map();
for (const l of leads) {
  const key = [l.city, l.state].filter(Boolean).join(', ').trim();
  if (!key) continue;
  if (!byCity.has(key)) byCity.set(key, []);
  byCity.get(key).push(l);
}
let cities = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length);
if (LIMIT) cities = cities.slice(0, LIMIT);
console.log(`cities: ${cities.length} (biggest: ${cities.slice(0, 5).map(([c, l]) => `${c} ${l.length}`).join(', ')})`);
console.log(`Overpass allows ~2 queries/min, so this will take roughly ${Math.ceil(cities.length * 0.75)} minutes.\n`);

const found = [];
let cityNo = 0;
for (const [city, cityLeads] of cities) {
  cityNo++;
  const center = await geocode(city);
  await sleep(1200); // Nominatim asks for max 1 req/sec
  if (!center) { console.log(`[${cityNo}/${cities.length}] ${city}: could not geocode, skipped`); continue; }

  const places = await osmBusinesses(center.lat, center.lon);
  const hits = [];
  for (const lead of cityLeads) {
    const match = places.find((p) => isSameBusiness(lead.business_name, p.name, [lead.city, lead.state].filter(Boolean).join(', ')));
    if (!match) continue;
    const host = hostOf(match.website);
    if (!host || badDomain(host)) continue;
    hits.push({ lead, match });
  }
  console.log(`[${cityNo}/${cities.length}] ${city}: ${cityLeads.length} leads, ${places.length} OSM businesses, ${hits.length} name matches`);
  found.push(...hits);
  await sleep(30000); // stay inside the free endpoint's budget
}

console.log(`\nname matches to verify: ${found.length}`);

// A name match is a candidate, not an answer. OSM is a volunteer database and
// will cheerfully tag a franchise with its parent chain's site, so each one has
// to fetch and prove it belongs to THIS business before it is written.
const verified = [];
for (const { lead, match } of found) {
  const res = await verifyCandidateSite({
    business: lead.business_name,
    city: [lead.city, lead.state].filter(Boolean).join(', ') || null,
    phone: lead.phone,
    url: match.website,
  });
  if (!res.ok) {
    console.log(`  ✗ ${lead.business_name.slice(0, 34).padEnd(34)} ${match.website} — ${res.why}`);
    continue;
  }
  // Nobody is watching this run, so it demands the one signal that cannot be
  // coincidence: THEIR phone number on the page. A shared word plus a shared
  // town is how "Lakewood Family Dentistry" nearly acquired Lakewood MODERN
  // Dentistry's website. The interactive button can stay looser because a rep
  // reads the answer before using it; a bulk write cannot.
  if (!res.phoneHit) {
    console.log(`  ~ ${lead.business_name.slice(0, 34).padEnd(34)} ${res.website} — plausible but their phone is not on the page, skipping`);
    continue;
  }
  verified.push({ lead, website: res.website, email: match.email, confidence: res.confidence });
  console.log(`  ✓ ${lead.business_name.slice(0, 34).padEnd(34)} ${res.website}  (${res.why})`);
}

console.log(`\nverified: ${verified.length}/${found.length}`);
if (!APPLY) {
  console.log('DRY RUN. Nothing written. Re-run with --apply to write.');
  try { rmSync(BUNDLE); } catch {}
  process.exit(0);
}

let n = 0;
for (const v of verified) {
  const patch = { website: v.website };
  if (v.email && !v.lead.email) patch.email = v.email;
  const { error } = await sb.from('outbound_leads').update(patch).eq('id', v.lead.id);
  if (error) { console.error(`update ${v.lead.business_name}:`, error.message); continue; }
  n++;
}
console.log(`\nWrote ${n} websites.`);
try { rmSync(BUNDLE); } catch {}
