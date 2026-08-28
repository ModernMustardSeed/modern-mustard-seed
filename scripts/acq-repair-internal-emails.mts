/**
 * Find prospect rows carrying one of OUR OWN addresses, and repair the ones
 * that are scrape errors.
 *
 *   pnpm exec tsx scripts/acq-repair-internal-emails.mts           # dry run
 *   pnpm exec tsx scripts/acq-repair-internal-emails.mts --apply
 *
 * WHY THESE EXIST. The site tracker reads contact details off a page and has
 * more than once filed ours as the business's: Cottonwood Veterinary Hospital
 * and Moses Tree Service of Bozeman both ended up with wildhopehouse@gmail.com,
 * and two rows carry a URL-encoded User-Agent string
 * ("modernmustardseed-tracker%2f1.0+%28sarah@modernmustardseed.com") in the
 * email column. Moses Tree Service was `acq_eligible` at stage `emailed` with a
 * cold campaign email already sent to Sarah's inbox and email 2 queued behind
 * it. That is a wasted send, a lie in the funnel, and self-traffic to Resend.
 *
 * WHAT IT DOES NOT TOUCH. The demo station and Mr. Mustard write Sarah's
 * address onto every demo she builds for herself, on purpose, so the demo email
 * reaches her. Those rows are correct and are left exactly as they are. Only
 * SCRAPE-sourced rows are repaired.
 *
 * The bad address is not deleted, it is moved into `notes`, because the wrong
 * value is evidence about the scraper and somebody will want to see it.
 *
 * Going forward this should find nothing: lib/acq/eligibility.ts refuses an
 * internal address with a named reason, and lib/acq/governor.ts refuses it
 * again at send time. This is the cleanup for what landed before that.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_CANDIDATES = ['.env.local', resolve('../../products/modern-mustard-seed/.env.local')];
const envFile = ENV_CANDIDATES.find((p) => existsSync(p));
if (!envFile) {
  console.error('No .env.local found. Looked in:\n  ' + ENV_CANDIDATES.join('\n  '));
  process.exit(1);
}
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { isInternalAddress } = await import('../lib/owner');

const apply = process.argv.includes('--apply');

const db = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

/**
 * Sources that READ the address off the web. Only these are repaired.
 *
 * An allowlist, not a denylist, and deliberately so. The demo station, Mr.
 * Mustard and hand-added rows put Sarah's address on a lead ON PURPOSE so the
 * demo mail reaches her, and some of those rows carry no `source` at all: All
 * Saints Plumbing sits at stage `demoed` with a follow-up queued to her inbox.
 * Clearing one of those would break a working demo. Anything this list does not
 * recognise is printed and left alone, which is the safe way to be wrong.
 */
const SCRAPED = /^(tracker|acq-lead-finder|sourced|review-mining|gleaner|hunter|maps|osm|western-aplus)/i;

const REASON = 'That is one of our own addresses, not theirs. The email on this record is wrong.';

type Lead = {
  id: string;
  business_name: string;
  email: string | null;
  source: string | null;
  acq_stage: string;
  acq_eligible: boolean;
  notes: string | null;
};

// No SQL predicate can express "one of ours" as well as the shared helper does
// (it has to catch a User-Agent string with our domain buried inside it), so
// the net is cast wide in SQL and narrowed in code.
const { data, error } = await db
  .from('outbound_leads')
  .select('id,business_name,email,source,acq_stage,acq_eligible,notes')
  .not('email', 'is', null)
  .or('email.ilike.%modernmustardseed%,email.ilike.%makeourcitypretty%,email.ilike.%wildhopehouse%');

if (error) {
  console.error(`Could not read the prospects: ${error.message}`);
  process.exit(1);
}

const hits = ((data ?? []) as Lead[]).filter((l) => isInternalAddress(l.email));
const scraped = hits.filter((l) => SCRAPED.test(l.source ?? ''));
const ours = hits.filter((l) => !SCRAPED.test(l.source ?? ''));

console.log(`\n${hits.length} prospect rows carry one of our addresses.`);
console.log(`  ${scraped.length} were read off the web and are wrong.`);
console.log(`  ${ours.length} are ours on purpose (demos, hand-added). Left alone:`);
for (const l of ours) console.log(`      ${l.business_name}  ${l.email}  [${l.source ?? 'no source'}]`);
console.log('');

if (!scraped.length) {
  console.log('Nothing to repair.');
  process.exit(0);
}

let repaired = 0;
let cancelled = 0;

for (const l of scraped) {
  const { data: pending } = await db
    .from('acq_queue')
    .select('id,kind,step')
    .eq('lead_id', l.id)
    .eq('status', 'pending');
  const jobs = pending ?? [];

  console.log(`  ${l.business_name}`);
  console.log(`      email    ${l.email}`);
  console.log(`      source   ${l.source ?? '(none)'} · stage ${l.acq_stage} · ${l.acq_eligible ? 'ELIGIBLE' : 'held'}`);
  if (jobs.length) console.log(`      queued   ${jobs.map((j) => `${j.kind}${j.step ? ` step ${j.step}` : ''}`).join(', ')}`);

  if (!apply) continue;

  const stamped = `[${new Date().toISOString().slice(0, 10)}] Email cleared by acq-repair-internal-emails: "${l.email}" is one of ours, not theirs. The tracker read it off the page in error.`;
  const { error: upErr } = await db
    .from('outbound_leads')
    .update({
      email: null,
      email_status: null,
      acq_eligible: false,
      acq_ineligible_reason: REASON,
      notes: l.notes ? `${l.notes}\n${stamped}` : stamped,
    })
    .eq('id', l.id);
  if (upErr) {
    console.log(`      FAILED: ${upErr.message}`);
    continue;
  }
  repaired++;

  if (jobs.length) {
    await db.from('acq_queue').update({ status: 'cancelled', error: REASON }).eq('lead_id', l.id).eq('status', 'pending');
    cancelled += jobs.length;
  }

  await db.from('acq_events').insert({
    lead_id: l.id,
    type: 'note',
    label: 'Email cleared: the address on file was one of ours, not theirs',
    detail: { removed: l.email, source: l.source, cancelledJobs: jobs.length },
    occurred_at: new Date().toISOString(),
  });
}

console.log('');
if (apply) console.log(`Repaired ${repaired} rows, cancelled ${cancelled} queued jobs.`);
else console.log('Dry run. Nothing was written. Re-run with --apply.');
console.log('');
