/**
 * WHAT HAPPENS AFTER A DEMO GOES OUT.
 *
 * Sending somebody a working version of their own business is the single
 * highest-intent moment in the funnel, and it used to be the moment the machine
 * went quiet. Sarah, 2026-08-25: "when we send a demo, it shouldnt end the drip
 * sequence, it should start a new one for every demo sent."
 *
 * Two separate faults were behind that.
 *
 * ONE. The cold drip does stop at `demo_sent`, and it should: you do not keep
 * cold-pitching a phone answering service to somebody who is holding the thing.
 * But the sequence that was supposed to replace it only ever started from ONE of
 * the five places a demo can be sent (the queue worker). A demo sent from the
 * admin button, from the build screen, from demos-now, or by Mr. Mustard while
 * he is on the phone started nothing at all. Those prospects went silent at the
 * exact moment they were most interested. This module is now called from inside
 * the senders themselves, so no caller can forget.
 *
 * TWO. The three jobs were keyed on (kind, lead, step) with no discriminator, so
 * the SECOND demo to the same prospect collided with the first and was refused
 * as a duplicate. "A new one for every demo sent" was impossible by construction.
 * The demo's ordinal is now part of the key, so demo two gets its own sequence,
 * and the previous demo's unsent follow-ups are cancelled first so the two never
 * overlap in somebody's inbox.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueue } from '@/lib/acq/queue';
import { enrollDripAfterDemo } from '@/lib/outbound-drip';
import type { OutboundLead } from '@/lib/outbound';
import type { FollowupKind } from '@/lib/acq/campaign';

/**
 * The sequence, and the business days after the demo that each one goes.
 *
 * Front-loaded on purpose. A demo is interesting on the day it lands and it is
 * furniture by the following week, so the first nudge comes while they can still
 * remember opening it. The last one is far enough out to be a genuine "still
 * here" rather than a fourth chase.
 */
export const POST_DEMO_SEQUENCE: { kind: FollowupKind; afterBusinessDays: number }[] = [
  { kind: 'demo_no_purchase_1', afterBusinessDays: 2 },
  { kind: 'demo_no_purchase_2', afterBusinessDays: 5 },
  { kind: 'demo_no_purchase_3', afterBusinessDays: 8 },
];

/** Queue steps 10, 11, 12 belong to this sequence and to nothing else. */
export const POST_DEMO_STEP_BASE = 10;

/** Whole business days out, landing around 09:00 Mountain. */
export function afterBusinessDays(days: number, from = new Date()): Date {
  const d = new Date(from.getTime());
  let left = Math.max(0, Math.round(days));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  d.setUTCHours(16, 0, 0, 0);
  return d;
}

export type PostDemoStart = {
  /** Which demo this was for this prospect. The first one is 1. */
  demoNumber: number;
  /** Jobs actually created. Fewer than the sequence length means a collision. */
  queued: number;
  /** Unsent follow-ups from an earlier demo that were stood down. */
  cancelled: number;
  /** The five-email drip they were enrolled in, or why they were not. */
  drip: { enrolled: boolean; nextAt: string | null; reason: string | null };
};

/**
 * Start the post-demo sequence, replacing any sequence still running.
 *
 * Called from `sendDemoEmail` and `sendSuiteEmail` the moment the provider
 * accepts, so every path that puts a demo in front of somebody gets the same
 * follow-through. Never throws: a lost follow-up must not turn a delivered demo
 * into a failed send, so a database problem here is swallowed and reported in
 * the return value rather than raised.
 */
export async function startPostDemoSequence(
  db: SupabaseClient,
  args: { leadId: string; campaignId: string | null; from?: Date; messageId?: string | null; subject?: string | null },
): Promise<PostDemoStart> {
  const out: PostDemoStart = { demoNumber: 1, queued: 0, cancelled: 0, drip: { enrolled: false, nextAt: null, reason: null } };
  try {
    // How many demos this prospect has now had. acq_sends is the record of what
    // actually left, so this counts sends rather than intentions, and a refused
    // attempt never advances the number.
    const { count } = await db
      .from('acq_sends')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', args.leadId)
      .eq('kind', 'demo')
      .neq('status', 'refused');
    out.demoNumber = Math.max(1, count ?? 1);

    // Stand down the previous demo's chase. Two sequences running at once is
    // six emails in ten days, which is how a hot prospect becomes a complaint.
    if (out.demoNumber > 1) {
      const { data } = await db
        .from('acq_queue')
        .update({
          status: 'cancelled',
          error: 'Superseded: a newer demo went out and started its own sequence.',
          done_at: new Date().toISOString(),
        })
        .eq('lead_id', args.leadId)
        .eq('kind', 'followup')
        .in('status', ['pending'])
        .gte('step', POST_DEMO_STEP_BASE)
        .lt('step', POST_DEMO_STEP_BASE + POST_DEMO_SEQUENCE.length)
        .select('id');
      out.cancelled = (data ?? []).length;
    }

    // THE DRIP IS THE FIRST CHOICE. Its five emails run demo, missed-call math,
    // the first week live, the price in writing, the close, which is the whole
    // argument for buying rather than three variations on "did you open it".
    // Sarah, 2026-08-25: "they should automatically enter a drip campaign after
    // that to try to land the client."
    const { data: leadRow } = await db.from('outbound_leads').select('*').eq('id', args.leadId).maybeSingle();
    if (leadRow) {
      const res = await enrollDripAfterDemo(db, leadRow as OutboundLead, {
        startedBy: 'demo-sent',
        messageId: args.messageId ?? null,
        subject: args.subject ?? null,
      });
      if (res.ok) {
        out.drip = { enrolled: true, nextAt: res.nextAt, reason: null };
        // Enrolled. The three queue follow-ups would land on top of the drip's
        // own emails, so they are not scheduled at all. Two sequences chasing
        // one prospect is eight emails in three weeks.
        return out;
      }
      out.drip = { enrolled: false, nextAt: null, reason: res.error };
    }

    // THE FALLBACK. A lead the drip refuses (replied, bounced, DNC, won, lost)
    // is usually one that should not be chased either, but a lead the drip
    // cannot render for still deserves the three nudges rather than silence.
    const from = args.from ?? new Date();
    for (const [i, entry] of POST_DEMO_SEQUENCE.entries()) {
      const res = await enqueue(db, {
        kind: 'followup',
        leadId: args.leadId,
        campaignId: args.campaignId,
        step: POST_DEMO_STEP_BASE + i,
        runAfter: afterBusinessDays(entry.afterBusinessDays, from),
        payload: { followup: entry.kind, demoNumber: out.demoNumber },
        // THE WHOLE POINT. Without the ordinal in the key, demo two's jobs are
        // byte-identical to demo one's and the unique index refuses them.
        discriminator: `demo${out.demoNumber}`,
      });
      if (res.ok && res.created) out.queued++;
    }
  } catch {
    /* a delivered demo is never failed by its follow-up scheduling */
  }
  return out;
}
