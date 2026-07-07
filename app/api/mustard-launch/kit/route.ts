/**
 * The Launch Kit generator (gated). Any paid tier (Kit or Room) can generate
 * and read their full launch package. It generates once and caches in
 * launch_progress; the Room can force a regenerate as their launch evolves.
 */

import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getLaunchTier, generateLaunchKit } from '@/lib/mustard-launch';
import { getLatestLaunchRun, getLaunchProgress, patchLaunchProgress } from '@/lib/mustard-launch-store';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** GET: return the cached Kit (or null if not generated yet). */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tier = await getLaunchTier(session.email);
  if (tier === 'none') return NextResponse.json({ error: 'not_entitled' }, { status: 403 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ kit: null });
  const { progress } = await getLaunchProgress(supabase, session.email);
  return NextResponse.json({ kit: progress?.kit ?? null });
}

/** POST: generate the Kit from the member's saved idea. Cached after the first run. */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tier = await getLaunchTier(session.email);
  if (tier === 'none') return NextResponse.json({ error: 'not_entitled' }, { status: 403 });

  let body: { regenerate?: boolean; idea?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* no body is fine */
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  // Return the cached Kit unless a Room member asks to regenerate.
  const { progress } = await getLaunchProgress(supabase, session.email);
  if (progress?.kit && !(body.regenerate && tier === 'room')) {
    return NextResponse.json({ kit: progress.kit, cached: true });
  }

  const latest = await getLatestLaunchRun(supabase, session.email);
  const idea = (body.idea || latest?.idea || '').trim().slice(0, 400);
  if (!idea) {
    return NextResponse.json({ error: 'no_idea', message: 'Tell Mr. Mustard what you are launching first.' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const kit = await generateLaunchKit(idea, latest?.blueprint ?? null);
  if (!kit) return NextResponse.json({ error: 'coach_unavailable' }, { status: 502 });

  await patchLaunchProgress(supabase, session.email, { kit });
  return NextResponse.json({ kit });
}
