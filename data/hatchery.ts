/**
 * MUSTARD HATCHERY — the mascot-birth offer, single source of truth.
 *
 * The Hatchery births a small business its OFFICIAL MASCOT: a name, a
 * Character Storybook, a model sheet, a hatching film, a hand-numbered Birth
 * Certificate, and the mascot's own phone line, unveiled on a public Birth Day.
 *
 * Evergreen, flat pricing: $497 to hatch a mascot, one time, always. No cohort,
 * no seat cap, no countdown, no price that climbs later. You approve the
 * direction before any art is made, so the risk stays on us.
 *
 * Framing rule: this is "the official mascot of your business," never a claim
 * that an AI has a soul. Huck says he is an AI mascot, cheerfully.
 */

export const HATCHERY = {
  wordmark: 'The Mustard Hatchery',
  by: 'by Modern Mustard Seed',
  metaTitle: 'The Mustard Hatchery — your business gets its own mascot, born on a Birth Day',
  metaDescription:
    'Modern Mustard Seed births your business its official mascot: a name, a story, a face, a voice, and their own phone number, unveiled on a public Birth Day. $497, one time.',
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

/** Flat, evergreen price to hatch a mascot. One time. It does not climb. */
export const HATCH = {
  priceUsd: 497,
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
 * The hatch itself, plus the two "keep them alive" care plans offered AFTER
 * the Birth Day. Only The Hatch is sold up front; the care plans are shown so
 * buyers see the full arc (and never a dead line: a lapse hibernates
 * gracefully, it does not delete what was delivered).
 */
export const hatcheryTiers: HatcheryTier[] = [
  {
    slug: 'hatchery-hatch',
    name: 'The Hatch',
    priceUsd: HATCH.priceUsd,
    cadence: 'once',
    mode: 'payment',
    tagline: 'Your business’s official mascot, fully hatched and unveiled on a public Birth Day.',
    includes: [
      'A name and a full Character Storybook (their origin, their voice, how they say hello)',
      'A canonical model sheet: four poses, drawn in one hand',
      'A hatching film, from first wobble to the spill of gold light',
      'A hand-numbered Birth Certificate for your wall',
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
    q: 'How much is it, and is that all?',
    a: `${'$'}${HATCH.priceUsd} to hatch your mascot, one time. That is the whole price and it does not climb. You approve the direction before any art is made, so nothing is drawn until you love it. If you later want your mascot to keep drawing, filming, and answering, two optional monthly plans keep them going, and you can stop anytime.`,
  },
  {
    q: 'What do I actually get, and when?',
    a: 'A name and Character Storybook, a model sheet, a hatching film, a hand-numbered Birth Certificate, and your mascot’s own live phone line. Once you claim your hatch, you approve the direction first, then your Birth Day is scheduled and everything is delivered around it.',
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
