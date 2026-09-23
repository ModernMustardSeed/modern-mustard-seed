import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientProject } from '@/lib/client-leads';
import { accountViews } from '@/lib/posting/accounts';
import { checkAll } from '@/lib/posting/verify';
import { getSettings } from '@/lib/posting/settings';
import { put } from '@/lib/cc-briefs';
import { mountainDate } from '@/lib/posting/time';

/**
 * THE DESK CHECKS ITSELF.
 *
 * Everything in this app fails quietly. A post claims itself and the process
 * dies, so the row sits at "publishing" forever and nobody is told. A Page
 * token is revoked in somebody's Meta settings on a Tuesday and the first
 * anyone knows is a week of silent feeds. A brief points at a job that was
 * deleted and shows a card that opens on nothing.
 *
 * None of those are bugs exactly. They are the ordinary wear of a system that
 * talks to other systems, and the difference between software that holds up
 * and software that slowly stops working is whether anything looks.
 *
 * So every hour this looks, and it does the same three things in order:
 *
 *   HEAL     what can be put right without a decision, put right. A claim
 *            left by a dead process is released. A brief about a row that no
 *            longer exists is closed.
 *   PROVE    what can only be known by asking, asked. Once a day every
 *            connection is checked against the live platform, because a
 *            stored green check is a memory and not a fact.
 *   RAISE    what needs a person, raised once, as a brief, with what to do.
 *
 * WHAT IT WILL NOT DO. It will not post, send, schedule, or fill a silence.
 * "We never fill silence with filler" is a promise in the product and a
 * self-healing loop that writes posts to keep a feed warm breaks it while
 * looking helpful.
 */

const HEALTH_KEY = 'cc_selfcheck';

export type Repair = { what: string; n: number };
export type Report = {
  at: string;
  client: string;
  healed: Repair[];
  raised: string[];
  checked: number;
  failing: string[];
};

/** A publish that claimed a row and never came back. */
const STUCK_MINUTES = 30;

export async function selfCheck(sb: SupabaseClient, project: ClientProject): Promise<Report> {
  const email = project.clientEmail;
  const healed: Repair[] = [];
  const raised: string[] = [];
  const failing: string[] = [];
  let checked = 0;

  /* ── heal: a claim left behind by a process that died ── */
  try {
    const stale = new Date(Date.now() - STUCK_MINUTES * 60_000).toISOString();
    const { data } = await sb
      .from('posting_posts')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('client_email', email)
      .eq('status', 'publishing')
      .lt('updated_at', stale)
      .select('id');
    if (data?.length) healed.push({ what: 'posts released from a publish that never finished', n: data.length });
  } catch {
    /* the rest of the check still runs */
  }

  /* ── heal: briefs about rows that no longer exist ── */
  try {
    const { data: open } = await sb.from('client_briefs').select('id, subject_type, subject_id').eq('client_email', email).eq('status', 'new').not('subject_id', 'is', null).limit(200);
    const byType = new Map<string, string[]>();
    for (const b of open ?? []) byType.set(String(b.subject_type), [...(byType.get(String(b.subject_type)) ?? []), String(b.subject_id)]);

    const tableOf: Record<string, string> = { job: 'client_jobs', lead: 'client_leads', trade: 'client_trades' };
    const dead: string[] = [];
    for (const [type, ids] of byType) {
      const table = tableOf[type];
      if (!table || !ids.length) continue;
      const { data: alive } = await sb.from(table).select('id').eq('client_email', email).in('id', ids);
      const living = new Set((alive ?? []).map((r) => String(r.id)));
      for (const b of open ?? []) {
        if (String(b.subject_type) === type && b.subject_id && !living.has(String(b.subject_id))) dead.push(String(b.id));
      }
    }
    if (dead.length) {
      await sb.from('client_briefs').update({ status: 'dismissed', decided_at: new Date().toISOString(), decided_by: 'the desk, tidying up' }).in('id', dead);
      healed.push({ what: 'briefs closed because what they were about is gone', n: dead.length });
    }
  } catch {
    /* not migrated yet */
  }

  /* ── heal: a job whose next step has been done and never cleared ── */
  // Deliberately absent. Only a person knows whether a step was done, and a
  // loop that clears next steps on a timer teaches people to distrust the one
  // field the board is built on.

  /* ── prove: ask the platforms, once a day ── */
  try {
    const settings = await getSettings(sb, email);
    if (settings?.active) {
      const { data: state } = await sb.from('app_state').select('value').eq('key', `${HEALTH_KEY}:${email}`).maybeSingle();
      const lastChecked = (state?.value as { checkedOn?: string } | null)?.checkedOn ?? null;
      const today = mountainDate();
      if (lastChecked !== today) {
        const accounts = await accountViews(sb, email);
        const live = accounts.filter((a) => a.connected && !a.manualOnly).map((a) => a.provider);
        if (live.length) {
          const results = await checkAll(sb, email, live);
          checked = results.length;
          for (const r of results) if (!r.ok) failing.push(`${r.platform}: ${r.error ?? 'not answering'}`);
        }
        await sb.from('app_state').upsert({ key: `${HEALTH_KEY}:${email}`, value: { checkedOn: today, at: new Date().toISOString(), failing }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
    }
  } catch {
    /* an unreachable platform is not a reason to fail the whole pass */
  }

  /* ── raise: a connection that has died ── */
  if (failing.length) {
    try {
      const r = await put(sb, email, {
        kind: 'risk',
        subject_type: 'board',
        subject_id: null,
        title: failing.length === 1 ? 'A connection has stopped working' : `${failing.length} connections have stopped working`,
        body: [
          'These answered today and could not post:',
          ...failing.map((f) => `- ${f}`),
          '',
          'Until they are reconnected, posts for those feeds are written and wait for a person instead of going out. Nothing has been lost.',
        ].join('\n'),
        actions: [{ kind: 'open', label: 'Open Connections', room: 'accounts' }],
      });
      if (r === 'written') raised.push('a dead connection');
    } catch {
      /* the failure is still recorded on the account row */
    }
  }

  /* ── raise: posting is switched on and nothing can post ── */
  try {
    const settings = await getSettings(sb, email);
    if (settings?.active && settings.visible) {
      const accounts = await accountViews(sb, email);
      const byApi = accounts.filter((a) => !a.manualOnly);
      const connected = byApi.filter((a) => a.connected);
      if (byApi.length && connected.length === 0) {
        const r = await put(sb, email, {
          kind: 'risk',
          subject_type: 'board',
          subject_id: null,
          title: 'Nothing can post on its own yet',
          body: [
            'Daily Posting is switched on and no account is connected, so every post that comes due is written and then waits for a person to put it out by hand.',
            '',
            'Connecting the Facebook Page takes a few minutes and brings Instagram with it.',
          ].join('\n'),
          actions: [{ kind: 'open', label: 'Open Connections', room: 'accounts' }],
        });
        if (r === 'written') raised.push('nothing connected');
      }
    }
  } catch {
    /* posting is not set up here */
  }

  const report: Report = { at: new Date().toISOString(), client: email, healed, raised, checked, failing };

  try {
    await sb.from('app_state').upsert({ key: `${HEALTH_KEY}:last:${email}`, value: report as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch {
    /* the report is nice to have; the repairs already happened */
  }

  return report;
}

/** The last time the desk looked at itself, for the Systems line. */
export async function lastSelfCheck(sb: SupabaseClient, clientEmail: string): Promise<Report | null> {
  try {
    const { data } = await sb.from('app_state').select('value').eq('key', `${HEALTH_KEY}:last:${clientEmail.toLowerCase().trim()}`).maybeSingle();
    return (data?.value as Report | null) ?? null;
  } catch {
    return null;
  }
}
