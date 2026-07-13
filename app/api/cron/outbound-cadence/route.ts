import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendOutboundEmail } from '@/lib/outbound-email';
import { demoStationDrip } from '@/lib/demo-drip';
import type { OutboundLead } from '@/lib/outbound';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Daily: work the parked three-strike leads. Each gets ONE cadence email ever
 * (the audit report when it exists), then the queue suggests a Mr. Mustard
 * attempt for a human to fire; the AI never cold-calls on a timer
 * (compliance stays human-shaped). Capped at 10 sends per run; leads without
 * an email park quietly with a note.
 *
 * ALSO runs the DEMO-STATION DRIP (lib/demo-drip.ts): self-serve forgers who
 * have not bought get a three-touch sequence that stops the moment they buy,
 * reply, or a rep moves the lead.
 */

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: due, error } = await sb
    .from('outbound_leads')
    .select('*')
    .eq('status', 'contacted')
    .ilike('next_action', 'Cadence:%')
    .lte('next_action_at', new Date().toISOString())
    .limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let parked = 0;
  for (const lead of (due ?? []) as OutboundLead[]) {
    if (sent >= 10) break;
    if (!lead.email) {
      await sb
        .from('outbound_leads')
        .update({ next_action: 'Needs an email (cadence parked)', next_action_at: null })
        .eq('id', lead.id);
      parked++;
      continue;
    }
    if (lead.last_email_at) {
      // Already emailed at some point; hand it to the human queue instead.
      await sb
        .from('outbound_leads')
        .update({ next_action: 'Mr. Mustard him', next_action_at: new Date(Date.now() + 86400000).toISOString() })
        .eq('id', lead.id);
      parked++;
      continue;
    }
    const result = await sendOutboundEmail(sb, lead, { source: 'cadence' });
    if (result.ok) {
      sent++;
      await sb
        .from('outbound_leads')
        .update({ next_action: 'Mr. Mustard him (cadence email sent)', next_action_at: new Date(Date.now() + 4 * 86400000).toISOString() })
        .eq('id', lead.id);
    } else {
      await sb
        .from('outbound_leads')
        .update({ next_action: `Cadence email failed: ${result.error.slice(0, 120)}`, next_action_at: null })
        .eq('id', lead.id);
      parked++;
    }
  }

  const drip = await demoStationDrip(sb);

  return NextResponse.json({ ok: true, due: due?.length ?? 0, sent, parked, drip });
}
