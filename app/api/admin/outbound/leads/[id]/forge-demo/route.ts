import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { forgeLeadVoiceDemo, ensureDemoHub } from '@/lib/outbound-demo';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Forge the lead's own AI receptionist demo (Cahill's close, automated: "in
 * two hours I'll build the AI on your website, then we call it together").
 * The shareable page at /sidekick/demo/<runId> answers as their business.
 * Logic lives in lib/outbound-demo.ts, shared with the website-demo forge.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const forged = await forgeLeadVoiceDemo(guard.supabase, lead);
  if (!forged.ok) return NextResponse.json({ error: forged.error }, { status: forged.status });

  const withHub = await ensureDemoHub(guard.supabase, forged.lead);
  return NextResponse.json({ ok: true, demo_url: forged.demoUrl, lead: withHub, existing: forged.existing });
}
