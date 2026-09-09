/**
 * AI NATIVE. The consulting door: a company that already works, moved onto AI
 * workflow by workflow, with its own team coached to run it.
 *
 * Opened 2026-09-08. The point of the offer is the second sentence of the
 * tagline: the team runs it. Every tier ends with the client holding the
 * accounts, the playbook and the habit, and the studio holding nothing.
 *
 * PRICES LIVE HERE IN CENTS AND NOWHERE ELSE. The checkout route, the page,
 * the JSON-LD offers and the order emails all read this file. Stripe gets
 * inline price_data from these numbers, the same way /launch-film and /pay do,
 * so there is no price id to create and nothing in Stripe that can drift.
 *
 * The three prices were set by the studio on 2026-09-08. THE AI MAP sits above
 * the rate sheet's strategy intensive because it covers the whole operation,
 * AI NATIVE sits under Idea to Product because nothing new is being invented,
 * and THE TENDING sits under the build-and-operate retainer because it is
 * coaching, not operating. Sarah can change any of them with one edit.
 */

export const AI_NATIVE = {
  name: 'AI Native',
  wordmark: '[ AI NATIVE ]',
  tagline: 'Your company, running on AI. Your team, running it.',
  promise:
    'We map every workflow in your business, put AI into the ones that pay first, build it inside accounts you own, and coach your team on their real work until they run it without us. Set prices, a fixed timeline, and no dependency on the studio when it is done.',
  metaTitle: 'AI Consulting for Small Business. Become AI Native, With Your Team Trained to Run It',
  metaDescription:
    'AI integration consulting for small and mid-sized companies: every workflow mapped, AI put into the five that pay first, built in accounts you own, and your team coached on their real work. Set prices, delivered in eight weeks, by Modern Mustard Seed in Kalispell, Montana.',
  mapDelivery: 'delivered within two weeks',
  buildDelivery: 'delivered within eight weeks',
  readDelivery: 'within two business days',
} as const;

/**
 * How the studio itself runs. These are the studio's own published numbers,
 * mirrored from sarahscarano.com in data/sarah-portfolio.ts on 2026-09-08.
 * When that file moves, move these.
 */
export const STUDIO_PROOF = [
  { n: '1', label: 'person at the desk' },
  { n: '17', label: 'agents in the back office' },
  { n: '150', label: 'sites built by the machine' },
  { n: '9,730', label: 'leads found by it' },
  { n: '0', label: 'ad dollars spent' },
] as const;

export type AiNativeTier = {
  slug: 'ai-map' | 'ai-native' | 'tending';
  name: string;
  chip: string;
  priceCents: number;
  cadence: 'once' | 'monthly';
  mode: 'payment' | 'subscription';
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

export const aiNativeTiers: AiNativeTier[] = [
  {
    slug: 'ai-map',
    name: 'THE AI MAP',
    chip: '[ TWO WEEKS ]',
    priceCents: 250000,
    cadence: 'once',
    mode: 'payment',
    pitch: 'Every workflow in the business, written down and ranked by what AI pays back first.',
    includes: [
      'Every workflow mapped: who does it, how long it takes, what it costs, where it breaks',
      'The AI moves ranked by payoff, with the first five named',
      'The tools chosen, with the monthly price of each, in writing',
      'A sequenced plan your team can run with us or without us',
      'One working session with the team on the first move, so the map starts moving that day',
      `Hand-written and ${AI_NATIVE.mapDelivery}`,
      'Credits in full toward AI NATIVE within ninety days',
    ],
    cta: 'Book the map',
  },
  {
    slug: 'ai-native',
    name: 'AI NATIVE',
    chip: '[ EIGHT WEEKS ]',
    priceCents: 1200000,
    cadence: 'once',
    mode: 'payment',
    pitch: 'The map, then the first five workflows moved onto AI and your team trained on them.',
    includes: [
      'Everything in THE AI MAP',
      'AI put into the five workflows that pay first, built and running, not recommended',
      'Internal copilots and automations built inside accounts your company owns',
      'Six working sessions with your team, on their real work, each one ending with something live',
      'The operating playbook: what runs where, who owns it, what to do when it breaks, how to add the next one',
      'Every login, key and admin seat handed over in your name on the last day',
      `Changes included, and ${AI_NATIVE.buildDelivery}`,
    ],
    cta: 'Start the build',
    featured: true,
  },
  {
    slug: 'tending',
    name: 'THE TENDING',
    chip: '[ COACHING, MONTH TO MONTH ]',
    priceCents: 150000,
    cadence: 'monthly',
    mode: 'subscription',
    pitch: 'For a team that wants a coach in the room while the habit sets.',
    includes: [
      'Two live team sessions a month, on whatever the team is working on that week',
      'A standing line for questions between sessions, answered the same business day',
      'A monthly briefing: what changed in AI this month and what it means for your shop',
      'One more workflow moved onto AI each month',
      'The playbook kept current as the stack changes',
      'Month to month. Cancel the day your team stops needing it.',
    ],
    cta: 'Start the tending',
  },
];

export function getAiNativeTier(slug: string): AiNativeTier | undefined {
  return aiNativeTiers.find((t) => t.slug === slug);
}

export function aiNativeUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** The method. Six steps, each one a thing we actually do, in the order we do it. */
export const aiNativeMethod = [
  {
    n: '01',
    title: 'The map comes first',
    body: 'Two weeks inside your operation. Every workflow gets written down with who does it, how long it takes, what it costs and where it breaks. Then each one is scored on what AI pays back and how fast. The map is the plan, and it is yours whether or not we build a thing.',
  },
  {
    n: '02',
    title: 'The first five',
    body: 'Not every workflow, the five that pay first. Intake, follow-up, quoting, scheduling, reporting, the inbox, the weekly numbers: whichever five are yours. Each one gets a before and an after, measured, so the payoff is a number and not a feeling.',
  },
  {
    n: '03',
    title: 'Built in your accounts',
    body: 'Every tool, key, agent and automation is set up in accounts your company owns and pays for directly. We hold an admin seat for eight weeks and then we do not. There is no reseller markup and no login you have to ask us for.',
  },
  {
    n: '04',
    title: 'Working sessions, not workshops',
    body: 'Your team learns on their own work: the actual quote, the actual inbox, the actual Monday report. Six sessions across the eight weeks, and each one ends with something running that was not running that morning.',
  },
  {
    n: '05',
    title: 'The playbook',
    body: 'One document, in plain language, kept current: what runs where, who owns it, what it costs a month, what to do when it breaks, and how to add the next workflow without calling anyone. New hires read it on day one.',
  },
  {
    n: '06',
    title: 'The hand-off, then the tending',
    body: 'On the last day every admin seat is in your name and the studio holds nothing. If the team wants a coach in the room while the habit sets, THE TENDING is month to month and ends the day they stop needing it.',
  },
] as const;

export const aiNativeFaq = [
  {
    q: 'What kind of company is this for?',
    a: 'A company that already works. Three to fifty people, real customers, real revenue, and an owner who can see that the next five years run on AI and does not want to hire a department to get there. Service businesses, trades, professional firms, agencies, regional brands, second businesses run alongside a first one.',
  },
  {
    q: 'We are not a technical team. Does that matter?',
    a: 'No. Nobody on your team writes code, and nothing we set up needs them to. The sessions happen on their own work, in the tools they already open every morning. The playbook is written in plain language. If someone can run a spreadsheet, they can run what we build.',
  },
  {
    q: 'Which AI tools do you use?',
    a: 'The ones that fit the workflow. Most engagements run on Claude for writing, research and the internal copilots, with voice, automation and the connections to your existing software built around it. Every tool is set up in your own account, on the business plan that keeps your data out of training, and the price of each is in the map before anything is bought.',
  },
  {
    q: 'How is this different from AI-Proof Your Business?',
    a: 'AI-Proof is the defensive engagement: audit an operation against the shift and harden it, quoted per business because the operation decides the scope. AI NATIVE is set-price and team-first. The finish line is not that AI is running in your company. It is that your people are running it.',
  },
  {
    q: 'How is this different from HUNDREDFOLD or Mustard Mode?',
    a: 'HUNDREDFOLD is a twelve-month scaling program where we build and run the growth machine for you. Mustard Mode teaches one person to run Claude the way the studio does. AI NATIVE is for a whole team inside an existing company: the workflows, the accounts, the playbook and the habit, in eight weeks.',
  },
  {
    q: 'What if we want changes?',
    a: 'Changes to what we built are included. A workflow that needs a different shape, a prompt that should say it another way, a report that should land on Tuesday instead of Monday: tell us and it is done. Something we never agreed to build is a new conversation at a set price, never a surprise on a bill.',
  },
  {
    q: 'What do we own when it is over?',
    a: 'Everything. The accounts, the keys, the agents, the automations, the prompts, the playbook, and the admin seats. There is nothing to migrate off and nothing that stops working if you never speak to us again. We do not build dependency.',
  },
  {
    q: 'Where do we start?',
    a: `Send the business and get the AI Read, free, ${AI_NATIVE.readDelivery}: the three AI moves that pay first in your company, what each one costs to run, and which of the three doors fits. Most owners book the map from there.`,
  },
] as const;
