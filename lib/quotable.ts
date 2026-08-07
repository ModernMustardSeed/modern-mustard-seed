import { DEMO_PRODUCTS, DEMO_BUNDLE } from '@/lib/demo-order';

/**
 * WHAT AN AGENT IS ALLOWED TO QUOTE, AND WHAT IT MUST HAND TO SARAH.
 *
 * Sarah 2026-08-07, setting the boundary for the auto-sent scope doc:
 * *"give pricing for all public facing pricing. super custom builds or software
 * is priced by me only, dont send those pricing docs, just make available for
 * public stuff and the websites, command centers and voice agents and like
 * chief or other programs we have like mustard mode."*
 *
 * So there are two worlds and the line between them is bright:
 *
 *   CATALOG   A productized thing with a price already published on the site.
 *             The agent may say the number out loud and email the document.
 *             Nothing is being decided; it is reading a price list.
 *
 *   CUSTOM    Bespoke software, apps, integrations, anything scoped to one
 *             business. Sarah prices these HERSELF. The agent must not quote a
 *             number, must not guess a range, and must not send a pricing doc.
 *             It captures the requirement and books her.
 *
 * ⚠️ WHY THE DEFAULT IS "CUSTOM". A wrong catalog price is embarrassing. A
 * wrong custom price is a number a stranger now believes, in writing, that
 * Sarah has to either honour or walk back. When the classifier is unsure it
 * MUST fall to custom: silence costs a follow-up, a bad quote costs the job.
 *
 * ⚠️ AND NOT ONE PRICE IS TYPED IN THIS FILE. Every figure is derived from the
 * module that already owns it (memory: mms-price-single-source). A price typed
 * twice is a price that will be wrong in one of the two places.
 */

export type QuotableProduct = {
  key: string;
  name: string;
  setupCents: number;
  monthlyCents: number;
  /** Where the same number is published, so the doc can cite itself. */
  page: string;
};

/**
 * The catalog. Everything here has its price on a public page already, which is
 * exactly the test for whether an agent may state it unsupervised.
 *
 * Adding a row is a pricing decision: only add a product whose price is BOTH
 * published and owned by a single module we can import from.
 */
export const QUOTABLE: QuotableProduct[] = [
  { ...DEMO_PRODUCTS.site, page: '/websites' },
  { ...DEMO_PRODUCTS.voice, page: '/voice-agents' },
  { ...DEMO_PRODUCTS.os, page: '/command-center' },
  { ...DEMO_BUNDLE, page: '/talking-website' },
];

/**
 * Programs priced on their own pages. Kept as pointers rather than numbers: the
 * agent sends the visitor to the page that owns the price instead of restating
 * it, so these can never drift.
 */
export const QUOTABLE_PROGRAMS = [
  { name: 'Mustard Mode', page: '/mustard-mode' },
  { name: 'The Chief', page: '/chief' },
  { name: 'Mustard Pictures', page: '/pictures' },
  { name: 'Mustard Broadcast', page: '/ads' },
  // Mustard Press parked 2026-08-07 (Sarah). Unlisted everywhere, so the agent
  // never points a visitor at it. See the note in Navbar.tsx.
  { name: 'Switchboard', page: '/switchboard' },
] as const;

/**
 * Language that means "this is a build, not a purchase".
 *
 * Deliberately broad. Over-matching sends a catalog buyer to a human, which
 * costs one conversation. Under-matching lets an agent price a six-week
 * software project on a phone call.
 */
const CUSTOM_SIGNALS =
  /\b(custom|bespoke|from scratch|integrat\w*|api|saas|platform|marketplace|dashboard for|internal tool|mobile app|ios|android|native app|migrat\w*|rebuild|re-?architect|crm|erp|inventory|booking system|portal|automation|workflow|scrape|sync|database|ai agent for|multi-?tenant|enterprise|white ?label|reseller)\b/i;

/** Language that means "one of the things on the price list". */
const CATALOG_SIGNALS =
  /\b(website|web site|site|voice agent|receptionist|answering|command center|command centre|talking website|mustard mode|the chief|press|broadcast|switchboard|pictures)\b/i;

export type PricingVerdict = {
  /** May the agent state a number and email a priced document? */
  mayQuote: boolean;
  /** Why, in words the agent can act on. */
  reason: 'catalog' | 'custom' | 'unclear';
};

/**
 * Decide whether what they described can be priced without Sarah.
 *
 * Order matters: a request that sounds like BOTH ("a website with a custom
 * booking system wired to our CRM") is custom, because the custom half is the
 * part that carries the risk and the part she has to price.
 */
export function classifyRequest(need: string | null | undefined): PricingVerdict {
  const text = String(need || '').trim();
  if (!text) return { mayQuote: false, reason: 'unclear' };
  if (CUSTOM_SIGNALS.test(text)) return { mayQuote: false, reason: 'custom' };
  if (CATALOG_SIGNALS.test(text)) return { mayQuote: true, reason: 'catalog' };
  return { mayQuote: false, reason: 'unclear' };
}

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US')}`;

/** One product's public price, formatted for speech and for paper. */
export function priceLine(p: QuotableProduct): string {
  return p.monthlyCents
    ? `${p.name}: ${usd(p.setupCents)} to set up, then ${usd(p.monthlyCents)} a month.`
    : `${p.name}: ${usd(p.setupCents)}.`;
}

/**
 * The instruction an agent carries into a call. Not decoration: this is the
 * text that keeps a live voice on the right side of Sarah's line.
 */
export function pricingDirective(verdict: PricingVerdict): string {
  if (verdict.mayQuote) {
    return [
      'You MAY quote these published prices and email the scope document:',
      ...QUOTABLE.map((p) => `- ${priceLine(p)}`),
      `Programs with their own pages: ${QUOTABLE_PROGRAMS.map((p) => `${p.name} (${p.page})`).join(', ')}.`,
      'Say the numbers plainly. They are already on the website.',
    ].join('\n');
  }
  return [
    'DO NOT quote a price, a range, an estimate, or a "usually around". DO NOT email a pricing document.',
    'This sounds like custom work, and Sarah prices custom work herself, always.',
    'What to do instead: get the requirement in their own words, then book them with Sarah.',
    'Say it as a feature, because it is one: "Custom builds get priced by Sarah personally, not by me. Let me get you on her calendar."',
  ].join('\n');
}
