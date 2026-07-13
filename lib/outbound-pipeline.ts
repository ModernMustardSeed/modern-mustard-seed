/**
 * The bridge between the dial floor (outbound_leads) and the CRM pipeline
 * (public.leads, which is what /admin counts, charts, and calls "leads").
 *
 * A lead that only exists on the dial floor is invisible to the command
 * center: the overview's counters, funnel, recent-leads list, and needs-
 * attention rail all read public.leads. Self-serve Demo Station signups used
 * to land ONLY on the dial floor, so the owner never saw them arrive. Anything
 * that creates an outbound lead worth knowing about should call this.
 *
 * Dedupes by email, then phone, and remembers the link on
 * outbound_leads.pipeline_lead_id so repeat calls update in place.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { phoneKey } from '@/lib/outbound';
import type { OutboundLead } from '@/lib/outbound';

/** leads.owner is an email (026), not a rep id. */
const REP_OWNER_EMAIL: Record<string, string> = {
  Polly: 'thompsonpolly71@gmail.com',
  Sarah: 'sarah@modernmustardseed.com',
};

/** Dial-floor status → the pipeline's own status vocabulary. */
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

export type PipelineSync = { ok: true; leadId: string; created: boolean } | { ok: false; error: string };

export async function syncLeadToPipeline(
  sb: SupabaseClient,
  lead: OutboundLead,
  opts: { source?: string } = {},
): Promise<PipelineSync> {
  if (!lead.email && !lead.phone) {
    return { ok: false, error: 'Needs an email or phone before it can enter the pipeline.' };
  }

  let ownerEmail: string | null = null;
  if (lead.owner_rep_id) {
    const { data: rep } = await sb.from('outbound_reps').select('name').eq('id', lead.owner_rep_id).maybeSingle();
    if (rep) ownerEmail = REP_OWNER_EMAIL[rep.name as string] ?? null;
  }

  const status = STATUS_MAP[lead.status] ?? 'new';
  const fields = {
    status,
    email: lead.email ?? '',
    phone: lead.phone,
    business_name: lead.business_name,
    name: lead.contact_name,
    audit_url: lead.website || lead.audit_url,
    audit_score: lead.audit_score,
    owner: ownerEmail,
    notes: lead.notes,
    follow_up_at: ['won', 'lost', 'archived'].includes(status) ? null : new Date(Date.now() + 2 * 86400000).toISOString(),
  };

  // Already linked: update that pipeline row in place.
  if (lead.pipeline_lead_id) {
    const { error } = await sb.from('leads').update(fields).eq('id', lead.pipeline_lead_id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, leadId: lead.pipeline_lead_id, created: false };
  }

  // Dedupe: match an existing pipeline lead by email, else by phone.
  let existingId: string | null = null;
  if (lead.email) {
    const { data: byEmail } = await sb
      .from('leads')
      .select('id')
      .eq('email', lead.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = byEmail?.id ?? null;
  }
  if (!existingId && lead.phone) {
    const { data: byPhone } = await sb
      .from('leads')
      .select('id, phone')
      .not('phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);
    const key = phoneKey(lead.phone);
    existingId = (byPhone ?? []).find((l) => l.phone && phoneKey(l.phone as string) === key)?.id ?? null;
  }

  let pipelineId = existingId;
  if (existingId) {
    // Source is set once, at creation: overwriting it would erase how we really
    // met this person (a lead-magnet download who later forged demos is still
    // a lead-magnet lead).
    const { error } = await sb.from('leads').update(fields).eq('id', existingId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: created, error } = await sb
      .from('leads')
      // type is CHECK-constrained to build-queue|audit|contact|newsletter (001).
      .insert({ type: 'contact', source: opts.source ?? 'outbound', ...fields })
      .select('id')
      .single();
    if (error || !created) return { ok: false, error: error?.message ?? 'Insert failed' };
    pipelineId = created.id as string;
  }

  await sb.from('outbound_leads').update({ pipeline_lead_id: pipelineId }).eq('id', lead.id);
  return { ok: true, leadId: pipelineId as string, created: !existingId };
}
