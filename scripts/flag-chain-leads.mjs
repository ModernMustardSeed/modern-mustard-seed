/**
 * Retire the national-chain locations already sitting in the outbound pipeline.
 *
 * Found 2026-07-22: the dial floor held Walmart Pharmacy, Walmart Vision Center,
 * Walmart Auto Care Center, Target, Ace Hardware (twice), a Starbucks, a Costco Tire
 * Center and about thirty more. None of them can buy a website from us. A store
 * manager has no authority to sign and no say over the brand's web presence, so every
 * dial, every forged demo and every enrichment call spent on one produced nothing.
 * Several were already marked "contacted", which means the time was actually spent.
 *
 * Uses the same lib/chains.mjs the importers now use, so the pipeline and the cleanup
 * can never disagree about what a chain is.
 *
 * Sets status 'lost' with a note rather than deleting: the row stays as a record of
 * where it came from, it drops off the active floor, and the dedupe keeps the same
 * business from being re-imported later.
 *
 * Dry run by default.
 *   node scripts/flag-chain-leads.mjs
 *   node scripts/flag-chain-leads.mjs --apply
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chainBrand } from '../lib/chains.mjs';

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

// PostgREST caps a page at 1000, so walk it.
const leads = [];
for (let offset = 0; ; offset += 1000) {
  const page = await (await fetch(
    `${URL_}/rest/v1/outbound_leads?select=id,business_name,city,status&order=created_at&offset=${offset}&limit=1000`,
    { headers: H },
  )).json();
  if (!Array.isArray(page) || !page.length) break;
  leads.push(...page);
  if (page.length < 1000) break;
}

const hits = leads
  .map((l) => ({ ...l, brand: chainBrand(l.business_name) }))
  .filter((l) => l.brand && l.status !== 'lost' && l.status !== 'dnc');

console.log(`scanned ${leads.length} leads, ${hits.length} are national-chain locations still on the floor\n`);
const spent = hits.filter((h) => h.status !== 'new');
for (const h of hits) console.log(`  [${h.brand}] "${h.business_name}" (${h.city}) status=${h.status}`);
if (spent.length) console.log(`\n  ${spent.length} of these already had time spent on them (status past "new").`);

if (!APPLY) {
  console.log(`\nDRY RUN. Nothing written. Re-run with --apply to retire these ${hits.length}.`);
  process.exit(0);
}

let done = 0;
for (const h of hits) {
  const res = await fetch(`${URL_}/rest/v1/outbound_leads?id=eq.${h.id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'lost', next_action_at: null, next_action: null }),
  });
  if (!res.ok) { console.error(' FAILED', h.business_name, res.status); continue; }
  await fetch(`${URL_}/rest/v1/messages`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({
      outbound_lead_id: h.id,
      direction: 'outbound',
      channel: 'note',
      from_addr: 'cockpit',
      to_addr: h.business_name,
      subject: 'Retired: national chain location',
      snippet: `Taken off the floor automatically: ${h.brand} is a corporate location, so there is no owner to pitch and no authority to buy.`,
      read: true,
      occurred_at: new Date().toISOString(),
    }),
  });
  done++;
}
console.log(`\nretired ${done}/${hits.length}. The importers now reject these on the way in.`);
