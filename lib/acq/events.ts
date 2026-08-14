/**
 * THE TIMELINE. Every meaningful thing that happens to a prospect is one row
 * here, written by whoever caused it, and the prospect page renders them in
 * order. This is the answer to "what actually happened with this lead", and it
 * is deliberately cheap to write so nobody is tempted to skip it.
 *
 * Events are facts, never state. The lead row carries state; this carries the
 * story. Writing an event never fails a caller: a lost timeline line must not
 * roll back a sent email.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import type { AcqEvent } from '@/lib/acq/types';

export type EventType =
  | 'imported'
  | 'sourced'
  | 'researched'
  | 'email_verified'
  | 'eligible'
  | 'ineligible'
  | 'email_queued'
  | 'email_sent'
  | 'email_failed'
  | 'email_bounced'
  | 'email_opened'
  | 'link_clicked'
  | 'permission_visited'
  | 'consent_captured'
  | 'consent_revoked'
  | 'call_queued'
  | 'call_started'
  | 'call_completed'
  | 'call_failed'
  | 'roleplay'
  | 'forge_requested'
  | 'forge_started'
  | 'forge_completed'
  | 'forge_failed'
  | 'demo_emailed'
  | 'checkout_sent'
  | 'meeting_booked'
  | 'purchased'
  | 'unsubscribed'
  | 'suppressed'
  | 'needs_human'
  | 'reply'
  | 'note'
  | 'stage_changed';

export async function recordEvent(
  db: SupabaseClient | null,
  args: {
    leadId?: string | null;
    campaignId?: string | null;
    type: EventType;
    label: string;
    detail?: Record<string, unknown>;
    occurredAt?: string;
  },
): Promise<void> {
  const client = db ?? getSupabase();
  if (!client) return;
  try {
    await client.from('acq_events').insert({
      lead_id: args.leadId ?? null,
      campaign_id: args.campaignId ?? null,
      type: args.type,
      label: args.label.slice(0, 300),
      detail: args.detail ?? {},
      occurred_at: args.occurredAt ?? new Date().toISOString(),
    });
  } catch {
    /* the timeline is evidence, not a dependency */
  }
}

export async function timelineFor(leadId: string, limit = 200): Promise<AcqEvent[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db
    .from('acq_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as AcqEvent[];
}

/** Events across the whole campaign, newest first. Powers the live activity feed. */
export async function recentEvents(limit = 60, types?: EventType[]): Promise<AcqEvent[]> {
  const db = getSupabase();
  if (!db) return [];
  let q = db.from('acq_events').select('*').order('occurred_at', { ascending: false }).limit(limit);
  if (types?.length) q = q.in('type', types);
  const { data } = await q;
  return (data ?? []) as AcqEvent[];
}
