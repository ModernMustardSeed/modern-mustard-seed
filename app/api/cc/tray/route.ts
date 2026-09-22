import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { collectTray, fileContacts, readTray, type FilePerson } from '@/lib/cc-tray';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Reading a photograph of handwriting is the slowest thing this desk does.
// The wait inside lib/cc-tray.ts is capped under this; past the cap the job
// keeps running on the queue and the screen collects it.
export const maxDuration = 60;

/**
 * THE TRAY. Four steps, and a person stands between step two and step three.
 *
 *   upload  a signed URL for one file
 *   read    what is in it, as rows, written nowhere
 *   collect the same answer when the model took longer than the request
 *   file    the rows the person kept, into the book
 *
 * `file` takes what the browser sends back, not what the model said, because
 * the whole point of the review screen is that a person may have corrected a
 * digit before pressing the button.
 */

const BUCKET = 'client-intake';
const MAX_BYTES = 20 * 1000 * 1000;
const OK_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf|text\/(csv|plain|markdown)|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/;

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
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return NextResponse.json({ error: 'Files up to 20 MB each.' }, { status: 413 });
    if (!OK_TYPES.test(type)) return NextResponse.json({ error: 'A photo, a PDF, a spreadsheet or a text file.' }, { status: 415 });

    const raw = String(body.name ?? 'file').slice(0, 120);
    const stem = raw.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'file';
    const ext = raw.includes('.') ? raw.split('.').pop()!.replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() : 'bin';
    const folder = account.clientEmail.replace(/[^a-z0-9]+/gi, '-');
    const path = `tray/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${stem}.${ext}`;

    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: 'That upload could not start.' }, { status: 500 });
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, uploadUrl: data.signedUrl, url: pub.publicUrl, path });
  }

  if (action === 'read') {
    const files = (Array.isArray(body.files) ? body.files : [])
      .map((f) => (f && typeof f === 'object' ? (f as { url?: unknown; name?: unknown; type?: unknown }) : null))
      .filter((f): f is { url: string; name?: string; type?: string } => typeof f?.url === 'string' && f.url.startsWith('https://'))
      .slice(0, 8);
    const result = await readTray({
      business: account.project.business,
      text: typeof body.text === 'string' ? body.text : null,
      files,
      clientEmail: account.clientEmail,
    });
    if (result.ok) return NextResponse.json({ ok: true, read: result.read });
    if (result.queued) {
      return NextResponse.json({
        ok: false,
        queued: true,
        jobId: result.jobId,
        note: 'Still reading it. This screen will pick the answer up on its own, and nothing is lost if you close it.',
      });
    }
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  if (action === 'collect') {
    const jobId = String(body.jobId ?? '');
    if (!jobId) return NextResponse.json({ error: 'Which read?' }, { status: 400 });
    const db = getSupabase();
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    return NextResponse.json(await collectTray(db, jobId));
  }

  if (action === 'file') {
    const people = (Array.isArray(body.people) ? body.people : []) as FilePerson[];
    if (!people.length) return NextResponse.json({ error: 'Nothing was kept.' }, { status: 400 });
    const source = String(body.source ?? '').trim().slice(0, 80) || 'Read from a drop';
    const filed = await fileContacts(sb, account.clientEmail, people, source);
    return NextResponse.json({ ok: true, ...filed, by: author.name });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
