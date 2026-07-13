import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';

const LEAD_JOIN = 'lead:outbound_leads(id, business_name, contact_name, phone, niche, city, avg_job_value)';

export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { data, error } = await guard.supabase
    .from('outbound_pilots')
    .select(`*, ${LEAD_JOIN}`)
    .order('status', { ascending: true })
    .order('ends_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pilots: data });
}

/**
 * RETIRED. This started a 30-day FREE pilot, which is a free trial, and Sarah
 * killed free trials on 2026-07-12. The free thing is the DEMO: we build them a
 * working receptionist, website and command center at no cost, and going live is
 * setup + monthly from day one.
 *
 * The route is kept and refuses, rather than deleted, because a hidden button is
 * not a closed door: anything that can still POST here (an old tab, a bookmarked
 * fetch, a future UI) would otherwise keep minting free months. Existing pilots
 * are untouched and still convert through PATCH.
 */
export async function POST() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  return NextResponse.json(
    {
      error: 'pilots_retired',
      message: 'Free pilots are retired. The demo is the free part. Send them the Demo Suite and close on setup + monthly.',
    },
    { status: 410 },
  );
}
