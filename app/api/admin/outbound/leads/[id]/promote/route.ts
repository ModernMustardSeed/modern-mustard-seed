import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { syncLeadToPipeline } from '@/lib/outbound-pipeline';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/**
 * Push the lead into the main CRM pipeline (public.leads) by hand. The shared
 * logic lives in lib/outbound-pipeline.ts because the Demo Station now does
 * the same thing automatically at signup.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const result = await syncLeadToPipeline(guard.supabase, lead, { source: 'outbound' });
  if (!result.ok) {
    const status = result.error.startsWith('Needs an email') ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { data: updated } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  return NextResponse.json({ ok: true, leadId: result.leadId, created: result.created, lead: updated });
}
