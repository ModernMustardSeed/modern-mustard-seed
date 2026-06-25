/**
 * The bridge between the outbound Tracker (`rep_prospects`) and the inbound CRM
 * (`leads`). When a prospect becomes a good lead (they booked, they are won, or
 * the rep promotes them by hand), we create or update a matching `leads` row so
 * the prospect flows into the pipeline, the daily digest, and the follow-up
 * loop without anyone re-typing it. The two rows are linked by
 * `rep_prospects.lead_id` so a prospect is never promoted twice.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Prospect, ProspectStatus } from './prospects';

/** Map a Tracker status to the pipeline status it should land in. */
export function leadStatusForProspect(status: ProspectStatus): string {
  switch (status) {
    case 'booked':
      return 'booked';
    case 'won':
      return 'won';
    case 'demoed':
    case 'contacted':
      return 'replied';
    case 'not-interested':
      return 'lost';
    default:
      return 'new';
  }
}

/** A prospect is "good" (worth auto-promoting to the pipeline) once it books or wins. */
export function isGoodLeadStatus(status: ProspectStatus): boolean {
  return status === 'booked' || status === 'won';
}

export type ConvertResult =
  | { ok: true; leadId: string; created: boolean }
  | { ok: false; reason: 'no-contact' | 'db'; error?: string };

/**
 * Promote a prospect into the leads pipeline. Idempotent: if the prospect is
 * already linked to a lead, that lead is updated; otherwise we match an existing
 * lead by email (so a prospect who once filled out a form is not duplicated),
 * and only insert when there is no match. Returns the lead id and stamps it back
 * onto the prospect.
 */
export async function convertProspectToLead(
  supabase: SupabaseClient,
  prospect: Prospect,
  opts: { status?: string; ownerEmail?: string | null } = {}
): Promise<ConvertResult> {
  // Cold-call prospects are phone-first; an email is a bonus, not a requirement.
  // A pipeline lead just needs at least one way to reach them.
  const email = prospect.email?.trim().toLowerCase() || null;
  const phone = prospect.phone?.trim() || null;
  if (!email && !phone) return { ok: false, reason: 'no-contact' };

  const status = opts.status ?? leadStatusForProspect(prospect.status);
  const owner = opts.ownerEmail ?? prospect.rep_email ?? null;

  // A follow-up date keeps the lead in the daily digest's "follow-ups due" loop.
  // Closed states (won/lost) do not need chasing.
  const needsFollowUp = !['won', 'lost', 'archived'].includes(status);
  const followUpAt = needsFollowUp
    ? new Date(Date.now() + 2 * 86_400_000).toISOString()
    : null;

  const noteParts = [
    `From the cold-call Tracker (${prospect.channel}).`,
    prospect.city ? `City: ${prospect.city}.` : '',
    prospect.website ? `Site: ${prospect.website}.` : '',
    prospect.audit_score != null ? `Website audit: ${prospect.audit_score}/100.` : '',
    prospect.notes ? `Notes: ${prospect.notes}` : '',
  ].filter(Boolean);

  const fields: Record<string, unknown> = {
    type: 'contact',
    status,
    email,
    name: null,
    phone,
    business_name: prospect.business || null,
    audit_url: prospect.website || prospect.audit_url || null,
    audit_score: prospect.audit_score ?? null,
    source: 'tracker',
    owner,
    notes: noteParts.join(' '),
  };

  try {
    // 1. Already linked? Update that lead in place.
    let leadId = prospect.lead_id ?? null;
    if (!leadId) {
      // Match an existing lead so we never double-enter someone: by email when we
      // have one, otherwise by phone (the cold-call case).
      const matchCol = email ? 'email' : 'phone';
      const matchVal = email ?? phone;
      if (matchVal) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq(matchCol, matchVal)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing?.id) leadId = existing.id as string;
      }
    }

    let created = false;
    if (leadId) {
      // Update, but never clobber a real contact name or a more-advanced status
      // back to a weaker one. Keep it simple: set status forward, refresh facts.
      const update: Record<string, unknown> = {
        status,
        phone: fields.phone,
        business_name: fields.business_name,
        audit_url: fields.audit_url,
        audit_score: fields.audit_score,
        owner,
        notes: fields.notes,
      };
      if (followUpAt) update.follow_up_at = followUpAt;
      const { error } = await supabase.from('leads').update(update).eq('id', leadId);
      if (error) return { ok: false, reason: 'db', error: error.message };
    } else {
      if (followUpAt) fields.follow_up_at = followUpAt;
      const { data, error } = await supabase.from('leads').insert(fields).select('id').single();
      if (error || !data) return { ok: false, reason: 'db', error: error?.message };
      leadId = data.id as string;
      created = true;
    }

    // Link the prospect to its lead so we do not promote it again.
    await supabase
      .from('rep_prospects')
      .update({ lead_id: leadId, updated_at: new Date().toISOString() })
      .eq('id', prospect.id);

    return { ok: true, leadId, created };
  } catch (err) {
    return { ok: false, reason: 'db', error: err instanceof Error ? err.message : 'convert failed' };
  }
}
