import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * WHAT IS STUCK, EVERYWHERE IN THE LOOP.
 *
 * A build finished for Lyons Roofing on 2026-08-26, produced a live voice agent,
 * and then went quiet. No error, no log, no flag. It was found the next day only
 * because Sarah happened to ask about that one lead by name. Everything in the
 * admin looked fine, because every screen in the admin answers "what happened?"
 * and none of them answered "what SHOULD have happened by now and did not?".
 *
 * That is the gap this closes. Every check below names a state the loop is only
 * ever allowed to pass THROUGH, then asks who has been sitting in it too long.
 * A lead mid-build is normal at 19:28 and an emergency at 19:28 the next day,
 * and the only difference is a clock nobody was watching.
 *
 * The rules:
 *   Every check is a query, never an inference. It reports rows, not opinions.
 *   Every finding says what to DO, because a report that needs interpreting
 *   gets skimmed and then ignored.
 *   Silence here means checked and clean, never "nothing ran".
 */

export type Severity = 'critical' | 'warn';

export type Stall = {
  /** Stable id so a digest can dedupe and a UI can key on it. */
  key: string;
  severity: Severity;
  /** One line, past tense, naming the count and the state. */
  title: string;
  /** What it costs, and what to do about it. */
  detail: string;
  count: number;
  /** Up to five, named, so it can be acted on without another query. */
  examples: { id: string; label: string; since: string | null }[];
};

const MIN = 60_000;
const HOUR = 60 * MIN;

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

function rows(
  data: unknown,
  label: (r: Record<string, unknown>) => string,
  since: (r: Record<string, unknown>) => string | null,
): Stall['examples'] {
  return ((data ?? []) as Record<string, unknown>[]).slice(0, 5).map((r) => ({
    id: String(r.id ?? ''),
    label: label(r),
    since: since(r),
  }));
}

const name = (r: Record<string, unknown>) => String(r.business_name ?? r.business ?? r.name ?? 'unnamed');

/**
 * Run every check. Never throws: a stall report that dies on one bad query
 * tells you nothing about the other nine, which is the failure mode it exists
 * to replace.
 */
export async function findStalls(db: SupabaseClient): Promise<Stall[]> {
  const out: Stall[] = [];
  const add = (s: Stall | null) => {
    if (s && s.count > 0) out.push(s);
  };
  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  /* 1. A build that made something real and never said so. THE LYONS CASE. */
  await safe(async () => {
    const { data, count } = await db
      .from('outbound_leads')
      .select('id,business_name,updated_at,hub_demo_url,demo_url', { count: 'exact' })
      .eq('demo_status', 'forging')
      .is('demo_emailed_at', null)
      .lt('updated_at', ago(30 * MIN))
      .or('hub_demo_url.not.is.null,demo_url.not.is.null')
      .limit(5);
    add({
      key: 'build-finished-never-announced',
      severity: 'critical',
      title: `${count ?? 0} built demo${count === 1 ? '' : 's'} finished but never announced`,
      detail:
        'Their voice agent is live and the lead still reads "forging", so nothing will ever mail it to them. ' +
        'rescueStalledBuilds should be clearing these on every queue drain, so any row here means the drain is not running.',
      count: count ?? 0,
      examples: rows(data, name, (r) => String(r.updated_at ?? '')),
    });
  }, null);

  /* 2. A build that died before it made anything. Retryable, but only by hand. */
  await safe(async () => {
    const { data, count } = await db
      .from('outbound_leads')
      .select('id,business_name,updated_at', { count: 'exact' })
      .eq('demo_status', 'forging')
      .is('hub_demo_url', null)
      .is('demo_url', null)
      .lt('updated_at', ago(2 * HOUR))
      .limit(5);
    add({
      key: 'build-died-empty',
      severity: 'warn',
      title: `${count ?? 0} build${count === 1 ? '' : 's'} started and produced nothing`,
      detail: 'No agent, no hub, still marked building hours later. Press Build again on the card, or mark it failed.',
      count: count ?? 0,
      examples: rows(data, name, (r) => String(r.updated_at ?? '')),
    });
  }, null);

  /* 3. A demo that is ready and has been sitting unsent. */
  await safe(async () => {
    const { data, count } = await db
      .from('outbound_leads')
      .select('id,business_name,updated_at', { count: 'exact' })
      .eq('demo_status', 'ready')
      .is('demo_emailed_at', null)
      .not('email', 'is', null)
      .is('unsubscribed_at', null)
      // Eligibility carries the refusals that are CORRECT: a hard bounce, an
      // opt-out, a score under the floor. Hernandez Companies has a finished
      // agent and a dead address, and the engine is right to sit on it. Without
      // this line the report shouts about the system working, which is how a
      // report earns the right to be ignored.
      .eq('acq_eligible', true)
      .lt('updated_at', ago(6 * HOUR))
      .limit(5);
    add({
      key: 'demo-ready-unsent',
      severity: 'critical',
      title: `${count ?? 0} finished demo${count === 1 ? '' : 's'} nobody has been sent`,
      detail:
        'The agent is built, the address is good, the lead is eligible, and no demo email has gone out in six hours. ' +
        'Either the demo_email job was never queued or the queue is held. Check The Hold, then the card.',
      count: count ?? 0,
      examples: rows(data, name, (r) => String(r.updated_at ?? '')),
    });
  }, null);

  /*
   * 4. The queue running behind ON THE WORK THAT IS NOT PACED.
   *
   * A thousand pending cold emails is not a stall, it is Tuesday: the governor
   * meters them at 25 an hour onto a warming domain and the backlog is the
   * ceiling doing its job. Counting those as an emergency was the first thing
   * this report got wrong, and a report that is wrong on day one gets muted by
   * day three.
   *
   * Read the gates rather than the comments: demo_email, followup and checkout
   * all defer on `perms.emailAllowed` and all count against the hourly email
   * budget, so outside the send window they are supposed to sit there. Only
   * calls and builds run on their own clock, so only calls and builds can be
   * genuinely late. A demo that never went out is caught by its outcome above,
   * which is the better question anyway.
   */
  await safe(async () => {
    const { data, count } = await db
      .from('acq_queue')
      .select('id,kind,run_after,lead_id', { count: 'exact' })
      .eq('status', 'pending')
      .in('kind', ['call', 'forge'])
      .lt('run_after', ago(3 * HOUR))
      .limit(5);
    add({
      key: 'queue-behind',
      severity: 'critical',
      title: `${count ?? 0} call${count === 1 ? '' : 's'} or build${count === 1 ? '' : 's'} are hours past due`,
      detail:
        'These do not wait on the send window, so they are late for a reason. Somebody asked to be called or asked ' +
        'for a build and is still waiting. Check the campaign pause switch and The Hold.',
      count: count ?? 0,
      examples: rows(data, (r) => `${r.kind} job`, (r) => String(r.run_after ?? '')),
    });
  }, null);

  /* 5. Jobs that gave up. */
  await safe(async () => {
    const { data, count } = await db
      .from('acq_queue')
      .select('id,kind,error,run_after', { count: 'exact' })
      .eq('status', 'failed')
      .gt('run_after', ago(7 * 24 * HOUR))
      .limit(5);
    add({
      key: 'queue-failed',
      severity: 'warn',
      title: `${count ?? 0} job${count === 1 ? '' : 's'} failed for good this week`,
      detail: 'They exhausted their attempts and will not retry. Read the error, fix the cause, requeue from the card.',
      count: count ?? 0,
      examples: rows(data, (r) => `${r.kind}: ${String(r.error ?? 'no error recorded').slice(0, 60)}`, (r) => String(r.run_after ?? '')),
    });
  }, null);

  /* 6. A drip that stopped stepping. */
  await safe(async () => {
    const { data, count } = await db
      .from('outbound_drips')
      .select('id,lead_id,next_at,step', { count: 'exact' })
      .eq('status', 'active')
      .lt('next_at', ago(6 * HOUR))
      .limit(5);
    add({
      key: 'drip-behind',
      severity: 'critical',
      title: `${count ?? 0} active drip${count === 1 ? '' : 's'} are past due`,
      detail:
        'These are prospects mid-sequence whose next email should already have gone. The drip cron is the thing to ' +
        'check, not the leads: one stopped cron holds every one of them at once.',
      count: count ?? 0,
      examples: rows(data, (r) => `drip on step ${r.step}`, (r) => String(r.next_at ?? '')),
    });
  }, null);

  /* 7. Mr. Mustard asked for a human and did not get one. */
  await safe(async () => {
    const { data, count } = await db
      .from('outbound_leads')
      .select('id,business_name,needs_human,updated_at', { count: 'exact' })
      .not('needs_human', 'is', null)
      .lt('updated_at', ago(24 * HOUR))
      .limit(5);
    add({
      key: 'needs-human-ignored',
      severity: 'warn',
      title: `${count ?? 0} prospect${count === 1 ? '' : 's'} have been waiting on a person for a day`,
      detail: 'Mr. Mustard flagged these on a call and nobody has cleared the flag since. They are the warmest leads on the board.',
      count: count ?? 0,
      examples: rows(data, (r) => `${name(r)}: ${String(r.needs_human ?? '').slice(0, 60)}`, (r) => String(r.updated_at ?? '')),
    });
  }, null);

  /* 8. A website build that never came back. */
  await safe(async () => {
    const { data, count } = await db
      .from('outbound_demo_sites')
      .select('id,business_name,status,created_at', { count: 'exact' })
      .in('status', ['queued', 'building', 'claimed'])
      .lt('created_at', ago(4 * HOUR))
      .limit(5);
    add({
      key: 'site-build-stuck',
      severity: 'warn',
      title: `${count ?? 0} website build${count === 1 ? '' : 's'} have been running for hours`,
      detail: 'A site build takes 20 to 40 minutes. Past four hours the worker has died holding the job. Check the build floor.',
      count: count ?? 0,
      examples: rows(data, (r) => `${name(r)} (${r.status})`, (r) => String(r.created_at ?? '')),
    });
  }, null);

  /* 9. Somebody paid and is still waiting. */
  await safe(async () => {
    const { data, count } = await db
      .from('demo_orders')
      .select('id,business_name,status,created_at', { count: 'exact' })
      .in('status', ['paid', 'intake_done'])
      .lt('created_at', ago(7 * 24 * HOUR))
      .limit(5);
    add({
      key: 'paid-not-delivered',
      severity: 'critical',
      title: `${count ?? 0} paying customer${count === 1 ? ' is' : 's are'} past the seven day promise`,
      detail: 'They have paid and their order is not marked delivered. This is the only number on this report that is billing somebody.',
      count: count ?? 0,
      examples: rows(data, (r) => `${name(r)} (${r.status})`, (r) => String(r.created_at ?? '')),
    });
  }, null);

  /*
   * 10. THE WATCHER WATCHES ITSELF.
   *
   * Every check above is worthless if nothing runs it, and a monitor that has
   * quietly stopped looks exactly like a loop with nothing wrong: both are
   * silent. The daily digest stamps `stalls:lastRun` on every pass, so a clock
   * older than two days means the digest is dead and the silence since then
   * proves nothing at all.
   */
  await safe(async () => {
    const { data } = await db.from('app_state').select('value').eq('key', 'stalls:lastRun').maybeSingle();
    const at = (data?.value as { at?: string } | null)?.at ?? null;
    const stale = !at || Date.now() - new Date(at).getTime() > 2 * 24 * HOUR;
    add({
      key: 'watcher-stopped',
      severity: 'critical',
      title: at ? 'The loop check has not run since ' + new Date(at).toISOString().slice(0, 16).replace('T', ' ') : 'The loop check has never run',
      detail:
        'The daily digest is what makes silence mean "clean" instead of "nobody looked". While it is down, none of ' +
        'the checks above have been seen by anybody. Start with the intake-nudge cron and CRON_SECRET.',
      count: stale ? 1 : 0,
      examples: [],
    });
  }, null);

  return out.sort((a, b) => (a.severity === b.severity ? b.count - a.count : a.severity === 'critical' ? -1 : 1));
}

/** One line for a log or a Slack-shaped digest. */
export function summarize(stalls: Stall[]): string {
  if (!stalls.length) return 'Nothing is stuck anywhere in the loop.';
  const crit = stalls.filter((s) => s.severity === 'critical');
  return `${stalls.length} stall${stalls.length === 1 ? '' : 's'} in the loop${crit.length ? `, ${crit.length} critical` : ''}: ${stalls
    .map((s) => `${s.key} (${s.count})`)
    .join(', ')}`;
}
