/**
 * THE "MEET MR. MUSTARD" EMAILS.
 *
 * The sequence, in order:
 *
 *   1  THE ASK        one question, no argument. Three subject lines plus the
 *                     personalized arm carrying their own missed-call maths.
 *   2  THE PROOF      why silence costs money, in numbers that cite themselves.
 *   3  THE CHALLENGE  do not let him present, try to break him.
 *   4  KEEP HER       nights and overflow only. Nobody loses a job over this.
 *   5  THE BREAKUP    permission to close the door.
 *
 * These emails have exactly one job, and it is not to explain AI, sell a
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
import { estimateFor, calculatorBlock, personalOpener, type Estimate } from '@/lib/acq/personalize';
import { proofStat, type ProofStat } from '@/data/proof-stats';

/** Tracked CTA. Every click is a measured "permission requested". */
export function permissionUrl(lead: Pick<AcqProspect, 'id'>, step: number, variantKey: string): string {
  const q = new URLSearchParams({ p: lead.id, s: String(step), v: variantKey });
  return `${SITE.url}/api/acq/click?${q.toString()}`;
}

/**
 * The doorway. ONE page for every channel: cold email, Facebook, LinkedIn, a QR
 * code, Sarah reading it down the phone. The `source` is the whole tracking
 * system, so a new channel needs a new URL rather than a new page.
 */
export function permissionPageUrl(leadId?: string, variantKey?: string): string {
  const q = new URLSearchParams({ source: 'cold-email' });
  if (leadId) q.set('p', leadId);
  if (variantKey) q.set('utm_content', variantKey);
  return `${SITE.url}/mustard?${q.toString()}`;
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
  /** 1-based position in the sequence. The BODY comes from `variant.body_key`,
   *  not from this number, so reordering the drip never rewrites an email. */
  step: number;
  fromName: string;
  fromEmail: string;
  replyTo: string;
}): BuiltCampaignEmail | null {
  const { lead, variant, step } = args;
  if (!lead.email) return null;

  const business = shortBusiness(lead.business_name);
  const greeting = greetingFor(lead);
  const cta = { label: variant.cta_label, url: permissionUrl(lead, step, variant.key) };

  // The personalized variant only fires when we genuinely hold two independent
  // true things about this business. Otherwise it degrades to the plain email
  // rather than dressing a template up as research.
  const estimate = variant.body_key === 'personalized' && step === 1 ? estimateFor(lead) : null;
  const personalized = estimate?.personalizable ? estimate : null;

  const body = personalized ? emailPersonalized(lead, personalized, business) : BODIES[variant.body_key]?.(business) ?? email1(business);

  const html =
    clientEmail({
      preheader: PREHEADERS[variant.body_key] ?? PREHEADERS.default,
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
    subject: personalized ? personalizedSubject(lead, personalized) : renderSubject(variant, lead),
    html,
    unsubscribeUrl: unsubscribeUrlFor(lead.email),
    summary: `MEET MR. MUSTARD email ${step} (variant ${variant.key}${personalized ? ', personalized' : ''}).`,
    step,
    variantKey: variant.key,
  };
}

/**
 * EMAIL 1, PERSONALIZED.
 *
 * Same single ask as the plain one. The difference is that it opens with
 * something true about their business and then shows the arithmetic behind why
 * a missed call matters, with the two guessed inputs printed in the open.
 *
 * It still does not sell a voice agent. It still asks one question.
 */
function emailPersonalized(lead: AcqProspect, est: Estimate, business: string): string {
  return (
    p(escape(personalOpener(lead, est))) +
    p(
      `I built an AI receptionist named <strong>Mr. Mustard</strong> that answers, qualifies and books customers for service businesses. Before I pitch you anything, here is the only reason it would matter to you.`,
    ) +
    calculatorBlock(lead, est, escape) +
    p(
      `Rather than argue about the number, I would rather let him call you and show you what he does with those calls. He can even pretend he is the receptionist for <strong>${escape(business)}</strong> so you can test him yourself.`,
    ) +
    p('<strong>Want Mr. Mustard to call you for a three minute demo?</strong>')
  );
}

function personalizedSubject(lead: AcqProspect, est: Estimate): string {
  const business = shortBusiness(lead.business_name);
  switch (est.hookKind) {
    case 'reviews':
      return `${business}, what happens to the calls you miss?`;
    case 'always-open':
      return `Who answers ${possessive(business)} phone at 2am?`;
    case 'hours':
      return `${business}, who picks up after you close?`;
    case 'emergency':
      return `${business}, the 11pm emergency call`;
    default:
      return `Want my AI receptionist to call you?`;
  }
}

/**
 * Body registry. The variant row names its body; the step number does not pick
 * it. That separation is the point: the sequence can be reordered from the
 * Command Center, or a sixth email inserted in the middle, and every existing
 * email still renders the words it was written to render.
 *
 * An unknown body_key falls back to the plain ask rather than sending a blank
 * email, and `acq:test` asserts every body_key in the database has an entry.
 */
const BODIES: Record<string, (business: string) => string> = {
  default: email1,
  proof: emailProof,
  challenge: email2,
  keep_her: emailKeepHer,
  breakup: email3,
};

const PREHEADERS: Record<string, string> = {
  default: 'Three minutes on the phone with an AI receptionist, no pitch.',
  proof: 'The customers who hang up never tell you they called.',
  challenge: 'Do not let him present. Try to break him.',
  keep_her: 'Nights, weekends and overflow. Your front desk keeps her job.',
  breakup: 'Last note from me on this.',
};

/** Every body key the renderer knows. Used by the tests and the admin preview. */
export const BODY_KEYS = Object.keys(BODIES).concat('personalized');

/* ────────────────────────────── the five emails ──────────────────────────── */

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

/**
 * EMAIL 2. THE PROOF.
 *
 * The only email in the sequence that argues. It exists because email 1 asks a
 * stranger for three minutes without ever saying why an unanswered phone is
 * expensive, and some people need the why before the what.
 *
 * Every figure comes from data/proof-stats.ts and prints its own citation on
 * the same line. The voicemail number shows its spread rather than pretending
 * a contested statistic is settled. Nothing here is rounded up for effect,
 * because the next email asks them to trust an estimate about their own
 * business and this is where that credit is earned or lost.
 */
function emailProof(business: string): string {
  const speed = proofStat('first-minute');
  const silence = proofStat('voicemail-silence');
  const nextGuy = proofStat('call-the-next-guy');

  return (
    p('Following up with the part I left out.') +
    p(
      `Everybody knows a missed call is bad. What surprised me is how fast it is over, and how little of it you ever find out about.`,
    ) +
    statBlock([speed, silence, nextGuy]) +
    p(
      `That middle one is the one I would think hardest about. A missed call at least leaves a number in your log. The ones who hang up on the beep leave nothing, so the loss never shows up anywhere you would look for it.`,
    ) +
    p(
      `Mr. Mustard answers in two rings, at any hour, and every caller ends up as a name, a number and what they wanted, in writing.`,
    ) +
    p(`<strong>Want him to call you and show you what that sounds like?</strong>`)
  );
}

/**
 * The proof table. Figure, claim, citation, in one stacked row each.
 *
 * The citation is not a footnote and not a tooltip. It sits directly under the
 * claim in the same block, at the same weight as the assumptions under the
 * calculator, for the same reason: a number a contractor cannot check is a
 * number a contractor discounts.
 */
function statBlock(stats: ProofStat[]): string {
  const row = (s: ProofStat, last: boolean) => `
    <tr>
      <td style="padding:${last ? '12px 0 0' : '12px 0'};border-bottom:${last ? 'none' : '1px solid #eee7d8'}">
        <p style="margin:0;font-size:24px;font-weight:bold;color:#161616;line-height:1.1">${escape(s.figure)}</p>
        <p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:#5a564f">${escape(s.body)}</p>
        <p style="margin:5px 0 0;font-size:11px;line-height:1.5;color:#8a8375">${escape(
          s.spread ? `${s.source}. ${capitalize(s.spread)}, so treat it as "most", not as exactly ${s.figure.replace(/^~/, '')}.` : s.source,
        )}</p>
      </td>
    </tr>`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">
    <tr>
      <td style="border:2px solid #161616;border-radius:14px;padding:18px 20px;background:#ffffff">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#E0301E;font-weight:bold">
          Silence costs more than a bad call
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${stats.map((s, i) => row(s, i === stats.length - 1)).join('')}
        </table>
      </td>
    </tr>
  </table>`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * EMAIL 4. KEEP HER.
 *
 * The objection nobody replies to say out loud. An owner reads "AI
 * receptionist", pictures replacing the person who has answered their phone
 * for nine years, decides they are not that kind of owner, and stops opening
 * our emails. They never argue with us; they just go quiet.
 *
 * So this one argues against the sale as most people imagine it. The offer is
 * genuinely additive: nights, weekends, and the calls that were already going
 * to voicemail. Nothing in here is softened for effect. If somebody DOES want
 * to cut a salary, they can, and we do not need to say so to sell this.
 */
function emailKeepHer(business: string): string {
  const line = (title: string, body: string) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #eee7d8">
        <p style="margin:0;font-size:14px;font-weight:bold;color:#161616">${escape(title)}</p>
        <p style="margin:3px 0 0;font-size:13.5px;line-height:1.55;color:#5a564f">${escape(body)}</p>
      </td>
    </tr>`;

  return (
    p('Something I should have said three emails ago.') +
    p(
      `This is not a replacement for whoever answers your phone. If you have somebody good on the front desk, she is a reason customers stay with ${escape(business)}, and no software is going to do what she does.`,
    ) +
    p('Almost nobody puts Mr. Mustard on every call. They give him one narrow job:') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">
      <tr><td style="border:2px solid #161616;border-radius:14px;padding:16px 20px;background:#ffffff">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${line('After hours and weekends', 'She goes home at five. He picks up the six-thirty emergency instead of the machine.')}
          ${line('Overflow only', 'He answers the second and third callers while she is on the first, so nobody waits.')}
          ${line('Just the voicemail calls', 'He takes only what was already going to the beep. Every call she reaches, she keeps.')}
        </table>
      </td></tr>
    </table>` +
    p(
      `You pick which. It is one sentence to set up and it changes nothing about your number, your phones, or who answers them during the day.`,
    ) +
    p('<strong>Easiest way to judge it is to let him call you. Three minutes.</strong>')
  );
}

/** EMAIL 5. The permission-to-close. Says the quiet part and means it. */
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
