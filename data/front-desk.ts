/**
 * The Front Desk: Mr. Mustard's instant scoping pool for the homepage hero.
 * Zero API cost. A typed idea routes into one of these intents and gets a
 * scoped reply on the spot; the personal follow-up is the lead (email gate).
 * Sibling of data/mustard-mode/coach.ts, tuned for client builds, not lessons.
 */

export type FrontDeskIntent = {
  key: string;
  /** Lowercase keywords that route a typed idea into this intent. */
  match: string[];
  /** The instant scoped reply (streams client-side, no API). */
  reply: string;
  /** Playfair headline rewrite: {thing} is the visitor's idea, cleaned. */
  headline: string;
  /** Optional instant-gratification route: renders as a gold button under the
   *  reply, so the tool the reply mentions is one click, not a typed URL. */
  cta?: { label: string; href: string };
};

export const frontDeskIntents: FrontDeskIntent[] = [
  {
    key: 'voice',
    match: ['voice', 'phone', 'call', 'receptionist', 'answering', 'after hours', 'missed call'],
    reply:
      "Seed received. A 24/7 AI voice agent on your own number: books appointments, answers your FAQs in a natural human voice, routes the urgent calls to you. Speaks 100+ languages. Fastest way to believe it: forge a free demo trained on YOUR business at modernmustardseed.com/sidekick and talk to it in sixty seconds. Want it built, or want to learn to build it yourself?",
    headline: 'Your {thing}, answering within the week.',
    cta: { label: 'Forge a free voice demo in 60 seconds', href: '/sidekick' },
  },
  {
    key: 'press',
    match: ['menu', 'price list', 'price sheet', 'rate sheet', 'flyer', 'business card', 'yard sign'],
    reply:
      "Seed received, and there's a shortcut: MUSTARD PRESS typesets your actual price list into a print-ready page while you watch, free, every price exactly as you wrote it. Run it at modernmustardseed.com/press. The clean file is $97, instant. Bigger brand system? That's THE KIT, or we design the whole presence.",
    headline: 'Your {thing}, print-ready today.',
    cta: { label: 'Typeset your proof free', href: '/press' },
  },
  {
    key: 'pictures',
    match: ['commercial', 'video ad', 'promo video', 'tv ad', 'advertisement', 'video for my'],
    reply:
      "Seed received, and the studio does this one on the spot: MUSTARD PICTURES writes your commercial's storyboard and taglines free at modernmustardseed.com/pictures (the Screen Test). Love it? The finished cinematic spot is $197 and lands in about two days, three cuts, ready to run.",
    headline: 'Your {thing}, in theaters this week.',
    cta: { label: 'Run your free Screen Test', href: '/pictures' },
  },
  {
    key: 'store',
    match: ['store', 'shop', 'ecommerce', 'e-commerce', 'sell', 'products', 'merch', 'boutique', 'apparel'],
    reply:
      "Seed received. A storefront that sells: custom design, checkout, the product engine, plus an AI concierge trained on your catalog and funnels that run day one. We took a faith apparel brand from sketch to live storefront in 60 days, most stores go faster. Fixed scope, fixed quote. Build it for you, or teach you to build it?",
    headline: 'Your {thing}, open for business in weeks.',
  },
  {
    key: 'site',
    match: ['website', 'site', 'landing', 'page', 'portfolio', 'blog', 'presence', 'seo'],
    reply:
      "Seed received. Not a brochure, a working engine: elite design, funnels and a lead magnet live on day one, an AI concierge trained on your business, SEO and GEO baked in. Live in about a week and you own every line of it. Want us to build it, or want to learn to build it yourself?",
    headline: 'Your {thing}, live in about a week.',
  },
  {
    key: 'app',
    match: ['app', 'application', 'saas', 'software', 'platform', 'booking', 'tracker', 'dashboard', 'command center', 'crm', 'portal', 'system'],
    reply:
      "Seed received. That's a real product, and smaller than you think. We design it, build it, brand it, and ship it end to end: command centers and dashboards land in about a week, deeper software in 2 to 4, fixed quote before work starts. You keep the repo, the deploy, and every account. Build it for you, or teach you to build it?",
    headline: 'Your {thing}, live in weeks.',
  },
  {
    key: 'ai-tool',
    match: ['ai', 'automate', 'automation', 'agent', 'tool', 'workflow', 'chatbot', 'gpt', 'claude', 'internal'],
    reply:
      "Seed received. A specialty AI tool only your business has: it takes the repetitive work off your plate or becomes the thing you sell to your niche. Think DEED AI, a $30K commission turned into a $99 monthly tool. Fixed scope, live in weeks. Want it built for you, or want to learn the method yourself?",
    headline: 'Your {thing}, working for you in weeks.',
  },
  {
    key: 'business',
    match: ['business', 'startup', 'company', 'brand', 'side hustle', 'income', 'clients', 'leads', 'grow'],
    reply:
      "Seed received. We start where every real business starts: one offer, one page, one way to pay, then the AI that keeps it running while you sleep. Live in weeks, fixed quote, yours forever. Want the studio to build it, or want to learn to run the machine yourself?",
    headline: 'Your {thing}, real in weeks.',
  },
];

export const frontDeskFallback: FrontDeskIntent = {
  key: 'dream',
  match: [],
  reply:
    "That's exactly what this front desk is for. Here's the move: we turn it into a one-sentence spec on a free call, fix the scope and the quote up front, and ship it in weeks. You own everything on launch day. Want us to build it, or want to learn to build it yourself?",
  headline: 'Your idea, live in weeks.',
};

export function routeBuild(text: string): FrontDeskIntent {
  const t = text.toLowerCase();
  // The earliest keyword in the typed idea wins: "a booking site for my shop"
  // is a booking build, not a store build. Word boundaries keep "ai" out of
  // "training" and "app" out of "apparel".
  let best: FrontDeskIntent | null = null;
  let bestIdx = Infinity;
  for (const intent of frontDeskIntents) {
    for (const m of intent.match) {
      const re = new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      const idx = t.search(re);
      if (idx !== -1 && idx < bestIdx) {
        bestIdx = idx;
        best = intent;
      }
    }
  }
  return best ?? frontDeskFallback;
}

/** Clean a typed idea into a short noun phrase for the headline rewrite. */
export function ideaPhrase(text: string): string {
  let t = text.trim().replace(/\s+/g, ' ');
  t = t.replace(/^(i\s+(want|need|would like|wanna|hope|dream)\s+(to\s+)?(build|make|create|launch|start|ship|have|open|get)?\s*)/i, '');
  t = t.replace(/^(build|make|create|launch|start|ship|open)\s+/i, '');
  // Drop a leading article or possessive so "Your {thing}" reads clean:
  // "a booking site" -> "Your booking site", "my shop" -> "Your shop".
  t = t.replace(/^(a|an|the|my|our|some)\s+/i, '');
  if (t.length > 40) t = t.slice(0, 40).replace(/\s\S*$/, '') + '…';
  if (!t) return 'idea';
  return t.charAt(0).toLowerCase() + t.slice(1);
}
