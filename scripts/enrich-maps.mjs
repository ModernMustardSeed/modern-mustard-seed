/**
 * BACKFILL WEBSITES FROM GOOGLE MAPS — the free alternative to a search API.
 *
 * ⚠️ READ THIS BEFORE TRYING SOMETHING ELSE. Searching the open web for each
 * lead does NOT work and is not worth retrying: DuckDuckGo, Bing and Google all
 * answer an automated request with a CAPTCHA ("select all squares containing a
 * duck"), headless and headed alike, and solving those is off the table.
 * Overpass name-regex queries (one per lead) return 504 and 429. An OSM
 * bounding-box pass was built and measured against 253 real leads: it produced
 * ZERO verified websites, because OSM's US coverage of small service businesses
 * is thin. Foursquare has these businesses with a BLANK website field.
 *
 * Google MAPS is different from Google SEARCH. The place page is not
 * CAPTCHA-gated here, and it carries the two things that matter together: the
 * business's website AND its phone number. That pairing is what makes this
 * safe. We do not have to guess whether the site belongs to the lead, because
 * Maps hands us the phone on the same panel, and the lead already has a phone.
 * If those two numbers match, identity is settled.
 *
 * That is the whole design: the phone is the proof, so nothing is written on a
 * name resemblance. A lead whose Maps phone disagrees is skipped, loudly.
 *
 * Pacing is load-bearing. maps-detail.mjs learned this the hard way: past
 * roughly a hundred rapid place loads Google starts returning a page whose h1
 * is empty, which throws nothing and looks exactly like a selector bug. So this
 * runs one tab, waits between loads, and records a block rather than swallowing
 * it. It is slow on purpose. Start it and leave it.
 *
 *   node scripts/enrich-maps.mjs --limit 20           (dry run, 20 leads)
 *   node scripts/enrich-maps.mjs --limit 20 --apply   (write those 20)
 *   node scripts/enrich-maps.mjs --apply              (the whole backlog)
 *   node scripts/enrich-maps.mjs --headed             (watch it work)
 */
import { readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const HEADED = argv.includes('--headed');
const LIMIT = Number(argv[argv.indexOf('--limit') + 1]) || 0;

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

// Reuse the live gates so this and the button can never disagree about what
// counts as a real website.
const BUNDLE = path.join(process.cwd(), '.enrich-maps-lib.mjs');
execFileSync('npx', ['--no-install', 'esbuild', 'lib/enrich.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${BUNDLE}`],
  { stdio: 'pipe', shell: process.platform === 'win32' });
const { badDomain, hostOf, isSameBusiness } = await import(pathToFileURL(BUNDLE).href);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phoneKey = (p) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};

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

let leads = await fetchAll(
  'outbound_leads',
  'id, business_name, city, state, phone, website, email, notes, status',
  (q) => q.is('website', null).neq('status', 'dnc'),
);
leads = leads.filter((l) => phoneKey(l.phone).length >= 10); // the phone IS the proof
if (LIMIT) leads = leads.slice(0, LIMIT);
console.log(`leads to look up: ${leads.length}${APPLY ? '' : '   (DRY RUN)'}\n`);

const browser = await chromium.launch({ headless: !HEADED });
const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1300, height: 900 }, userAgent: UA });
const page = await ctx.newPage();

/** Read the place panel. Returns null when Maps served a results list instead. */
async function readPanel() {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      h1: q('h1')?.innerText?.trim() || null,
      website: q('a[data-item-id="authority"]')?.href || null,
      phoneItem: q('button[data-item-id^="phone"]')?.getAttribute('data-item-id') || null,
    };
  });
}

const results = { written: [], social: [], mismatch: [], nosite: [], noplace: [], blocked: [] };
let n = 0;

for (const lead of leads) {
  n++;
  const where = [lead.city, lead.state].filter(Boolean).join(', ');
  const url = `https://www.google.com/maps/search/${encodeURIComponent(`${lead.business_name} ${where}`)}?hl=en&gl=us`;
  let got;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4200);
    got = await readPanel();
    // Maps sometimes answers with a list. Open the first result that actually
    // looks like this business, then re-read the panel.
    if (!got.website && (!got.h1 || /^results$/i.test(got.h1))) {
      const links = await page.$$eval('a[href*="/maps/place/"]', (as) =>
        as.slice(0, 5).map((a) => ({ label: a.getAttribute('aria-label'), href: a.href })));
      const hit = links.find((l) => l.label && isSameBusiness(lead.business_name, l.label, where));
      if (hit) {
        await page.goto(`${hit.href}${hit.href.includes('?') ? '&' : '?'}hl=en&gl=us`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(4000);
        got = await readPanel();
      }
    }
  } catch (e) {
    results.blocked.push(`${lead.business_name}: ${String(e.message).slice(0, 50)}`);
    await sleep(6000);
    continue;
  }

  const label = `[${n}/${leads.length}] ${lead.business_name.slice(0, 32).padEnd(32)}`;

  if (!got.h1) { results.blocked.push(lead.business_name); console.log(`${label} BLOCKED (empty panel) — backing off`); await sleep(15000); continue; }
  if (/^results$/i.test(got.h1)) { results.noplace.push(lead.business_name); console.log(`${label} no matching place on Maps`); await sleep(2500); continue; }
  if (!got.website) { results.nosite.push(lead.business_name); console.log(`${label} confirmed NO website (good pitch)`); await sleep(2500); continue; }

  // THE GATE: Maps' phone for this place must be the lead's phone.
  const mapsPhone = phoneKey((got.phoneItem ?? '').replace(/^phone:tel:/, ''));
  if (!mapsPhone || mapsPhone !== phoneKey(lead.phone)) {
    results.mismatch.push(`${lead.business_name} → ${got.website} (maps ${mapsPhone || 'none'} ≠ lead ${phoneKey(lead.phone)})`);
    console.log(`${label} SKIP, phone disagrees (${got.h1})`);
    await sleep(2500);
    continue;
  }

  const host = hostOf(got.website);
  const bad = host ? badDomain(host) : 'not a usable URL';
  if (bad) {
    // A Facebook page or a builder's booking link IS their web presence, and
    // "you have no real website" is the pitch. Record it, do not file it as a
    // site the audit engine will try to score.
    results.social.push({ lead, url: got.website, why: bad });
    console.log(`${label} social/builder only: ${got.website}`);
    await sleep(2500);
    continue;
  }

  results.written.push({ lead, website: got.website });
  console.log(`${label} ✓ ${got.website}`);
  await sleep(2500);
}

await browser.close();
try { rmSync(BUNDLE); } catch {}

console.log(`\n──────── RESULT ────────`);
console.log(`  real websites found : ${results.written.length}`);
console.log(`  social/builder only : ${results.social.length}`);
console.log(`  confirmed NO website: ${results.nosite.length}`);
console.log(`  phone disagreed     : ${results.mismatch.length}`);
console.log(`  no place on Maps    : ${results.noplace.length}`);
console.log(`  blocked             : ${results.blocked.length}`);
if (results.mismatch.length) console.log(`\n  rejected on phone:\n    ${results.mismatch.slice(0, 10).join('\n    ')}`);

if (!APPLY) { console.log('\nDRY RUN. Nothing written. Re-run with --apply.'); process.exit(0); }

let w = 0;
for (const r of results.written) {
  const { error } = await sb.from('outbound_leads').update({ website: r.website }).eq('id', r.lead.id);
  if (error) { console.error(`update ${r.lead.business_name}:`, error.message); continue; }
  w++;
}
// Social-only presence goes in the notes, where the ammo card reads it.
let s = 0;
for (const r of results.social) {
  const note = `WEB PRESENCE: ${r.url} (no site of their own)`;
  if (String(r.lead.notes ?? '').includes('WEB PRESENCE:')) continue;
  const notes = [r.lead.notes, note].filter(Boolean).join(' · ').slice(0, 4000);
  const { error } = await sb.from('outbound_leads').update({ notes }).eq('id', r.lead.id);
  if (!error) s++;
}
console.log(`\nWrote ${w} websites and noted ${s} social-only presences.`);
