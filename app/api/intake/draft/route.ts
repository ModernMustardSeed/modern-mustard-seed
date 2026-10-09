import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resolveIntake } from '@/lib/intake-resolve';
import { cleanAnswers } from '@/lib/intake-files';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * Autosave for the welcome intake.
 *
 * The form posts every answer here a moment after the client stops typing, and
 * again when the page is hidden. Before 2026-10-08 nothing was kept until "Send
 * it in", so a phone that reloaded the tab while the client was picking photos
 * (iOS does this under memory pressure) threw away everything she had written.
 *
 * Writes client_intake.answers with status in_progress. A row already marked
 * submitted stays submitted: the client is editing what she sent, and the card
 * keeps saying so. The body may arrive as text/plain from a keepalive request.
 */
export async function POST(req: Request) {
  let body: { key?: unknown; answers?: unknown };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const key = typeof body.key === 'string' ? body.key.trim().slice(0, 120) : '';
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const client = await resolveIntake(supabase, key);
  if (!client) return NextResponse.json({ error: 'unknown_key' }, { status: 401 });

  const answers = cleanAnswers(body.answers);
  const { data: prior } = await supabase
    .from('client_intake')
    .select('status, submitted_at, answers')
    .eq('client_email', client.email)
    .maybeSingle();

  // A different intake (the old brand intake) lives in the same row under its
  // own key. Keep it rather than overwrite it.
  const kept = (prior?.answers ?? {}) as Record<string, unknown>;
  const carry: Record<string, unknown> = {};
  if ('brand_intake' in kept) carry.brand_intake = kept.brand_intake;

  const now = new Date().toISOString();
  const { error } = await supabase.from('client_intake').upsert(
    {
      client_email: client.email,
      answers: { ...carry, ...answers, kind: client.profile.kind },
      status: prior?.status === 'submitted' ? 'submitted' : 'in_progress',
      submitted_at: prior?.submitted_at ?? null,
      updated_at: now,
    },
    { onConflict: 'client_email' },
  );
  if (error) {
    console.error('intake draft: not saved', error.message);
    return NextResponse.json({ error: 'not_saved' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, savedAt: now });
}
