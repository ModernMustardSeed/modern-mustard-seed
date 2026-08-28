import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcqProspect } from '@/lib/acq/types';

/**
 * WHO IS WAITING ON A PERSON.
 *
 * The engine is good at the things it can do alone: source, mail, call, build,
 * send, chase. What it cannot do is notice that somebody reached for the door
 * handle and stopped, and then go stand in front of them.
 *
 * This finds those people. Every rule below is the same shape: a real signal
 * from a real human, followed by the machine running out of moves. Nobody here
 * is mid-sequence, because a lead the drip is still working is not a lead
 * anybody should be phoning.
 *
 * Scanner traffic is excluded everywhere it matters. A mail security gateway
 * rendering an email and following its links looks exactly like enthusiasm, and
 * a follow-up list built on it is a list of people who never heard of us
 * (lib/acq/bots.ts marks every hit with detail.machine).
 */

export type FollowupReason =
  | 'flagged'
  | 'talked-no-next-step'
  | 'has-demo-went-quiet'
  | 'reached-and-stopped'
  | 'email-is-dead'
  | 'warm-sequence-done';

export type Followup = {
  lead: AcqProspect;
  reason: FollowupReason;
  /** One line, in Sarah's words, about what this person did. */
  why: string;
  /** The move that fits, said plainly. */
  move: string;
  /** Newest signal, for sorting and for the sheet. */
  at: string;
  /** 1 is hottest. */
  rank: number;
};

const LABEL: Record<FollowupReason, { move: string; rank: number }> = {
  flagged: { move: 'Call them. Mr. Mustard asked for you by name.', rank: 1 },
  'talked-no-next-step': { move: 'Call them back. They talked and nothing was booked.', rank: 1 },
  'email-is-dead': { move: 'Call them. Their agent is built and their email bounces.', rank: 2 },
  'reached-and-stopped': { move: 'Call or write. They pressed the button and did not finish.', rank: 2 },
  'has-demo-went-quiet': { move: 'Write them. They have the demo and stopped talking.', rank: 3 },
  'warm-sequence-done': { move: 'Write them once, by hand. The machine is out of moves.', rank: 4 },
};

const DAY = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();

/** Contactable at all: not a client, not opted out, and reachable somehow. */
function reachable(l: AcqProspect): boolean {
  if (l.unsubscribed_at) return false;
  if (l.client_status === 'client') return false;
  if ((l as unknown as { is_test?: boolean }).is_test) return false;
  return Boolean(l.email || l.phone);
}

export async function findFollowups(db: SupabaseClient, limit = 200): Promise<Followup[]> {
  const found = new Map<string, Followup>();
  /** First reason wins, and the rules run hottest first. */
  const claim = (lead: AcqProspect, reason: FollowupReason, why: string, at: string | null) => {
    if (!reachable(lead) || found.has(lead.id)) return;
    found.set(lead.id, { lead, reason, why, move: LABEL[reason].move, rank: LABEL[reason].rank, at: at ?? new Date(0).toISOString() });
  };

  const safe = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch {
      /* one broken rule must not empty the whole list */
    }
  };

  /* 1. Mr. Mustard put a flag on it and nobody has taken it off. */
  await safe(async () => {
    const { data } = await db.from('outbound_leads').select('*').not('needs_human', 'is', null).limit(limit);
    for (const l of (data ?? []) as AcqProspect[]) {
      claim(l, 'flagged', String(l.needs_human ?? 'Flagged on a call'), l.updated_at as string);
    }
  });

  /* 2. A real conversation that led nowhere. */
  await safe(async () => {
    const { data: calls } = await db
      .from('acq_calls')
      .select('lead_id,duration_sec,summary,requested_at')
      .eq('status', 'completed')
      .gte('duration_sec', 30)
      .order('requested_at', { ascending: false })
      .limit(limit);
    const byLead = new Map<string, { at: string; summary: string; secs: number }>();
    for (const c of (calls ?? []) as Record<string, unknown>[]) {
      const id = String(c.lead_id ?? '');
      if (!id || byLead.has(id)) continue;
      byLead.set(id, {
        at: String(c.requested_at ?? ''),
        // The transcript summary arrives as markdown from the model. On a call
        // sheet that reads as `**Caller:**`, so the asterisks come off here.
        summary: String(c.summary ?? '').replace(/\*+/g, '').replace(/\s+/g, ' ').trim().slice(0, 160),
        secs: Number(c.duration_sec ?? 0),
      });
    }
    if (!byLead.size) return;
    const { data } = await db.from('outbound_leads').select('*').in('id', [...byLead.keys()]);
    for (const l of (data ?? []) as AcqProspect[]) {
      // Booked or bought is not a follow-up, it is a win.
      if (l.acq_stage === 'meeting' || l.acq_stage === 'client' || l.checkout_sent_at) continue;
      const c = byLead.get(l.id)!;
      const mins = Math.round(c.secs / 60);
      claim(l, 'talked-no-next-step', `Talked to Mr. Mustard for ${mins ? `${mins} min` : `${c.secs}s`}. ${c.summary}`, c.at);
    }
  });

  /* 3. Their agent is built and the only address we hold is dead. */
  await safe(async () => {
    const { data } = await db
      .from('outbound_leads')
      .select('*')
      .eq('demo_status', 'ready')
      .is('demo_emailed_at', null)
      .eq('acq_eligible', false)
      .not('phone', 'is', null)
      .limit(limit);
    for (const l of (data ?? []) as AcqProspect[]) {
      claim(l, 'email-is-dead', `Demo built and never sent: ${l.acq_ineligible_reason ?? 'not mailable'}.`, l.updated_at as string);
    }
  });

  /* 4. A human pressed the button and did not finish. */
  await safe(async () => {
    const { data: hits } = await db
      .from('acq_events')
      .select('lead_id,type,label,occurred_at,detail')
      .in('type', ['link_clicked', 'permission_visited'])
      .gte('occurred_at', ago(30))
      .lte('occurred_at', ago(2))
      .order('occurred_at', { ascending: false })
      .limit(600);
    const byLead = new Map<string, { at: string; label: string }>();
    for (const e of (hits ?? []) as Record<string, unknown>[]) {
      const d = (e.detail ?? {}) as { machine?: boolean };
      if (d.machine) continue; // a scanner is not a prospect
      const id = String(e.lead_id ?? '');
      if (!id || byLead.has(id)) continue;
      byLead.set(id, { at: String(e.occurred_at ?? ''), label: String(e.label ?? 'Clicked through') });
    }
    if (!byLead.size) return;
    const ids = [...byLead.keys()].slice(0, limit);
    const { data } = await db.from('outbound_leads').select('*').in('id', ids);
    for (const l of (data ?? []) as AcqProspect[]) {
      if (l.consent_status === 'granted' || l.demo_emailed_at || l.acq_stage === 'meeting' || l.acq_stage === 'client') continue;
      const h = byLead.get(l.id)!;
      claim(l, 'reached-and-stopped', h.label, h.at);
    }
  });

  /* 5. They have their demo and went quiet on it. */
  await safe(async () => {
    const { data } = await db
      .from('outbound_leads')
      .select('*')
      .not('demo_emailed_at', 'is', null)
      .is('reply_at', null)
      .lt('demo_emailed_at', ago(4))
      .limit(limit);
    for (const l of (data ?? []) as AcqProspect[]) {
      if (l.acq_stage === 'meeting' || l.acq_stage === 'client' || l.checkout_sent_at) continue;
      claim(l, 'has-demo-went-quiet', 'Demo sent, no reply since.', l.demo_emailed_at as string);
    }
  });

  /* 6. Warm, and the machine has played every card it holds. */
  await safe(async () => {
    const { data } = await db
      .from('outbound_leads')
      .select('*')
      .gte('lead_score', 70)
      .gte('email_stage', 3)
      .is('reply_at', null)
      .is('demo_emailed_at', null)
      .gt('email_open_count', 0)
      .lt('last_campaign_email_at', ago(5))
      .limit(limit);
    for (const l of (data ?? []) as AcqProspect[]) {
      const opens = Number((l as unknown as { email_open_count?: number }).email_open_count ?? 0);
      claim(l, 'warm-sequence-done', `Scored ${l.lead_score}, opened ${opens} time${opens === 1 ? '' : 's'}, never answered.`, l.last_campaign_email_at as string);
    }
  });

  return [...found.values()].sort((a, b) => (a.rank === b.rank ? (b.at > a.at ? 1 : -1) : a.rank - b.rank));
}
