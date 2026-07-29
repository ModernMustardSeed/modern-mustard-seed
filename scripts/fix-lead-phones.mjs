/**
 * RECONCILE LEAD PHONES AGAINST GOOGLE MAPS.
 *
 * The Maps website backfill (enrich-maps.mjs) refuses to write a website when
 * the phone Maps shows for a place disagrees with the phone on the lead. That
 * happened 177 times, and the refusal was right: a name resemblance is not
 * identity. But it also surfaced something more useful than a missing website.
 * Several of those disagreements are one digit apart:
 *
 *   Chambers Creek Collision   maps 253-472-2077   lead 253-462-2077
 *
 * That is not a different business. That is OUR number being wrong, and a rep
 * burning a dial on it costs more than this lookup does.
 *
 * So this pass re-checks those leads and, where the Maps place name is a CLOSE
 * match to the lead (not merely a plausible one), takes Maps as the source of
 * truth for the phone and the website. Anything short of a close name match is
 * left alone and reported, because a wrong phone number on a dial floor is
 * worse than a blank one.
 *
 * The bar: `isSameBusiness` with the lead's city supplied (so a shared town
 * name cannot carry the match) AND a near-identical Dice score. Same gates the
 * live enrichment uses, imported from lib/enrich.ts so they cannot drift.
 *
 *   node scripts/fix-lead-phones.mjs                (dry run)
 *   node scripts/fix-lead-phones.mjs --apply        (write)
 *   node scripts/fix-lead-phones.mjs --limit 40     (sample)
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

const BUNDLE = path.join(process.cwd(), '.fix-phones-lib.mjs');
execFileSync('npx', ['--no-install', 'esbuild', 'lib/enrich.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${BUNDLE}`],
  { stdio: 'pipe', shell: process.platform === 'win32' });
const { isSameBusiness, badDomain, hostOf } = await import(pathToFileURL(BUNDLE).href);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phoneKey = (p) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};

/** How many single-character edits apart two numbers are. */
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

async function fetchAll(cols, filter) {
  const page = 1000, rows = [];
  for (let from = 0; ; from += page) {
    let q = sb.from('outbound_leads').select(cols).order('id', { ascending: true }).range(from, from + page - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows;
}

// The leftovers from the website backfill: no site, and no marker explaining
// why. Those are exactly the phone-disagreed / no-place-found rows.
let leads = await fetchAll('id, business_name, city, state, phone, website, notes, status',
  (q) => q.is('website', null).neq('status', 'dnc'));
leads = leads.filter((l) => !/NO WEBSITE:|WEB PRESENCE:|PHONE CHECKED:/.test(String(l.notes ?? '')));
leads = leads.filter((l) => phoneKey(l.phone).length >= 10);
if (LIMIT) leads = leads.slice(0, LIMIT);
console.log(`leads to reconcile: ${leads.length}${APPLY ? '' : '   (DRY RUN)'}\n`);

const browser = await chromium.launch({ headless: !HEADED });
const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1300, height: 900 }, userAgent: UA });
const page = await ctx.newPage();

const out = { fixed: [], review: [], noplace: [], agreed: [] };
let n = 0;

for (const lead of leads) {
  n++;
  const where = [lead.city, lead.state].filter(Boolean).join(', ');
  const label = `[${n}/${leads.length}] ${lead.business_name.slice(0, 30).padEnd(30)}`;
  let got;
  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(`${lead.business_name} ${where}`)}?hl=en&gl=us`,
      { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4200);
    got = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.innerText?.trim() || null,
      website: document.querySelector('a[data-item-id="authority"]')?.href || null,
      phoneItem: document.querySelector('button[data-item-id^="phone"]')?.getAttribute('data-item-id') || null,
    }));
  } catch (e) {
    console.log(`${label} error: ${String(e.message).slice(0, 40)}`);
    await sleep(6000);
    continue;
  }

  // Mark every settled outcome, not just the corrections, so a re-run does not
  // pay seven seconds to learn the same nothing twice.
  const mark = async (note) => {
    if (!APPLY) return;
    const notes = [lead.notes, note].filter(Boolean).join(' · ').slice(0, 4000);
    await sb.from('outbound_leads').update({ notes }).eq('id', lead.id);
  };

  if (!got.h1 || /^results$/i.test(got.h1)) {
    out.noplace.push(lead.business_name);
    await mark('PHONE CHECKED: no single matching place on Maps');
    console.log(`${label} no single place on Maps`);
    await sleep(2500); continue;
  }

  const mapsPhone = phoneKey((got.phoneItem ?? '').replace(/^phone:tel:/, ''));
  const leadPhone = phoneKey(lead.phone);
  if (!mapsPhone) {
    out.noplace.push(lead.business_name);
    await mark('PHONE CHECKED: Maps has no phone for them');
    console.log(`${label} Maps has no phone`);
    await sleep(2500); continue;
  }
  if (mapsPhone === leadPhone) {
    out.agreed.push(lead.business_name);
    await mark('PHONE CHECKED: agrees with Maps');
    console.log(`${label} phone agrees`);
    await sleep(2500); continue;
  }

  // The bar for overwriting a dial number: the names must genuinely be the same
  // business, with the town excluded from the comparison.
  const close = isSameBusiness(lead.business_name, got.h1, where)
    && isSameBusiness(got.h1, lead.business_name, where);
  const digits = editDistance(mapsPhone, leadPhone);

  if (!close) {
    out.review.push({ lead, mapsName: got.h1, mapsPhone, website: got.website });
    await mark(`PHONE CHECKED: Maps shows "${got.h1.slice(0, 60)}" on ${mapsPhone}, a different business — left alone`);
    console.log(`${label} SKIP "${got.h1.slice(0, 28)}" (${mapsPhone}) — names are not the same business`);
    await sleep(2500);
    continue;
  }

  const site = got.website && !badDomain(hostOf(got.website)) ? got.website : null;
  out.fixed.push({ lead, mapsName: got.h1, mapsPhone, website: site, digits });
  console.log(`${label} ✓ ${leadPhone} → ${mapsPhone}${digits <= 2 ? ` (${digits}-digit typo)` : ''}${site ? ` + ${site}` : ''}`);

  if (APPLY) {
    const patch = { phone: mapsPhone, notes: [lead.notes, `PHONE CHECKED: was ${leadPhone}, Maps says ${mapsPhone}`].filter(Boolean).join(' · ').slice(0, 4000) };
    if (site) patch.website = site;
    const { error } = await sb.from('outbound_leads').update(patch).eq('id', lead.id);
    if (error) console.error(`   ! save failed: ${error.message}`);
  }
  await sleep(2500);
}

await browser.close();
try { rmSync(BUNDLE); } catch {}

console.log(`\n──────── RESULT ────────`);
console.log(`  phone corrected      : ${out.fixed.length}${out.fixed.filter((f) => f.digits <= 2).length ? ` (${out.fixed.filter((f) => f.digits <= 2).length} were 1-2 digit typos)` : ''}`);
console.log(`  websites gained      : ${out.fixed.filter((f) => f.website).length}`);
console.log(`  left alone, review   : ${out.review.length}`);
console.log(`  phone already agreed : ${out.agreed.length}`);
console.log(`  no place on Maps     : ${out.noplace.length}`);
if (out.review.length) {
  console.log(`\n  different business, left alone:`);
  for (const r of out.review.slice(0, 15)) console.log(`    ${r.lead.business_name.slice(0, 30).padEnd(30)} vs Maps "${r.mapsName.slice(0, 30)}"`);
}
console.log(APPLY ? '\nSaved as they were found.' : '\nDRY RUN. Re-run with --apply.');
