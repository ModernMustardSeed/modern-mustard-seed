import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { askForSite, draftArticle, draftProject, listSiteRequests, type SiteKind } from '@/lib/cc-site';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * THE WEBSITE WORKBENCH's endpoint.
 *
 *   GET             everything they have asked for, with its status
 *   upload          a signed URL for one photograph
 *   draft-project   photographs and three answers become a page draft
 *   draft-article   notes become a piece for their own blog
 *   collect         either draft, when the writing outran the request
 *   ask             put it in the queue and tell Sarah
 *
 * Drafting writes nothing. `ask` is the only thing that leaves a mark, and
 * what it sends is what the person had on screen after they edited it.
 */

const BUCKET = 'client-intake';
const MAX_BYTES = 20 * 1000 * 1000;

export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;
  try {
    return NextResponse.json({ requests: await listSiteRequests(sb, account.clientEmail) });
  } catch {
    // The columns arrive with migration 142; until then the room shows the
    // rest of itself rather than an error.
    return NextResponse.json({ requests: [] });
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

  if (action === 'upload') {
    const size = Number(body.size ?? 0);
    const type = String(body.type ?? '');
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return NextResponse.json({ error: 'Photos up to 20 MB each.' }, { status: 413 });
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return NextResponse.json({ error: 'JPEG, PNG or WEBP.' }, { status: 415 });
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const folder = account.clientEmail.replace(/[^a-z0-9]+/gi, '-');
    const path = `projects/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: 'That upload could not start.' }, { status: 500 });
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, uploadUrl: data.signedUrl, url: pub.publicUrl });
  }

  const files = (Array.isArray(body.files) ? body.files : [])
    .map((f) => (f && typeof f === 'object' ? (f as { url?: unknown; name?: unknown; type?: unknown }) : null))
    .filter((f): f is { url: string; name?: string; type?: string } => typeof f?.url === 'string' && f.url.startsWith('https://'))
    .slice(0, 12);

  if (action === 'draft-project') {
    const r = await draftProject(account.project, {
      town: String(body.town ?? ''),
      kind: String(body.kind ?? 'a custom home'),
      answers: String(body.answers ?? ''),
      files,
    });
    if (r.ok) return NextResponse.json({ ok: true, draft: r.draft });
    if (r.queued) return NextResponse.json({ ok: false, queued: true, jobId: r.jobId, note: 'Still reading the photographs. This screen picks it up on its own.' });
    return NextResponse.json({ error: r.error }, { status: 503 });
  }

  if (action === 'draft-article') {
    const r = await draftArticle(account.project, { topic: String(body.topic ?? ''), notes: String(body.notes ?? '') });
    if (r.ok) return NextResponse.json({ ok: true, draft: r.draft });
    if (r.queued) return NextResponse.json({ ok: false, queued: true, jobId: r.jobId, note: 'Still writing. This screen picks it up on its own.' });
    return NextResponse.json({ error: r.error }, { status: 503 });
  }

  if (action === 'collect') {
    const id = String(body.jobId ?? '');
    if (!id) return NextResponse.json({ error: 'Which draft?' }, { status: 400 });
    const db = getSupabase();
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    const { data } = await db.from('llm_jobs').select('status, result_json, error').eq('id', id).maybeSingle();
    if (!data) return NextResponse.json({ status: 'failed', error: 'That draft is gone.' });
    if (data.status === 'failed') return NextResponse.json({ status: 'failed', error: String(data.error ?? 'It could not be written.') });
    if (data.status !== 'done' || !data.result_json) return NextResponse.json({ status: 'working' });
    return NextResponse.json({ status: 'done', draft: data.result_json });
  }

  if (action === 'ask') {
    const kind = String(body.kind ?? '') as SiteKind;
    if (!['project', 'article', 'change', 'photos'].includes(kind)) return NextResponse.json({ error: 'Unknown kind.' }, { status: 400 });
    const r = await askForSite(sb, account.project, {
      kind,
      title: String(body.title ?? ''),
      body: String(body.body ?? ''),
      details: (body.details && typeof body.details === 'object' ? body.details : {}) as Record<string, unknown>,
      photos: files.map((f) => f.url),
      by: author.email,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, id: r.id, requests: await listSiteRequests(sb, account.clientEmail) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
