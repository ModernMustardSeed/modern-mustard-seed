import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { roomRegistration } from '@/lib/bootcamp/room-auth';
import { markHere } from '@/lib/bootcamp/stage';
import { canAttend, clockPinned, getSession, isLive, isSessionKey, roomNow } from '@/lib/bootcamp/sessions';

/**
 * "I am in the room." The room posts this once when a live session is on
 * screen, from the browser, so a link preview or a mail scanner opening the
 * room never counts as attendance. Only a live session the person holds a
 * seat in can be marked, and only once.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { id?: string; k?: string; session?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const reg = await roomRegistration(sb, body.id, body.k);
    if (!reg) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (!isSessionKey(body.session)) return NextResponse.json({ error: 'unknown_session' }, { status: 400 });
    const session = getSession(body.session);
    if (!session || !canAttend(reg.tier, session)) return NextResponse.json({ error: 'no_seat' }, { status: 403 });
    if (!isLive(session, roomNow())) return NextResponse.json({ ok: true, marked: false, reason: 'not_live' });
    // A pinned clock is a rehearsal on this machine: it never writes attendance.
    if (clockPinned()) return NextResponse.json({ ok: true, marked: false, reason: 'pinned_clock' });
    const marked = await markHere(sb, reg, session.key);
    return NextResponse.json({ ok: true, marked });
  } catch (err) {
    console.error('bootcamp here failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not mark attendance.' }, { status: 500 });
  }
}
