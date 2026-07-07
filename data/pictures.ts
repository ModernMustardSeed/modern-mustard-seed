/**
 * MUSTARD PICTURES. Mr. Mustard, director. The second mascot-first flagship
 * (judge-panel runner-up at 29/30, promoted to its own offer 2026-07-07).
 *
 * Free SCREEN TEST: Mr. Mustard writes a personalized 6-shot storyboard for
 * the visitor's business on the spot (Claude) and paints one cinematic hero
 * frame of their commercial (fal nano-banana, with a graceful "darkroom"
 * fallback when generation is down). ROLL FILM converts it into a finished
 * commercial through the exact pipeline that shipped Night Shift, Call Me,
 * MUSTARD MODE, and The Graduate.
 *
 * Stripe price ids come from env, never code:
 *   STRIPE_PRICE_PICTURES_SPOT      ($197 one-time)
 *   STRIPE_PRICE_PICTURES_PREMIERE  ($497 one-time)
 *   STRIPE_PRICE_PICTURES_SEASON    ($197/mo subscription)
 */

export const PICTURES = {
  name: 'MUSTARD PICTURES',
  wordmark: '[ A MUSTARD PICTURES PRODUCTION ]',
  tagline: 'Your business. His camera. One commercial.',
  promise:
    'Tell Mr. Mustard about your business and he directs your commercial on the spot: a full storyboard, your tagline options, and one cinematic frame of the film. Free. If you love it, roll film and the finished spot is yours within days.',
  metaTitle: 'MUSTARD PICTURES. A Commercial for Your Business, Directed by AI',
  metaDescription:
    'Get a free Screen Test: Mr. Mustard storyboards a cinematic commercial for YOUR business in 60 seconds, tagline included. Love it? The finished spot ships within days, from $197. By Modern Mustard Seed, the studio behind The Graduate and Night Shift.',
  deliveryPromiseSpot: 'delivered within 2 business days',
  deliveryPromisePremiere: 'delivered within 3 business days',
} as const;

export type PicturesVertical = {
  id: string;
  label: string;
  /** Set-dressing hint for the hero frame prompt. */
  set: string;
};

export const picturesVerticals: PicturesVertical[] = [
  { id: 'home-services', label: 'Home services (plumbing, HVAC, electrical, landscaping)', set: 'a cozy workshop full of tools, a work van glowing at dusk' },
  { id: 'restaurant', label: 'Restaurant, cafe, or food truck', set: 'a warm diner counter with steam rising and neon glow' },
  { id: 'beauty', label: 'Salon, spa, or beauty studio', set: 'an elegant salon chair under warm vanity lights' },
  { id: 'fitness', label: 'Gym, fitness, or yoga studio', set: 'a sunrise gym floor with chalk dust in the light beams' },
  { id: 'retail', label: 'Retail shop or boutique', set: 'a charming storefront window glowing at blue hour' },
  { id: 'professional', label: 'Professional services (law, accounting, real estate, insurance)', set: 'a handsome desk with warm lamplight and city bokeh' },
  { id: 'health', label: 'Clinic, dental, or wellness', set: 'a bright welcoming reception with soft morning light' },
  { id: 'other', label: 'Something else entirely', set: 'a small-business counter bathed in golden hour light' },
];

export function getPicturesVertical(id: string): PicturesVertical {
  return picturesVerticals.find((v) => v.id === id) || picturesVerticals[picturesVerticals.length - 1];
}

export type PicturesTier = {
  slug: 'pictures-spot' | 'pictures-premiere' | 'pictures-season';
  name: string;
  chip: string;
  priceUsd: number;
  cadence: 'once' | 'monthly';
  stripePriceEnv: string;
  mode: 'payment' | 'subscription';
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

export const picturesTiers: PicturesTier[] = [
  {
    slug: 'pictures-spot',
    name: 'THE SPOT',
    chip: '[ 30 SECONDS ]',
    priceUsd: 197,
    cadence: 'once',
    stripePriceEnv: 'STRIPE_PRICE_PICTURES_SPOT',
    mode: 'payment',
    pitch: 'Your storyboard becomes a finished cinematic commercial.',
    includes: [
      'A ~30 second commercial built from your Screen Test',
      'Your business, your colors, your story (no stock footage, ever)',
      'Three cuts: widescreen, vertical Reels, and square feed',
      'Styled captions burned in (most feeds watch on mute)',
      'Original score, end card with your name and offer',
      `Hand-reviewed and ${PICTURES.deliveryPromiseSpot}`,
    ],
    cta: 'Roll film',
  },
  {
    slug: 'pictures-premiere',
    name: 'THE PREMIERE',
    chip: '[ HE SPEAKS ]',
    priceUsd: 497,
    cadence: 'once',
    stripePriceEnv: 'STRIPE_PRICE_PICTURES_PREMIERE',
    mode: 'payment',
    pitch: 'The talking picture. A voiced spot plus everything you need to run it.',
    includes: [
      'Everything in THE SPOT',
      'A voiced, lip-synced lead character (the talkies have arrived)',
      'A poster frame for thumbnails and print',
      'The Launch Kit: ready-to-paste ad copy, audience settings, and a $10/day launch checklist',
      'One revision pass included',
      `Priority production, ${PICTURES.deliveryPromisePremiere}`,
    ],
    cta: 'Roll film, with sound',
    featured: true,
  },
  {
    slug: 'pictures-season',
    name: 'SEASON PASS',
    chip: '[ ALWAYS FRESH ]',
    priceUsd: 197,
    cadence: 'monthly',
    stripePriceEnv: 'STRIPE_PRICE_PICTURES_SEASON',
    mode: 'subscription',
    pitch: 'A brand-new spot every month, so your ads never go stale.',
    includes: [
      'One new SPOT-tier commercial every month',
      'Seasonal angles: holidays, promotions, weather, local moments',
      'Your ad library grows 12 spots a year',
      'Fresh creative is the #1 fix for rising ad costs',
      'Month to month, cancel anytime. One spot per month, no rollover.',
    ],
    cta: 'Start my season',
  },
];

export function getPicturesTier(slug: string): PicturesTier | undefined {
  return picturesTiers.find((t) => t.slug === slug);
}

export const picturesFaq = [
  {
    q: 'What exactly do I get in the free Screen Test?',
    a: 'A director’s treatment written for your business on the spot: the logline, a six-shot storyboard, and three tagline options, plus one cinematic hero frame of your commercial painted while you watch. It is genuinely useful even if you never buy: most owners have never seen their business through a director’s eyes.',
  },
  {
    q: 'Is this stock footage with my logo slapped on?',
    a: 'No. Every frame is generated for your business from your storyboard: your trade, your vibe, your town. It is the same pipeline that produced our own commercials, which you can watch right on this page.',
  },
  {
    q: 'How fast do I get my commercial?',
    a: 'THE SPOT lands within 2 business days, THE PREMIERE within 3. Every spot is hand-reviewed by Sarah before delivery, which is why it is days and not minutes.',
  },
  {
    q: 'What if I want changes?',
    a: 'THE PREMIERE includes a revision pass. On THE SPOT, small text and end-card fixes are always free; bigger reshoots are quoted honestly (usually under $50, it is our pipeline after all).',
  },
  {
    q: 'Can Mr. Mustard be IN my commercial?',
    a: 'He is the director, and he takes a cameo when the story calls for it. If you want him co-starring, say so in the intake notes. He does not charge extra. He works for exposure.',
  },
  {
    q: 'What do I actually own?',
    a: 'The delivered files are yours to run anywhere, forever: Meta, YouTube, your website, the TV in your lobby. Full commercial usage rights included.',
  },
  {
    q: 'Why is this so much cheaper than an agency?',
    a: 'An agency shoot runs $1,500 to $10,000 because cameras, crews, and edit suites are expensive. Our studio is an AI pipeline we built and use for our own brand, so you pay for direction, taste, and hand review, not for equipment rental.',
  },
] as const;

/** The on-page production log while the Screen Test renders. {business} substituted client-side. */
export const screenTestScript = [
  '[ MUSTARD PICTURES PRESENTS ]',
  '> reading everything you just told him...',
  '> scouting locations around {business}...',
  '> the beret goes on. the megaphone comes up.',
  '> blocking six shots. arguing with himself about shot three. winning.',
  '> auditioning taglines. two fired, three kept.',
  '> lighting your hero frame...',
  '[ QUIET ON SET ]',
] as const;
