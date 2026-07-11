import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { forgeLeadVoiceDemo, buildOsConfig, ensureDemoHub } from '@/lib/outbound-demo';
import type { OutboundLead } from '@/lib/outbound';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * The third forge: the BUSINESS OS demo, for the lead who says "I have the
 * business, I can't manage it." Instant and token-free: /demo/os/[id] is one
 * template app personalized by the config frozen here (real name, trade,
 * city, phone, mined review pain, audit score; sample data does the rest).
 * Also makes sure the voice demo exists, since the OS demo features the
 * receptionist as its front door.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const l = lead as OutboundLead;

  if (l.os_demo_status === 'ready' && l.os_demo_url) {
    return NextResponse.json({ ok: true, lead: await ensureDemoHub(guard.supabase, l), existing: true });
  }

  let current = l;
  const voice = await forgeLeadVoiceDemo(guard.supabase, l);
  if (voice.ok) current = voice.lead;

  const { data: row, error: insErr } = await guard.supabase
    .from('outbound_demo_os')
    .insert({ lead_id: current.id, business_name: current.business_name, config: buildOsConfig(current) })
    .select('id')
    .single();
  if (insErr || !row) {
    return NextResponse.json({ error: insErr?.message ?? 'Could not forge the OS demo.' }, { status: 500 });
  }

  const osUrl = `${SITE.url}/demo/os/${row.id}`;
  const { data: updated, error: updErr } = await guard.supabase
    .from('outbound_leads')
    .update({ os_demo_id: row.id, os_demo_url: osUrl, os_demo_status: 'ready' })
    .eq('id', current.id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await guard.supabase.from('messages').insert({
    outbound_lead_id: current.id,
    direction: 'outbound',
    channel: 'note',
    from_addr: 'cockpit',
    to_addr: current.business_name,
    subject: 'Business OS demo forged',
    snippet: `Their command center is live at ${osUrl}`,
    read: true,
    occurred_at: new Date().toISOString(),
  });

  const withHub = await ensureDemoHub(guard.supabase, updated as OutboundLead);
  return NextResponse.json({ ok: true, lead: withHub });
}
