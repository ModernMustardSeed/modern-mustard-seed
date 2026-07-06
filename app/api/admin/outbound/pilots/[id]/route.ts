import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { pilotPatchSchema } from '@/lib/outbound';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/**
 * Update a pilot: inline counters (calls_caught, revenue_recovered), pricing
 * fields, or the Convert / Lost actions. Winning or losing a pilot moves the
 * lead to won / lost with it.
 */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, pilotPatchSchema);
  if ('error' in parsed) return parsed.error;

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data: pilot, error } = await guard.supabase
    .from('outbound_pilots')
    .update(update)
    .eq('id', id)
    .select('*, lead:outbound_leads(id, business_name, contact_name, phone, niche, city, avg_job_value)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (update.status === 'won' || update.status === 'lost') {
    await guard.supabase.from('outbound_leads').update({ status: update.status }).eq('id', pilot.lead_id);
  }

  return NextResponse.json({ pilot });
}
