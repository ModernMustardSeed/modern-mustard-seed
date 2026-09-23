import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS, type ClientProject } from '@/lib/client-leads';
import { mondayBoard, put, qualifyLead, quietJob } from '@/lib/cc-briefs';
import { certBody, certsNeedingAttention } from '@/lib/cc-handover';
import { noticeThings } from '@/lib/cc-noticing';
import { selfCheck } from '@/lib/cc-selfcheck';
import { proposeTuning } from '@/lib/cc-tuning';
import { OPEN_STAGES, QUIET_AFTER_DAYS, daysSince, listJobs, type JobRow } from '@/lib/cc-jobs';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * THE STANDING WORK, hourly.
 *
 * This is the part that makes the Command Center agentic rather than
 * interactive: it runs whether or not anybody opened the app, and it arrives
 * having already done the reading.
 *
 *   QUALIFY  a website inquiry that nobody has briefed yet, read and drafted
 *            inside the hour. A custom home buyer phones three builders in an
 *            afternoon, and the one who calls back first wins an unfair share.
 *   QUIET    an open job nobody has touched past what its stage allows, with
 *            the check-in already written.
 *   MONDAY   the board, read and ranked, once a week.
 *
 * Every one of them writes a brief and stops. Nothing here emails a homeowner,
 * moves a job, or marks anything as done. A person presses the button.
 *
 * WORK BUDGET. Each pass does a small, fixed amount: the queue is a table and
 * rows wait, and a cron that tries to clear everything in one run is a cron
 * that times out and clears nothing. Briefs also deduplicate on a unique
 * index, so a slow pass costs a few minutes, never a double.
 */

/** Per pass, per client. Enough to keep up, small enough to always finish. */
const MAX_QUALIFY = 3;
const MAX_QUIET = 2;

/** An inquiry older than this is history, not something to brief at 2am. */
const FRESH_HOURS = 72;

/**
 * Who this runs for: every client, every hour.
 *
 * This used to be clever. It ran for a desk whose Command Center was switched
 * on, and then, when that proved too narrow, for a desk with a job on the
 * board, and then for one with a job OR a trade. Every version of that
 * cleverness had the same bug in it: a client with something genuinely wrong
 * was silently skipped because they did not match the shape the rule expected.
 * A self healing loop that decides on its own not to look at somebody is the
 * exact failure it was built to prevent.
 *
 * So it looks at everyone, and each check decides for itself whether there is
 * anything to do. The checks are all cheap and all guarded: fresh leads only,
 * a handful of jobs per pass, one brief per thing per week. A client with an
 * empty desk costs a few reads and produces nothing, which is the correct
 * amount of work to do about an empty desk.
 */
function everyClient(): ClientProject[] {
  return Object.values(CLIENT_PROJECTS);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });

  const url = new URL(req.url);
  const only = url.searchParams.get('client');
  const force = url.searchParams.get('force') === '1';

  const projects = everyClient().filter((p) => !only || p.clientEmail === only.toLowerCase());
  const report: Array<Record<string, unknown>> = [];

  // Monday, in Mountain time, is when the board gets read. `force` runs it now.
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Denver' });
  const hourMt = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Denver' }));
  const isMondayMorning = weekday === 'Mon' && hourMt >= 7 && hourMt < 9;

  for (const project of projects) {
    const line: Record<string, unknown> = { client: project.clientEmail, qualified: 0, quiet: 0, monday: 'no' };

    /* ── new inquiries nobody has briefed ── */
    try {
      const since = new Date(Date.now() - FRESH_HOURS * 3600_000).toISOString();
      const { data: leads } = await sb
        .from('client_leads')
        .select('id, name, phone, email, town, project_type, land, message, source, created_at')
        .eq('client_email', project.clientEmail)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);

      const fresh = (leads ?? []) as Array<Parameters<typeof qualifyLead>[2]>;
      if (fresh.length) {
        // One query for every brief already written about these leads, rather
        // than one query per lead.
        const { data: had } = await sb
          .from('client_briefs')
          .select('subject_id')
          .eq('client_email', project.clientEmail)
          .eq('kind', 'qualify')
          .in('subject_id', fresh.map((l) => l.id));
        const seen = new Set((had ?? []).map((r) => String(r.subject_id)));

        for (const lead of fresh.filter((l) => !seen.has(l.id)).slice(0, MAX_QUALIFY)) {
          try {
            const r = await qualifyLead(sb, project, lead);
            if (r === 'written') line.qualified = (line.qualified as number) + 1;
          } catch (err) {
            console.error('cc-agents qualify failed', lead.id, err instanceof Error ? err.message : err);
          }
        }
      }
    } catch (err) {
      line.qualifyError = err instanceof Error ? err.message : 'failed';
    }

    /* ── jobs that have gone quiet ── */
    try {
      const jobs = await listJobs(sb, project.clientEmail);
      const open = jobs.filter((j: JobRow) => OPEN_STAGES.includes(j.stage));
      const overdue = open
        .filter((j) => {
          const limit = QUIET_AFTER_DAYS[j.stage];
          const silent = daysSince(j.last_touch_at);
          return limit !== null && silent !== null && silent > limit;
        })
        // Loudest first: the longest silence on the biggest number.
        .sort((a, b) => (daysSince(b.last_touch_at) ?? 0) - (daysSince(a.last_touch_at) ?? 0) || (b.value_cents ?? 0) - (a.value_cents ?? 0));

      if (overdue.length) {
        const { data: had } = await sb
          .from('client_briefs')
          .select('subject_id')
          .eq('client_email', project.clientEmail)
          .eq('kind', 'quiet')
          .eq('status', 'new')
          .in('subject_id', overdue.map((j) => j.id));
        const openAlready = new Set((had ?? []).map((r) => String(r.subject_id)));

        for (const job of overdue.filter((j) => !openAlready.has(j.id)).slice(0, MAX_QUIET)) {
          try {
            const r = await quietJob(sb, project, job);
            if (r === 'written') line.quiet = (line.quiet as number) + 1;
          } catch (err) {
            console.error('cc-agents quiet failed', job.id, err instanceof Error ? err.message : err);
          }
        }
      }
    } catch (err) {
      line.quietError = err instanceof Error ? err.message : 'failed';
    }

    /* ── the desk checks itself ── */
    //
    // First, every pass, before anything else: a claim left by a dead process
    // or a brief about a row that no longer exists should be tidied before
    // the rest of the work reads the same tables.
    try {
      const report = await selfCheck(sb, project);
      if (report.healed.length) line.healed = report.healed.map((h) => `${h.n} ${h.what}`);
      if (report.raised.length) line.raisedBySelfCheck = report.raised;
      if (report.failing.length) line.failingConnections = report.failing;
    } catch (err) {
      line.selfCheckError = err instanceof Error ? err.message : 'failed';
    }

    /* ── certificates about to lapse ── */
    try {
      const certs = await certsNeedingAttention(sb, project);
      if (certs.length) {
        const worst = certs[0];
        // One brief for all of them rather than one each: a builder wants the
        // list, and six cards about insurance is how a person learns to close
        // cards about insurance.
        const r = await put(sb, project.clientEmail, {
          kind: 'cert',
          subject_type: 'trade',
          subject_id: worst.id,
          title: certs.some((c) => c.cert.level === 'lapsed')
            ? `${certs.filter((c) => c.cert.level === 'lapsed').length} insurance certificate${certs.filter((c) => c.cert.level === 'lapsed').length === 1 ? ' has' : 's have'} lapsed`
            : `${certs.length} insurance certificate${certs.length === 1 ? '' : 's'} running out`,
          body: certBody(certs),
          actions: [
            ...(worst.phone ? [{ kind: 'call' as const, label: `Call ${worst.company}`, phone: worst.phone }] : []),
            { kind: 'open' as const, label: 'Open the bench', room: 'trades' },
          ],
        });
        line.certs = r;
      }
    } catch (err) {
      line.certError = err instanceof Error ? err.message : 'failed';
    }

    /* ── Monday ── */
    if (isMondayMorning || force) {
      try {
        line.monday = await mondayBoard(sb, project);
      } catch (err) {
        line.mondayError = err instanceof Error ? err.message : 'failed';
      }
      // And the thing no rule would have found. Weekly, beside the board read,
      // because a pattern that changes on a Tuesday was never a pattern.
      try {
        line.noticed = await noticeThings(sb, project);
      } catch (err) {
        line.noticedError = err instanceof Error ? err.message : 'failed';
      }
      // And the numbers this product guessed at, re-argued from their own
      // results. Silent until there is enough of them to mean anything.
      try {
        line.tuning = await proposeTuning(sb, project);
      } catch (err) {
        line.tuningError = err instanceof Error ? err.message : 'failed';
      }
    }

    report.push(line);
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString(), clients: report });
}
