import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { findFollowups } from '@/lib/acq/followups';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * The leads waiting on a person, hottest first, with the reason attached.
 *
 * Computed on read rather than stored: every input is a timestamp on a row that
 * moves, so a saved list is wrong the moment somebody replies. A stored report
 * that never updates itself is its own kind of quiet failure.
 */
export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const list = await findFollowups(guard.supabase);
  return NextResponse.json({
    count: list.length,
    followups: list.map((f) => ({
      reason: f.reason,
      why: f.why,
      move: f.move,
      at: f.at,
      rank: f.rank,
      lead: f.lead,
    })),
  });
}
