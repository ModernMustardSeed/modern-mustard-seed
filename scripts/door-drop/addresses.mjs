/**
 * WHERE THEY ACTUALLY ARE. Backfills the street address for the Flathead leads,
 * so the route sheet says "225 Main St" instead of "address not on file".
 *
 * The Flathead rows predate the Maps lead finder, which is why 104 audited
 * businesses in these towns carry a phone, a website and a grade but not one
 * address between them. Everything else for the door drop is ready; this is the
 * only thing standing between a box of flyers and a route she can drive.
 *
 * It is the same shape as scripts/enrich-maps.mjs, and deliberately so, because
 * that script paid for the two rules that matter:
 *
 *   THE PHONE IS THE PROOF. An address is only written when the phone on the
 *   Maps place panel matches the phone already on the lead. A name resemblance
 *   is not identity, and there are two Glacier somethings in every one of these
 *   towns. A disagreement is recorded and skipped, loudly.
 *
 *   PACING IS LOAD BEARING. Past roughly a hundred rapid place loads Google
 *   starts serving a panel whose h1 is empty. That throws nothing and looks
 *   exactly like a broken selector. So this runs one tab, waits between loads,
 *   and backs off fifteen seconds when it sees an empty panel.
 *
 * Writes as it goes, never at the end, so an interrupted run keeps everything it
 * already confirmed and a re-run skips those rows.
 *
 *   node scripts/door-drop/addresses.mjs --limit 10            dry run
 *   node scripts/door-drop/addresses.mjs --limit 10 --apply    write those ten
 *   node scripts/door-drop/addresses.mjs --apply               the whole backlog
 *   node scripts/door-drop/addresses.mjs --apply --headed      watch it work
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const FLATHEAD = ['Whitefish', 'Columbia Falls', 'Kalispell', 'Somers', 'Lakeside', 'Bigfork', 'Polson'];

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const HEADED = argv.includes('--headed');
const LIMIT = Number(argv[argv.indexOf('--limit') + 1]) || 0;
const CITIES = argv.includes('--cities')
  ? argv[argv.indexOf('--cities') + 1].split(',').map((s) => s.trim())
  : FLATHEAD;

const env = { ...process.env };
for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const sb = createClient(
  env.SUPABASE_URL || env.supabase_url,
  env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key,
  { auth: { persistSession: false } },
);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phoneKey = (p) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};

/** "Address: 225 Main St, Kalispell, MT 59901" */
function parseAddress(label) {
  if (!label) return {};
  const clean = label.replace(/^Address:\s*/i, '').trim();
  const m = /^(.*?),\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})?/.exec(clean);
  if (!m) return { full: clean };
  return { full: clean, street: m[1].trim(), city: m[2].trim(), state: m[3].trim(), zip: m[4] || null };
}

const { data, error } = await sb
  .from('outbound_leads')
  .select('id, business_name, city, state, phone, address')
  .in('city', CITIES)
  .is('address', null)
  .not('phone', 'is', null)
  .order('city')
  .order('business_name')
  .limit(2000);
if (error) { console.error(error.message); process.exit(1); }

let leads = (data ?? []).filter((l) => phoneKey(l.phone).length >= 10);
if (LIMIT) leads = leads.slice(0, LIMIT);
console.log(`Leads needing an address: ${leads.length}${APPLY ? '' : '   (DRY RUN, nothing will be written)'}\n`);
if (!leads.length) process.exit(0);

const browser = await chromium.launch({ headless: !HEADED });
const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1300, height: 900 }, userAgent: UA });
const page = await ctx.newPage();

const readPanel = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      h1: q('h1')?.innerText?.trim() || null,
      phoneItem: q('button[data-item-id^="phone"]')?.getAttribute('data-item-id') || null,
      addressLabel: q('button[data-item-id="address"]')?.getAttribute('aria-label') || null,
    };
  });

const out = { written: [], mismatch: [], noaddr: [], noplace: [], blocked: [] };
let n = 0;

for (const lead of leads) {
  n += 1;
  const where = [lead.city, lead.state].filter(Boolean).join(', ');
  const url = `https://www.google.com/maps/search/${encodeURIComponent(`${lead.business_name} ${where}`)}?hl=en&gl=us`;
  const label = `[${n}/${leads.length}] ${String(lead.business_name).slice(0, 34).padEnd(34)}`;

  let got;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4200);
    got = await readPanel();
    if (!got.addressLabel && (!got.h1 || /^results$/i.test(got.h1))) {
      const links = await page.$$eval('a[href*="/maps/place/"]', (as) =>
        as.slice(0, 5).map((a) => ({ label: a.getAttribute('aria-label'), href: a.href })));
      const first = links[0];
      if (first?.href) {
        await page.goto(`${first.href}${first.href.includes('?') ? '&' : '?'}hl=en&gl=us`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(4000);
        got = await readPanel();
      }
    }
  } catch (e) {
    out.blocked.push(lead.business_name);
    console.log(`${label} error: ${String(e.message).slice(0, 48)}`);
    await sleep(6000);
    continue;
  }

  if (!got.h1) { out.blocked.push(lead.business_name); console.log(`${label} BLOCKED (empty panel), backing off`); await sleep(15000); continue; }
  if (/^results$/i.test(got.h1)) { out.noplace.push(lead.business_name); console.log(`${label} no matching place`); await sleep(2500); continue; }

  // THE GATE. Maps' phone for this place must be the phone already on the lead.
  const mapsPhone = phoneKey((got.phoneItem ?? '').replace(/^phone:tel:/, ''));
  if (!mapsPhone || mapsPhone !== phoneKey(lead.phone)) {
    out.mismatch.push(`${lead.business_name} (maps ${mapsPhone || 'none'} vs lead ${phoneKey(lead.phone)})`);
    console.log(`${label} SKIP, phone disagrees (${got.h1})`);
    await sleep(2500);
    continue;
  }

  const a = parseAddress(got.addressLabel);
  if (!a.street && !a.full) { out.noaddr.push(lead.business_name); console.log(`${label} no address on the panel`); await sleep(2500); continue; }

  const patch = { address: a.street || a.full };
  if (a.zip) patch.postal_code = a.zip;
  if (APPLY) {
    const { error: upErr } = await sb.from('outbound_leads').update(patch).eq('id', lead.id);
    if (upErr) { console.log(`${label} ! could not save: ${upErr.message}`); await sleep(2500); continue; }
  }
  out.written.push(`${lead.business_name}: ${patch.address}`);
  console.log(`${label} ${patch.address}${a.zip ? ` ${a.zip}` : ''}${APPLY ? '' : '   (dry)'}`);
  await sleep(2600);
}

await browser.close();

console.log('');
console.log(`addresses ${APPLY ? 'written' : 'found'}: ${out.written.length}`);
console.log(`phone disagreed:            ${out.mismatch.length}`);
console.log(`no address on panel:        ${out.noaddr.length}`);
console.log(`no matching place:          ${out.noplace.length}`);
console.log(`blocked or errored:         ${out.blocked.length}`);
if (out.mismatch.length) {
  console.log('\nPhone disagreements, which are the ones worth a human eye:');
  for (const m of out.mismatch) console.log(`  ${m}`);
}
if (!APPLY) console.log('\nDRY RUN. Nothing was written. Re-run with --apply.');
