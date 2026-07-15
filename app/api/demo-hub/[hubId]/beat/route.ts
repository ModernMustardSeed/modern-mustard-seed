/**
 * Presence beat from the demo hub: while a prospect has their hub open, the
 * client pings here and the lead's last_seen_at moves, which lights the
 * "watching right now" tier on the dial floor so a human calls at the peak.
 *
 * Public and unauthenticated by design (the hub is a share link), so the
 * write is bounded: server-side throttle to one stamp per minute per lead,
 * UUID-validated, and the only mutable field is a timestamp on the lead the
 * hub already belongs to. Telemetry rides the same throttle.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordDemoEvent } from '@/lib/demo-events';

export const runtime = 'nodejs';
export const maxDuration = 10;

type Params = Promise<{ hubId: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { hubId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(hubId)) return new NextResponse(null, { status: 204 });

  const supabase = getSupabase();
  if (!supabase) return new NextResponse(null, { status: 204 });

  const { data: lead } = await supabase
    .from('outbound_leads')
    .select('id, last_seen_at, origin, affiliate_id')
    .eq('hub_demo_id', hubId)
    .maybeSingle();
  if (!lead) return new NextResponse(null, { status: 204 });

  // Throttle: one stamp per 60 seconds. The conditional update is the guard;
  // a burst of beats collapses into a single write.
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  if (lead.last_seen_at && lead.last_seen_at > cutoff) return new NextResponse(null, { status: 204 });

  const { data: updated } = await supabase
    .from('outbound_leads')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', lead.id)
    .or(`last_seen_at.is.null,last_seen_at.lt.${cutoff}`)
    .select('id')
    .maybeSingle();

  if (updated) {
    await recordDemoEvent(supabase, {
      event: 'beat',
      leadId: lead.id,
      hubId,
      origin: lead.origin,
      affiliateId: lead.affiliate_id,
    });
  }

  return new NextResponse(null, { status: 204 });
}
