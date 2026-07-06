import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { callInputSchema } from '@/lib/outbound';
import type { LeadStatus } from '@/lib/outbound';

export const runtime = 'nodejs';

/** Terminal lead states an outcome click must never silently downgrade. */
const LOCKED: LeadStatus[] = ['pilot_live', 'won', 'dnc'];

/**
 * Log one call outcome. Writes the call_logs row and advances the lead's
 * status: demo_booked and callback set their statuses (callback also stamps
 * next_action_at for the dashboard queue), not_interested marks lost, and any
 * other outcome bumps a brand-new lead to contacted.
 */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, callInputSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const { data: lead, error: leadErr } = await guard.supabase
    .from('outbound_leads')
    .select('id, status')
    .eq('id', input.lead_id)
    .single();
  if (leadErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const { data: log, error: logErr } = await guard.supabase
    .from('outbound_call_logs')
    .insert({
      lead_id: input.lead_id,
      rep_id: input.rep_id,
      outcome: input.outcome,
      duration_sec: input.duration_sec,
      disposition: input.disposition,
      next_action: input.next_action,
      next_action_at: input.next_action_at,
    })
    .select()
    .single();
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  const current = lead.status as LeadStatus;
  const update: Record<string, unknown> = {};
  if (!LOCKED.includes(current)) {
    if (input.outcome === 'demo_booked') {
      update.status = 'demo_booked';
      update.next_action_at = input.next_action_at ?? null;
    } else if (input.outcome === 'callback') {
      update.status = 'callback';
      update.next_action_at = input.next_action_at ?? null;
    } else if (input.outcome === 'not_interested' && current !== 'won' && current !== 'lost') {
      update.status = 'lost';
    } else if (current === 'new') {
      update.status = 'contacted';
    }
  }

  let updatedLead = null;
  if (Object.keys(update).length > 0) {
    const { data } = await guard.supabase.from('outbound_leads').update(update).eq('id', input.lead_id).select().single();
    updatedLead = data;
  }

  return NextResponse.json({ log, lead: updatedLead });
}
