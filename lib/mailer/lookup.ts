/**
 * Resolving a code off a postcard, and recording that a human did it.
 *
 * The view is the product. Cold email produced six consent records across 9,730
 * leads; a person typing a seven character code off paper is a stronger inbound
 * signal than any email open we have ever recorded, and unlike an email open it
 * cannot be a security gateway (see the scanner-traffic post mortem: gateways
 * fetched links within seconds of send; a human does it hours later, from a
 * phone, once). So `touchMailView` is what promotes a cold row into something
 * the calling machine is allowed to work.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { normalizeMailCode } from '@/lib/mailer/code';
import { previewFor, type MailerLead, type PreviewSpec } from '@/lib/mailer/preview';

export type MailLookup = {
  lead: MailerLead & { id: string; email: string | null; contact_name: string | null; status: string | null };
  spec: PreviewSpec;
  code: string;
  /** A live order already exists for this card. Never sell them twice. */
  existingOrder: { id: string; status: string; stripe_session_id: string | null } | null;
};

const LEAD_FIELDS =
  'id,business_name,contact_name,email,phone,trade,niche,city,state,address,postal_code,rating,review_count,emergency_service,open_24_7,status,mail_code,mail_view_count,mail_first_view_at';

export async function lookupMailCode(raw: string): Promise<MailLookup | null> {
  const code = normalizeMailCode(raw);
  if (!code) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: lead } = await supabase
    .from('outbound_leads')
    .select(LEAD_FIELDS)
    .eq('mail_code', code)
    .maybeSingle();
  if (!lead) return null;

  const { data: order } = await supabase
    .from('demo_orders')
    .select('id,status,stripe_session_id')
    .eq('mail_code', code)
    .in('status', ['paid', 'intake_done', 'delivered'])
    .limit(1)
    .maybeSingle();

  return {
    lead: lead as MailLookup['lead'],
    spec: previewFor(lead as MailerLead),
    code,
    existingOrder: (order as MailLookup['existingOrder']) ?? null,
  };
}

/**
 * Record the visit. Fire and forget on purpose: a counter that fails must never
 * stop the page from rendering, because the page is the only thing the postage
 * bought.
 */
export async function touchMailView(leadId: string, code: string): Promise<void> {
  const supabase: SupabaseClient | null = getSupabase();
  if (!supabase) return;
  try {
    const { data: current } = await supabase
      .from('outbound_leads')
      .select('mail_view_count,mail_first_view_at')
      .eq('id', leadId)
      .maybeSingle();

    const first = !current?.mail_first_view_at;
    await supabase
      .from('outbound_leads')
      .update({
        mail_view_count: (current?.mail_view_count ?? 0) + 1,
        ...(first ? { mail_first_view_at: new Date().toISOString() } : {}),
        // The first visit is the hand raise. It moves the row out of 'new' so
        // the follow-up list stops treating it as untouched, and it writes the
        // reason in words a person reads in the cockpit.
        ...(first
          ? {
              last_touch_source: 'mailer',
              next_action: 'They opened their card. Call while it is on the desk.',
              next_action_at: new Date().toISOString(),
            }
          : {}),
      })
      .eq('id', leadId);

    if (first) {
      await supabase
        .from('mail_pieces')
        .update({ updated_at: new Date().toISOString() })
        .eq('mail_code', code);
    }
  } catch {
    /* a counter is never worth a 500 on the money page */
  }
}
