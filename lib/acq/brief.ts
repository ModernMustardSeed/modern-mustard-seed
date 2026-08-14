/**
 * THE PREP BRIEF.
 *
 * When somebody books Sarah, she should walk in already knowing more about them
 * than they expect. This is the one-screen version of everything the machine
 * learned: who they are, how big the phone problem is, what Mr. Mustard heard,
 * what they objected to, and how likely this is to close.
 *
 * It states only what we actually know. A blank line is better than a guess in
 * front of a customer.
 */

import { OFFER } from '@/lib/acq/types';
import type { AcqProspect, CallIntel } from '@/lib/acq/types';
import { scoreHeadline } from '@/lib/acq/score';
import { shortBusiness } from '@/lib/acq/campaign';

export type PrepBrief = {
  headline: string;
  facts: { label: string; value: string }[];
  call: {
    duration: string | null;
    scenario: string | null;
    summary: string | null;
  } | null;
  intel: CallIntel | null;
  intent: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  pricingDiscussed: boolean;
  lines: string[];
};

type CallRow = {
  summary: string | null;
  transcript: string | null;
  intel: unknown;
  duration_sec: number | null;
  roleplay_scenario: string | null;
};

export function buildPrepBrief(lead: AcqProspect, calls: CallRow[]): PrepBrief {
  const business = shortBusiness(lead.business_name);
  const best = calls.find((c) => (c.duration_sec ?? 0) > 30) ?? calls[0] ?? null;
  const intel = (best?.intel as CallIntel | null) ?? null;

  const facts: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value) facts.push({ label, value });
  };

  push('Where', [lead.city, lead.state].filter(Boolean).join(', ') || null);
  push('Trade', lead.trade ? lead.trade.toUpperCase() : null);
  push('Reviews', lead.review_count ? `${lead.review_count.toLocaleString()}${lead.rating ? ` at ${lead.rating} stars` : ''}` : null);
  push('Website', lead.website);
  push('Score', lead.lead_score != null ? `${lead.lead_score}/100 · ${scoreHeadline({ score: lead.lead_score, reasons: lead.score_reasons ?? [] })}` : null);
  push('Missed call risk', lead.missed_call_score != null ? `${lead.missed_call_score}/100` : null);
  push('After hours', lead.open_24_7 ? 'Advertises 24/7' : lead.emergency_service ? 'Advertises emergency service' : null);
  push('Consent given', lead.consent_at ? new Date(lead.consent_at).toLocaleString() : null);
  push('Forge', lead.demo_status === 'ready' ? 'Completed' : lead.demo_status ?? 'Not started');
  push('Demo sent', lead.demo_emailed_at ? new Date(lead.demo_emailed_at).toLocaleString() : null);
  push('Checkout sent', lead.checkout_sent_at ? new Date(lead.checkout_sent_at).toLocaleString() : null);

  const intent = intel?.buying_intent ? (intel.buying_intent.toUpperCase() as PrepBrief['intent']) : 'UNKNOWN';
  const pricingDiscussed = Boolean(intel?.price_reaction || lead.checkout_sent_at);

  const lines = [
    intel?.pain_point ? `Pain: ${intel.pain_point}` : null,
    intel?.current_phone_workflow ? `Phones today: ${intel.current_phone_workflow}` : null,
    intel?.missed_call_problem ? `Missed calls: ${intel.missed_call_problem}` : null,
    intel?.after_hours_need ? `After hours: ${intel.after_hours_need}` : null,
    best?.roleplay_scenario ? `Roleplay: ${best.roleplay_scenario}` : null,
    intel?.requested_features?.length ? `Requested: ${intel.requested_features.join(', ')}` : null,
    pricingDiscussed ? `Pricing discussed: ${OFFER.line}` : null,
    intel?.price_reaction ? `On price: ${intel.price_reaction}` : null,
    intel?.objection ? `Objection: ${intel.objection}` : null,
    intel?.competitor ? `Mentioned: ${intel.competitor}` : null,
    intel?.next_step ? `Agreed next step: ${intel.next_step}` : null,
    intel?.close_probability != null ? `Mr. Mustard's close read: ${intel.close_probability}%` : null,
  ].filter(Boolean) as string[];

  return {
    headline: `${business}${lead.city ? ` · ${lead.city}, ${lead.state ?? ''}`.trimEnd() : ''}`,
    facts,
    call: best
      ? {
          duration: best.duration_sec ? `${Math.floor(best.duration_sec / 60)}m ${best.duration_sec % 60}s` : null,
          scenario: best.roleplay_scenario,
          summary: best.summary,
        }
      : null,
    intel,
    intent,
    pricingDiscussed,
    lines,
  };
}
