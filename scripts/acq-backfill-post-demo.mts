/**
 * Start the post-demo sequence for prospects whose demo went out before the
 * sequence existed.
 *
 *   pnpm exec tsx scripts/acq-backfill-post-demo.mts            # dry run
 *   pnpm exec tsx scripts/acq-backfill-post-demo.mts --apply
 *   pnpm exec tsx scripts/acq-backfill-post-demo.mts --days 14  # widen the window
 *
 * WHY IT IS NEEDED ONCE. Until 2026-08-25 the post-demo follow-ups were only
 * scheduled by the queue worker, so a demo sent from the admin, the build
 * screen, demos-now or by Mr. Mustard on a call started nothing. On the day the
 * fix shipped, fifteen prospects had a demo in hand and an empty queue behind
 * them: the whole funnel had gone silent at its highest-intent moment. Going
 * forward lib/acq/post-demo.ts runs inside the senders and this script finds
 * nothing.
 *
 * WHAT IT STARTS. The five-email outbound drip, with the demo recorded as its
 * step 1, so the next thing they receive is the missed-call math rather than
 * the demo a second time. A lead the drip refuses falls back to the three queue
 * follow-ups. Run on 2026-08-25 against the fifteen: all fifteen took the drip.
 *
 * WHAT IT REFUSES TO TOUCH. Anyone already in a live drip, anyone who already
 * has follow-ups queued, anyone who
 * bought, booked Sarah or unsubscribed, and any test prospect. It only ever
 * queues: the governor still decides at send time whether each one may leave,
 * so this cannot push past the daily cap or the bounce brake.
 *
 * The window defaults to 14 days because a demo older than that is cold enough
 * that "did you try to break it" reads as a form letter rather than a nudge.
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

const { startPostDemoSequence, POST_DEMO_SEQUENCE, POST_DEMO_STEP_BASE } = await import('../lib/acq/post-demo');

const apply = process.argv.includes('--apply');
const daysArg = process.argv.indexOf('--days');
const DAYS = daysArg >= 0 ? Math.max(1, Math.min(90, Number(process.argv[daysArg + 1]) || 14)) : 14;

const db = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const since = new Date(Date.now() - DAYS * 86400_000).toISOString();

const { data: sends, error } = await db
  .from('acq_sends')
  .select('lead_id, campaign_id, sent_at')
  .eq('kind', 'demo')
  .neq('status', 'refused')
  .gte('sent_at', since)
  .not('lead_id', 'is', null)
  .order('sent_at', { ascending: false });

if (error) {
  console.error(`Could not read the sends: ${error.message}`);
  process.exit(1);
}

// Newest demo per prospect: the sequence is keyed off the latest one.
const latest = new Map<string, { campaignId: string | null; sentAt: string }>();
for (const s of sends ?? []) {
  const id = s.lead_id as string;
  if (!latest.has(id)) latest.set(id, { campaignId: s.campaign_id as string | null, sentAt: s.sent_at as string });
}

console.log(`\n${latest.size} prospects were sent a demo in the last ${DAYS} days.\n`);

let started = 0;
let skipped = 0;

for (const [leadId, info] of latest) {
  const { data: lead } = await db
    .from('outbound_leads')
    .select('business_name, acq_stage, client_status, meeting_status, unsubscribed_at, is_test, email')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) continue;

  const refuse =
    lead.is_test ? 'test prospect'
    : lead.unsubscribed_at ? 'unsubscribed'
    : lead.client_status === 'client' ? 'already a client'
    : lead.meeting_status === 'booked' ? 'booked with Sarah'
    : !lead.email ? 'no email on file'
    : null;

  const { count } = await db
    .from('acq_queue')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('kind', 'followup')
    .eq('status', 'pending')
    .gte('step', POST_DEMO_STEP_BASE)
    .lt('step', POST_DEMO_STEP_BASE + POST_DEMO_SEQUENCE.length);

  // A LIVE DRIP IS ALSO "ALREADY CHASED", and this check missed it. The queue
  // is only the fallback path; the normal outcome is a row in outbound_drips
  // that queues nothing. Without this a second run RESET all fifteen drips to
  // step 1 and rescheduled step 2, which on a sequence already at step 3 would
  // silently restart the chase from the beginning.
  const { data: drip } = await db
    .from('outbound_drips')
    .select('status, step')
    .eq('lead_id', leadId)
    .maybeSingle();
  const liveDrip = drip && (drip.status === 'active' || drip.status === 'paused');

  const already = (count ?? 0) > 0;
  const reason =
    refuse ??
    (liveDrip ? `drip already ${drip.status} at step ${drip.step}` : already ? 'already has follow-ups queued' : null);

  if (reason) {
    skipped++;
    console.log(`  skip  ${lead.business_name}  (${reason})`);
    continue;
  }

  console.log(`  START ${lead.business_name}  demo ${String(info.sentAt).slice(0, 10)}, nothing queued`);
  if (!apply) continue;

  // Scheduled from NOW, not from the original send: a demo from last week whose
  // gap is already in the past would otherwise fire everything at once.
  const res = await startPostDemoSequence(db, { leadId, campaignId: info.campaignId, from: new Date() });
  // COUNT THE OUTCOME, NOT THE MECHANISM. The drip is the normal result and it
  // queues nothing, so counting queued jobs printed "Started 0 sequences" over
  // fifteen live enrolments: a run that worked, reporting that it had not.
  if (res.drip.enrolled) {
    started++;
    console.log(`        enrolled in the drip, step 2 goes ${res.drip.nextAt ? new Date(res.drip.nextAt).toLocaleString() : 'on the next gap'}`);
  } else if (res.queued > 0) {
    started++;
    console.log(`        drip refused (${res.drip.reason ?? 'unknown'}), queued ${res.queued} follow-ups instead`);
  } else {
    console.log(`        nothing started: ${res.drip.reason ?? 'no drip and no follow-ups'}`);
  }
}

console.log('');
if (apply) console.log(`Started ${started} sequences, skipped ${skipped}.`);
else console.log(`Dry run. Nothing was written. ${latest.size - skipped} would start, ${skipped} skipped. Re-run with --apply.`);
console.log('');
