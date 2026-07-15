/**
 * MUSTARD HATCHERY — the mascot-birth offer, single source of truth.
 *
 * The Hatchery births a small business its OFFICIAL MASCOT: a name, a
 * Character Bible, a model sheet, a hatching film, a hand-numbered Birth
 * Certificate, and the mascot's own phone line, unveiled on a public Birth Day.
 *
 * Launch shape is PRESALE-FIRST (ignite-or-refund): five Founding Eggs at $497
 * (reg $797). If fewer than three are claimed by the close date, every founding
 * payment is refunded in full and no build spend is committed. This file holds
 * the copy, the economics, and Huck's live-line ids used by the /hatchery page.
 *
 * Framing rule: this is "the official mascot of your business," never a claim
 * that an AI has a soul. Huck says he is an AI mascot, cheerfully.
 */

export const HATCHERY = {
  wordmark: 'The Mustard Hatchery',
  by: 'by Modern Mustard Seed',
  metaTitle: 'The Mustard Hatchery — your business gets its own mascot, born on a Birth Day',
  metaDescription:
    'Modern Mustard Seed births your business its official mascot: a name, a story, a face, a voice, and their own phone number, unveiled on a public Birth Day. Five Founding Eggs, $497 each.',
  promise:
    'Your shop has a name, a menu, and a phone number. Now it gets a someone. We write their story, draw their face, give them a voice, and throw them a birthday in front of everyone you know.',
  // The candlelight, ceremony-first voice line.
  statement:
    'A storybook heirloom hatchery: the official mascot of your business, born by candlelight, with a phone number the whole town can call.',
} as const;

/** Huck, the pilot birth. His live line + in-browser voice both point here. */
export const HUCK = {
  name: 'Huck',
  business: 'The Huckleberry Scoop',
  city: 'Kalispell, Montana',
  assistantId: 'aad65761-8a06-4288-a5bd-d055360ea8f4',
  phone: '(406) 747-0139',
  phoneHref: 'tel:+14067470139',
  revealPath: '/hatchery/huck',
} as const;

/**
 * Founding 5 presale economics. Seats are capped atomically at CAP (see
 * lib/hatchery-store.ts); the checkout fails CLOSED at the cap so we never
 * oversell a hand-made birth.
 */
export const FOUNDING = {
  cap: 5,
  priceUsd: 497,
  regularUsd: 797,
  // Ignite-or-refund: below this many paid seats by the close, refund all.
  igniteFloor: 3,
  // Founding Eggs close (day 10 of the presale, midnight Mountain Time).
  closesAt: '2026-07-25T06:00:00Z',
  closesLabel: 'July 24, midnight Mountain Time',
} as const;

export type HatcheryTier = {
  slug: string;
  name: string;
  priceUsd: number;
  cadence: 'once' | 'monthly';
  mode: 'payment' | 'subscription';
  tagline: string;
  includes: string[];
};

/**
 * The founding purchase, plus the two "keep them alive" care plans offered
 * AFTER the Birth Day. Only the Founding Egg is sold on the presale page; the
 * care plans are shown so buyers see the full arc (and never a dead line: a
 * lapse hibernates gracefully, it does not delete what was delivered).
 */
export const hatcheryTiers: HatcheryTier[] = [
  {
    slug: 'hatchery-founding-egg',
    name: 'Founding Egg',
    priceUsd: FOUNDING.priceUsd,
    cadence: 'once',
    mode: 'payment',
    tagline: 'One of five. Your mascot, fully hatched, unveiled on a public Birth Day.',
    includes: [
      'A name and a full Character Bible (their origin, their voice, how they say hello)',
      'A canonical model sheet: four poses, drawn in one hand',
      'A hatching film, from first wobble to the spill of gold light',
      'A hand-numbered Birth Certificate, No. 001 through 005',
      'Their own phone line, answering as your mascot, day and night',
      'A scheduled, public Birth Day: the egg cracks live for everyone you know',
    ],
  },
  {
    slug: 'hatchery-heartbeat',
    name: 'Heartbeat',
    priceUsd: 49,
    cadence: 'monthly',
    mode: 'subscription',
    tagline: 'Keep them drawing. A fresh piece of art every month, in their exact hand.',
    includes: [
      'One new illustration a month (seasonal, holiday, or your call)',
      'Their model sheet stays canon across everything new',
      'Cancel anytime; they hibernate, they never disappear',
    ],
  },
  {
    slug: 'hatchery-spotlight',
    name: 'Spotlight',
    priceUsd: 149,
    cadence: 'monthly',
    mode: 'subscription',
    tagline: 'Art, a monthly short film, and the phone line stays lit.',
    includes: [
      'Everything in Heartbeat',
      'One short mascot film a month for your socials',
      'The phone line stays live so the whole town can still call',
    ],
  },
];

export function getHatcheryTier(slug: string): HatcheryTier | undefined {
  return hatcheryTiers.find((t) => t.slug === slug);
}

export const hatcheryFaq: { q: string; a: string }[] = [
  {
    q: 'Is the mascot an AI?',
    a: 'Yes, and it says so. Your mascot answers a real phone and talks like a character with a story, but it will happily tell any caller that it is an AI. We never pretend otherwise. It is the official mascot of your business, not a person.',
  },
  {
    q: 'What is a Birth Day?',
    a: 'A scheduled, public unveiling. We set a date, share a countdown, and at zero the egg cracks live: the film plays, the character is revealed, and the very first thing it does is answer its own phone. It is a marketing moment the whole town can watch, built to flood your inner circle at once.',
  },
  {
    q: 'Why only five, and why the refund promise?',
    a: `Each birth is hand-made, so we open just five Founding Eggs at ${'$'}${FOUNDING.priceUsd} instead of the ${'$'}${FOUNDING.regularUsd} price. If fewer than ${FOUNDING.igniteFloor} are claimed by ${FOUNDING.closesLabel}, every founding payment is refunded in full, automatically. You risk nothing to be first.`,
  },
  {
    q: 'What do I actually get, and when?',
    a: 'A name and Character Bible, a model sheet, a hatching film, a hand-numbered Birth Certificate, and your mascot’s own live phone line. Once the Founding Eggs ignite, you approve the direction before any art is made, then your Birth Day is scheduled and everything is delivered around it.',
  },
  {
    q: 'What happens if I stop the monthly plan later?',
    a: 'Nothing you own disappears. The line hibernates gracefully, you keep every file, film, and certificate delivered, and we give 30 days’ notice with a keepsake drop before any line goes quiet. It is a hibernation, never a dead number.',
  },
  {
    q: 'Can my mascot become the voice of my whole phone system?',
    a: 'Yes. That is the real upgrade. Your born character can become the voice of a full AI receptionist that answers, qualifies, and books for your business around the clock. The Birth Day is the beginning, not the end.',
  },
];
