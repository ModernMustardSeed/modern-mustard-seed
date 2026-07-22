import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * A lead's PERSONAL VIDEO: the face-to-camera take Sarah records in the booth
 * for one lead ("I Called Your Receptionist"), attached to that lead so it
 * leads their demo hub and their demo email.
 *
 * No new column: the attachment IS a file at a lead-scoped path in the private
 * `booth` bucket (founder/<leadId>.webm). Attaching copies the chosen booth
 * take onto that path (a server-side storage copy, so deleting the original
 * take later never breaks a sent hub). Its existence is the whole state.
 */

const BUCKET = 'booth';
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9._-]{0,120}$/i;
const SIGN_TTL = 60 * 60 * 3; // 3h, matches the booth playback window

const destPath = (id: string) => `founder/${id}.webm`;

/** GET: is a personal video attached to this lead? Returns a signed preview URL. */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  if (!SAFE_SEGMENT.test(id)) return NextResponse.json({ error: 'Bad lead id.' }, { status: 400 });

  const { data } = await guard.supabase.storage.from(BUCKET).createSignedUrl(destPath(id), SIGN_TTL);
  return NextResponse.json({ attached: Boolean(data?.signedUrl), url: data?.signedUrl ?? null });
}

/** POST { takePath }: copy a booth take onto this lead's personal-video slot. */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  if (!SAFE_SEGMENT.test(id)) return NextResponse.json({ error: 'Bad lead id.' }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { takePath?: string } | null;
  const takePath = (body?.takePath ?? '').trim();
  const [scriptId, fileName, ...rest] = takePath.split('/');
  if (!scriptId || !fileName || rest.length || !SAFE_SEGMENT.test(scriptId) || !SAFE_SEGMENT.test(fileName)) {
    return NextResponse.json({ error: 'That take path is not valid.' }, { status: 400 });
  }

  const store = guard.supabase.storage.from(BUCKET);
  const dest = destPath(id);
  // Overwrite any previous attachment: copy fails if the dest already exists.
  await store.remove([dest]);
  const { error: copyErr } = await store.copy(takePath, dest);
  if (copyErr) {
    return NextResponse.json(
      { error: 'Could not attach that take. It may have been deleted from the booth.' },
      { status: 500 },
    );
  }

  const { data: signed } = await store.createSignedUrl(dest, SIGN_TTL);

  // Leave a note on the lead's thread so the attachment is auditable.
  try {
    await guard.supabase.from('messages').insert({
      outbound_lead_id: id,
      direction: 'outbound',
      channel: 'note',
      from_addr: 'cockpit',
      to_addr: 'personal video',
      subject: 'Personal video attached',
      snippet: 'A face-to-camera video was attached; it now leads their demo hub and demo email.',
      read: true,
      occurred_at: new Date().toISOString(),
    });
  } catch {
    /* the note is a nicety, never block the attach */
  }

  return NextResponse.json({ ok: true, attached: true, url: signed?.signedUrl ?? null });
}

/** DELETE: remove the personal video from this lead (back to the standard film). */
export async function DELETE(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  if (!SAFE_SEGMENT.test(id)) return NextResponse.json({ error: 'Bad lead id.' }, { status: 400 });

  const { error } = await guard.supabase.storage.from(BUCKET).remove([destPath(id)]);
  if (error) return NextResponse.json({ error: 'Could not remove it.' }, { status: 500 });
  return NextResponse.json({ ok: true, attached: false });
}
