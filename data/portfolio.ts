// The portfolio index behind /admin/portfolio ("My Projects"). One curated,
// human-written record per project: what it is, where it lives, whether it is
// live. Every url here was verified reachable (HTTP 200) on 2026-07-11.
// Edit this list as the studio grows; the page renders it automatically.

export type ProjectStatus = 'live' | 'building' | 'demo';

export type PortfolioLink = { label: string; url: string };

export type PortfolioItem = {
  name: string;
  /** Primary link. If `internal`, it is a route on this site; else an external URL. */
  url?: string;
  internal?: boolean;
  links?: PortfolioLink[];
  status: ProjectStatus;
  /** One or two plain sentences. No em dashes. */
  blurb: string;
  /** Client / person the project belongs to, when it is a build for someone. */
  owner?: string;
  tags?: string[];
};

export type PortfolioCategory = {
  key: string;
  title: string;
  kicker: string;
  items: PortfolioItem[];
};

export const PORTFOLIO: PortfolioCategory[] = [
  {
    key: 'ventures',
    title: 'Ventures',
    kicker: 'The businesses',
    items: [
      {
        name: 'Modern Mustard Seed',
        url: 'https://modernmustardseed.com',
        status: 'live',
        blurb: 'The AI studio itself. Marketing site, blog, case studies, the AI audit tool, and this entire command center.',
        tags: ['studio', 'flagship'],
      },
      {
        name: 'Cross + Covenant',
        url: 'https://crossandcovenant.co',
        status: 'live',
        blurb: 'Your faith apparel house. The Abound in Hope storefront where the collections actually sell.',
        tags: ['CXC', 'commerce', 'apparel'],
      },
      {
        name: 'Cross + Covenant Studio',
        url: 'https://cxc-studio-zeta.vercel.app',
        status: 'live',
        blurb: 'The operations OS behind CXC. Products, drops, devotionals, and the liturgy flywheel in one cockpit.',
        tags: ['CXC', 'ops'],
      },
      {
        name: 'Lago Society',
        url: 'https://lagosociety.com',
        status: 'live',
        blurb: "Wild Hope's boutique brand. The micro resort's presence on the lake.",
        tags: ['Wild Hope', 'hospitality'],
      },
      {
        name: 'HUCKWILD',
        url: 'https://huckwild.vercel.app',
        status: 'live',
        blurb: 'Wild Montana huckleberry drink mix as a Victorian naturalist folio. Ink-pour film hero, the Huckalope legend, scroll-driven ink staining, and a numbered Patch 001 waitlist.',
        tags: ['HUCKWILD', 'beverage', 'brand launch'],
      },
      {
        name: 'Wild Hope HQ',
        url: 'https://wildhopehq.com',
        status: 'live',
        blurb: 'The retreat village on Flathead Lake, told as a Book of Hours for wild horses. Night-to-dawn scroll, seventeen in-house oil plates, and the Offertory: write your wildest hope, watch it become a galloping horse of gold, and seal it in wax until arrival.',
        tags: ['Wild Hope', 'hospitality', 'flagship design'],
      },
    ],
  },
  {
    key: 'products',
    title: 'MMS Products',
    kicker: 'The money-making tools',
    items: [
      {
        name: 'Command Center',
        url: '/admin',
        internal: true,
        status: 'live',
        blurb: 'The brain of the studio. Pipeline, outbound, campaigns, builds, and delivery, all in one place. You are in it now.',
        tags: ['internal', 'ops'],
      },
      {
        name: 'Sidekick',
        url: '/sidekick',
        internal: true,
        status: 'live',
        blurb: 'Instant AI receptionist. A prospect hears it answer their own phone in one click, then subscribes.',
        tags: ['funnel', 'voice', 'subscription'],
      },
      {
        name: 'Mustard Pictures',
        url: '/pictures',
        internal: true,
        status: 'live',
        blurb: 'A free AI Screen Test that turns into a finished commercial. The top of the video funnel.',
        tags: ['funnel', 'video'],
      },
      {
        name: 'Mustard Press',
        url: '/press',
        internal: true,
        status: 'live',
        blurb: 'A free typeset proof that becomes a printed piece. The print arm of the studio.',
        tags: ['funnel', 'print'],
      },
      {
        name: 'Mustard Launch',
        url: '/mustard-launch',
        internal: true,
        status: 'live',
        blurb: 'AI launch coach. A free Blueprint that upsells the full launch Kit.',
        tags: ['funnel', 'coaching'],
      },
      {
        name: 'GEO Desk',
        url: '/website-audit',
        internal: true,
        status: 'live',
        blurb: 'A conversion audit that scores any site and sells the Fix Pack.',
        tags: ['funnel', 'audit'],
      },
      {
        name: 'Mustard Mode',
        url: '/mustard-mode',
        internal: true,
        links: [{ label: 'Episode 01', url: 'https://mustard-mode-ep01-watch.vercel.app' }],
        status: 'live',
        blurb: 'The flagship coaching show and membership. Player, Builder, and Cabinet tiers.',
        tags: ['coaching', 'show'],
      },
      {
        name: 'Prompt Playbook',
        url: '/prompt-playbook',
        internal: true,
        status: 'live',
        blurb: 'An AI-prompt lead magnet that captures emails at the top of the funnel.',
        tags: ['funnel', 'lead-magnet'],
      },
      {
        name: 'Launch Checklist',
        url: '/launch-checklist',
        internal: true,
        status: 'live',
        blurb: 'An interactive launch checklist lead magnet, a sibling to the Prompt Playbook.',
        tags: ['funnel', 'lead-magnet'],
      },
      {
        name: 'Studio Store',
        url: '/store',
        internal: true,
        status: 'live',
        blurb: 'The studio store. Playbooks and products for sale.',
        tags: ['commerce'],
      },
      {
        name: 'Mustard Seed Supply',
        url: 'https://mustard-seed-supply.vercel.app',
        status: 'live',
        blurb: 'Heirloom seeds and windowsill grow kits. A small commerce brand grown under the seed.',
        tags: ['commerce'],
      },
    ],
  },
  {
    key: 'clients',
    title: 'Client Builds',
    kicker: 'Sites you shipped for others',
    items: [
      {
        name: 'Parker Tidewater',
        url: 'https://parker-tidewater.vercel.app',
        owner: 'Easton Parker',
        status: 'live',
        blurb: "Easton Parker's Gulf Coast seafood wholesale brand, trucked up the middle of the country to the heartland.",
        tags: ['seafood', 'brand'],
      },
      {
        name: 'Fiat Lux Design',
        url: 'https://fiatluxdesign.co',
        status: 'live',
        blurb: 'A client design studio site with live Supabase billing wired in.',
        tags: ['design', 'billing'],
      },
      {
        name: 'Penco Command',
        url: 'https://penco-command.vercel.app',
        owner: 'Penco Power Products',
        status: 'live',
        blurb: 'The operations dashboard built for Penco Power Products.',
        tags: ['dashboard'],
      },
      {
        name: 'Bare Earth',
        url: 'https://bare-earth.vercel.app',
        owner: 'Evan Meany',
        status: 'live',
        blurb: "Evan Meany's landscaping brand and site.",
        tags: ['landscaping'],
      },
      {
        name: 'P & E Clothing',
        url: 'https://pe-clothing.vercel.app',
        status: 'live',
        blurb: 'A pro bono apparel brand build.',
        tags: ['apparel', 'pro-bono'],
      },
    ],
  },
  {
    key: 'concierge',
    title: 'Voice Concierge Demos',
    kicker: 'AI that answers the phone',
    items: [
      {
        name: "Newk's",
        url: 'https://newks-voice-concierge.vercel.app',
        status: 'demo',
        blurb: 'AI phone concierge demo for Newk\'s. Answers, books, and never misses a call.',
        tags: ['voice', 'restaurant'],
      },
      {
        name: 'Serabella Med Spa',
        url: 'https://serabella-medspa-concierge.vercel.app',
        status: 'demo',
        blurb: 'Med spa concierge demo with the Glow Plan intake built in.',
        tags: ['voice', 'medspa'],
      },
      {
        name: 'Just Botox',
        url: 'https://just-botox-voice-concierge.vercel.app',
        status: 'demo',
        blurb: 'A med spa voice concierge demo.',
        tags: ['voice', 'medspa'],
      },
      {
        name: 'Franklin',
        url: 'https://franklin-voice-concierge.vercel.app',
        status: 'demo',
        blurb: 'A voice concierge demo.',
        tags: ['voice'],
      },
      {
        name: 'CertaPro',
        url: 'https://certapro-voice-concierge.vercel.app',
        status: 'demo',
        blurb: 'A painter concierge demo with a color visualizer.',
        tags: ['voice', 'painting'],
      },
      {
        name: 'JR Tree Removal',
        url: 'https://jr-tree-voice-concierge.vercel.app',
        status: 'demo',
        blurb: 'Tree service concierge for Jaco. Talk to it in the browser or call it.',
        tags: ['voice', 'tree-service'],
      },
      {
        name: 'Hall Roofing',
        url: 'https://hall-roofing-concierge.vercel.app',
        owner: 'Andrew Hall',
        status: 'demo',
        blurb: 'Roofer concierge for Andrew Hall in the Florida Panhandle. Call it at (940) 828-8215.',
        tags: ['voice', 'roofing'],
      },
    ],
  },
  {
    key: 'demos',
    title: 'Demo Sites',
    kicker: 'Free builds that win the deal',
    items: [
      {
        name: 'JR Tree Removal',
        url: 'https://jr-tree-website.vercel.app',
        owner: 'Jaco',
        status: 'live',
        blurb: 'Redesigned site in the Arborist Field Dossier direction, with the embedded AI receptionist in the corner.',
        tags: ['demo-build', 'tree-service'],
      },
      {
        name: 'Hall Roofing',
        url: 'https://hall-roofing-website.vercel.app',
        owner: 'Andrew Hall',
        status: 'live',
        blurb: 'Golden Hour Grit direction, storm-ready, receptionist built in. Honors founder Sidney Hall; his son Andrew leads the company now.',
        tags: ['demo-build', 'roofing'],
      },
      {
        name: 'Chinatown Restaurant',
        url: 'https://chinatown-kalispell.vercel.app',
        owner: 'Chinatown Restaurant, Kalispell',
        status: 'live',
        blurb: 'Midnight lacquer ticket direction for the Kalispell Chinese kitchen. Their real 150-item menu with every dish photographed, a thermal-receipt ordering flow, and a live AI host that takes orders in English, Mandarin, Cantonese, or Spanish. Lead on the dial floor: (406) 755-2401, kalispellchinatown@gmail.com.',
        tags: ['demo-build', 'restaurant', 'voice', 'multilingual'],
      },
    ],
  },
  {
    key: 'apps',
    title: 'Apps & Experiments',
    kicker: 'Products and prototypes',
    items: [
      {
        name: 'FORGE',
        url: 'https://forge-one-mu.vercel.app',
        status: 'live',
        blurb: 'App factory cockpit. Spins up new micro-apps from a brief.',
        tags: ['tooling'],
      },
      {
        name: 'Command Deck',
        url: 'https://deck.modernmustardseed.com',
        status: 'live',
        blurb: 'Your personal Atelier dashboard, a calm private home base.',
        tags: ['dashboard', 'personal'],
      },
      {
        name: 'Perch',
        url: 'https://perch-taupe.vercel.app',
        status: 'live',
        blurb: 'An OS for accounting firms. Know where every client stands at a glance.',
        tags: ['vertical-saas'],
      },
      {
        name: 'CROWN',
        url: 'https://crown-guide.vercel.app',
        status: 'live',
        blurb: 'A Glacier and Flathead summer guide for visitors to the valley.',
        tags: ['guide', 'local'],
      },
      {
        name: 'Olive Shoot',
        status: 'building',
        blurb: 'Agentic OS for solopreneurs. In active development, no public URL yet.',
        tags: ['app', 'in-progress'],
      },
      {
        name: 'Alive Notes',
        status: 'building',
        blurb: 'An OS for human intention. Mobile app in active development.',
        tags: ['mobile', 'in-progress'],
      },
    ],
  },
];

export const PORTFOLIO_COUNT = PORTFOLIO.reduce((n, c) => n + c.items.length, 0);
export const PORTFOLIO_LIVE = PORTFOLIO.reduce(
  (n, c) => n + c.items.filter((i) => i.status !== 'building').length,
  0,
);
