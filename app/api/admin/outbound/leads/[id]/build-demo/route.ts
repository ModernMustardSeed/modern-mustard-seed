import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { buildLeadVoiceDemo, ensureDemoHub } from '@/lib/outbound-demo';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Build the lead's own voice agent demo (Cahill's close, automated: "in
 * two hours I'll build the AI on your website, then we call it together").
 * The shareable page at /voice-agents/build/demo/<runId> answers as their business.
 * Logic lives in lib/outbound-demo.ts, shared with the website-demo build.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const built = await buildLeadVoiceDemo(guard.supabase, lead);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: built.status });

  // No command center rides along any more (Sarah, 2026-08-22). It is sold on
  // its own and built by hand; the Build OS button is the only way one appears.
  const withHub = await ensureDemoHub(guard.supabase, built.lead);
  return NextResponse.json({ ok: true, demo_url: built.demoUrl, lead: withHub, existing: built.existing });
}
