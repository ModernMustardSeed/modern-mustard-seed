import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { summariseSources } from '@/lib/cc-sources';
import { handoverActions, handoverBody, jobPhotos } from '@/lib/cc-handover';
import { put } from '@/lib/cc-briefs';
import {
  createJob,
  getJob,
  jobEvents,
  jobFromLead,
  listJobs,
  logJobEvent,
  summarise,
  updateJob,
  type JobEvent,
} from '@/lib/cc-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE BOARD's own endpoint.
 *
 * GET         every job, with the board's summary
 * GET ?id=    one job with its trail
 * create      a job by hand, or from a website lead
 * update      any field; a stage move logs itself
 * log         a call, a meeting, a note. Logging is also touching, which is
 *             what keeps the silence watch honest: a job somebody rang this
 *             morning must not be reported as quiet tonight.
 */
export async function GET(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, people } = got.desk;

  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    const job = await getJob(sb, account.clientEmail, id);
    if (!job) return NextResponse.json({ error: 'No such job.' }, { status: 404 });
    return NextResponse.json({ job, events: await jobEvents(sb, id) });
  }

  const jobs = await listJobs(sb, account.clientEmail);
  // Where the work comes from rides along with the board: it is the same rows
  // grouped a second way, so a second request would only be a second cost.
  return NextResponse.json({ jobs, summary: summarise(jobs), sources: summariseSources(jobs), people });
}

export async function POST(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, author } = got.desk;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }

  const action = String(body.action ?? '');

  if (action === 'create') {
    const r = await createJob(sb, account.clientEmail, body as Record<string, unknown>, author);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, job: r.job });
  }

  if (action === 'from-lead') {
    const leadId = String(body.leadId ?? '');
    if (!leadId) return NextResponse.json({ error: 'Which lead?' }, { status: 400 });
    const { data: lead } = await sb
      .from('client_leads')
      .select('id, name, phone, email, town, project_type, land, message, source')
      .eq('id', leadId)
      .eq('client_email', account.clientEmail)
      .maybeSingle();
    if (!lead) return NextResponse.json({ error: 'No such lead.' }, { status: 404 });
    const r = await jobFromLead(sb, account.clientEmail, lead as Parameters<typeof jobFromLead>[2], author);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, job: r.job });
  }

  if (action === 'update') {
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Which job?' }, { status: 400 });
    const before = await getJob(sb, account.clientEmail, id);
    const r = await updateJob(sb, account.clientEmail, id, body as Record<string, unknown>, author);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

    // THE DAY A HOUSE IS FINISHED. The review is warmest the week they move
    // in, and the photographs of the best work this business did all year are
    // sitting on this job. Both are one press, and neither fires on its own.
    if (r.job.stage === 'complete' && before?.stage !== 'complete') {
      try {
        const photos = await jobPhotos(sb, id);
        await put(sb, account.clientEmail, {
          kind: 'handover',
          subject_type: 'job',
          subject_id: id,
          title: `${r.job.name} is finished`,
          body: handoverBody(r.job, photos),
          actions: handoverActions(r.job, photos),
        });
      } catch {
        /* the stage change is the point; the brief is the courtesy */
      }
    }

    return NextResponse.json({ ok: true, job: r.job, events: await jobEvents(sb, id) });
  }

  if (action === 'log') {
    const id = String(body.id ?? '');
    const kind = String(body.kind ?? 'note') as JobEvent['kind'];
    if (!id) return NextResponse.json({ error: 'Which job?' }, { status: 400 });
    if (!['note', 'call', 'meeting', 'email'].includes(kind)) return NextResponse.json({ error: 'Unknown kind.' }, { status: 400 });
    const job = await getJob(sb, account.clientEmail, id);
    if (!job) return NextResponse.json({ error: 'No such job.' }, { status: 404 });
    await logJobEvent(sb, account.clientEmail, id, { kind, body: String(body.body ?? '') }, author);
    // Logging is touching. Without this the silence watch would report a job
    // that somebody rang this morning.
    await sb.from('client_jobs').update({ last_touch_at: new Date().toISOString() }).eq('id', id).eq('client_email', account.clientEmail);
    return NextResponse.json({ ok: true, events: await jobEvents(sb, id) });
  }

  if (action === 'delete') {
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Which job?' }, { status: 400 });
    await sb.from('client_jobs').delete().eq('id', id).eq('client_email', account.clientEmail);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
