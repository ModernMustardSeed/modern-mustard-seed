/**
 * Scrub the wrong websites and emails that the old "Find site & email" saved.
 *
 * Before 2026-07-22 the enrichment fell back to `results[0]` whenever nothing matched
 * the business name, so a 40km Foursquare search around a small town would hand back
 * the nearest Walmart. Then Hunter was pointed at THAT domain and dug up a real
 * employee's address. The result: "Prefix Coffee" in Kansas City carrying
 * daveo@starbucks.com, ready to be cold-pitched.
 *
 * The rule here is deliberately narrow. A row is only touched when BOTH are true:
 *   1. the saved domain is one that is never a small business's own site, and
 *   2. the lead's own name does not match that domain.
 * So a lead literally named "Walmart Pharmacy" keeps walmart.com (it is a junk LEAD,
 * not junk enrichment, and that is Sarah's call to make), while "Prefix Coffee" loses
 * starbucks.com. Facebook page URLs are left alone: for a lot of these businesses
 * their Facebook page genuinely is their only web presence.
 *
 * Dry run by default. Nothing is written without --apply.
 *
 *   node scripts/clean-bad-enrichment.mjs
 *   node scripts/clean-bad-enrichment.mjs --apply
 */
import { readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const URL_ = env.supabase_url || env.SUPABASE_URL;
const KEY = env.supabase_service_role_key || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('Missing supabase url / service role key.'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// The same judgment the live enrichment uses, compiled straight from lib/enrich.ts so
// the cleanup and the button can never drift apart.
const BUNDLE = path.join(process.cwd(), '.enrich-lib.mjs');
try {
  execFileSync('npx', ['--no-install', 'esbuild', 'lib/enrich.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${BUNDLE}`], { stdio: 'pipe', shell: process.platform === 'win32' });
} catch (e) {
  console.error('Could not compile lib/enrich.ts:', e.message);
  process.exit(1);
}
const { badDomain, hostOf, domainMatchesName } = await import(pathToFileURL(BUNDLE).href);

const rows = await (await fetch(
  `${URL_}/rest/v1/outbound_leads?select=id,business_name,city,website,email,status&or=(website.not.is.null,email.not.is.null)&limit=10000`,
  { headers: H },
)).json();

const fixes = [];
for (const l of rows) {
  const patch = {};
  const reasons = [];

  if (l.website) {
    const h = hostOf(l.website);
    const bad = badDomain(h);
    // Only when the lead is not itself that brand, and never a Facebook page (for a lot
    // of these businesses that page genuinely is their only web presence).
    if (bad && !domainMatchesName(l.business_name, h) && !/facebook\.com|instagram\.com/.test(h)) {
      patch.website = null;
      reasons.push(`website ${h} (${bad})`);
    }
  }
  if (l.email) {
    const eh = (l.email.split('@')[1] || '').toLowerCase();
    const bad = badDomain(eh);
    if (bad && !domainMatchesName(l.business_name, eh)) {
      patch.email = null;
      reasons.push(`email ${l.email} (${bad})`);
    }
  }
  if (Object.keys(patch).length) fixes.push({ lead: l, patch, reasons });
}

console.log(`scanned ${rows.length} leads, ${fixes.length} carry enrichment that is not theirs\n`);
for (const f of fixes) {
  console.log(` "${f.lead.business_name}" (${f.lead.city}) status=${f.lead.status}`);
  for (const r of f.reasons) console.log(`     clear ${r}`);
}

rmSync(BUNDLE, { force: true });

if (!APPLY) {
  console.log(`\nDRY RUN. Nothing written. Re-run with --apply to clear these ${fixes.length} rows.`);
  process.exit(0);
}

let done = 0;
for (const f of fixes) {
  const res = await fetch(`${URL_}/rest/v1/outbound_leads?id=eq.${f.lead.id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify(f.patch),
  });
  if (res.ok) done++;
  else console.error(' FAILED', f.lead.business_name, res.status, (await res.text()).slice(0, 120));
}
console.log(`\ncleared ${done}/${fixes.length}. "Find site & email" can now retry them honestly.`);
