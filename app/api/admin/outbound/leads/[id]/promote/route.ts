import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { phoneKey } from '@/lib/outbound';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/** leads.owner emails for the two reps (leads.owner is an email, 026). */
const REP_OWNER_EMAIL: Record<string, string> = {
  Polly: 'thompsonpolly71@gmail.com',
  Sarah: 'sarah@modernmustardseed.com',
};

const STATUS_MAP: Record<string, string> = {
  new: 'new',
  contacted: 'new',
  callback: 'new',
  demo_booked: 'booked',
  pilot_live: 'booked',
  won: 'won',
  lost: 'lost',
  dnc: 'archived',
};

/**
 * Push the lead into the main CRM pipeline (public.leads). Dedupes by email,
 * then phone; updates in place when this lead was promoted before
 * (pipeline_lead_id). Mirrors lib/prospect-lead.ts for outbound leads.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (!lead.email && !lead.phone) return NextResponse.json({ error: 'Needs an email or phone before it can enter the pipeline.' }, { status: 400 });

  let ownerEmail: string | null = null;
  if (lead.owner_rep_id) {
    const { data: rep } = await guard.supabase.from('outbound_reps').select('name').eq('id', lead.owner_rep_id).maybeSingle();
    if (rep) ownerEmail = REP_OWNER_EMAIL[rep.name] ?? null;
  }

  const fields = {
    status: STATUS_MAP[lead.status] ?? 'new',
    email: lead.email ?? '',
    phone: lead.phone,
    business_name: lead.business_name,
    name: lead.contact_name,
    audit_url: lead.website || lead.audit_url,
    audit_score: lead.audit_score,
    owner: ownerEmail,
    notes: lead.notes,
    follow_up_at: ['won', 'lost', 'archived'].includes(STATUS_MAP[lead.status] ?? 'new')
      ? null
      : new Date(Date.now() + 2 * 86400000).toISOString(),
  };

  // Already promoted: update the linked pipeline lead in place.
  if (lead.pipeline_lead_id) {
    const { error: updErr } = await guard.supabase.from('leads').update(fields).eq('id', lead.pipeline_lead_id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, leadId: lead.pipeline_lead_id, created: false });
  }

  // Dedupe: match an existing pipeline lead by email, else by phone.
  let existingId: string | null = null;
  if (lead.email) {
    const { data: byEmail } = await guard.supabase
      .from('leads')
      .select('id')
      .eq('email', lead.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = byEmail?.id ?? null;
  }
  if (!existingId && lead.phone) {
    const { data: byPhone } = await guard.supabase
      .from('leads')
      .select('id, phone')
      .not('phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);
    const key = phoneKey(lead.phone);
    existingId = (byPhone ?? []).find((l) => l.phone && phoneKey(l.phone) === key)?.id ?? null;
  }

  let pipelineId = existingId;
  if (existingId) {
    const { error: updErr } = await guard.supabase.from('leads').update(fields).eq('id', existingId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  } else {
    const { data: created, error: insErr } = await guard.supabase
      .from('leads')
      .insert({ type: 'contact', source: 'outbound', ...fields })
      .select('id')
      .single();
    if (insErr || !created) return NextResponse.json({ error: insErr?.message ?? 'Insert failed' }, { status: 500 });
    pipelineId = created.id;
  }

  const { data: updated } = await guard.supabase
    .from('outbound_leads')
    .update({ pipeline_lead_id: pipelineId })
    .eq('id', id)
    .select()
    .single();

  return NextResponse.json({ ok: true, leadId: pipelineId, created: !existingId, lead: updated });
}
