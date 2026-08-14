/**
 * WHO GETS MAILED.
 *
 * The single gate between the prospect table and the outbound machine. Every
 * disqualifier is a named reason stored on the lead, so the CRM can always
 * answer "why is this one not being emailed" without anybody reading code.
 *
 * The rule that matters most: this is a DENY list evaluated in order, and a
 * blank field never passes. An unknown email status is not "probably fine".
 */

import type { AcqProspect } from '@/lib/acq/types';
import { isMailableEmailStatus } from '@/lib/acq/types';
import { emailKey } from '@/lib/acq/dedupe';

export type Eligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

export type EligibilityContext = {
  /** Addresses on either suppression list, plus current clients. */
  suppressed: Set<string>;
  minLeadScore: number;
};

const ROLE_OK = /^(info|contact|office|hello|service|sales|admin|support|scheduling|dispatch|estimates?|booking|frontdesk|reception)@/i;
const NO_REPLY = /^(no-?reply|donotreply|do-?not-?reply|postmaster|mailer-daemon|abuse|webmaster|privacy|legal|dmca|unsubscribe)@/i;
const TEST_DOMAIN = /@(example|test|localhost|invalid|mailinator|guerrillamail|tempmail|yopmail|10minutemail)\./i;

export function evaluate(lead: AcqProspect, ctx: EligibilityContext): Eligibility {
  if (lead.is_test) return { eligible: false, reason: 'Marked as a test prospect.' };
  if (lead.duplicate_of) return { eligible: false, reason: 'Duplicate of another prospect.' };
  if (lead.unsubscribed_at) return { eligible: false, reason: 'Unsubscribed. Permanent.' };
  if (lead.bounced) return { eligible: false, reason: 'Previously bounced.' };
  if (lead.client_status === 'client' || lead.acq_stage === 'client') {
    return { eligible: false, reason: 'Already a client.' };
  }
  if (lead.status === 'dnc' || lead.dnc_checked) return { eligible: false, reason: 'On the do-not-contact list.' };

  const key = emailKey(lead.email);
  if (!key) return { eligible: false, reason: 'No usable email address.' };
  if (ctx.suppressed.has(key)) return { eligible: false, reason: 'Address is suppressed (opt-out, bounce or existing client).' };
  if (NO_REPLY.test(key)) return { eligible: false, reason: 'Unattended mailbox (no-reply style address).' };
  if (TEST_DOMAIN.test(key)) return { eligible: false, reason: 'Test or disposable email domain.' };

  if (!isMailableEmailStatus(lead.email_status)) {
    return { eligible: false, reason: `Email status is "${lead.email_status ?? 'unknown'}"; only verified, likely and publicly listed addresses are mailed.` };
  }

  if (!lead.phone || String(lead.phone).replace(/\D/g, '').length < 10) {
    return { eligible: false, reason: 'No dialable phone number, so the whole play cannot run.' };
  }

  const score = lead.lead_score ?? 0;
  if (score < ctx.minLeadScore) {
    return { eligible: false, reason: `Lead score ${score} is under the campaign minimum of ${ctx.minLeadScore}.` };
  }

  return { eligible: true };
}

/** True when a role inbox is the right one to write to. Purely informational. */
export function isRoleInbox(email: string | null | undefined): boolean {
  return ROLE_OK.test(String(email || ''));
}

/**
 * Should this lead get the NEXT email in the sequence right now?
 * Separate from eligibility on purpose: a lead can be perfectly eligible and
 * still not be due.
 */
export function dueForStep(
  lead: AcqProspect,
  now: Date,
  step2AfterDays: number,
  step3AfterDays: number,
): 1 | 2 | 3 | null {
  // Anything that converted stops the sequence dead.
  if (lead.consent_status === 'granted') return null;
  if (lead.reply_at) return null;
  if (['consented', 'called', 'demoed', 'forged', 'demo_sent', 'meeting', 'client'].includes(lead.acq_stage)) return null;

  const stage = lead.email_stage ?? 0;
  if (stage >= 3) return null;
  if (stage === 0) return 1;

  const last = lead.last_campaign_email_at ? new Date(lead.last_campaign_email_at) : null;
  if (!last) return (stage + 1) as 2 | 3;
  const waited = businessDaysBetween(last, now);
  if (stage === 1) return waited >= step2AfterDays ? 2 : null;
  return waited >= step3AfterDays ? 3 : null;
}

/** Whole business days between two instants (Sat/Sun do not count). */
export function businessDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let days = 0;
  const cursor = new Date(from.getTime());
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to.getTime());
  end.setUTCHours(0, 0, 0, 0);
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const d = cursor.getUTCDay();
    if (d !== 0 && d !== 6) days++;
  }
  return days;
}
