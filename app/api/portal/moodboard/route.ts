import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { sanitizeMoodboard } from '@/lib/moodboard-shared';
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

type Asset = { url?: string; name?: string; kind?: string };

async function boardFor(email: string) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: project } = await sb
    .from('projects')
    .select('id, name, moodboard, moodboard_status, moodboard_note, moodboard_sent_at, moodboard_approved_at')
    .eq('client_email', email)
    .in('moodboard_status', ['sent', 'changes', 'approved'])
    .order('moodboard_sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!project?.moodboard) return null;

  const board = sanitizeMoodboard(project.moodboard);
  if (!board) return null;

  let businessName = String(project.name ?? 'Your business');
  let logoUrl: string | null = null;
  let photos: string[] = [];
  try {
    const { data: order } = await sb
      .from('demo_orders')
      .select('business_name, intake')
      .eq('project_id', project.id)
      .maybeSingle();
    if (order?.business_name) businessName = String(order.business_name);
    const assets = (order?.intake as { assets?: Asset[] } | null)?.assets;
    if (Array.isArray(assets)) {
      logoUrl = assets.find((a) => a?.kind === 'logo' && typeof a.url === 'string')?.url ?? null;
      photos = assets
        .filter((a) => (a?.kind === 'photo' || a?.kind === 'product') && typeof a.url === 'string')
        .map((a) => a.url as string)
        .slice(0, 4);
    }
  } catch {
    /* order lookup is garnish, the board still renders */
  }

  return {
    projectId: project.id as string,
    board,
    status: String(project.moodboard_status),
    note: (project.moodboard_note as string | null) ?? null,
    sentAt: (project.moodboard_sent_at as string | null) ?? null,
    approvedAt: (project.moodboard_approved_at as string | null) ?? null,
    businessName,
    logoUrl,
    photos,
  };
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
