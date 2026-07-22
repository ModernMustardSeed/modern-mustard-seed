import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { loadBoardForEmail } from '@/lib/moodboard-data';
import { resendClient } from '@/lib/send-email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE CLIENT'S DIRECTION BOARD.
 *
 * GET: the signed-in client's board, if Sarah has sent one. Best-effort like
 * the rest of the portal: a not-yet-migrated column yields an empty section,
 * never a broken portal.
 *
 * POST { action: 'approve' }            → the client signs the direction.
 * POST { action: 'changes', note }      → the client asks for a re-cut; the
 *                                         note goes straight to Sarah.
 *
 * Approving is the gate that lets the scheduled reveal publish; asking for
 * changes keeps holding it. Either way Sarah hears about it immediately.
 */

async function boardFor(email: string) {
  const sb = getSupabase();
  if (!sb) return null;
  return loadBoardForEmail(sb, email);
}

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ moodboard: await boardFor(session.email) });
  } catch {
    return NextResponse.json({ moodboard: null });
  }
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { action?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const current = await boardFor(session.email);
  if (!current) return NextResponse.json({ error: 'No direction board yet.' }, { status: 404 });

  if (body.action === 'approve') {
    const now = new Date().toISOString();
    const { error } = await sb
      .from('projects')
      .update({ moodboard_status: 'approved', moodboard_approved_at: now, moodboard_note: null })
      .eq('id', current.projectId)
      .eq('client_email', session.email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    notifySarah(
      `Direction board APPROVED: ${current.businessName}`,
      `${session.email} approved the "${current.board.directionName}" direction. The reveal is unblocked.`,
    );
    return NextResponse.json({ ok: true, approvedAt: now });
  }

  if (body.action === 'changes') {
    const note = String(body.note ?? '').trim().slice(0, 800);
    if (!note) return NextResponse.json({ error: 'Tell us what feels off, even one sentence helps.' }, { status: 400 });
    const { error } = await sb
      .from('projects')
      .update({ moodboard_status: 'changes', moodboard_note: note, moodboard_approved_at: null })
      .eq('id', current.projectId)
      .eq('client_email', session.email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    notifySarah(
      `Direction board change request: ${current.businessName}`,
      `${session.email} on the "${current.board.directionName}" direction:\n\n"${note}"\n\nRe-forge it on /admin/delivery and send the new cut.`,
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/** Fire-and-forget owner note. A failed email never fails the client's click. */
function notifySarah(subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = resendClient();
    void resend.emails
      .send({
        from: 'MMS Portal <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject,
        text,
      })
      .catch((err: unknown) => console.error('moodboard owner notify failed', err));
  } catch (err) {
    console.error('moodboard owner notify failed', err);
  }
}
