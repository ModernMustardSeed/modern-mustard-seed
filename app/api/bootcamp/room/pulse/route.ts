import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getStage } from '@/lib/bootcamp/stage';
import { liveSession, roomNow } from '@/lib/bootcamp/sessions';

/**
 * The room's heartbeat. Every open room polls this every twenty seconds, so
 * it carries nothing private: the stage revision, which session is live, and
 * whether the offer is on screen. The edge caches it for ten seconds, which
 * means five thousand open rooms cost the database one read every ten
 * seconds, not five hundred a second. When `rev` moves, a room re-renders
 * itself through its own signed page and picks up the new links there.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const live = liveSession(roomNow())?.key ?? null;
  let rev = 0;
  let offer = false;
  const sb = getSupabase();
  if (sb) {
    try {
      const stage = await getStage(sb);
      rev = stage.rev;
      offer = stage.offer.open;
    } catch (err) {
      console.error('bootcamp pulse: stage unreadable', err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.json(
    { rev, live, offer },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } },
  );
}
