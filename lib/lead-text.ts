import { categoryLabel } from '@/lib/lead-script';
import type { Prospect } from '@/lib/prospects';

/**
 * Builds a personalized cold TEXT for one lead, the SMS sibling of
 * buildLeadScript (the call script). Same Cahill spine: identify yourself, a
 * pain hook tuned to what THAT type of business loses, one soft ask. Kept short
 * (aim for one or two segments), always names the sender + business (an A2P
 * requirement), and can append the STOP opt-out line for campaign sends.
 *
 * If the lead's site has been audited, the text leads with the real score + the
 * offer of the free breakdown, mirroring how the call script opens. Otherwise it
 * uses the missed-calls hook for the business type. Bodies are kept to plain
 * ASCII so they encode as cheap single-segment GSM-7 rather than UCS-2.
 */

const SHORT_HOOKS: { test: RegExp; hook: string }[] = [
  { test: /restaurant|cafe|coffee|\bbar\b|pub|food|pizza|grill|diner|eatery|brew|kitchen|bistro|taqueria|cantina/, hook: 'takeout and reservation calls slip during the rush' },
  { test: /salon|spa|beauty|nail|barber|hair|lash|wax|massage|aesthetic|brow/, hook: "calls go to voicemail while you're with a client and book elsewhere" },
  { test: /auto|tyre|tire|mechanic|body shop|car wash|\bcar\b|motor|collision/, hook: 'a missed call is a job that books down the street' },
  { test: /dentist|dental|orthodont/, hook: "patients calling to book can't get through" },
  { test: /clinic|doctor|medical|\bhealth|chiro|physical therapy|therapy|urgent care|wellness|pharmac/, hook: 'patients calling to book slip to voicemail' },
  { test: /\bvet/, hook: 'pet owners calling to book go to voicemail' },
  { test: /gym|fitness|pilates|yoga|crossfit|martial|cycle/, hook: 'membership calls go to voicemail and cool off' },
  { test: /real estate|realt|broker/, hook: 'buyers calling you slip to voicemail and move on' },
  { test: /\blaw\b|attorney|legal/, hook: 'new clients calling slip to voicemail and try the next firm' },
  { test: /insurance/, hook: 'quote calls go to voicemail and get one elsewhere' },
  { test: /account|financ|\btax\b|bookkeep/, hook: "busy-season calls can't get through" },
  { test: /trade|plumb|hvac|heating|electric|roof|paint|carpent|contractor|handyman|construction|flooring|window|garage|locksmith|landscap|fenc|concrete/, hook: 'the caller does not leave a message, they just call the next one' },
  { test: /laundry|clean|dry clean/, hook: 'pickup and service calls go to voicemail' },
];
const GENERIC_HOOK = 'calls slip to voicemail and you lose business you never knew called';

function shortHookFor(label: string): string {
  const l = label.toLowerCase();
  for (const h of SHORT_HOOKS) if (h.test.test(l)) return h.hook;
  return GENERIC_HOOK;
}

function firstName(name: string): string {
  return (name || '').split(' ')[0] || 'there';
}

function hostname(website: string | null): string {
  if (!website) return '';
  try { return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.replace(/^www\./, ''); }
  catch { return website; }
}

export type LeadText = {
  /** The message body, ready to send. */
  body: string;
  /** Rough SMS segment count, for the composer to warn on long texts. */
  segments: number;
  /** Which template produced it, for reporting. */
  kind: 'audit' | 'missed-calls';
};

export function smsSegments(body: string): number {
  const len = [...body].length;
  // Any non-ASCII char forces UCS-2 (70/67 per segment vs GSM-7 160/153).
  const unicode = /[^\x00-\x7F]/.test(body);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return len <= single ? 1 : Math.ceil(len / multi);
}

export function buildLeadText(
  p: Pick<Prospect, 'business' | 'city' | 'notes' | 'website' | 'audit_json' | 'audit_score'>,
  repName: string,
  bookUrl: string,
  opts: { includeOptOut?: boolean } = {}
): LeadText {
  const first = firstName(repName);
  const biz = p.business;
  const city = p.city || 'town';
  const domain = hostname(p.website);
  const optOut = opts.includeOptOut ? ' Reply STOP to opt out.' : '';

  let body: string;
  let kind: LeadText['kind'];

  if (p.audit_json && p.audit_score != null) {
    kind = 'audit';
    body =
      `Hi ${biz}, it's ${first} at Modern Mustard Seed. ` +
      `I ran a quick check on ${domain || 'your site'} and it scored ${p.audit_score}/100. ` +
      `A couple of fixes would likely bring in more calls. ` +
      `Want the free breakdown? I can text or email it over.${optOut}`;
  } else {
    kind = 'missed-calls';
    const hook = shortHookFor(categoryLabel(p.notes));
    body =
      `Hi, is this ${biz}? It's ${first} with Modern Mustard Seed here in ${city}. ` +
      `Quick one: when you're slammed, ${hook}. ` +
      `We set up an AI that answers and books 24/7 in a real voice. ` +
      `Worth a quick demo? ${bookUrl}${optOut}`;
  }

  return { body, segments: smsSegments(body), kind };
}
