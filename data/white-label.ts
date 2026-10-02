/**
 * THE WHITE LABEL PROGRAM. One file holds every number.
 *
 * Agencies (web designers, marketers, brand studios) resell our AI work under
 * their own name. They pay us a fixed wholesale price, set their own retail,
 * bill their own client, and keep the difference. Sarah, 2026-10-01: "white
 * label it all and sell to them for a certain price and they can sell for
 * whatever they want."
 *
 * ⚠️ WHOLESALE NEVER SHIPS TO A BROWSER UNSIGNED. A public wholesale number is
 * a ceiling on every agency's markup: their client googles us, finds $147, and
 * the agency's $297 looks like a con. So `WL_LINES` is imported only by server
 * code. The public page reads `wlPublicLines()` (no wholesale), and the price
 * sheet and the demo's margin panel render wholesale only behind a key signed
 * for that agency (lib/white-label/key.ts).
 *
 * ⚠️ THE LADDER. The Talking Business bundle stays at or above the priciest
 * single and below the sum of the two pieces, on setup and on monthly, so no
 * path buys more for less. `wlLadderHolds()` checks it; the admin desk shows a
 * red banner the moment a price move breaks it.
 *
 * The Business Command Center is NOT on this sheet and never goes on it. It
 * sells on its own page at its own price (Study law).
 */

export type WlCadence = 'monthly' | 'project';

export type WlLine = {
  slug: string;
  name: string;
  cadence: WlCadence;
  /** One line a client understands. */
  pitch: string;
  /** What ships, in plain words. */
  includes: string[];
  /** Wholesale: what the agency pays us. Dollars. */
  wholesale: { setup: number; monthly: number };
  /** Our suggested retail. The agency can charge anything. Dollars. */
  retail: { setup: number; monthly: number };
  /** What a direct MMS client pays for the nearest thing, for Sarah's eyes only. */
  directRef?: string;
};

export const WL_PROGRAM = {
  name: 'The White Label Program',
  short: 'White Label',
  path: '/white-label',
  promise:
    'Voice agents, website agents, AI visibility and custom automations, built by us and sold under your name. You set the price. You keep the client.',
  metaTitle: 'White Label AI Services for Agencies: Voice Agents and Automations',
  metaDescription:
    'A white label AI program for web design and marketing agencies. Sell voice agents, website agents, AI visibility and custom automations under your brand at your price. Built and run by Modern Mustard Seed.',
  /** Founding rate: the first agencies keep these wholesale prices this long. */
  foundingAgencies: 5,
  foundingMonths: 24,
  answeredMinutes: 500,
} as const;

export const WL_LINES: WlLine[] = [
  {
    slug: 'ai-receptionist',
    name: 'AI Receptionist',
    cadence: 'monthly',
    pitch: 'A voice agent that answers the business phone around the clock, books the work and texts the owner a summary.',
    includes: [
      'Trained on the client’s services, prices, hours and policies',
      'Books real appointments, takes messages, transfers live calls',
      `${WL_PROGRAM.answeredMinutes} answered minutes a month, then message-taking mode, never a surprise bill`,
      'Call summaries and transcripts sent under your agency’s name',
      'Works on the client’s existing number or a new local one',
    ],
    wholesale: { setup: 197, monthly: 147 },
    retail: { setup: 497, monthly: 297 },
    directRef: 'Voice Agent direct: $297 setup, $297/mo',
  },
  {
    slug: 'site-agent',
    name: 'Website Voice and Chat Agent',
    cadence: 'monthly',
    pitch: 'The site you already built learns to talk: visitors ask out loud or type, and it answers and books.',
    includes: [
      'One script tag on any site: WordPress, Webflow, Squarespace, Shopify, Next.js',
      'Talks and types, in the client’s colors',
      'Books, captures leads and hands every conversation to the owner',
      'Same brain as the AI Receptionist when both are on',
    ],
    wholesale: { setup: 197, monthly: 97 },
    retail: { setup: 397, monthly: 197 },
    directRef: 'No direct single; part of the Talking Website ($497 + $397/mo)',
  },
  {
    slug: 'talking-business',
    name: 'The Talking Business',
    cadence: 'monthly',
    pitch: 'The phone and the website answer as one: the AI Receptionist and the Website Agent, off one brain.',
    includes: [
      'Everything in the AI Receptionist',
      'Everything in the Website Voice and Chat Agent',
      'One knowledge base, so a change lands on the phone and the site at once',
      'The line we recommend you lead with',
    ],
    wholesale: { setup: 297, monthly: 197 },
    retail: { setup: 797, monthly: 397 },
    directRef: 'Talking Website direct: $497 setup, $397/mo (includes our site)',
  },
  {
    slug: 'ai-visibility',
    name: 'AI Visibility',
    cadence: 'monthly',
    pitch: 'When someone asks ChatGPT, Google or Perplexity for the best in town, the client is the answer.',
    includes: [
      'Setup: entity, schema and answer pages fixed on the client’s site',
      'Monthly: tracked prompts across the major AI engines',
      'A monthly report with your agency’s name on it',
      'Fixes made every month, not just reported',
    ],
    wholesale: { setup: 497, monthly: 147 },
    retail: { setup: 1497, monthly: 397 },
    directRef: 'Rate sheet: GEO implementation $1,500 to $3,500, monitoring $300 to $750/mo',
  },
  {
    slug: 'custom-agent',
    name: 'Custom AI Agent or Automation',
    cadence: 'project',
    pitch: 'One workflow the client does by hand today, done by an agent: intake, quoting, follow-up, scheduling, reporting.',
    includes: [
      'One workflow, scoped in writing before we start',
      'Connected to the tools the client already uses',
      'Documented so the client could run it without either of us',
      'Running costs passed through at cost, no markup from us',
    ],
    wholesale: { setup: 2000, monthly: 0 },
    retail: { setup: 4500, monthly: 0 },
    directRef: 'Rate sheet: single automation from $2,500, agent build $5,000 to $12,000',
  },
  {
    slug: 'claude-setup',
    name: 'Claude Setup',
    cadence: 'project',
    pitch: 'Claude set up for one person at the client’s business: their skills, their tools, their way of working.',
    includes: [
      'Claude configured for one operator',
      'Up to three custom skills written for how they work',
      'Their existing tools connected',
      'A working session so they leave using it',
    ],
    wholesale: { setup: 900, monthly: 0 },
    retail: { setup: 1500, monthly: 0 },
    directRef: '/claude person tier, quoted direct',
  },
  {
    slug: 'overflow-site',
    name: 'Overflow Website Build',
    cadence: 'project',
    pitch: 'When your studio is full, we build the site under your name, to your design or ours, and hand you the repo.',
    includes: [
      'Up to five pages, built to your design file or brief',
      'Mobile, speed and search basics done properly',
      'The repository, deploy and docs handed to you',
      'Your name in the footer, never ours',
    ],
    wholesale: { setup: 1500, monthly: 0 },
    retail: { setup: 3500, monthly: 0 },
    directRef: 'Website direct: $497 setup, $147/mo managed',
  },
];

/** How the program works, in the order an agency asks. Public. */
export const WL_TERMS: { title: string; body: string }[] = [
  {
    title: 'You set the price',
    body: 'We charge you a fixed wholesale price per client. You charge whatever you want and keep every dollar above it.',
  },
  {
    title: 'Your name, never ours',
    body: 'The agent introduces itself as the client’s business. Summaries, reports and the demo carry your agency’s name. We do not appear anywhere your client looks.',
  },
  {
    title: 'You keep the client',
    body: 'You bill them and you own the relationship. We never contact your client unless you ask us to, and we never sell to them directly.',
  },
  {
    title: 'No license fee, no minimum',
    body: 'Nothing to join. You pay for a client when you sell one, month to month, one invoice from us covering all of them.',
  },
  {
    title: 'Changes are included',
    body: 'When a client wants the agent adjusted, the prompt reworked or the report changed, we do it. No charge, no change order.',
  },
  {
    title: 'Nothing held hostage',
    body: 'If you ever leave, we hand you every agent’s configuration, knowledge base and number. Your client never goes dark.',
  },
];

/** What the agency gets the day they join. Public. */
export const WL_KIT: { title: string; body: string }[] = [
  { title: 'A live demo with your name on it', body: 'A link that opens a working AI receptionist for any client you type in, branded as your agency. Use it in the pitch.' },
  { title: 'A price sheet signed for you', body: 'Your wholesale prices, our suggested retail and your margin, on one page you can print.' },
  { title: 'A sales one-pager per service', body: 'Written for your clients, in plain words, with your logo and your number.' },
  { title: 'One person to text', body: 'Sarah Scarano, who builds the work, answers you directly. No ticket queue.' },
];

export const WL_FAQ: { q: string; a: string }[] = [
  {
    q: 'Will my client ever see your name?',
    a: 'No. The agent speaks as your client’s business, the reports carry your agency’s name, and we never contact your client unless you ask us to.',
  },
  {
    q: 'What do I have to do?',
    a: 'Sell it and own the relationship. Send us what the client does, their hours and how they book. We build, test and run it. You approve it before it goes live.',
  },
  {
    q: 'What does it cost me?',
    a: 'A fixed wholesale price per client per month, plus a one-time setup per client. No license fee and no minimum. We send the full price sheet after a twenty minute call.',
  },
  {
    q: 'Can I charge whatever I want?',
    a: 'Yes. We publish a suggested retail on your price sheet. Most agencies sell at or above it. The difference is yours.',
  },
  {
    q: 'What happens when a call goes over?',
    a: `Each agent answers ${WL_PROGRAM.answeredMinutes} minutes a month. Past that it switches to taking messages for the rest of the month. Nobody gets an overage bill.`,
  },
  {
    q: 'What if my client wants something changed?',
    a: 'Tell us and we change it. Changes to what we built are included, with no charge and no change order.',
  },
  {
    q: 'What if I leave the program?',
    a: 'We hand you every configuration, knowledge base and number we run for your clients. They keep working.',
  },
];

/** Public view of a line: everything but wholesale. */
export function wlPublicLines() {
  return WL_LINES.map(({ slug, name, cadence, pitch, includes }) => ({ slug, name, cadence, pitch, includes }));
}

export function wlMargin(l: WlLine) {
  return { setup: l.retail.setup - l.wholesale.setup, monthly: l.retail.monthly - l.wholesale.monthly };
}

/** The bundle sits between the priciest single and the sum of the pieces. */
export function wlLadderHolds(): boolean {
  const by = (s: string) => WL_LINES.find((l) => l.slug === s)!;
  const a = by('ai-receptionist').wholesale;
  const b = by('site-agent').wholesale;
  const t = by('talking-business').wholesale;
  const ok = (x: number, y: number, z: number) => z >= Math.max(x, y) && z < x + y;
  return ok(a.setup, b.setup, t.setup) && ok(a.monthly, b.monthly, t.monthly);
}

export const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Sample clients for the demo. Fictional businesses; the agency can type a real one. */
export const WL_SAMPLE_CLIENTS = [
  {
    id: 'dental',
    verticalId: 'health',
    label: 'Dental office',
    client: 'Juniper Family Dental',
    services:
      'Cleanings and exams, fillings, crowns, whitening, Invisalign consults, emergency toothaches same day when possible. New patients welcome. Most PPO insurance accepted; the office confirms coverage before the visit.',
    hours: 'Monday to Thursday 7am to 5pm, Friday 7am to 1pm',
  },
  {
    id: 'hvac',
    verticalId: 'home-services',
    label: 'Heating and air',
    client: 'Summit Peak Heating and Air',
    services:
      'Furnace and AC repair, new system installs, seasonal tune-ups, heat pumps, ductwork. Emergency no-heat calls answered around the clock. Diagnostic visit is quoted on arrival.',
    hours: 'Monday to Friday 7am to 6pm, emergency calls any hour',
  },
  {
    id: 'law',
    verticalId: 'professional',
    label: 'Law firm',
    client: 'Hartwell and Lane Law',
    services:
      'Estate planning, wills and trusts, probate, small business formation and contracts. Free fifteen minute consultation for new clients. The agent never gives legal advice; it books the consultation.',
    hours: 'Monday to Friday 8:30am to 5pm',
  },
  {
    id: 'salon',
    verticalId: 'beauty',
    label: 'Salon',
    client: 'Saltwater Salon',
    services:
      'Cuts, color, balayage, extensions, blowouts, bridal parties. New clients book a consultation for color work. A card holds every appointment; 24 hour cancellation policy.',
    hours: 'Tuesday to Saturday 9am to 7pm',
  },
  {
    id: 'restaurant',
    verticalId: 'restaurant',
    label: 'Restaurant',
    client: 'Copper Kettle Bistro',
    services:
      'Dinner reservations for parties up to eight, private dining room for up to thirty, catering, gift cards. Gluten free and vegetarian options on every menu.',
    hours: 'Wednesday to Sunday 4pm to 10pm',
  },
] as const;

export type WlSampleId = (typeof WL_SAMPLE_CLIENTS)[number]['id'];

export function wlSample(id: string | null | undefined) {
  return WL_SAMPLE_CLIENTS.find((s) => s.id === id) ?? WL_SAMPLE_CLIENTS[0];
}

/** The agency color, sanitized to a 6-digit hex. Falls back to deep teal. */
export function wlColor(raw: string | null | undefined): string {
  const v = (raw || '').trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(v) ? `#${v.toLowerCase()}` : '#0b3b44';
}

/** Black or white text on the agency color, by luminance. */
export function wlInk(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#111111' : '#ffffff';
}

export function wlClean(raw: string | null | undefined, max = 60): string {
  return (raw || '').replace(/[<>{}\u0000-\u001f]/g, '').trim().slice(0, max);
}
