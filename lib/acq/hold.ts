/**
 * THE HOLD.
 *
 * The governor writes a refusal row every time it stops a message, and the
 * runner writes the reason onto the queue job every time it defers one. Until
 * this file existed, nothing read either of them, so "we sent the demos and
 * nothing arrived" had no answer anywhere in the admin: the queue looked busy,
 * Sender Health looked amber, and the two facts never met.
 *
 * This is the meeting. One report that answers, in order:
 *   1. Is anything actually waiting?
 *   2. What single check is stopping it?
 *   3. When does that check stop stopping it?
 *
 * Everything here is read from rows we wrote at the moment of the decision. No
 * re-derivation, no guessing: if the governor said "bounce rate", this says
 * bounce rate, in the governor's own words.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { getAcqSettings, getCampaign } from '@/lib/acq/settings';
import { authorize } from '@/lib/acq/governor';
import type { GovernorCheck } from '@/lib/acq/governor';
import type { AcqProspect } from '@/lib/acq/types';

/** Queue kinds that put mail in front of a prospect. Calls are not mail. */
const MAIL_KINDS = ['email', 'demo_email', 'followup'] as const;
export type MailKind = (typeof MAIL_KINDS)[number];

export const MAIL_KIND_LABELS: Record<MailKind, string> = {
  email: 'Campaign email',
  demo_email: 'Demo suite email',
  followup: 'Follow-up',
};

export type WaitingRow = {
  kind: MailKind;
  label: string;
  /** Pending and the clock has already passed. These are the ones stuck. */
  due: number;
  /** Pending but scheduled forward. These are fine. */
  scheduled: number;
  /** The oldest run_after among the due ones, so age is visible. */
  oldestDue: string | null;
  /** The last reason the runner wrote onto a deferred job of this kind. */
  lastNote: string | null;
};

export type RefusalGroup = {
  reason: string;
  count: number;
  firstAt: string;
  lastAt: string;
  kinds: string[];
  sample: string[];
};

export type HoldReport = {
  /** True when at least one mail job is due and the governor would refuse it. */
  held: boolean;
  /** The blocking check, in the governor's words. Null when nothing blocks. */
  blocker: { id: string; label: string; detail: string } | null;
  /** Every check the governor ran on a representative waiting lead. */
  checks: GovernorCheck[];
  /** When it is worth asking again. Null means "not until something changes". */
  retryAfter: string | null;
  waiting: WaitingRow[];
  totalDue: number;
  totalScheduled: number;
  /** Refusals the governor recorded in the last 24 hours, grouped by reason. */
  refusals: RefusalGroup[];
  refused24h: number;
  /** Sends that actually left in the last 24 hours, by provider status. */
  sent24h: Record<string, number>;
  /** Set when the report itself could not be built. */
  error: string | null;
};

type QueueRow = { kind: string; status: string; run_after: string; error: string | null; lead_id: string | null };

/**
 * Counted, never fetched. A backlog is exactly the case where the rows do not
 * fit in one page, and a truncated select would report the ceiling as the
 * answer: 1,000 rows of queue reading as "983 waiting" is a lie that looks
 * like data.
 */
async function countQueue(db: SupabaseClient, kind: MailKind, nowIso: string, side: 'due' | 'scheduled'): Promise<number> {
  let q = db.from('acq_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('kind', kind);
  q = side === 'due' ? q.lte('run_after', nowIso) : q.gt('run_after', nowIso);
  const { count, error } = await q;
  if (error) throw new Error(`The queue could not be counted: ${error.message}`);
  return count ?? 0;
}

/** The front of the queue for one kind: the oldest overdue job, if any. */
async function frontOfQueue(db: SupabaseClient, kind: MailKind, nowIso: string): Promise<QueueRow | null> {
  const { data } = await db
    .from('acq_queue')
    .select('kind,status,run_after,error,lead_id')
    .eq('status', 'pending')
    .eq('kind', kind)
    .lte('run_after', nowIso)
    .order('run_after', { ascending: true })
    .limit(1);
  return ((data ?? [])[0] as QueueRow) ?? null;
}

/** The most recent note the runner wrote onto a deferred job of this kind. */
async function lastDeferNote(db: SupabaseClient, kind: MailKind, nowIso: string): Promise<string | null> {
  const { data } = await db
    .from('acq_queue')
    .select('error')
    .eq('status', 'pending')
    .eq('kind', kind)
    .lte('run_after', nowIso)
    .not('error', 'is', null)
    .order('run_after', { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as { error: string | null })?.error ?? null;
}

/**
 * Read the whole picture. Cheap enough to run on every page load: three
 * indexed reads and one governor evaluation.
 */
export async function holdReport(client?: SupabaseClient | null): Promise<HoldReport> {
  const db = client ?? getSupabase();
  const empty: HoldReport = {
    held: false,
    blocker: null,
    checks: [],
    retryAfter: null,
    waiting: [],
    totalDue: 0,
    totalScheduled: 0,
    refusals: [],
    refused24h: 0,
    sent24h: {},
    error: null,
  };
  if (!db) return { ...empty, error: 'The database is not configured, so the hold cannot be read.' };

  const now = new Date();
  const nowIso = now.toISOString();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let waiting: WaitingRow[];
  let front: (QueueRow | null)[];
  try {
    const perKind = await Promise.all(
      MAIL_KINDS.map(async (kind) => {
        const [due, scheduled, head, note] = await Promise.all([
          countQueue(db, kind, nowIso, 'due'),
          countQueue(db, kind, nowIso, 'scheduled'),
          frontOfQueue(db, kind, nowIso),
          lastDeferNote(db, kind, nowIso),
        ]);
        return { row: { kind, label: MAIL_KIND_LABELS[kind], due, scheduled, oldestDue: head?.run_after ?? null, lastNote: note }, head };
      }),
    );
    waiting = perKind.map((p) => p.row).filter((w) => w.due > 0 || w.scheduled > 0);
    front = perKind.map((p) => p.head);
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : 'The queue could not be read.' };
  }

  const [refusals, sends] = await Promise.all([
    db.from('acq_sends').select('kind,refused_reason,sent_at,to_email').eq('status', 'refused').gte('sent_at', since).order('sent_at', { ascending: false }).limit(1000),
    db.from('acq_sends').select('status').neq('status', 'refused').gte('sent_at', since).limit(1000),
  ]);

  const totalDue = waiting.reduce((n, w) => n + w.due, 0);
  const totalScheduled = waiting.reduce((n, w) => n + w.scheduled, 0);

  /* ── group the refusals by the governor's own sentence ── */

  const byReason = new Map<string, RefusalGroup>();
  for (const r of (refusals.data ?? []) as { kind: string; refused_reason: string | null; sent_at: string; to_email: string }[]) {
    const reason = r.refused_reason ?? 'Refused, with no reason recorded.';
    const g = byReason.get(reason);
    if (g) {
      g.count++;
      g.firstAt = r.sent_at < g.firstAt ? r.sent_at : g.firstAt;
      if (!g.kinds.includes(r.kind)) g.kinds.push(r.kind);
      if (g.sample.length < 5 && !g.sample.includes(r.to_email)) g.sample.push(r.to_email);
    } else {
      byReason.set(reason, { reason, count: 1, firstAt: r.sent_at, lastAt: r.sent_at, kinds: [r.kind], sample: [r.to_email] });
    }
  }
  const grouped = [...byReason.values()].sort((a, b) => b.count - a.count);

  const sent24h: Record<string, number> = {};
  for (const s of (sends.data ?? []) as { status: string }[]) sent24h[s.status] = (sent24h[s.status] ?? 0) + 1;

  /* ── ask the governor the same question the runner asks ── */

  let checks: GovernorCheck[] = [];
  let blocker: HoldReport['blocker'] = null;
  let retryAfter: string | null = null;

  const probe = await probeLead(db, front);
  if (probe) {
    try {
      const [settings, campaign] = await Promise.all([getAcqSettings(), getCampaign()]);
      const decision = await authorize({ db, lead: probe, kind: 'campaign', settings, campaign, now });
      checks = decision.checks;
      retryAfter = decision.retryAfter ? decision.retryAfter.toISOString() : null;
      if (!decision.allowed) {
        const failed = decision.checks.find((c) => c.critical && !c.passed);
        blocker = failed ? { id: failed.id, label: failed.label, detail: failed.detail } : { id: 'unknown', label: 'Refused', detail: decision.reason ?? 'Refused.' };
      }
    } catch (err) {
      return {
        ...empty,
        waiting,
        totalDue,
        totalScheduled,
        refusals: grouped,
        refused24h: refusals.data?.length ?? 0,
        sent24h,
        error: err instanceof Error ? err.message : 'The governor could not be asked.',
      };
    }
  }

  // A blocker that only exists because THIS probe lead is unmailable is not a
  // hold on the queue; only the global checks stop everybody.
  const GLOBAL = new Set(['master', 'email-toggle', 'campaign', 'sender-state', 'window', 'db', 'volume-read', 'ceiling', 'allowance', 'hourly', 'bounce-rate', 'complaint-rate']);
  const globalBlocker = blocker && GLOBAL.has(blocker.id) ? blocker : null;

  return {
    held: Boolean(globalBlocker) && totalDue > 0,
    blocker: globalBlocker,
    checks,
    retryAfter,
    waiting,
    totalDue,
    totalScheduled,
    refusals: grouped,
    refused24h: refusals.data?.length ?? 0,
    sent24h,
    error: null,
  };
}

/**
 * A real lead from the front of the queue, so the governor answers about
 * somebody it would actually be asked about rather than a fabricated row.
 */
async function probeLead(db: SupabaseClient, front: (QueueRow | null)[]): Promise<AcqProspect | null> {
  const oldest = front
    .filter((r): r is QueueRow => Boolean(r?.lead_id))
    .sort((a, b) => a.run_after.localeCompare(b.run_after))[0];
  const id = oldest?.lead_id;
  if (!id) return null;
  const { data } = await db.from('outbound_leads').select('*').eq('id', id).maybeSingle();
  return (data as AcqProspect) ?? null;
}
