/**
 * Cross-device progress for the MUSTARD MODE HQ. One JSON blob per player,
 * merged client-side with localStorage (last-write-wins by updated_at).
 */

import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getMustardTier } from '@/lib/mustard-mode';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ progress: null });
  try {
    const { data } = await supabase
      .from('mustard_progress')
      .select('progress, updated_at')
      .eq('email', session.email)
      .maybeSingle();
    return NextResponse.json({ progress: data?.progress ?? null, updatedAt: data?.updated_at ?? null });
  } catch {
    return NextResponse.json({ progress: null });
  }
}

export async function PUT(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tier = await getMustardTier(session.email);
  if (tier === 'none') return NextResponse.json({ error: 'not_entitled' }, { status: 403 });

  let body: { progress?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!body.progress || typeof body.progress !== 'object') {
    return NextResponse.json({ error: 'invalid_progress' }, { status: 400 });
  }
  if (JSON.stringify(body.progress).length > 60_000) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ saved: false });
  try {
    await supabase
      .from('mustard_progress')
      .upsert({ email: session.email, progress: body.progress, updated_at: new Date().toISOString() }, { onConflict: 'email' });
    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error('mustard progress save failed', err);
    return NextResponse.json({ saved: false });
  }
}
