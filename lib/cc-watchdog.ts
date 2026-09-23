import type { SupabaseClient } from '@supabase/supabase-js';
import { alert, recovered } from '@/lib/cc-alert';
import { LLM_WORKER_HEALTH_KEY } from '@/lib/llm';
import { SITE } from '@/lib/seo';
import { lastRan } from '@/lib/cc-ran';
import { possessive } from '@/lib/business-name';

/**
 * THE THINGS THAT BREAK WITHOUT TELLING ANYBODY.
 *
 * The Command Center leans on three pieces of machinery that all fail in the
 * same style: quietly, somewhere else, in a way that looks like nothing
 * happening.
 *
 *   THE DRAINER. Every word this product writes comes from a queue that two
 *   workers drain. If both stop, nothing errors. Posts still get their
 *   mechanical edit, briefs still arrive in plainer words, and the whole thing
 *   degrades so gracefully that nobody notices for a week. A green heartbeat
 *   is not proof of life: one worker here once reported healthy for thirty
 *   nine hours while dead, which is why this watches the QUEUE and not the
 *   heartbeat.
 *
 *   THE CRONS. A cron that stops running produces no error, no row, and no
 *   sign at all. The only evidence is an absence, so absence is what this
 *   looks for.
 *
 *   THE CONNECTIONS. A revoked token is discovered by a post that does not go
 *   out, days later, by a client.
 *
 * Every finding goes to Sarah once, with what to do, and says so again only
 * after the cooldown. Nothing here is shown to a client: a client should be
 * told their feed is not connected, which the self check already does, and
 * should never be told that our queue is stuck.
 */

/** A job queued longer than this with nothing draining it is a stall. */
const STALL_MINUTES = 25;
/** A cron that has not run in this long has stopped. */
const CRON_SILENT_HOURS = 3;

export type WatchResult = { checked: string[]; alerted: string[] };

export async function watchdog(sb: SupabaseClient): Promise<WatchResult> {
  const checked: string[] = [];
  const alerted: string[] = [];

  /* ── the queue that writes everything ── */
  try {
    checked.push('the drainer');
    const stale = new Date(Date.now() - STALL_MINUTES * 60_000).toISOString();
    const { data: stuck } = await sb.from('llm_jobs').select('id, label, created_at').eq('status', 'queued').lt('created_at', stale).order('created_at', { ascending: true }).limit(20);

    if (stuck?.length) {
      // The heartbeat is reported for colour, never as the verdict. The queue
      // is the verdict.
      const { data: health } = await sb.from('app_state').select('value, updated_at').eq('key', LLM_WORKER_HEALTH_KEY).maybeSingle();
      const beat = (health?.value as { at?: string } | null)?.at ?? null;
      const beatAge = beat ? Math.round((Date.now() - Date.parse(beat)) / 60_000) : null;
      const oldest = Math.round((Date.now() - Date.parse(String(stuck[0].created_at))) / 60_000);

      const r = await alert(sb, {
        key: 'llm-stall',
        severity: 'down',
        what: `${stuck.length} ${stuck.length === 1 ? 'job has' : 'jobs have'} been waiting ${oldest} minutes for the drainer`,
        where: 'The queue that writes every post, brief and draft',
        doThis: 'Check the workstation worker is running, and that the llm-worker Action is not failing on its OAuth token. Until one drains, posts still go out in their mechanical form.',
        detail: [
          `oldest: ${stuck[0].label}`,
          beatAge === null ? 'no workstation heartbeat has ever been recorded' : `workstation heartbeat ${beatAge} minutes old (a heartbeat is not proof of life)`,
          `waiting: ${stuck.map((j) => j.label).slice(0, 8).join(', ')}`,
        ].join('\n'),
      });
      if (r === 'sent') alerted.push('the drainer has stalled');
    } else {
      await recovered(sb, 'llm-stall', 'The drainer');
    }
  } catch {
    /* a watchdog that throws is worse than one that misses a pass */
  }

  /* ── crons that have gone silent ── */
  // Each of these writes a row or a state key when it runs. Absence is the
  // only evidence a stopped cron ever leaves.
  const CRONS: Array<{ name: string; what: string }> = [
    { name: 'posting-publish', what: 'Nothing has tried to publish' },
    { name: 'client-mail-sync', what: 'No client mailbox has been read' },
    { name: 'cc-agents', what: 'The standing work has not run' },
  ];

  for (const cron of CRONS) {
    try {
      checked.push(cron.name);
      const last = await lastRan(sb, cron.name);
      // Never stamped is not the same as stopped: a cron deployed an hour ago
      // has no stamp yet, and alerting on that is how a watchdog teaches
      // people to ignore it. The first stamp starts the clock.
      if (!last) continue;
      const hours = (Date.now() - last.getTime()) / 3_600_000;
      if (hours > CRON_SILENT_HOURS) {
        const r = await alert(sb, {
          key: `cron:${cron.name}`,
          severity: 'broken',
          what: `${cron.what} (${Math.round(hours)} hours)`,
          where: `The ${cron.name} cron`,
          doThis: `Open the Vercel cron log for /api/cron/${cron.name} and check the last run. A failing cron usually means an expired secret or a route that started throwing.`,
        });
        if (r === 'sent') alerted.push(`${cron.name} has gone quiet`);
      } else {
        await recovered(sb, `cron:${cron.name}`, `The ${cron.name} cron`);
      }
    } catch {
      /* one cron's check failing must not stop the others */
    }
  }

  return { checked, alerted };
}

/**
 * A connection that stopped answering, told to Sarah rather than only to the
 * client. The client is told what it means for them; she is told what to fix.
 */
export async function alertDeadConnections(sb: SupabaseClient, clientEmail: string, business: string, failing: string[]): Promise<void> {
  if (!failing.length) {
    await recovered(sb, `conn:${clientEmail}`, `${possessive(business)} connections`);
    return;
  }
  await alert(sb, {
    key: `conn:${clientEmail}`,
    severity: 'broken',
    what: failing.length === 1 ? 'A posting connection stopped working' : `${failing.length} posting connections stopped working`,
    where: business,
    doThis: `Reconnect it in their Command Center: ${SITE.url}/api/admin/look?client=${encodeURIComponent(clientEmail)} then /cc#accounts. Their posts are being written and held, not lost.`,
    detail: failing.join('\n'),
  });
}

/** The Operator falling over for a client, which they experience as a shrug. */
export async function alertOperatorFailure(sb: SupabaseClient | null, clientEmail: string, business: string, detail: string): Promise<void> {
  await alert(sb, {
    key: `operator:${clientEmail}`,
    severity: 'broken',
    what: 'The Operator failed to answer a client',
    where: business,
    doThis: 'Usually the drainer. Check the queue and the llm-worker Action. The client saw a polite apology and their question was not answered.',
    detail,
  });
}
