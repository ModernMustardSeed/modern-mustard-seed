import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { collectField, readSiteDrop, type FieldRead } from '@/lib/cc-field';
import { getJob, logJobEvent } from '@/lib/cc-jobs';
import { draftNewMail } from '@/lib/mail-desk';
import { getSettings } from '@/lib/posting/settings';
import { compose, scheduleComposed } from '@/lib/posting/compose';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * FROM THE SITE: upload, read, then file in one press.
 *
 *   upload   a signed URL per photograph, into their own folder
 *   read     the photographs, into three drafts nobody has committed to
 *   collect  the same read when it took longer than the request
 *   file     whichever of the three they kept
 *
 * `file` does three different things and reports each one separately, because
 * they fail separately: the job record always works, the client note needs a
 * connected mailbox, and the post needs Daily Posting to be on. One of them
 * failing must never be reported as all three working.
 *
 * The post lands on the calendar already shaped for every platform, through
 * the same composer a person uses by hand. The client note lands in their own
 * Drafts folder and is never sent from here.
 */

const BUCKET = 'client-intake';
const MAX_BYTES = 20 * 1000 * 1000;

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

  if (action === 'upload') {
    const size = Number(body.size ?? 0);
    const type = String(body.type ?? '');
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return NextResponse.json({ error: 'Photos up to 20 MB each.' }, { status: 413 });
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return NextResponse.json({ error: 'A photo from your phone: JPEG, PNG or WEBP.' }, { status: 415 });
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const folder = account.clientEmail.replace(/[^a-z0-9]+/gi, '-');
    const path = `field/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: 'That upload could not start.' }, { status: 500 });
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, uploadUrl: data.signedUrl, url: pub.publicUrl });
  }

  const files = (Array.isArray(body.files) ? body.files : [])
    .map((f) => (f && typeof f === 'object' ? (f as { url?: unknown; name?: unknown; type?: unknown }) : null))
    .filter((f): f is { url: string; name?: string; type?: string } => typeof f?.url === 'string' && f.url.startsWith('https://'))
    .slice(0, 8);

  const job = typeof body.jobId === 'string' && body.jobId ? await getJob(sb, account.clientEmail, body.jobId) : null;
  const input = { project: account.project, job, text: typeof body.text === 'string' ? body.text : null, files };

  if (action === 'read') {
    const r = await readSiteDrop(input);
    if (r.ok) return NextResponse.json({ ok: true, read: r.read });
    if (r.queued) return NextResponse.json({ ok: false, queued: true, jobId: r.jobId, note: 'Still reading the photos. This screen picks the answer up on its own.' });
    return NextResponse.json({ error: r.error }, { status: 503 });
  }

  if (action === 'collect') {
    const id = String(body.readId ?? '');
    if (!id) return NextResponse.json({ error: 'Which read?' }, { status: 400 });
    const db = getSupabase();
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    return NextResponse.json(await collectField(db, id, input));
  }

  if (action === 'file') {
    const read = (body.read ?? {}) as Partial<FieldRead>;
    const want = (body.keep ?? {}) as { log?: boolean; note?: boolean; post?: boolean };
    const done: string[] = [];
    const failed: string[] = [];

    if (want.log !== false && job) {
      const line = String(read.log ?? '').trim();
      const withPhotos = [line, files.length ? `${files.length} photo${files.length === 1 ? '' : 's'}: ${files.map((f) => f.url).join(' ')}` : ''].filter(Boolean).join('\n');
      await logJobEvent(sb, account.clientEmail, job.id, { kind: 'note', body: withPhotos }, author);
      await sb.from('client_jobs').update({ last_touch_at: new Date().toISOString() }).eq('id', job.id).eq('client_email', account.clientEmail);
      done.push('on the job record');
    }

    if (want.note && read.clientNote?.body) {
      if (!job?.contact_email) {
        failed.push('the homeowner has no email on the job');
      } else {
        const r = await draftNewMail(sb, account.clientEmail, job.contact_email, read.clientNote.subject ?? 'An update on your build', read.clientNote.body);
        if (r.ok) done.push(`in your drafts for ${job.contact_email}`);
        else failed.push(`the note (${r.error})`);
      }
    }

    if (want.post && String(read.post ?? '').trim()) {
      const settings = await getSettings(sb, account.clientEmail);
      if (!settings) {
        failed.push('the post (Daily Posting is not on this account)');
      } else {
        const text = String(read.post).trim();
        const image = files[0]?.url ?? null;
        const composed = await compose(sb, settings, { text, url: image });
        const scheduled = await scheduleComposed(sb, settings, {
          text,
          captions: composed.captions,
          notes: composed.notes,
          headline: composed.headline,
          url: image,
          jobId: composed.jobId,
          by: author.email,
        });
        if ('error' in scheduled) failed.push(`the post (${scheduled.error})`);
        else done.push(`on the calendar for ${scheduled.date}`);
      }
    }

    return NextResponse.json({ ok: failed.length === 0, done, failed });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
