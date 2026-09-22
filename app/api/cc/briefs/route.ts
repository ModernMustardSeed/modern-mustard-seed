import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { decideBrief, listBriefs, type BriefAction } from '@/lib/cc-briefs';
import { getJob, jobFromLead, logJobEvent, updateJob } from '@/lib/cc-jobs';
import { jobPhotos } from '@/lib/cc-handover';
import { askForSite } from '@/lib/cc-site';
import { sendReviewAsk } from '@/lib/reviews';
import { draftNewMail } from '@/lib/mail-desk';
import { addDays, mountainDate } from '@/lib/posting/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * BRIEFS, and the buttons on them.
 *
 * This is where the standing work meets a person. Every action here runs
 * because somebody pressed it, one at a time, and reports what actually
 * happened rather than what was intended. A drafted email lands in their own
 * Drafts folder and is never sent from here; sending stays a thing a person
 * does in their own mail, which is the only version of this a business should
 * accept.
 */
export async function GET(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;
  const all = new URL(req.url).searchParams.get('all') === '1';
  try {
    return NextResponse.json({ briefs: await listBriefs(sb, account.clientEmail, all ? 'all' : 'new') });
  } catch {
    // The table arrives with migration 141. Until then the room is simply empty.
    return NextResponse.json({ briefs: [] });
  }
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
  const id = String(body.id ?? '');

  if (action === 'decide') {
    const status = body.status === 'done' ? 'done' : 'dismissed';
    if (!id) return NextResponse.json({ error: 'Which brief?' }, { status: 400 });
    await decideBrief(sb, account.clientEmail, id, status, author.name);
    return NextResponse.json({ ok: true, briefs: await listBriefs(sb, account.clientEmail) });
  }

  if (action === 'act') {
    const act = body.do as BriefAction | undefined;
    if (!act || typeof act !== 'object') return NextResponse.json({ error: 'Nothing to do.' }, { status: 400 });

    switch (act.kind) {
      case 'draft_email': {
        const r = await draftNewMail(sb, account.clientEmail, act.to, act.subject, act.body);
        if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
        return NextResponse.json({ ok: true, said: `It is in your drafts, addressed to ${act.to}. Nothing has been sent.` });
      }

      case 'stage': {
        const r = await updateJob(sb, account.clientEmail, act.jobId, { stage: act.to }, author);
        if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
        return NextResponse.json({ ok: true, said: `Moved to ${act.to}.`, job: r.job });
      }

      case 'next_step': {
        const on = addDays(mountainDate(), Math.max(0, Math.min(90, Number(act.inDays) || 0)));
        const r = await updateJob(sb, account.clientEmail, act.jobId, { next_step: act.step, next_step_on: on }, author);
        if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
        return NextResponse.json({ ok: true, said: `Next step set for ${on}.`, job: r.job });
      }

      case 'call': {
        // The dialling happens on their phone. What lands here is the record of
        // it, which is also the touch that stops the silence watch firing again.
        if (act.jobId) {
          await logJobEvent(sb, account.clientEmail, act.jobId, { kind: 'call', body: 'Called from a brief' }, author);
          await sb.from('client_jobs').update({ last_touch_at: new Date().toISOString() }).eq('id', act.jobId).eq('client_email', account.clientEmail);
        }
        return NextResponse.json({ ok: true, said: 'Logged as called.' });
      }

      case 'add_job': {
        const { data: lead } = await sb
          .from('client_leads')
          .select('id, name, phone, email, town, project_type, land, message, source')
          .eq('id', act.leadId)
          .eq('client_email', account.clientEmail)
          .maybeSingle();
        if (!lead) return NextResponse.json({ error: 'No such lead.' }, { status: 404 });
        const r = await jobFromLead(sb, account.clientEmail, lead as Parameters<typeof jobFromLead>[2], author);
        if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
        return NextResponse.json({ ok: true, said: `On the board as ${r.job.name}.`, job: r.job });
      }

      case 'note': {
        await logJobEvent(sb, account.clientEmail, act.jobId, { kind: 'note', body: act.body }, author);
        return NextResponse.json({ ok: true, said: 'Noted.' });
      }

      case 'review_ask': {
        const job = await getJob(sb, account.clientEmail, act.jobId);
        if (!job) return NextResponse.json({ error: 'No such job.' }, { status: 404 });
        if (!job.contact_email && !job.contact_phone) return NextResponse.json({ error: 'There is no email or mobile on that job to ask.' }, { status: 400 });
        const r = await sendReviewAsk(sb, account.project, account.clientEmail, {
          name: job.contact_name ?? job.name,
          email: job.contact_email,
          phone: job.contact_phone,
          project: job.name,
        });
        if (!r.ok) return NextResponse.json({ error: r.error ?? 'The review ask did not go.' }, { status: 400 });
        await logJobEvent(sb, account.clientEmail, job.id, { kind: 'note', body: 'Asked them for a review.' }, author);
        return NextResponse.json({ ok: true, said: `The review ask went to ${job.contact_name ?? 'them'}${r.sent_email && r.sent_sms ? ' by email and text' : r.sent_sms ? ' by text' : ' by email'}.` });
      }

      case 'project_page': {
        const job = await getJob(sb, account.clientEmail, act.jobId);
        if (!job) return NextResponse.json({ error: 'No such job.' }, { status: 404 });
        const photos = await jobPhotos(sb, job.id);
        // The request carries the job's own history, so nobody retypes what
        // the board already knows, and the photographs ride with it.
        const body = [
          `${job.name}, finished${job.town ? ` in ${job.town}` : ''}.`,
          job.kind ? `A ${job.kind.replace('-', ' ')}.` : '',
          job.notes?.trim() ? `\nFrom the job:\n${job.notes.trim()}` : '',
          photos.length ? `\n${photos.length} photograph${photos.length === 1 ? '' : 's'} from the build are attached.` : '\nNo photographs are on the job yet.',
        ]
          .filter(Boolean)
          .join('\n');
        const r = await askForSite(sb, account.project, {
          kind: 'project',
          title: `${job.name}, for the website`,
          body,
          details: { town: job.town, kind: job.kind, jobId: job.id },
          photos,
          by: author.email,
        });
        if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
        await logJobEvent(sb, account.clientEmail, job.id, { kind: 'note', body: 'Sent to Sarah for a project page.' }, author);
        return NextResponse.json({ ok: true, said: photos.length ? `Sent to Sarah with ${photos.length} photo${photos.length === 1 ? '' : 's'}. You will see it move under Website.` : 'Sent to Sarah. Add photographs on the job and they will follow.' });
      }

      case 'open':
        return NextResponse.json({ ok: true, said: '' });

      default:
        return NextResponse.json({ error: 'That button does nothing yet.' }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
