import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { queueIntegrationPlan } from '@/lib/integration-plan';
import type { OutboundLead } from '@/lib/outbound';

export const runtime = 'nodejs';
export const maxDuration = 15;

type Params = Promise<{ id: string }>;

/**
 * Queue the lead's AI INTEGRATION PLAN. Same shape as build-site: the heavy
 * lifting happens on Sarah's machine (scripts/integration-plan-worker.mjs runs
 * headless Claude on the Max plan) and the finished document serves at
 * /demo/plan/<id>, print-ready. Idempotent: queued/building/ready runs are
 * returned as-is; a failed run re-queues fresh.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const res = await queueIntegrationPlan(guard.supabase, lead as OutboundLead);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

  if (!res.existing) {
    await guard.supabase.from('messages').insert({
      outbound_lead_id: id,
      direction: 'outbound',
      channel: 'note',
      from_addr: 'cockpit',
      to_addr: (lead as OutboundLead).business_name,
      subject: 'AI Integration Plan queued',
      snippet: `Their customized Integration Plan is being written. It goes live at ${res.planUrl}`,
      read: true,
      occurred_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, planId: res.planId, planUrl: res.planUrl, existing: res.existing });
}
