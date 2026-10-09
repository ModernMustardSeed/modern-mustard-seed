import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { roomRegistration } from '@/lib/bootcamp/room-auth';
import { saveWorksheet, type WorksheetAnswers } from '@/lib/bootcamp/stage';
import { WORKSHEET_ANSWER_MAX, WORKSHEET_KEYS } from '@/data/bootcamp-worksheet';

/**
 * Save the Idea Director worksheet. The room saves as the person types (a
 * pause of a couple of seconds), and every save is a new event, so the
 * newest answers win and nothing anyone wrote is ever overwritten in place.
 * Only the seven known keys are kept, each trimmed to its limit.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { id?: string; k?: string; answers?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const answers: WorksheetAnswers = {};
  for (const key of WORKSHEET_KEYS) {
    const v = String(body.answers?.[key] ?? '').slice(0, WORKSHEET_ANSWER_MAX);
    if (v.trim()) answers[key] = v;
  }

  try {
    const reg = await roomRegistration(sb, body.id, body.k);
    if (!reg) return NextResponse.json({ error: 'This room link is not valid.' }, { status: 404 });
    await saveWorksheet(sb, reg, answers);
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error('bootcamp worksheet save failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Not saved. Your answers are still on this page; try again in a moment.' }, { status: 500 });
  }
}
