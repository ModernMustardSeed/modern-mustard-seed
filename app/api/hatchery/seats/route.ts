/**
 * Live Founding Egg inventory for the /hatchery page. The ClaimEgg button reads
 * this on mount so the "X of 5 claimed" counter is current without forcing the
 * whole page dynamic. Seats are counted from the atomic claim rows.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { foundingSeatsClaimed } from '@/lib/hatchery-store';
import { FOUNDING } from '@/data/hatchery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cap = FOUNDING.cap;
  const supabase = getSupabase();
  const claimed = supabase ? (await foundingSeatsClaimed(supabase, cap)) ?? 0 : 0;
  const remaining = Math.max(0, cap - claimed);
  return NextResponse.json(
    { cap, claimed, remaining, soldOut: remaining === 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
