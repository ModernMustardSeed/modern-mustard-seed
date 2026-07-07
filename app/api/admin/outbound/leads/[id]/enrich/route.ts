import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { enrichProspect } from '@/lib/enrich';

export const runtime = 'nodejs';
export const maxDuration = 45;

type Params = Promise<{ id: string }>;

/**
 * Find the lead's website and contact email from its name + city so the rep
 * never has to search. Fills blanks only; never overwrites what is already on
 * the row.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const found = await enrichProspect({
    business: lead.business_name,
    city: lead.city,
    website: lead.website,
    phone: lead.phone,
  });

  const patch: Record<string, unknown> = {};
  if (!lead.website && found.website) patch.website = found.website;
  if (!lead.email && found.email) patch.email = found.email;

  let saved = lead;
  if (Object.keys(patch).length > 0) {
    const { data: updated, error: updErr } = await guard.supabase.from('outbound_leads').update(patch).eq('id', id).select().single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    saved = updated;
  }

  return NextResponse.json({ ok: true, lead: saved, found });
}
