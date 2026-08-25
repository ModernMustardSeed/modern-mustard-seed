import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { getSession } from '@/lib/admin-auth';
import { safeEmailHtml } from '@/lib/acq/thread';
import { dripStopReason, getDrip, planDrip, setDripStatus, startDrip, DRIP_LENGTH } from '@/lib/outbound-drip';
import type { OutboundLead } from '@/lib/outbound';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * THE DRIP FOR ONE LEAD (2026-08-25).
 *
 * GET  → the drip row (or null), the stop reason if any, and the whole
 *        sequence dated: every email rendered from the lead as it stands,
 *        pixel stripped and links de-armed so previewing cannot forge an open.
 * POST → { action: 'start' | 'restart' | 'pause' | 'resume' | 'stop' }.
 *        start sends email 1 right now and schedules the rest.
 */
export async function GET(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const summary = new URL(req.url).searchParams.get('summary') === '1';

  const { data: lead } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const l = lead as OutboundLead;

  const drip = await getDrip(guard.supabase, id);
  const stop = dripStopReason(l, false);
  if (summary) {
    return NextResponse.json({ drip, stop, length: DRIP_LENGTH });
  }
  const plan = planDrip(l, drip).map((s) => ({ ...s, html: safeEmailHtml(s.html).html ?? '' }));
  return NextResponse.json({ drip, stop, length: DRIP_LENGTH, plan, email: l.email });
}

export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const session = await getSession();
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action ?? '';

  const { data: lead } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const l = lead as OutboundLead;

  if (action === 'start' || action === 'restart') {
    const r = await startDrip(guard.supabase, l, session?.email ?? 'cockpit', action === 'restart');
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    await guard.supabase.from('messages').insert({
      outbound_lead_id: l.id,
      direction: 'outbound',
      channel: 'note',
      from_addr: 'cockpit',
      to_addr: l.business_name,
      subject: 'Drip started',
      snippet: `Drip campaign started: email 1 of ${DRIP_LENGTH} sent, the rest follow on business-day gaps unless they reply.`,
      read: true,
      occurred_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, drip: r.drip, lead: r.lead, subject: r.subject });
  }
  if (action === 'pause' || action === 'resume' || action === 'stop') {
    const drip = await setDripStatus(guard.supabase, id, action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'stopped');
    if (!drip) return NextResponse.json({ error: 'No drip to change yet.' }, { status: 404 });
    return NextResponse.json({ ok: true, drip });
  }
  return NextResponse.json({ error: 'Pick an action: start, restart, pause, resume or stop.' }, { status: 400 });
}
