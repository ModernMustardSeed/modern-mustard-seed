/**
 * MUSTARD MODE. The flagship Claude coaching experience.
 *
 * Mr. Mustard is the buyer's personal AI coach. The product is a gated coach
 * app (chat coach on the Claude API, a four-track curriculum, the prompt
 * library, the Builder vault, a progress HUD) sold as arcade levels.
 *
 * Stripe price ids come from env, never code:
 *   STRIPE_PRICE_MUSTARD_PLAYER   ($197 one-time)
 *   STRIPE_PRICE_MUSTARD_BUILDER  ($397 one-time)
 *   STRIPE_PRICE_MUSTARD_CABINET  ($97/mo subscription)
 */

export type MustardLevel = {
  level: 0 | 1 | 2 | 3;
  slug: 'mustard-mode-free' | 'mustard-mode' | 'mustard-mode-builder' | 'mustard-mode-cabinet';
  name: string;
  chip: string;
  priceUsd: number;
  cadence: 'once' | 'monthly' | 'free';
  stripePriceEnv: string | null;
  mode: 'payment' | 'subscription' | null;
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

export const MUSTARD = {
  name: 'MUSTARD MODE',
  wordmark: '[ MUSTARD MODE: ON ]',
  tagline: 'One seed. 100x the output.',
  promise:
    'A personal AI coach, a four-track curriculum, and the exact prompts to ship software, design, and ideas with nothing but your Claude subscription. Mr. Mustard trains you. Claude does the reps.',
  metaTitle: 'MUSTARD MODE. Learn Claude With Your Own AI Coach',
  metaDescription:
    'The coach-led way to master Claude and Claude Code. Mr. Mustard coaches you through four tracks (Code, Design, Cowork, Ideate) with a live AI coach, the prompt library, and a progress HUD. From Modern Mustard Seed.',
  guarantee:
    'Play the method for 14 days. If you do the missions and MUSTARD MODE does not change how much you ship, email Sarah for a full refund. No questions, handled by hand.',
  priceFraming:
    'Set it against one month of a developer, one bootcamp deposit, or one more year of not building. The whole method is less than a nice dinner out per track, once.',
} as const;

export const mustardLevels: MustardLevel[] = [
  {
    level: 0,
    slug: 'mustard-mode-free',
    name: 'Free Play',
    chip: '[ LEVEL 00 ]',
    priceUsd: 0,
    cadence: 'free',
    stripePriceEnv: null,
    mode: null,
    pitch: 'Your first coaching session starts on this page. One free credit, no card.',
    includes: ['One live coaching run with Mr. Mustard', 'The starter prompt sampler', 'Your run saved, waiting in the app if you level up'],
    cta: 'Play your free credit',
  },
  {
    level: 1,
    slug: 'mustard-mode',
    name: 'Player',
    chip: '[ LEVEL 01 ]',
    priceUsd: 197,
    cadence: 'once',
    stripePriceEnv: 'STRIPE_PRICE_MUSTARD_PLAYER',
    mode: 'payment',
    pitch: 'The full coach app. Learn the method, run the missions, ship.',
    includes: [
      'Mr. Mustard, your live AI coach (chat, on the Claude API)',
      'All 4 tracks: Code, Design, Cowork, Ideate (28 missions)',
      'The full prompt library (42 battle-ready prompts)',
      'Progress HUD: XP, streaks, milestones',
      'Lifetime access and free updates',
    ],
    cta: 'Start as Player',
  },
  {
    level: 2,
    slug: 'mustard-mode-builder',
    name: 'Builder',
    chip: '[ LEVEL 02 ]',
    priceUsd: 397,
    cadence: 'once',
    stripePriceEnv: 'STRIPE_PRICE_MUSTARD_BUILDER',
    mode: 'payment',
    pitch: 'Everything in Player, plus the vault and a real human review of what you ship.',
    includes: [
      'Everything in Player',
      'The Builder vault: 9 complete blueprints and templates',
      'Ship-off: submit your boss-mission build for a personal review from the studio',
      'Founding cohort badge on your HUD',
    ],
    cta: 'Start as Builder',
    featured: true,
  },
  {
    level: 3,
    slug: 'mustard-mode-cabinet',
    name: "Founders' Cabinet",
    chip: '[ LEVEL 03 ]',
    priceUsd: 97,
    cadence: 'monthly',
    stripePriceEnv: 'STRIPE_PRICE_MUSTARD_CABINET',
    mode: 'subscription',
    pitch: 'The inner circle. Build alongside Sarah, monthly, with everything included.',
    includes: [
      'Everything in Player and Builder, included while active',
      'Monthly live build-along with Sarah',
      'Every future drop and track, day one',
      'Priority coach lane',
    ],
    cta: 'Join the Cabinet',
  },
];

export const mustardFaq: { q: string; a: string }[] = [
  {
    q: 'Do I need to know how to code?',
    a: 'No. MUSTARD MODE assumes nothing but curiosity and a Claude subscription. The Code track takes you from your first Claude Code session to a live shipped app, and the other three tracks need zero code at all.',
  },
  {
    q: 'What do I need to play?',
    a: 'A Claude subscription (the regular one you may already have), a computer, and about 30 minutes per mission. Mr. Mustard handles the rest.',
  },
  {
    q: 'How is the coach different from just using Claude?',
    a: 'Mr. Mustard knows the method, your track, your mission, and what you said you want to build. Instead of a blank chat box, you get a coach who tells you the next rep, checks your work, and keeps score. The skill you build transfers to every Claude session you ever run.',
  },
  {
    q: 'How is this different from The Terminal?',
    a: 'The Terminal is our self-study engineering program (a deep playbook plus ops dashboard, $497). MUSTARD MODE is the coach-led experience: a live AI coach, four tracks beyond just code, missions, XP, and a prompt library. Many people run both. If you want a coach on your shoulder, start here.',
  },
  {
    q: 'How long does it take?',
    a: 'Each mission is 15 to 60 minutes. Most players finish their first track inside two weeks and ship their boss mission (a real, live artifact) by week three.',
  },
  {
    q: 'What exactly happens after I buy?',
    a: 'Checkout takes a minute. You get an access link by email, your HQ opens instantly, and if you played your free credit, your run is already loaded. Mission one starts immediately.',
  },
  {
    q: 'Refunds?',
    a: 'Yes. Play the method for 14 days. If you do the missions and it does not change how much you ship, email Sarah for a full refund. Handled by hand, no forms.',
  },
];

export function getMustardLevel(slug: string): MustardLevel | undefined {
  return mustardLevels.find((l) => l.slug === slug);
}
