/**
 * MUSTARD PRESS. The print shop department of the Mustard studio (third
 * flagship; judge-panel winner at 47, kill spike passed 2026-07-07).
 *
 * Free wow: paste your price list and Mr. Mustard typesets a print-ready
 * page before your eyes (THE PRESS RUN), delivered as a watermarked PROOF.
 * Paid: THE PIECE $97 (instant, self-serve, clean print-ready PDF), THE KIT
 * $297 (a matching set, hand-assembled), THE HAND PRESS $497 (Sarah's hands,
 * five slots a week, hard-capped).
 *
 * Stripe price ids come from env, never code:
 *   STRIPE_PRICE_PRESS_PIECE      ($97 one-time)
 *   STRIPE_PRICE_PRESS_KIT       ($297 one-time)
 *   STRIPE_PRICE_PRESS_HANDPRESS ($497 one-time)
 */

export const PRESS = {
  name: 'MUSTARD PRESS',
  wordmark: '[ SET BY HAND AT MUSTARD PRESS ]',
  tagline: 'Your prices, typeset like they matter.',
  promise:
    'Paste your price list, menu, or rate sheet exactly as it is, typos and all. Mr. Mustard sets the type before your eyes and hands you a print-ready proof. Free. If you love it, the clean file is yours in one click.',
  metaTitle: 'MUSTARD PRESS. Your Menu or Price List, Beautifully Typeset in 60 Seconds',
  metaDescription:
    'Paste your price list and get a print-ready menu, rate sheet, or price card typeset on the spot, free watermarked proof included. The clean 300dpi file is $97, instant. By Modern Mustard Seed.',
  weeklyHandPressSlots: 5,
} as const;

export type PressTier = {
  slug: 'press-piece' | 'press-kit' | 'press-handpress';
  name: string;
  chip: string;
  priceUsd: number;
  stripePriceEnv: string;
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
  instant?: boolean;
};

export const pressTiers: PressTier[] = [
  {
    slug: 'press-piece',
    name: 'THE PIECE',
    chip: '[ INSTANT ]',
    priceUsd: 97,
    stripePriceEnv: 'STRIPE_PRICE_PRESS_PIECE',
    pitch: 'The proof you are looking at, clean and print-ready, right now.',
    includes: [
      'Your typeset page with the watermark lifted',
      'Print-ready PDF (US Letter, 300dpi-class vector type)',
      'Download the instant you pay, plus a copy by email',
      'Edit your items and prices on this page before you buy',
      'Re-download anytime from your email receipt link',
      'Print it anywhere: local shop, office printer, Vistaprint',
    ],
    cta: 'Lift the watermark',
    featured: true,
    instant: true,
  },
  {
    slug: 'press-kit',
    name: 'THE KIT',
    chip: '[ THE FULL SET ]',
    priceUsd: 297,
    stripePriceEnv: 'STRIPE_PRICE_PRESS_KIT',
    pitch: 'One matching system from the same type case: counter, wall, window, and pocket.',
    includes: [
      'Your PIECE, plus three companions set to match',
      'A flyer, a business card, and a window or yard piece',
      'One brand system: same type, same rules, same ink',
      'Assembled by hand and delivered within 2 business days',
      'One revision pass included',
    ],
    cta: 'Set the full kit',
  },
  {
    slug: 'press-handpress',
    name: 'THE HAND PRESS',
    chip: '[ FIVE SLOTS A WEEK ]',
    priceUsd: 497,
    stripePriceEnv: 'STRIPE_PRICE_PRESS_HANDPRESS',
    pitch: 'Sarah at the press: your collateral rethought by a human with taste, not just retype.',
    includes: [
      'Everything in THE KIT',
      'A working session on your offer: what to feature, what to cut, what to charge more for',
      'Two concept directions before the final set',
      'Print vendor handoff (sizes, bleeds, paper recommendations)',
      'Five slots a week. When they are gone, they are gone.',
    ],
    cta: 'Claim a slot',
  },
];

export function getPressTier(slug: string): PressTier | undefined {
  return pressTiers.find((t) => t.slug === slug);
}

export const pressFaq = [
  {
    q: 'What exactly is the free proof?',
    a: 'Your actual price list, parsed and typeset into a print-ready page design, shown on screen and downloadable as a watermarked PDF. Every price appears exactly as you wrote it. It is genuinely useful for seeing what your counter could look like, and it is yours to keep.',
  },
  {
    q: 'Will it get my prices right?',
    a: 'Yes, by design. Your prices are parsed into a table you can review and edit before anything is final; the type is set from that table, never retyped or rounded. If you can read it on the preview, that is exactly what prints.',
  },
  {
    q: 'What do I get for $97?',
    a: 'The exact page you approved with the watermark lifted: a clean US Letter PDF with crisp vector type, downloadable the moment you pay and emailed to you as a backup. Take it to any print shop or run it on the office printer.',
  },
  {
    q: 'Can I change things after I buy?',
    a: 'Edit your items on the page before you buy (that is the point of the review table). After purchase, THE PIECE includes your final file as-approved; changed your menu? Run a new proof anytime. THE KIT and THE HAND PRESS include a revision pass.',
  },
  {
    q: 'What kinds of businesses does this work for?',
    a: 'Anything with a list of prices: restaurant menus, salon and spa service lists, trade rate sheets (plumbing, HVAC, detailing), gym memberships, pet grooming, tattoo flash rates. If you can paste it, the press can set it.',
  },
  {
    q: 'Why is THE HAND PRESS capped at five slots?',
    a: 'Because it is Sarah personally rethinking your collateral, not a template pass. Five a week is what hand work allows. Sold out means sold out until Monday.',
  },
  {
    q: 'Do I own the files?',
    a: 'Completely. Print them, reprint them, hand them to your printer, put them on the wall. Full commercial rights, forever.',
  },
] as const;

/** The press-run log while the type is set. {business} substituted client-side. */
export const pressRunScript = [
  '[ MUSTARD PRESS · JOB NO. {job} ]',
  '> reading your list, exactly as written...',
  '> sorting sections. straightening prices. nothing invented, nothing rounded.',
  '> pulling type: Playfair for the name, a workhorse for the prices.',
  '> setting dot leaders. aligning every price to the right margin.',
  '> ink is mixed. goldenrod and true black.',
  '> one proof, coming off the press...',
  '[ HOT OFF THE PRESS ]',
] as const;
