/**
 * THE "MEET MR. MUSTARD" EMAILS.
 *
 * The sequence, in order:
 *
 *   1  THE ASK        one question, no argument. Three subject lines plus the
 *                     personalized arm. Both arms now carry the pop-art
 *                     Revenue Recovery machine and the ranch line.
 *   2  THE PROOF      why silence costs money, in numbers that cite themselves.
 *   3  THE WHOLE THING  he is not only a phone line. He lives on a website we
 *                     build, and the free demo suite is one click.
 *   4  THE CHALLENGE  do not let him present, try to break him.
 *   5  KEEP HER       nights and overflow only. Nobody loses a job over this.
 *   6  THE BREAKUP    permission to close the door.
 *
 * NOBODY IS ASKED FOR THEIR PHONE NUMBER ANY MORE (2026-08-25). Every email
 * used to end by offering to have Mr. Mustard ring them, and the button
 * collected a number. Sarah, reading the sends: "people dont seem too
 * responsive... really, we should just have them call Mr. Mustard instead of
 * asking him to call them."
 *
 * She is right, and the reason is that the old ask inverted the friction. A
 * stranger had to hand over their number, then wait for a robot to phone them
 * at a moment they did not choose, and it bought them nothing until it
 * happened. Every email now offers two things a reader can have immediately:
 *
 *   the button    /demos. A working voice agent built for their business, free,
 *                 plus a website if they want one. No card, no call to sit
 *                 through, nothing to wait for.
 *   the number    the ranch line, printed at 34px as a tel: link, because most
 *                 of these are read on a phone and the fastest conversion we
 *                 have ever measured is a man reading an email at 6am and just
 *                 calling.
 *
 * A quieter text link goes to /talking-website for the reader who wants the
 * website as well as the agent. One button, two text paths, no waiting on us.
 *
 * Email 3 is still the one that names the whole product rather than the phone,
 * which is why it kept its own ending (Sarah, 2026-08-22).
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
import { estimateFor, personalOpener, type Estimate } from '@/lib/acq/personalize';
import { recoveryMachineBlock, machineAssumptions } from '@/lib/acq/machine';
import { proofStat, type ProofStat } from '@/data/proof-stats';

/**
 * Where a tracked click is allowed to land.
 *
 * A whitelist rather than a URL, because the redirect target rides in a query
 * string on a link we send to strangers, and an open redirect on our own domain
 * is a phishing kit somebody else gets to use. Adding a door is a code change.
 */
export type ClickDoor = 'mustard' | 'demos' | 'talking-website';

/** The ranch line. Mr. Mustard answers it himself, day or night. */
export const RANCH_LINE = { display: '(406) 312-1223', tel: '+14063121223' };

/** Tracked CTA. Every click is a measured "permission requested". */
export function permissionUrl(lead: Pick<AcqProspect, 'id'>, step: number, variantKey: string, door: ClickDoor = 'mustard'): string {
  const q = new URLSearchParams({ p: lead.id, s: String(step), v: variantKey });
  if (door !== 'mustard') q.set('d', door);
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
/**
 * THE ASK IS "WANT ONE BUILT FOR YOU", NEVER "CAN HE CALL YOU" (Sarah,
 * 2026-08-25). The variant rows in acq_variants were seeded when the button
 * collected a phone number, and migration 111 rewrites them, but a row is data
 * and data drifts: any label or subject that still asks for a call is replaced
 * here, at render, so no send can carry the old ask whatever the table says.
 */
export const BUILD_CTA_LABEL = 'YES, BUILD MY DEMO';
export const BUILD_SUBJECT = 'Can we build {{business_name}} a demo? It is free';
const ASKS_FOR_A_CALL = /\bcall\b/i;
/**
 * EVERY EMAIL ASKS THE SAME THING (Sarah, 2026-08-25: "i want all of them to
 * ask if we can build them a demo"). The row's label is ignored on purpose: one
 * ask, one button, whatever an A/B row was seeded with.
 */
export function ctaLabelFor(_label: string | null | undefined): string {
  return BUILD_CTA_LABEL;
}

export function renderSubject(variant: AcqVariant, lead: AcqProspect): string {
  const raw = ASKS_FOR_A_CALL.test(variant.subject) ? BUILD_SUBJECT : variant.subject;
  return raw
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
 * WHERE THE BUTTON GOES. ONE DOOR, EVERY EMAIL: the free build.
 *
 * Until 2026-08-25 every email asked for permission to phone them, and the
 * button opened /mustard to collect a number. Sarah, reading the sends: "people
 * dont seem too responsive... we should just have them call Mr. Mustard instead
 * of asking him to call them."
 *
 * She is right, and the reason is that the old ask inverted the friction. A
 * stranger had to hand over their phone number, then wait for a robot to ring
 * them at a moment they did not choose. That is a bigger commitment than buying
 * something, and it bought them nothing until it happened. The new ask hands
 * them a working voice agent and a website for their own business, free, with
 * no number and no wait, and prints the ranch line at full size for anyone who
 * would rather just dial it right now.
 */
const CTA_DOOR: ClickDoor = 'demos';

/**
 * The second, quieter path. A text link, never a second button.
 *
 * On every email now, because the choice underneath is real: some readers want
 * the phone answered, and some want the whole front of the business rebuilt.
 * /talking-website is the page for the second kind.
 */
const SECONDARY_LABEL = 'Or the Talking Website';

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
  const cta = { label: ctaLabelFor(variant.cta_label), url: permissionUrl(lead, step, variant.key, CTA_DOOR) };
  const secondary = { label: SECONDARY_LABEL, url: permissionUrl(lead, step, variant.key, 'talking-website') };

  // The personalized variant only fires when we genuinely hold two independent
  // true things about this business. Otherwise it degrades to the plain email
  // rather than dressing a template up as research.
  const estimate = variant.body_key === 'personalized' && step === 1 ? estimateFor(lead) : null;
  const personalized = estimate?.personalizable ? estimate : null;

  const body = personalized ? emailPersonalized(lead, personalized, business) : BODIES[variant.body_key]?.(business, lead) ?? email1(business, lead);

  const html =
    clientEmail({
      preheader: PREHEADERS[variant.body_key] ?? PREHEADERS.default,
      greeting,
      body,
      cta,
      secondary,
      signature: 'Sarah',
      // The body already carries the ranch line at 34px with the line that
      // makes the call a demo. The signature's own card would be the same
      // number a second time, four inches lower.
      ranchLine: false,
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
 * THE MACHINE, WIRED FOR ONE PROSPECT.
 *
 * `personalized` is not decoration. It picks whether the machine claims the
 * numbers came from their listing, so it is false for every plain send even
 * though the arithmetic underneath is identical.
 */
/**
 * THE BLANK MACHINE (Sarah, 2026-08-25). No estimate is printed in any cold
 * email any more: the guessed job value was wrong often enough to cost the
 * argument ("Dolphin Pools, $250 a job"). The machine ships empty, and the
 * reader puts three numbers in on the live one. `machineFor` with an estimate
 * stays for the admin preview of the old personalized layout.
 */
function blankMachineFor(lead: AcqProspect, business: string): string {
  return recoveryMachineBlock({
    blank: true,
    business,
    personalized: false,
    // The live machine on the demo page, never /mustard (Sarah, 2026-08-25:
    // "not ever send to mustard page"). The keys land on the calculator, and
    // the build form is one scroll above it.
    liveUrl: `${SITE.url}/demos?source=cold-email-calculator&p=${encodeURIComponent(lead.id)}#calculator`,
    escape,
  });
}

function machineFor(lead: AcqProspect, est: Estimate, business: string, personalized: boolean): string {
  return recoveryMachineBlock({
    est,
    business,
    personalized,
    // The live machine on the demo page, never /mustard (Sarah, 2026-08-25:
    // "not ever send to mustard page"). The keys land on the calculator, and
    // the build form is one scroll above it.
    liveUrl: `${SITE.url}/demos?source=cold-email-calculator&p=${encodeURIComponent(lead.id)}#calculator`,
    escape,
  });
}

/**
 * THE NUMBER, AT THE SIZE OF THE ASK.
 *
 * This used to be a sentence with the number inside it, sitting under a button
 * that asked him to call them. The button is gone and the order is reversed:
 * the fastest thing a curious owner can do is dial, so the number is the
 * largest thing in the email after the calculator, and it is a `tel:` link, so
 * on the phone where most of these are read it is one tap.
 *
 * The instruction under it is what makes the call a demo rather than a wrong
 * number: tell him to pretend he works for you. Without that line people ring
 * the number, get a receptionist, and hang up confused.
 */
function ranchLineBlock(business: string): string {
  const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px">
    <tr><td bgcolor="#FFF3CC" align="center" style="background:#FFF3CC;border:2px solid #161616;border-radius:14px;padding:20px 18px">
      <p style="margin:0;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#C2261A">Call him now, he is awake</p>
      <p style="margin:10px 0 0;line-height:1">
        <a href="tel:${RANCH_LINE.tel}" style="font-family:${SANS};font-size:34px;font-weight:800;letter-spacing:-0.5px;color:#161616;text-decoration:none;white-space:nowrap">${RANCH_LINE.display}</a>
      </p>
      <p style="margin:10px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.55;color:#161616">
        He answers in two rings at any hour. Tell him to pretend he works for ${escape(business)} and give him your worst customer.
      </p>
    </td></tr>
  </table>`;
}

/**
 * THE LINE ABOVE THE BUTTON.
 *
 * One sentence, in every email, naming what the button actually does. It has to
 * carry the whole offer because it is the last thing read before the click:
 * free, built for them, no card, no call, and it is a real working thing rather
 * than a booked appointment to look at one.
 */
function buildItAsk(): string {
  return p(
    '<strong>Can we build you a demo?</strong> Say yes and we make you a working voice agent that answers as your business, plus a website to go with it if you want one. Free, no card, no meeting, nothing to sit through. It is with you inside the hour.',
  );
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
    blankMachineFor(lead, business) +
    p(
      `Put your own three numbers in; I would rather you see it than take my word for it. Then hear what he does with those calls: he can pretend he is the receptionist for <strong>${escape(business)}</strong>, so you can test him on your own work.`,
    ) +
    ranchLineBlock(business) +
    buildItAsk()
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
      return `Your AI receptionist, built free`;
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
const BODIES: Record<string, (business: string, lead: AcqProspect) => string> = {
  default: email1,
  proof: emailProof,
  talking_website: emailTalkingWebsite,
  challenge: email2,
  keep_her: emailKeepHer,
  breakup: email3,
};

const PREHEADERS: Record<string, string> = {
  default: 'Here is what the calls you miss are worth. Then call him and check.',
  proof: 'The customers who hang up never tell you they called.',
  talking_website: 'He answers the phone. He also answers your website.',
  challenge: 'Do not let him present. Try to break him.',
  keep_her: 'Nights, weekends and overflow. Your front desk keeps her job.',
  breakup: 'Last note from me. The line stays open either way.',
};

/** Every body key the renderer knows. Used by the tests and the admin preview. */
export const BODY_KEYS = Object.keys(BODIES).concat('personalized');

/* ────────────────────────────── the five emails ──────────────────────────── */

/**
 * EMAIL 1. The whole ask is "hear him". Nothing else is sold.
 *
 * The machine ships here too, on house numbers rather than theirs, and it says
 * so on its own face. That is the line that keeps this honest: a stranger's
 * calculator showing round numbers it admits are round is an invitation to
 * argue, and an argument about their own average ticket is the best qualifying
 * conversation we get.
 */
function email1(business: string, lead: AcqProspect): string {
  return (
    p('Slightly unusual question.') +
    p(
      `I built an AI receptionist named <strong>Mr. Mustard</strong> that answers, qualifies and books customers for service businesses. Before I pitch you anything, here is the only reason it would matter to you.`,
    ) +
    blankMachineFor(lead, business) +
    p('Three numbers you already know, thirty seconds, and it is your business on the display instead of a stranger\'s guess.') +
    p(`Rather than send you a sales pitch, I would rather you hear what he does with the calls that fall through.`) +
    ranchLineBlock(business) +
    buildItAsk()
  );
}

/**
 * EMAIL 3. THE WHOLE THING.
 *
 * By here they have been asked twice for the same three minutes. Some of them
 * are not ignoring us, they just do not have a phone problem, and every email
 * so far has been about the phone.
 *
 * So this one names the rest of it: we build the website, the same agent lives
 * on it as a button that talks, and it carries its own line. Sarah, 2026-08-22:
 * "tell them we build websites and thier voice agent can live right on thier
 * website and have phone line". Then it hands them the free suite, which is the
 * lowest-friction yes in the whole business: no card, no call, built for them.
 *
 * The forge close stays available to people who would rather talk than click,
 * because Mr. Mustard builds it live on the phone.
 */
function emailTalkingWebsite(business: string): string {
  const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
  const piece = (title: string, body: string, last = false) => `
    <tr>
      <td style="padding:${last ? '11px 0 0' : '11px 0'};border-bottom:${last ? 'none' : '1px solid #eee7d8'}">
        <p style="margin:0;font-family:${SANS};font-size:14.5px;font-weight:bold;color:#161616">${escape(title)}</p>
        <p style="margin:3px 0 0;font-family:${SANS};font-size:13.5px;line-height:1.55;color:#5a564f">${escape(body)}</p>
      </td>
    </tr>`;

  return (
    p('I have been talking about your phone as if that is all this is.') +
    p(
      `It is not. We build the website too, and Mr. Mustard lives on it. A button in the corner that talks back, the same agent, the same brain, answering the person reading about ${escape(business)} at eleven at night who was never going to fill in a contact form.`,
    ) +
    p('And he carries his own line, so the website and the phone are the same employee instead of two systems that do not know about each other.') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
      <tr><td style="border:2px solid #161616;border-radius:14px;padding:16px 20px;background:#ffffff">
        <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#E0301E;font-weight:bold">
          What we would build you, free, to look at
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${piece('The voice agent', 'Answers as your business, day or night, qualifies the caller and books the job.')}
          ${piece('The website', 'Designed from scratch for your trade and your town, with him answering on it.', true)}
        </table>
      </td></tr>
    </table>` +
    p(
      'Both are built for your business and cost nothing to look at. No card, no meeting, and it is with you inside the hour.',
    ) +
    p('Or skip the form entirely. Tell him to build you a website while you are on the line with him, and he does it.') +
    ranchLineBlock(business)
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
    p('Dial him right now and start with the worst one you got this month.') +
    ranchLineBlock(business) +
    buildItAsk()
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
    ranchLineBlock(business) +
    buildItAsk()
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
    p('Easiest way to judge it is to hear him work. Call the line and give him the six-thirty emergency.') +
    ranchLineBlock(business) +
    buildItAsk()
  );
}

/** EMAIL 5. The permission-to-close. Says the quiet part and means it. */
function email3(business: string): string {
  return (
    p('Last note from me.') +
    p(
      `If you are ever curious what an AI receptionist would actually sound like answering calls for ${escape(business)}, the line is open and it costs you nothing to find out.`,
    ) +
    ranchLineBlock(business) +
    buildItAsk() +
    p('If not, no problem at all. I will not keep chasing you.')
  );
}

/* ─────────────────── the demo email Mr. Mustard sends ────────────────────── */

/**
 * THE JOKE, AND IT IS LOAD BEARING.
 *
 * Sarah, 2026-08-22: "make a cute joke in the demo suite emails that say wed
 * rather show you than pitch you."
 *
 * It is funny because it is the literal operating model. Everybody in this
 * inbox has been pitched by four agencies this month; nobody has been handed a
 * working version of their own business. Saying the quiet part is the cheapest
 * credibility we have, so it sits right where a pitch would normally go.
 */
export const SHOW_DONT_PITCH = 'We would rather show you than pitch you, mostly because we are terrible at pitching and pretty good at building.';

/**
 * The audit, folded into a suite email.
 *
 * Prints the score, because a number in an inbox gets opened and an adjective
 * does not. Renders nothing at all when no audit has been run, rather than
 * linking to a page that will greet them with a spinner.
 */
function auditBlock(args: { auditUrl?: string | null; auditScore?: number | null; auditHeadline?: string | null }): string {
  if (!args.auditUrl) return '';
  const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
  const score = typeof args.auditScore === 'number' ? args.auditScore : null;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
    <tr><td style="border:2px solid #161616;border-radius:14px;padding:16px 20px;background:#FFF3CC">
      <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#C2261A;font-weight:bold">
        And we scored you while we were in there
      </p>
      <p style="margin:8px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:#161616">
        ${score !== null ? `<strong style="font-size:22px">${score}/100</strong>. ` : ''}${
          args.auditHeadline ? `${escape(args.auditHeadline)} ` : ''
        }Your website, your Google Business Profile and your reviews, each graded, with every number showing where it came from.
      </p>
      <p style="margin:10px 0 0">
        <a href="${escape(args.auditUrl)}" style="font-family:${SANS};font-size:14px;font-weight:bold;color:#8a6a1f;text-decoration:none">Read your presence audit &rarr;</a>
      </p>
    </td></tr>
  </table>`;
}

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
  /** Their Presence Audit, when one has been run. Website, Google profile and
   *  reviews, each scored. It is what makes the rest of the suite read as an
   *  answer to something instead of an offer out of nowhere. */
  auditUrl?: string | null;
  auditScore?: number | null;
  auditHeadline?: string | null;
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
        // Never "we talked about": this email goes out whether or not anyone
        // has spoken to them (Sarah, 2026-08-25). It opens as a gift, not a recap.
        p('Mr. Mustard here. We made you something.') +
        p(`A receptionist for ${escape(business)}, already answering to your name. Not a mockup: pick up the phone, and it picks up as you.`) +
        p('Test it like a customer. Try weird questions. Try an emergency. Try to stump it.') +
        auditBlock(args) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0"><tr>
          <td style="border:2px solid #161616;border-radius:14px;padding:16px 18px;background:#ffffff">
            <p style="margin:0;font-size:15px;color:#161616"><strong>If you want it on your real incoming calls</strong></p>
            <p style="margin:6px 0 0;font-size:14px;color:#5a564f;line-height:1.6">${escape(args.offerLine)}. Month to month, cancel anytime. We install it by hand and it is live within a week.</p>
            <p style="margin:10px 0 0"><a href="${escape(args.checkoutUrl)}" style="font-size:14px;font-weight:bold;color:#8a6a1f;text-decoration:none">Activate ${escape(possessive(business))} voice agent &rarr;</a></p>
          </td>
        </tr></table>` +
        p(escape(SHOW_DONT_PITCH)) +
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


/* ──────────────────────── the SUITE email (all of it) ───────────────────── */

/** What actually got built for them. Only pieces that exist are ever named. */
export type SuiteLinks = {
  hubUrl: string;
  voiceUrl: string | null;
  siteUrl: string | null;
  osUrl: string | null;
  /** True when Sarah recorded a face-to-camera video for this business. */
  personalVideo: boolean;
  /** True when the walkthrough film of THEIR suite is cut and ready. */
  film: boolean;
};

/**
 * THE SUITE EMAIL.
 *
 * The demo email above says "I built your receptionist" and is Mr. Mustard's,
 * sent to somebody who just spent four minutes talking to him. This one is for
 * the far bigger audience that never picked up the phone: they opened the note,
 * some of them walked all the way to the permission page, and then they closed
 * the tab. Nothing was owed to them and nothing was ever sent.
 *
 * So this email leads with the thing itself. No pitch in the first line, no
 * "just following up", no asking for a call. Their website exists, their
 * receptionist answers, their back office is running, and the whole point of
 * the email is the four links that prove it.
 *
 * It only ever names pieces that are actually built. A suite email that
 * promises a website which is still on the anvil is worse than no email,
 * because they click it inside the first minute.
 */
export function buildSuiteEmail(args: {
  lead: AcqProspect;
  suite: SuiteLinks;
  checkoutUrl: string;
  calendarUrl: string;
  offerLine: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  /** Mr. Mustard signs it when he has actually spoken to them. Otherwise Sarah does. */
  fromMustard: boolean;
}): BuiltCampaignEmail | null {
  const { lead, suite } = args;
  if (!lead.email) return null;
  const business = shortBusiness(lead.business_name);
  const greeting = greetingFor(lead);

  const pieces: { label: string; blurb: string; url: string }[] = [];
  if (suite.siteUrl) {
    pieces.push({
      label: 'Your website',
      blurb: `Built around ${escape(business)}, not a template with your name dropped in. Open it on your phone.`,
      url: suite.siteUrl,
    });
  }
  if (suite.voiceUrl) {
    pieces.push({
      label: 'Your receptionist',
      blurb: 'Answers as your business, in a real voice, on any call. Try to stump it.',
      url: suite.voiceUrl,
    });
  }
  // THE COMMAND CENTER IS NEVER NAMED IN AN OUTBOUND EMAIL. It came off the
  // suite and out of the offer (Sarah, 2026-08-22, again on 2026-08-25), so
  // there is no third piece to list and no freebie to promise. The demo suite
  // page draws no door for it either (components/demo/DemoHub.tsx), so the
  // email and the page they land on can never disagree. Do not add one back.
  if (!pieces.length) return null;
  const onlyVoice = pieces.length === 1 && Boolean(suite.voiceUrl);
  const onlySite = pieces.length === 1 && Boolean(suite.siteUrl);

  const list = pieces
    .map(
      (piece) => `
      <tr><td style="padding:0 0 10px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #161616;border-radius:14px;background:#ffffff">
          <tr><td style="padding:15px 18px">
            <p style="margin:0 0 3px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#8a6a1f">${escape(piece.label)}</p>
            <p style="margin:0 0 9px;font-size:14px;color:#5a564f;line-height:1.6">${piece.blurb}</p>
            <a href="${escape(piece.url)}" style="font-size:14px;font-weight:bold;color:#161616;text-decoration:none">Open it &rarr;</a>
          </td></tr>
        </table>
      </td></tr>`,
    )
    .join('');

  // The video line is only ever written when a video genuinely exists. A
  // promise of a walkthrough that is not there is the one thing that would
  // make this email worse than silence.
  const videoLine = suite.personalVideo
    ? p(
        `There is a short video of me at the top of that page walking you through what I built and why. Watch that first and the rest will make sense.`,
      )
    : suite.film
      ? p(
          `There is a two minute walkthrough at the top of that page: your site and a live call to your receptionist, recorded off the real thing.`,
        )
      : '';

  const html =
    clientEmail({
      // The preheader is the first line they read in the inbox list, before the
      // subject has even earned a click, so it names the same pieces the body
      // does and nothing more. It promised a back office to everybody once; the
      // back office is not part of this offer at all now.
      preheader:
        pieces.length === 2
          ? `Your website and your receptionist are live. Nothing to sign up for.`
          : onlySite
            ? `Your website is live. Nothing to sign up for.`
            : `Your receptionist is live. Nothing to sign up for.`,
      eyebrow: 'IT IS BUILT',
      greeting,
      body:
        p(`I built it.`) +
        p(
          pieces.length === 2
            ? `${escape(business)} now has a website and an AI receptionist answering the phone on it. Both are live right now. Nothing to sign up for, no card, no call with me first.`
            : `It is live right now. Nothing to sign up for, no card, no call with me first.`,
        ) +
        videoLine +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 6px">${list}</table>` +
        p(`Break it if you can. That is genuinely the best thing you could do with it today.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0"><tr>
          <td style="border:2px solid #161616;border-radius:14px;padding:16px 18px;background:#FBF6EA">
            <p style="margin:0;font-size:15px;color:#161616"><strong>If you want the receptionist on your real incoming calls</strong></p>
            <p style="margin:6px 0 0;font-size:14px;color:#5a564f;line-height:1.6">${escape(args.offerLine)}. Month to month, cancel anytime. Your number and your phones stay exactly as they are, and we install it by hand inside a week.</p>
            <p style="margin:10px 0 0"><a href="${escape(args.checkoutUrl)}" style="font-size:14px;font-weight:bold;color:#8a6a1f;text-decoration:none">Put it on ${escape(possessive(business))} real calls &rarr;</a></p>
          </td>
        </tr></table>` +
        p(
          `Or if you would rather talk to a person about it, <a href="${escape(args.calendarUrl)}" style="color:#C2261A;font-weight:700;text-decoration:none">grab time with me</a>. If the answer is no, replying with the word no is a complete answer and I will stop.`,
        ),
      cta: { label: 'Open everything', url: suite.hubUrl },
      signature: args.fromMustard ? 'Mr. Mustard' : 'Sarah',
      trackId: lead.id,
    }) + complianceFooter(lead.email);

  return {
    to: lead.email,
    from: `${args.fromName} <${args.fromEmail}>`,
    replyTo: args.replyTo,
    // NOT escaped: a subject line is plain text, so an entity here would ship
    // literally and turn Bob's Heating into Bob&#39;s Heating in the inbox.
    // It also names only what is inside: a subject promising a website to
    // somebody who is getting a receptionist is the first broken promise they
    // read, and it is the one they judge everything else by.
    subject: onlyVoice
      ? `I built ${business} a receptionist`
      : onlySite
        ? `I built ${business} a website`
        : `I built ${business} a website and a receptionist`,
    html,
    unsubscribeUrl: unsubscribeUrlFor(lead.email),
    summary: `Sent the full forged suite: ${pieces.map((x) => x.label.toLowerCase()).join(', ')}.`,
    step: 0,
    variantKey: 'suite',
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
  // Never /mustard from an email (Sarah, 2026-08-25). The demo page is where
  // the build is asked for, so it is the fallback when no demo exists yet.
  const demo = args.demoUrl || `${SITE.url}/demos?source=followup&p=${encodeURIComponent(lead.id)}`;

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
