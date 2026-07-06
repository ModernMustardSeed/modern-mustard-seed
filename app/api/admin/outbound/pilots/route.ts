import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { pilotInputSchema } from '@/lib/outbound';

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

/** Start a 30-day free pilot for a lead and mark the lead pilot_live. */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, pilotInputSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const { data: lead, error: leadErr } = await guard.supabase
    .from('outbound_leads')
    .select('id, business_name')
    .eq('id', input.lead_id)
    .single();
  if (leadErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const started = new Date();
  const ends = new Date(started.getTime() + 30 * 86400000);

  const { data: pilot, error } = await guard.supabase
    .from('outbound_pilots')
    .insert({
      lead_id: input.lead_id,
      started_at: started.toISOString(),
      ends_at: ends.toISOString(),
      pricing_model: input.pricing_model,
      convert_price: input.convert_price,
      rev_share_pct: input.rev_share_pct ?? 15,
      monthly_floor: input.monthly_floor,
      notes: input.notes,
    })
    .select(`*, ${LEAD_JOIN}`)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await guard.supabase.from('outbound_leads').update({ status: 'pilot_live' }).eq('id', input.lead_id);

  return NextResponse.json({ pilot });
}
