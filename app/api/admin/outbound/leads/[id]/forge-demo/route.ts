import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { forgeCall } from '@/lib/sidekick';
import { saveRun } from '@/lib/sidekick-store';
import { NICHE_LABELS } from '@/lib/outbound';
import type { Niche } from '@/lib/outbound';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/** Cockpit niches to Sidekick verticals. */
const VERTICAL: Record<Niche, string> = {
  home_service: 'home-services',
  restaurant: 'restaurant',
  dental_medspa: 'health',
  real_estate: 'professional',
  other: 'professional',
};

/**
 * Forge the lead's own AI receptionist demo (Cahill's close, automated: "in
 * two hours I'll build the AI on your website, then we call it together").
 * Reuses the Sidekick forge directly, skipping the public page's per-email
 * and daily caps because this is an internal, admin-triggered run; the
 * platform-side 4-minute call cap still applies. The shareable page at
 * /sidekick/demo/<runId> answers as their business.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  if (lead.demo_url && lead.demo_run_id) {
    return NextResponse.json({ ok: true, demo_url: lead.demo_url, lead, existing: true });
  }

  const niche = (lead.niche ?? 'other') as Niche;
  const notesLine = (lead.notes ?? '').split('\n')[0].slice(0, 120);
  const profile = {
    business: lead.business_name,
    verticalId: VERTICAL[niche] ?? 'professional',
    city: lead.city || 'your area',
    ownerName: lead.contact_name || 'the owner',
    services: `${NICHE_LABELS[niche]} work: answer every call, quote the basics, capture the job details, and book the appointment.${notesLine ? ` Context: ${notesLine}` : ''}`,
  };

  const runId = randomUUID();
  const forged = await forgeCall(profile, runId, 'web');
  if (!forged.ok) {
    return NextResponse.json({ error: forged.error || 'The forge is not configured (Vapi keys).' }, { status: 502 });
  }

  const saved = await saveRun(guard.supabase, runId, {
    ...profile,
    email: lead.email || 'outbound@modernmustardseed.com',
    ip: 'outbound-cockpit',
    createdAt: new Date().toISOString(),
  });
  if (!saved) return NextResponse.json({ error: 'Could not store the demo run.' }, { status: 500 });

  const demoUrl = `${SITE.url}/sidekick/demo/${runId}`;
  const { data: updated, error: updErr } = await guard.supabase
    .from('outbound_leads')
    .update({ demo_url: demoUrl, demo_run_id: runId })
    .eq('id', id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await guard.supabase.from('messages').insert({
    outbound_lead_id: id,
    direction: 'outbound',
    channel: 'note',
    from_addr: 'cockpit',
    to_addr: lead.business_name,
    subject: 'Demo forged',
    snippet: `Their AI receptionist is live at ${demoUrl}`,
    read: true,
    occurred_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, demo_url: demoUrl, lead: updated });
}
