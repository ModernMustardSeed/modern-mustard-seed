/**
 * SEND THE DEMOS NOW.
 *
 * A forged demo is a live site and a live agent with somebody's own business
 * name on it. It has a shelf life measured in a day or two, and it was sitting
 * behind a thousand cold emails, an hourly cap, a send window and a bounce
 * brake that a single full mailbox could trip. All of those exist to stop a
 * MACHINE from sending too much too fast, and none of them describe what is
 * happening when Sarah looks at sixteen demos she just built and says send.
 *
 * So this path exists and it is deliberately direct: every queued demo email
 * that is ready goes, right now, in order, with the pacing lifted.
 *
 * What it does NOT lift, ever:
 *   · an unsubscribe
 *   · the suppression list
 *   · a previous hard bounce
 *   · a do-not-contact flag
 *   · a missing or unmailable address
 *   · the hard rolling 24 hour ceiling
 *   · the master pause and an explicitly paused or restricted sender
 *
 * Those are not pacing. The first five are the difference between a list worth
 * having and a blocklist entry, and the last two are Sarah's own kill switch,
 * which a convenience button does not get to defeat quietly. Everything else
 * gets out of the way.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { getCampaign } from '@/lib/acq/settings';
import { sendDemoEmail } from '@/lib/acq/send';
import { completeJob, skipJob } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';
import type { AcqProspect } from '@/lib/acq/types';

export type DemoSendOutcome = {
  leadId: string;
  company: string | null;
  email: string | null;
  status: 'sent' | 'skipped' | 'failed';
  note: string;
};

export type DemoSendReport = {
  ready: number;
  sent: number;
  skipped: number;
  failed: number;
  outcomes: DemoSendOutcome[];
  held: string | null;
};

const DEFAULT_REASON = 'Sent by hand from the admin.';

/**
 * Drain every ready demo email immediately.
 *
 * `leadIds` narrows it to specific prospects; omit it to send everything that
 * is queued and forged. `limit` is a safety rail on a runaway click, not a
 * pacing rule.
 */
export async function sendDemosNow(opts: {
  db?: SupabaseClient | null;
  leadIds?: string[];
  reason?: string;
  limit?: number;
} = {}): Promise<DemoSendReport> {
  const db = opts.db ?? getSupabase();
  const report: DemoSendReport = { ready: 0, sent: 0, skipped: 0, failed: 0, outcomes: [], held: null };
  if (!db) {
    report.held = 'The database is not configured.';
    return report;
  }

  const campaign = await getCampaign();
  if (!campaign) {
    report.held = 'The MEET MR. MUSTARD campaign row is missing.';
    return report;
  }

  const override = { reason: opts.reason?.trim() || DEFAULT_REASON };
  const limit = Math.max(1, Math.min(opts.limit ?? 200, 500));

  // Claim nothing and lock nothing: this is a human pressing a button once,
  // and the idempotency that matters is demo_emailed_at on the lead, which
  // sendDemoEmail sets and the guard below reads.
  let q = db
    .from('acq_queue')
    .select('id,lead_id,run_after')
    .eq('status', 'pending')
    .eq('kind', 'demo_email')
    .order('run_after', { ascending: true })
    .limit(limit);
  if (opts.leadIds?.length) q = q.in('lead_id', opts.leadIds);

  const { data: jobs, error } = await q;
  if (error) {
    report.held = `The queue could not be read: ${error.message}`;
    return report;
  }

  const rows = (jobs ?? []) as { id: string; lead_id: string | null; run_after: string }[];
  report.ready = rows.length;

  for (const job of rows) {
    if (!job.lead_id) {
      await skipJob(db, job.id, 'The job has no prospect on it.');
      continue;
    }
    const { data } = await db.from('outbound_leads').select('*').eq('id', job.lead_id).maybeSingle();
    const lead = data as AcqProspect | null;
    const label = (v: DemoSendOutcome) => {
      report.outcomes.push(v);
      report[v.status === 'sent' ? 'sent' : v.status === 'skipped' ? 'skipped' : 'failed']++;
    };

    if (!lead) {
      await skipJob(db, job.id, 'The prospect is gone.');
      label({ leadId: job.lead_id, company: null, email: null, status: 'skipped', note: 'The prospect is gone.' });
      continue;
    }
    const who = { leadId: lead.id, company: lead.business_name ?? null, email: lead.email ?? null };

    if (lead.demo_emailed_at) {
      await completeJob(db, job.id, { note: 'Already sent.' });
      label({ ...who, status: 'skipped', note: 'The demo email already went out.' });
      continue;
    }
    if (!lead.hub_demo_url && !lead.demo_url) {
      label({ ...who, status: 'skipped', note: 'Nothing forged yet, so there is nothing to link to.' });
      continue;
    }

    const sent = await sendDemoEmail(db, campaign, lead, override);
    if (sent.ok) {
      await completeJob(db, job.id, { note: override.reason });
      label({ ...who, status: 'sent', note: 'Sent.' });
    } else if (sent.permanent) {
      await skipJob(db, job.id, sent.error);
      label({ ...who, status: 'skipped', note: sent.error });
    } else {
      label({ ...who, status: 'failed', note: sent.error });
    }
  }

  await recordEvent(db, {
    campaignId: campaign.id,
    type: 'note',
    label: `Demo suite emails sent by hand: ${report.sent} sent, ${report.skipped} skipped, ${report.failed} failed`,
    detail: { reason: override.reason, ready: report.ready },
  });

  return report;
}
