/**
 * Cross-device progress for the MUSTARD LAUNCH Deck (mission check-offs + the
 * target Launch Day). Merged client-side with localStorage, last-write-wins by
 * updated_at. The generated Kit lives in the same blob but is written by the
 * kit route, so PUT here preserves it.
 */

import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getLaunchTier } from '@/lib/mustard-launch';
import { getLaunchProgress, saveLaunchProgress } from '@/lib/mustard-launch-store';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ progress: null });
  const { progress, updatedAt } = await getLaunchProgress(supabase, session.email);
  return NextResponse.json({ progress: progress ?? null, updatedAt });
}

export async function PUT(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tier = await getLaunchTier(session.email);
  if (tier === 'none') return NextResponse.json({ error: 'not_entitled' }, { status: 403 });

  let body: { done?: Record<string, boolean>; launchDate?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const done = body.done && typeof body.done === 'object' ? body.done : {};
  if (JSON.stringify(done).length > 20_000) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }
  const launchDate = typeof body.launchDate === 'string' ? body.launchDate.slice(0, 30) : null;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ saved: false });

  // Preserve the generated Kit; only merge the fields the Deck owns.
  const { progress } = await getLaunchProgress(supabase, session.email);
  const ok = await saveLaunchProgress(supabase, session.email, { ...(progress ?? {}), done, launchDate });
  return NextResponse.json({ saved: ok });
}
