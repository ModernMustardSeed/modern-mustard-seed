/**
 * MUSTARD LAUNCH. The flagship "launch your business for real" experience.
 *
 * Mr. Mustard is the buyer's personal launch coach. The free tool is THE
 * BLUEPRINT: type your idea, get an instant personalized launch plan (the free
 * lead magnet, built on the New Business Launch Checklist). The paid ladder:
 *   THE LAUNCH KIT   $197 one-time   your full launch package, generated
 *   THE LAUNCH ROOM  $97/mo          the live coached launch, mission by mission
 *
 * Stripe price ids come from env, never code:
 *   STRIPE_PRICE_LAUNCH_KIT   ($197 one-time)
 *   STRIPE_PRICE_LAUNCH_ROOM  ($97/mo subscription)
 */

export type LaunchTierRow = {
  slug: 'launch-blueprint' | 'mustard-launch-kit' | 'mustard-launch-room';
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

export const LAUNCH = {
  name: 'MUSTARD LAUNCH',
  wordmark: '[ CLEARED FOR IGNITION ]',
  tagline: 'Launch for real. Not someday. This week.',
  promise:
    'Tell Mr. Mustard what you are starting. He builds your whole launch (brand, offer, money, presence, first customers) and counts you down to open. The free Blueprint is your plan. The Kit is the whole package, generated. The Room is the coach who launches it with you.',
  metaTitle: 'MUSTARD LAUNCH. Your AI Launch Coach, From Idea to Open',
  metaDescription:
    'Launch your business for real with Mr. Mustard as your AI launch coach. Type your idea, get an instant personalized launch plan free, then generate your whole launch package and get coached mission by mission to Launch Day. From Modern Mustard Seed.',
  guarantee:
    'Work the launch for 14 days. If Mr. Mustard does not move you closer to open than you were, email Sarah for a full refund. No forms, handled by hand.',
  priceFraming:
    'Set it against one logo designer, one consultant hour, or one more year of the idea sitting in your notes app. The whole launch is less than a nice dinner out.',
} as const;

export const launchTiers: LaunchTierRow[] = [
  {
    slug: 'launch-blueprint',
    name: 'The Blueprint',
    chip: '[ FREE ]',
    priceUsd: 0,
    cadence: 'free',
    stripePriceEnv: null,
    mode: null,
    pitch: 'Type your idea. Mr. Mustard builds your personalized launch plan on the spot.',
    includes: [
      'Your idea, turned into a real 6-phase launch plan',
      'Tailored to your exact business, not a generic checklist',
      'A branded PDF to keep and work through',
    ],
    cta: 'Ignite my launch',
  },
  {
    slug: 'mustard-launch-kit',
    name: 'The Launch Kit',
    chip: '[ ONE-TIME ]',
    priceUsd: 197,
    cadence: 'once',
    stripePriceEnv: 'STRIPE_PRICE_LAUNCH_KIT',
    mode: 'payment',
    pitch: 'Your whole launch package, generated and yours to keep. Everything you need to open, written.',
    includes: [
      'Three name and brand directions with the reasoning',
      'Your positioning and one-liner, written',
      'Your first offer and pricing, packaged',
      'The 30/60/90 plan with the copy done (bio, announcement, first email, pitch)',
      'The full mission map with progress tracking',
      'Export the whole kit as a branded PDF. Lifetime access.',
    ],
    cta: 'Get the Launch Kit',
    featured: true,
  },
  {
    slug: 'mustard-launch-room',
    name: 'The Launch Room',
    chip: '[ COACHED ]',
    priceUsd: 97,
    cadence: 'monthly',
    stripePriceEnv: 'STRIPE_PRICE_LAUNCH_ROOM',
    mode: 'subscription',
    pitch: 'Everything in the Kit, plus Mr. Mustard live, coaching you mission by mission to Launch Day.',
    includes: [
      'Everything in the Launch Kit, included while active',
      'Mr. Mustard live: your coach on chat, any hour',
      'Regenerate and expand any asset as your launch takes shape',
      'Mission-by-mission coaching all the way to open, then growth',
      'Every future launch playbook and drop, day one',
    ],
    cta: 'Open the Launch Room',
  },
];

export function getLaunchTierRow(slug: string): LaunchTierRow | undefined {
  return launchTiers.find((t) => t.slug === slug);
}

/**
 * The launch sequence. Six phases, framed as a countdown from T-05 to T-00
 * (ignition). Each carries the console "systems check" label used on the hero
 * and the coach missions inside the Room.
 */
export type LaunchPhase = {
  id: string;
  code: string;
  system: string;
  title: string;
  eyebrow: string;
  blurb: string;
};

export const LAUNCH_PHASES: LaunchPhase[] = [
  {
    id: 'brand',
    code: 'T-05',
    system: 'BRAND & NAME',
    title: 'Name it and make it look real',
    eyebrow: 'Phase 1',
    blurb: 'Lock the name, the one-liner, and a look that makes a one-person shop read like an established company.',
  },
  {
    id: 'offer',
    code: 'T-04',
    system: 'THE OFFER',
    title: 'Build the thing people pay for',
    eyebrow: 'Phase 2',
    blurb: 'Define exactly what you sell, how it is packaged, and the price that is both fair and profitable.',
  },
  {
    id: 'foundation',
    code: 'T-03',
    system: 'MONEY & LEGAL',
    title: 'Make it official and bankable',
    eyebrow: 'Phase 3',
    blurb: 'The structure, the EIN, the business account, and a clean way to get paid from day one.',
  },
  {
    id: 'presence',
    code: 'T-02',
    system: 'YOUR PRESENCE',
    title: 'Build your online home',
    eyebrow: 'Phase 4',
    blurb: 'A domain, a real site that converts, the profiles, and an SEO plus GEO foundation so you get found.',
  },
  {
    id: 'systems',
    code: 'T-01',
    system: 'SYSTEMS',
    title: 'Wire what runs it while you work',
    eyebrow: 'Phase 5',
    blurb: 'The CRM, booking, an AI agent on the front line, and the automations that answer and follow up.',
  },
  {
    id: 'launch',
    code: 'T-00',
    system: 'FIRST CUSTOMERS',
    title: 'Ignition: open and get your first ten',
    eyebrow: 'Phase 6',
    blurb: 'The announcement, the funnel, the lead magnet, and the moves that turn open day into booked, paying work.',
  },
];

export const launchFaq: { q: string; a: string }[] = [
  {
    q: 'What is Mustard Launch, exactly?',
    a: 'A launch coach in an app. You tell Mr. Mustard what you are starting and he builds your whole launch: the brand, the offer, the money and legal setup, your online presence, the systems, and the first-customer push. The free Blueprint gives you the plan. The Kit generates the whole package. The Room is the coach who works it with you to Launch Day.',
  },
  {
    q: 'Does this work for any kind of business?',
    a: 'Yes. A local service, a product or ecommerce brand, an app or software product, a creator business, a consultancy. Mr. Mustard reads your specific idea and tailors every phase to it. It is built on our New Business Launch Checklist, so the foundation is battle-tested across industries.',
  },
  {
    q: 'What do I actually get for free?',
    a: 'Type your idea and you get a real, personalized launch plan on the spot: your six launch phases with the specific moves for your business, your signature first move, and a branded PDF to keep. No credit card. It is genuinely useful on its own.',
  },
  {
    q: 'What is the difference between the Kit and the Room?',
    a: 'The Launch Kit ($197, one time) generates your entire launch package and it is yours to keep: three name directions, your positioning, your offer and pricing, and a 30/60/90 plan with the copy already written. The Launch Room ($97/mo) adds the live coach: Mr. Mustard on chat, regenerating and expanding assets as your launch takes shape, coaching you mission by mission until you are open.',
  },
  {
    q: 'Will you build the actual website and systems for me?',
    a: 'Mustard Launch coaches you to launch and generates everything you need to do it yourself. When you would rather have it built for you, Modern Mustard Seed does that too (sites, AI agents, the whole stack). The Room coach will tell you exactly when that is the smart move.',
  },
  {
    q: 'What happens right after I buy?',
    a: 'Checkout takes a minute. Your Launch Deck opens instantly, your free Blueprint is already loaded, and Mr. Mustard generates your Kit from your idea. If you joined the Room, the coach is live from the first message.',
  },
  {
    q: 'Refunds?',
    a: 'Yes. Work the launch for 14 days. If it does not move you closer to open than you were, email Sarah for a full refund. Handled by hand, no forms.',
  },
];
