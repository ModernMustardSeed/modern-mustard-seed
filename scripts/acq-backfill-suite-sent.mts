/**
 * Stamp the suites the announcement hook sent without ever saying so.
 *
 *   pnpm exec tsx scripts/acq-backfill-suite-sent.mts            # dry run
 *   pnpm exec tsx scripts/acq-backfill-suite-sent.mts --apply
 *
 * WHY IT IS NEEDED ONCE. From 2026-07-30 to 2026-09-09 the suite-ready hook
 * (app/api/hooks/suite-ready) emailed a finished suite to fifty-nine
 * prospects and recorded each one only as a `messages` row. The acquisition
 * board reads `demo_emailed_at` for "sent", so fifty-three of those sat under
 * "Built, never sent" with a live send button on them. On 2026-09-03 four
 * prospects were sent their suite three times in one afternoon because of it,
 * and on 2026-09-09 Sarah pressed send on one who already had it. The hook
 * writes the stamp, the ledger and the timeline itself now; this script
 * writes them for the ones it already sent.
 *
 * WHAT IT WRITES, from the messages row and nothing invented:
 *   - `demo_emailed_at` = the moment the announcement went, when it is null.
 *   - `acq_stage` = 'demo_sent' and `reservoir_state` = 'hot', only for a
 *     campaign prospect who is not already a client or lost, so the board
 *     reads them the way it reads a suite sent from the card.
 *   - one `demo_emailed` timeline line, dated when the email went, marked as
 *     a backfill in its detail so nobody mistakes it for the hook running.
 *
 * WHAT IT DOES NOT WRITE. No acq_sends row: the ledger feeds the rolling
 * ceiling and every one of these is older than the window. No follow-ups:
 * a chase that starts weeks after the demo reads as a form letter.
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
for (const l of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith('[')) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be real values in .env.local.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const apply = process.argv.includes('--apply');

type Announced = { outbound_lead_id: string; to_addr: string | null; snippet: string | null; occurred_at: string };
type Lead = {
  id: string;
  business_name: string;
  email: string | null;
  acq_campaign_id: string | null;
  acq_stage: string | null;
  demo_emailed_at: string | null;
  hub_demo_url: string | null;
  is_test: boolean;
};

const { data: rows, error } = await db
  .from('messages')
  .select('outbound_lead_id,to_addr,snippet,occurred_at')
  .eq('subject', 'Demo suite emailed')
  .order('occurred_at', { ascending: true });
if (error) {
  console.error('Could not read the announcement records:', error.message);
  process.exit(1);
}

// The first announcement per lead is the one that counts; the hook has always
// refused a second, so there is at most one, but the code does not assume it.
const firstByLead = new Map<string, Announced>();
for (const r of (rows ?? []) as Announced[]) if (!firstByLead.has(r.outbound_lead_id)) firstByLead.set(r.outbound_lead_id, r);

const ids = [...firstByLead.keys()];
const leads = new Map<string, Lead>();
for (let i = 0; i < ids.length; i += 40) {
  const { data } = await db
    .from('outbound_leads')
    .select('id,business_name,email,acq_campaign_id,acq_stage,demo_emailed_at,hub_demo_url,is_test')
    .in('id', ids.slice(i, i + 40));
  for (const l of (data ?? []) as Lead[]) leads.set(l.id, l);
}

let stamped = 0;
let skipped = 0;
for (const [leadId, ann] of firstByLead) {
  const lead = leads.get(leadId);
  if (!lead) {
    skipped++;
    continue;
  }
  if (lead.demo_emailed_at) {
    skipped++;
    continue;
  }
  const campaignLead = Boolean(lead.acq_campaign_id);
  const moveStage = campaignLead && lead.acq_stage !== 'client' && lead.acq_stage !== 'lost';
  const to = ann.to_addr ?? lead.email ?? 'them';
  console.log(
    `${apply ? 'STAMP' : 'would stamp'}  ${lead.business_name}${lead.is_test ? ' (test)' : ''}  sent ${ann.occurred_at.slice(0, 16)}  to ${to}` +
      `${moveStage ? `  stage ${lead.acq_stage} -> demo_sent` : campaignLead ? '  (stage left alone)' : '  (no campaign)'}`,
  );
  stamped++;
  if (!apply) continue;

  const { error: upErr } = await db
    .from('outbound_leads')
    .update({
      demo_emailed_at: ann.occurred_at,
      ...(moveStage ? { acq_stage: 'demo_sent', reservoir_state: 'hot' } : {}),
    })
    .eq('id', lead.id)
    .is('demo_emailed_at', null);
  if (upErr) {
    console.error(`  could not stamp ${lead.business_name}: ${upErr.message}`);
    continue;
  }
  const { error: evErr } = await db.from('acq_events').insert({
    lead_id: lead.id,
    campaign_id: lead.acq_campaign_id,
    type: 'demo_emailed',
    label: `Their finished suite was emailed to ${to} (website, voice agent and walkthrough film)`,
    detail: { hubUrl: lead.hub_demo_url, announcement: true, backfilled: true, backfilledAt: new Date().toISOString(), snippet: ann.snippet },
    occurred_at: ann.occurred_at,
  });
  if (evErr) console.error(`  stamped ${lead.business_name} but could not write the timeline line: ${evErr.message}`);
}

console.log(
  `\n${firstByLead.size} announced by the hook, ${stamped} ${apply ? 'stamped' : 'to stamp'}, ${skipped} already stamped or gone.` +
    (apply ? '' : '\nDry run. Add --apply to write.'),
);
