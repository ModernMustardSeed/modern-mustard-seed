/**
 * THE "MEET MR. MUSTARD" EMAILS.
 *
 * These three emails have exactly one job, and it is not to explain AI, sell a
 * website, or book a discovery call. It is to make a contractor curious enough
 * to say "yes, let him call me."
 *
 * Two rules run through every line:
 *   NEVER FAKE FAMILIARITY. If we do not know their first name we say "Hi
 *   there", and if we do not know something about their business we do not
 *   imply that we do. Every merge field has an honest fallback.
 *   NEVER SHIP WITHOUT THE FOOTER. This is commercial mail to people who never
 *   opted in, so the compliance footer and the RFC 8058 unsubscribe header are
 *   built in here rather than left to the caller to remember.
 */

import { clientEmail, escape, p } from '@/lib/email';
import { complianceFooter, unsubscribeUrlFor } from '@/lib/outbound-email';
import { SITE } from '@/lib/seo';
import type { AcqProspect, AcqVariant } from '@/lib/acq/types';
import { possessive } from '@/lib/business-name';

/** Tracked CTA. Every click is a measured "permission requested". */
export function permissionUrl(lead: Pick<AcqProspect, 'id'>, step: number, variantKey: string): string {
  const q = new URLSearchParams({ p: lead.id, s: String(step), v: variantKey });
  return `${SITE.url}/api/acq/click?${q.toString()}`;
}

/** Where the click lands, and where a prospect can arrive cold. */
export function permissionPageUrl(leadId?: string, variantKey?: string): string {
  const q = new URLSearchParams();
  if (leadId) q.set('p', leadId);
  if (variantKey) q.set('v', variantKey);
  const s = q.toString();
  return `${SITE.url}/meet-mr-mustard${s ? `?${s}` : ''}`;
}

/**
 * The greeting. A first name when we genuinely have one, "Hi there" otherwise.
 * A business name is never used as a person's name ("Hi ABC Heating LLC," is
 * the tell that an email is automated).
 */
export function greetingFor(lead: Pick<AcqProspect, 'contact_name'>): string {
  const raw = String(lead.contact_name || '').trim();
  // A company name in the contact field is the classic automated-email tell.
  // "Hi ABC Heating LLC," has never once been written by a person.
  if (!raw || COMPANY_SHAPED.test(raw)) return 'Hey there,';
  const first = raw.split(/\s+/)[0] ?? '';
  const usable =
    first.length >= 2 &&
    /^[A-Za-z][A-Za-z'’.-]+$/.test(first) &&
    // An all-caps token is an acronym (ABC, HVAC), not somebody's first name.
    first !== first.toUpperCase() &&
    !GENERIC_NAMES.has(first.toLowerCase());
  return usable ? `Hey ${titleCase(first)},` : 'Hey there,';
}

const COMPANY_SHAPED =
  /\b(llc|l\.l\.c|inc|incorporated|corp|corporation|co|company|ltd|limited|pllc|lp|llp|pc|dba|group|services?|heating|cooling|plumbing|roofing|hvac|air|contractors?)\b|&/i;

const GENERIC_NAMES = new Set(['office', 'info', 'owner', 'manager', 'team', 'service', 'sales', 'admin', 'contact', 'llc', 'inc', 'staff', 'front', 'desk']);

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** First name for a subject line, or a fallback that reads like a human wrote it. */
export function firstNameOr(lead: Pick<AcqProspect, 'contact_name'>, fallback: string): string {
  const g = greetingFor(lead);
  const m = g.match(/^Hey (.+),$/);
  return m && m[1] !== 'there' ? m[1] : fallback;
}

/** Merge a variant subject. `{{first_name}}` degrades to the business name. */
export function renderSubject(variant: AcqVariant, lead: AcqProspect): string {
  return variant.subject
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstNameOr(lead, shortBusiness(lead.business_name)))
    .replace(/\{\{\s*business_name\s*\}\}/gi, shortBusiness(lead.business_name))
    .slice(0, 160);
}

/** "ABC Heating & Air LLC" reads better in a sentence as "ABC Heating & Air". */
export function shortBusiness(name: string): string {
  return String(name || 'your business')
    .replace(/\s*,?\s*\b(llc|l\.l\.c\.?|inc\.?|incorporated|corp\.?|corporation|co\.|ltd\.?|pllc|lp|llp)\b\.?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'your business';
}

export type BuiltCampaignEmail = {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  unsubscribeUrl: string;
  summary: string;
  step: number;
  variantKey: string;
};

const CTA_STYLE_NOTE = 'The button IS the conversion. There is exactly one per email.';

/**
 * Build one campaign email. Pure: no writes, no sends, so the admin preview
 * renders the same bytes Resend is handed.
 */
export function buildCampaignEmail(args: {
  lead: AcqProspect;
  variant: AcqVariant;
  step: 1 | 2 | 3;
  fromName: string;
  fromEmail: string;
  replyTo: string;
}): BuiltCampaignEmail | null {
  const { lead, variant, step } = args;
  if (!lead.email) return null;

  const business = shortBusiness(lead.business_name);
  const greeting = greetingFor(lead);
  const cta = { label: variant.cta_label, url: permissionUrl(lead, step, variant.key) };

  const body = step === 1 ? email1(business) : step === 2 ? email2(business) : email3(business);

  const html =
    clientEmail({
      preheader: PREHEADERS[step],
      greeting,
      body,
      cta,
      signature: 'Sarah',
      trackId: lead.id,
    }) + complianceFooter(lead.email);

  return {
    to: lead.email,
    from: `${args.fromName} <${args.fromEmail}>`,
    replyTo: args.replyTo,
    subject: renderSubject(variant, lead),
    html,
    unsubscribeUrl: unsubscribeUrlFor(lead.email),
    summary: `MEET MR. MUSTARD email ${step} (variant ${variant.key}).`,
    step,
    variantKey: variant.key,
  };
}

const PREHEADERS: Record<number, string> = {
  1: 'Three minutes on the phone with an AI receptionist, no pitch.',
  2: 'Do not let him present. Try to break him.',
  3: 'Last note from me on this.',
};

/* ────────────────────────────── the three emails ─────────────────────────── */

/** EMAIL 1. The whole ask is "can he call you". Nothing else is sold. */
function email1(business: string): string {
  return (
    p('Slightly unusual question.') +
    p(
      `I built an AI receptionist named <strong>Mr. Mustard</strong> that answers, qualifies and books customers for service businesses.`,
    ) +
    p('Rather than send you a sales pitch, I would rather let him call you and show you what he can do.') +
    p(
      `He can even pretend he is the receptionist for <strong>${escape(business)}</strong> so you can test him yourself.`,
    ) +
    p('<strong>Want Mr. Mustard to call you for a three minute demo?</strong>')
  );
}

/** EMAIL 2. Reframes the demo as a challenge, which converts better than a demo. */
function email2(business: string): string {
  return (
    p('One more thought.') +
    p('Do not let Mr. Mustard give you a presentation.') +
    p('Try to <strong>break him</strong>.') +
    p(
      `Have him pretend he works for ${escape(business)} and give him the sort of customer call your team actually receives.`,
    ) +
    p('If you want to try it, the button below rings your phone in about ten seconds.') +
    p('Takes about three minutes.')
  );
}

/** EMAIL 3. The permission-to-close. Says the quiet part and means it. */
function email3(business: string): string {
  return (
    p('Last note from me.') +
    p(
      `If you are curious what an AI receptionist would actually sound like answering calls for ${escape(business)}, I will have Mr. Mustard call you and demonstrate it.`,
    ) +
    p('If not, no problem at all. I will not keep chasing you.')
  );
}

/* ─────────────────── the demo email Mr. Mustard sends ────────────────────── */

/**
 * The "I built their receptionist" email. Sent the moment the Forge lands,
 * either by Mr. Mustard on the call or by the queue when the build finishes.
 * The subject runs the business name through possessive() so a company called
 * Ross Plumbing never becomes "Ross Plumbing's" when it should be "Ross
 * Plumbing'".
 */
export function buildDemoEmail(args: {
  lead: AcqProspect;
  demoUrl: string;
  checkoutUrl: string;
  calendarUrl: string;
  offerLine: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
}): BuiltCampaignEmail | null {
  const { lead } = args;
  if (!lead.email) return null;
  const business = shortBusiness(lead.business_name);
  const greeting = greetingFor(lead);

  const html =
    clientEmail({
      preheader: `Your receptionist is live. Try to stump it.`,
      eyebrow: 'YOUR RECEPTIONIST IS BUILT',
      greeting,
      body:
        p('Mr. Mustard here.') +
        p(`I built the ${escape(business)} version we talked about.`) +
        p('Test it like a customer. Try weird questions. Try an emergency. Try to stump it.') +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0"><tr>
          <td style="border:2px solid #161616;border-radius:14px;padding:16px 18px;background:#ffffff">
            <p style="margin:0;font-size:15px;color:#161616"><strong>If you want it on your real incoming calls</strong></p>
            <p style="margin:6px 0 0;font-size:14px;color:#5a564f;line-height:1.6">${escape(args.offerLine)}. Month to month, cancel anytime. We install it by hand and it is live within a week.</p>
            <p style="margin:10px 0 0"><a href="${escape(args.checkoutUrl)}" style="font-size:14px;font-weight:bold;color:#8a6a1f;text-decoration:none">Activate ${escape(possessive(business))} voice agent &rarr;</a></p>
          </td>
        </tr></table>` +
        p(
          `Or if you would rather talk it through with a human, <a href="${escape(args.calendarUrl)}" style="color:#C2261A;font-weight:700;text-decoration:none">grab time with Sarah</a>.`,
        ),
      cta: { label: 'Try your receptionist', url: args.demoUrl },
      signature: 'Mr. Mustard',
      trackId: lead.id,
    }) + complianceFooter(lead.email);

  return {
    to: lead.email,
    from: `${args.fromName} <${args.fromEmail}>`,
    replyTo: args.replyTo,
    subject: `I built ${possessive(business)} receptionist`,
    html,
    unsubscribeUrl: unsubscribeUrlFor(lead.email),
    summary: 'Sent the personalized demo Mr. Mustard forged on the call.',
    step: 0,
    variantKey: 'demo',
  };
}

/* ──────────────── behavior-driven follow-ups after the demo ──────────────── */

export type FollowupKind = 'no_call_after_consent' | 'called_no_forge' | 'demo_no_purchase_1' | 'demo_no_purchase_2' | 'demo_no_purchase_3';

export const FOLLOWUP_SUBJECTS: Record<FollowupKind, string> = {
  no_call_after_consent: 'Your phone did not ring. That is on me.',
  called_no_forge: 'Want me to build yours?',
  demo_no_purchase_1: 'Did you try to break your receptionist?',
  demo_no_purchase_2: 'Want me to change anything about it?',
  demo_no_purchase_3: 'Ready to put it on your real calls?',
};

export function buildFollowupEmail(args: {
  kind: FollowupKind;
  lead: AcqProspect;
  demoUrl?: string | null;
  checkoutUrl: string;
  calendarUrl: string;
  offerLine: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
}): BuiltCampaignEmail | null {
  const { lead, kind } = args;
  if (!lead.email) return null;
  const business = shortBusiness(lead.business_name);
  const greeting = greetingFor(lead);
  const demo = args.demoUrl || permissionPageUrl(lead.id);

  const bodies: Record<FollowupKind, string> = {
    no_call_after_consent:
      p('You asked Mr. Mustard to call and the call did not connect. That is our fault, not yours.') +
      p('Hit the button and he will try you again right now, or reply with a better time and number.'),
    called_no_forge:
      p(`You and Mr. Mustard talked. He mentioned he could build the ${escape(business)} version so you can test it whenever you want.`) +
      p('That offer stands, it is free, and it takes him about an hour. Want it?'),
    demo_no_purchase_1:
      p(`Your receptionist has been sitting there waiting for someone to try to break it.`) +
      p('Call it like an angry customer at 9pm. That is the real test.'),
    demo_no_purchase_2:
      p('If anything about it was off, the greeting, the questions it asked, the way it handled the emergency, I can change it.') +
      p('Tell me what to fix and I will fix it. No charge, no meeting.'),
    demo_no_purchase_3:
      p(`If it is doing the job, I can put it on ${escape(possessive(business))} real calls this week.`) +
      p(`${escape(args.offerLine)}. Month to month, cancel anytime. Your phones and your number stay exactly as they are.`),
  };

  const ctas: Record<FollowupKind, { label: string; url: string }> = {
    no_call_after_consent: { label: 'HAVE HIM TRY ME AGAIN', url: permissionUrl(lead, 4, 'retry') },
    called_no_forge: { label: 'BUILD MINE', url: permissionUrl(lead, 5, 'forge') },
    demo_no_purchase_1: { label: 'Try your receptionist', url: demo },
    demo_no_purchase_2: { label: 'Open your receptionist', url: demo },
    demo_no_purchase_3: { label: 'Activate it on my real calls', url: args.checkoutUrl },
  };

  const html =
    clientEmail({
      preheader: FOLLOWUP_SUBJECTS[kind],
      greeting,
      body: bodies[kind],
      cta: ctas[kind],
      secondary: kind === 'demo_no_purchase_3' ? { label: 'Talk with Sarah first', url: args.calendarUrl } : undefined,
      signature: kind === 'no_call_after_consent' ? 'Sarah' : 'Mr. Mustard',
      trackId: lead.id,
    }) + complianceFooter(lead.email);

  return {
    to: lead.email,
    from: `${args.fromName} <${args.fromEmail}>`,
    replyTo: args.replyTo,
    subject: FOLLOWUP_SUBJECTS[kind],
    html,
    unsubscribeUrl: unsubscribeUrlFor(lead.email),
    summary: `Follow-up: ${kind}.`,
    step: 0,
    variantKey: kind,
  };
}

export const _internal = { CTA_STYLE_NOTE };
