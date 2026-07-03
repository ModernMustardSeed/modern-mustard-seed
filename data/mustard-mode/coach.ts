/**
 * Mr. Mustard's client-safe coach data: the instant-response pool for the
 * Multiplier hero (zero API cost, keyed by intent), and the headline rewrite
 * templates. The real persona system prompt lives server-side in
 * lib/mustard-mode.ts.
 */

export type FreePlayIntent = {
  key: string;
  /** Lowercase keywords that route a typed ambition into this intent. */
  match: string[];
  /** The instant first coaching line (streams client-side, no API). */
  line: string;
  /** Playfair headline rewrite: {thing} is the visitor's ambition, cleaned. */
  headline: string;
};

export const freePlayIntents: FreePlayIntent[] = [
  {
    key: 'app',
    match: ['app', 'application', 'saas', 'software', 'platform', 'tool', 'dashboard', 'booking', 'tracker', 'website builder'],
    line: "Good. That's a real build, and smaller than you think. Claude Code can scaffold the first working version tonight. Step 1: we write the one-sentence spec so the machine builds the right thing. Ready?",
    headline: 'One seed. {thing} at 100x.',
  },
  {
    key: 'site',
    match: ['website', 'site', 'landing', 'page', 'portfolio', 'blog', 'store', 'shop', 'ecommerce', 'e-commerce'],
    line: "A live site is the fastest win in the whole method. One session for the build, one for the design pass that makes it yours. Step 1: we write a design brief so it never looks like a template. Want the brief?",
    headline: 'One seed. {thing} at 100x.',
  },
  {
    key: 'business',
    match: ['business', 'startup', 'company', 'agency', 'brand', 'side hustle', 'income', 'money', 'clients', 'freelanc'],
    line: "Then we start where every real business starts: one offer, one page, one way to pay. Claude drafts all three with you this week. Step 1: we pressure-test the idea like a skeptic so you build the version people buy.",
    headline: 'One seed. A real business at 100x.',
  },
  {
    key: 'automate',
    match: ['automate', 'automation', 'workflow', 'report', 'email', 'spreadsheet', 'process', 'repetitive', 'save time', 'faster'],
    line: "The Cowork track was made for this. We find the 5 hours a week you're burning, hand the reps to Claude, and keep your judgment in the loop. Step 1: name the one task you dread most. That's our first automation.",
    headline: 'One seed. Your week back at 100x.',
  },
  {
    key: 'learn',
    match: ['learn', 'code', 'coding', 'programming', 'developer', 'technical', 'how to use claude', 'ai', 'prompt'],
    line: "You're in the right dojo. You don't need a CS degree, you need reps with a coach who keeps score. Mission one takes 20 minutes and ends with Claude building something real in front of you. Ready for it?",
    headline: 'One seed. A builder at 100x.',
  },
  {
    key: 'creative',
    match: ['book', 'write', 'course', 'content', 'video', 'podcast', 'newsletter', 'art', 'design', 'game', 'music'],
    line: "Creative work is where Claude multiplies hardest. You bring the taste, it brings the drafts, and the Ideate track turns your idea into a one-page spec you can actually ship. Step 1: we excavate the idea out of your head.",
    headline: 'One seed. {thing} at 100x.',
  },
];

export const freePlayFallback: FreePlayIntent = {
  key: 'dream',
  match: [],
  line: "That's exactly the kind of ambition this machine was built for. Here's the move: we turn it into a one-sentence spec, then Claude and I break it into missions you can ship one at a time. Step 1 takes 10 minutes. In?",
  headline: 'One seed. Your dream at 100x.',
};

export function routeIntent(text: string): FreePlayIntent {
  const t = text.toLowerCase();
  for (const intent of freePlayIntents) {
    if (intent.match.some((m) => t.includes(m))) return intent;
  }
  return freePlayFallback;
}

/** Clean a typed ambition into a short noun phrase for the headline rewrite. */
export function ambitionPhrase(text: string): string {
  let t = text.trim().replace(/\s+/g, ' ');
  // Strip leading fillers so "I want to build a booking app" becomes "a booking app".
  t = t.replace(/^(i\s+(want|need|would like|wanna|hope|dream)\s+(to\s+)?(build|make|create|launch|start|ship|have|learn|write|design)?\s*)/i, '');
  t = t.replace(/^(build|make|create|launch|start|ship|write|design)\s+/i, '');
  if (t.length > 40) t = t.slice(0, 40).replace(/\s\S*$/, '') + '…';
  if (!t) return 'your dream';
  return t.charAt(0).toLowerCase() + t.slice(1);
}
