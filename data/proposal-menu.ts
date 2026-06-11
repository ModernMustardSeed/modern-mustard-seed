/**
 * Modern Mustard Seed service menu, pricing, and scopes.
 *
 * Source of truth for the admin proposal builder. Mirrors mms-pricing.json and
 * the rate sheet (current 2026-06-04). Prices are real. Do not invent prices.
 * For a range, proposals default to the midpoint unless scope justifies more.
 * "from" units default to the floor. Hourly defaults to the rate times hours.
 *
 * Voice: no em dashes, stewardship not extraction, never call price an
 * "investment". Final scope and price are set in the proposal.
 */

export type Unit = 'fixed' | 'free' | 'monthly' | 'fixed_from' | 'monthly_from' | 'hourly';
export type ServiceStatus = 'set' | 'session_set' | 'recommended';

export type Service = {
  id: string;
  group: string;
  name: string;
  description: string;
  /** Detailed, real deliverables. What the client actually gets. */
  scope: string[];
  priceMin: number;
  priceMax: number | null;
  unit: Unit;
  status: ServiceStatus;
  requires?: string;
  note?: string;
  /** Usage-based pass-through (model/voice/hosting). Billed at cost, the
   *  monthly figure is an estimate that moves with compute used. */
  variable?: boolean;
};

export const ENGAGEMENT_MODELS = {
  fixed_price: 'Defined scope, defined price, defined timeline. Covers most work.',
  hourly_rate: 225,
  hourly_use: 'Strategy and open-ended work that resists a fixed scope.',
  retained: 'Monthly, for ongoing build and operation after launch.',
  payment_terms: '50 percent to start, 50 percent on delivery, unless the proposal states otherwise.',
} as const;

export const TIERS = {
  scope_and_sequence: 'Map the idea, sequence the build, price it.',
  build_and_ship: 'Build and put in production. The execution tier.',
  own_and_operate: 'Stay on to run and extend it. Retained.',
} as const;

export const TERMS: string[] = [
  'Prices are starting points. Final scope and price are set in this proposal.',
  'Every build includes repo ownership, deployment, documentation, and handoff. You own what is built.',
  '50 percent deposit to start. The deposit holds the timeline and is non-refundable once work begins.',
  'Rush timelines and travel, if needed, are quoted separately.',
];

export const STATUS_LEGEND: Record<ServiceStatus, string> = {
  set: 'Established price. Do not change without explicit instruction.',
  session_set: 'Set during the audit-tool pricing pass. Treat as current.',
  recommended: 'Suggested starting range based on comparable work. Confirm before locking.',
};

/* ───────────────────────────────────────────────────────────────────────
 * EDIT PRICES HERE. Single source of truth for the proposal builder. To
 * change a price, edit `priceMin` / `priceMax` on a service below (one number
 * = exact; min+max = a range, proposals default to the midpoint). All are
 * `status: 'set'` (locked/firm). Save + redeploy and it is live everywhere.
 * Leave `unit` unless the billing shape changes. Locked 2026-06-11; edit freely.
 * ─────────────────────────────────────────────────────────────────────── */
export const SERVICES: Service[] = [
  {
    id: 'idea_to_product',
    group: 'Idea to Product',
    name: 'Idea to Product in 30 Days',
    description:
      'Sketch to shipped product. Web app, internal tool, agent, or full system. Repo, deploy, documentation, and handoff included.',
    scope: [
      'Discovery and scoping session, success criteria defined in writing',
      'Full UI and UX design system',
      'Full-stack build (Next.js, Supabase, Stripe, Vercel)',
      'AI integration where it earns its place (Claude, OpenAI, Gemini, Vapi)',
      'Production deployment and monitoring',
      '30 days of post-launch support',
      'Repo, documentation, and every credential handed off. You own it all',
    ],
    priceMin: 15000,
    priceMax: 35000,
    unit: 'fixed',
    status: 'set',
  },
  {
    id: 'ai_visibility_audit',
    group: 'AI Visibility and Web',
    name: 'AI Visibility Audit',
    description:
      'The free teardown. Whether AI assistants surface the business, what is working on the site, and what is costing them customers.',
    scope: [
      'Representative AI-assistant discovery check for the category',
      'On-site read: metadata, structured data, headings, content clarity',
      'Off-site read: Google Business Profile, name consistency, directories, reviews',
      'Prioritized fixes tagged do-it-yourself, needs implementation, or needs a rebuild',
      'No code access required',
    ],
    priceMin: 0,
    priceMax: 0,
    unit: 'free',
    status: 'set',
    note: 'Lead magnet. Usually free, into a paid path.',
  },
  {
    id: 'ai_visibility_starter',
    group: 'AI Visibility and Web',
    name: 'AI Visibility Starter',
    description:
      'Off-site discovery work. Google Business Profile, schema handed off, directory and name consistency, review strategy. No code access needed.',
    scope: [
      'Google Business Profile set up or optimized',
      'Schema markup authored and handed off for install',
      'Directory and name, address, phone consistency cleanup',
      'Review generation strategy with a direct review link',
      'No code or admin access required',
    ],
    priceMin: 750,
    priceMax: 1500,
    unit: 'fixed',
    status: 'set',
  },
  {
    id: 'onsite_geo',
    group: 'AI Visibility and Web',
    name: 'On-Site GEO Implementation',
    description:
      'Direct fixes to a site with code or admin access. Schema, content structure, entity clarity, technical discovery layer.',
    scope: [
      'Schema markup implemented directly on the site',
      'Content restructured for entity and topic clarity',
      'Plain statements of what they do, where, and for whom',
      'Technical discovery layer (crawlability, llms.txt, ai.txt where supported)',
      'Requires code or admin access',
    ],
    priceMin: 1500,
    priceMax: 3500,
    unit: 'fixed',
    status: 'set',
    requires: 'code or admin access',
  },
  {
    id: 'website_build',
    group: 'AI Visibility and Web',
    name: 'Website Build, AI-Optimized',
    description:
      'A new site built for AI discovery from the first line. For no site, or a closed builder holding them back.',
    scope: [
      'Brand-aligned, production-grade site (3 to 6 pages typical)',
      'Built for AI discovery from the first line (schema, llms.txt, semantic structure)',
      'Mobile-fast, Lighthouse 90 plus',
      'Real copy written for the business',
      'Booking or payment integration as needed',
      'Full handoff: repo, deploy, every credential',
    ],
    priceMin: 3500,
    priceMax: 8000,
    unit: 'fixed',
    status: 'set',
    note: 'Open-ended above 8k for larger sites.',
  },
  {
    id: 'ai_visibility_monitoring',
    group: 'AI Visibility and Web',
    name: 'AI Visibility Monitoring',
    description:
      'Ongoing re-checks and adjustments as models and sources shift. Sold after the first win, not before.',
    scope: [
      'Periodic re-checks as models and sources change',
      'Adjustments to schema, content, and off-site signals',
      'A short monthly read on what moved and why',
    ],
    priceMin: 300,
    priceMax: 750,
    unit: 'monthly',
    status: 'set',
  },
  {
    id: 'single_automation',
    group: 'AI Systems and Automation',
    name: 'Single Automation',
    description: 'One workflow wired end to end. A repeating manual task removed.',
    scope: [
      'One workflow mapped end to end',
      'Built and wired into the existing tools',
      'Tested, documented, and handed off',
    ],
    priceMin: 2500,
    priceMax: null,
    unit: 'fixed_from',
    status: 'set',
  },
  {
    id: 'custom_ai_system',
    group: 'AI Systems and Automation',
    name: 'Custom AI System',
    description:
      'A CRM, internal tool, or multi-step workflow built to their process. Larger systems fold into Idea to Product.',
    scope: [
      'Discovery of the process and the data behind it',
      'Custom CRM, internal tool, or multi-step workflow',
      'AI where it earns its place',
      'Deploy, documentation, and handoff',
    ],
    priceMin: 5000,
    priceMax: 20000,
    unit: 'fixed',
    status: 'set',
  },
  {
    id: 'mcp_integration',
    group: 'AI Systems and Automation',
    name: 'MCP / Tool Integration',
    description: 'Connecting tools and data so an agent or app can act on them.',
    scope: [
      'Connect the tools and data sources that matter',
      'MCP server or tool layer so an agent or app can act on them',
      'Auth, testing, and documentation',
    ],
    priceMin: 2500,
    priceMax: null,
    unit: 'fixed_from',
    status: 'set',
  },
  {
    id: 'ai_agent_build',
    group: 'AI Agents',
    name: 'AI Agent Build',
    description:
      'A working agent for a real job. Sales development, concierge, intake, or voice. The build and the logic.',
    scope: [
      'Agent scoped to a real job (SDR, concierge, intake, or voice)',
      'The build and the decision logic',
      'Integrations to the tools the agent needs',
      'Deploy and handoff. Operation billed separately',
    ],
    priceMin: 5000,
    priceMax: 12000,
    unit: 'fixed',
    status: 'set',
  },
  {
    id: 'agent_operation',
    group: 'AI Agents',
    name: 'Agent Operation',
    description: 'Monthly run cost. Model and voice usage billed at cost or inside a managed retainer.',
    scope: [
      'Monthly run and oversight',
      'Model and voice usage at cost, or inside a managed retainer',
      'Tuning as the job evolves',
    ],
    priceMin: 300,
    priceMax: null,
    unit: 'monthly_from',
    status: 'set',
    variable: true,
  },
  {
    id: 'software_compute',
    group: 'Running Costs',
    name: 'Software & Compute',
    description:
      'The monthly cost to run what we build. AI model usage, voice minutes, hosting, and any third-party tools. Billed at cost. It depends on how much compute the system uses each month, so the figure is an estimate that moves with real usage.',
    scope: [
      'AI model usage (Claude, OpenAI, Gemini) at cost',
      'Voice minutes and telephony where an agent is involved',
      'Hosting, database, email and SMS sending',
      'Any third-party software the build depends on',
      'Billed at cost. The estimate moves with actual usage each month',
    ],
    priceMin: 50,
    priceMax: 500,
    unit: 'monthly',
    status: 'set',
    variable: true,
  },
  {
    id: 'build_operate_retainer',
    group: 'Retainers & Subscriptions',
    name: 'Build & Operate Retainer',
    description:
      'A monthly engagement instead of a large upfront build. We build, iterate, and operate it month to month. For clients who would rather subscribe than pay a big build fee at once.',
    scope: [
      'Ongoing build and iteration on your product or system',
      'We run and maintain what is live, with oversight and tuning',
      'A standing block of priority hours each month',
      'Month to month, cancel with notice. You own everything built',
    ],
    priceMin: 2000,
    priceMax: null,
    unit: 'monthly_from',
    status: 'set',
    note: 'Use instead of, or alongside, a one-time build fee.',
  },
  {
    id: 'care_plan',
    group: 'Retainers & Subscriptions',
    name: 'Care Plan',
    description:
      'Keep what we built healthy after launch. Updates, small changes, monitoring, and support, on a predictable monthly fee.',
    scope: [
      'Updates, dependency and security upkeep',
      'A monthly allowance for small changes and fixes',
      'Uptime and error monitoring',
      'Priority support and a monthly check-in',
    ],
    priceMin: 250,
    priceMax: 900,
    unit: 'monthly',
    status: 'set',
  },
  {
    id: 'single_skill',
    group: 'Claude Skills',
    name: 'Single Skill',
    description: 'One production skill. Tested, documented, working across Claude.ai, Code, Cowork, and API.',
    scope: [
      'One production Claude skill',
      'Tested across Claude.ai, Code, Cowork, and API',
      'Documented and handed off',
    ],
    priceMin: 1500,
    priceMax: 3500,
    unit: 'fixed',
    status: 'set',
  },
  {
    id: 'skill_suite',
    group: 'Claude Skills',
    name: 'Skill Suite',
    description: 'A connected set of three to six skills for a full workflow.',
    scope: [
      'Three to six connected skills for a full workflow',
      'Shared conventions and documentation',
      'Tested across every Claude surface',
    ],
    priceMin: 5000,
    priceMax: null,
    unit: 'fixed_from',
    status: 'set',
  },
  {
    id: 'funnel_build',
    group: 'Marketing Funnels',
    name: 'Funnel Build',
    description:
      'Landing page, capture, and the automation behind it. Built to send the right buyers to them, not to chase everyone.',
    scope: [
      'Landing page and capture',
      'The automation behind it',
      'Built to send the right buyers, not chase everyone',
    ],
    priceMin: 2500,
    priceMax: 6000,
    unit: 'fixed',
    status: 'set',
  },
  {
    id: 'strategy_intensive',
    group: 'Advisory',
    name: 'Strategy Intensive',
    description:
      'A focused half-day to scope and sequence a build before committing. Credited toward the build if they proceed.',
    scope: [
      'A focused half-day on the problem',
      'A clear plan, the sequence, and a real price out the other side',
      'Credited toward the build if they proceed',
    ],
    priceMin: 1200,
    priceMax: 1200,
    unit: 'fixed',
    status: 'set',
  },
  {
    id: 'advisory',
    group: 'Advisory',
    name: 'Consulting / Advisory',
    description: 'Hourly, for strategy and open-ended work that resists a fixed scope.',
    scope: ['Strategy and open-ended work', 'Billed against actual time at the hourly rate'],
    priceMin: 225,
    priceMax: 225,
    unit: 'hourly',
    status: 'set',
  },
];

/**
 * Realistic paths. Each maps a client situation (what they need, or what their
 * current site is like) to a sequence of services with a one-line rationale.
 * These seed a proposal fast; everything stays editable after.
 */
export type Path = {
  id: string;
  label: string;
  when: string;
  serviceIds: string[];
  rationale: string;
};

export const PATHS: Path[] = [
  {
    id: 'no_site',
    label: 'No website yet',
    when: 'They have a business but nothing online, or a dead placeholder.',
    serviceIds: ['website_build', 'idea_to_product'],
    rationale:
      'Start with a site built for discovery from the first line. If the idea is bigger than a site, go straight to a full product.',
  },
  {
    id: 'closed_builder',
    label: 'On a closed builder (Wix, Squarespace, GoDaddy)',
    when: 'The platform is the ceiling. Some wins are reachable, the deep ones are not.',
    serviceIds: ['ai_visibility_starter', 'website_build'],
    rationale:
      'Capture the off-site wins now without touching the builder, then plan a rebuild for the work the platform will not allow.',
  },
  {
    id: 'modern_invisible',
    label: 'Modern site, invisible to AI',
    when: 'Good site, accessible code, but AI assistants do not surface them.',
    serviceIds: ['onsite_geo', 'ai_visibility_monitoring'],
    rationale: 'Fix the site directly, then keep it surfaced as models and sources shift.',
  },
  {
    id: 'off_site_only',
    label: 'Site is fine, wins are off-site',
    when: 'The site is structurally sound. The gaps are profile, reviews, and citations.',
    serviceIds: ['ai_visibility_starter', 'ai_visibility_monitoring'],
    rationale: 'Do the off-site discovery work, then hold the position month to month.',
  },
  {
    id: 'manual_overload',
    label: 'Drowning in manual work',
    when: 'Revenue exists, but the team is buried in repetitive tasks.',
    serviceIds: ['single_automation', 'custom_ai_system', 'software_compute'],
    rationale: 'Remove the worst repeating task first, then build the system that runs the operation.',
  },
  {
    id: 'needs_agent',
    label: 'Needs an agent on the front line',
    when: 'Missed calls, slow lead response, after-hours gaps.',
    serviceIds: ['ai_agent_build', 'agent_operation', 'software_compute'],
    rationale: 'Build the agent for the real job, then run it month to month.',
  },
  {
    id: 'has_idea',
    label: 'Has an idea, needs it built',
    when: 'A clear vision for a product or tool, ready to ship.',
    serviceIds: ['strategy_intensive', 'idea_to_product', 'software_compute'],
    rationale: 'Scope and sequence it first (credited toward the build), then build and ship in 30 days.',
  },
  {
    id: 'prefers_monthly',
    label: 'Prefers monthly to a big upfront',
    when: 'Wants to start without a large build fee, or wants us to keep building and running it.',
    serviceIds: ['build_operate_retainer', 'software_compute'],
    rationale:
      'Run it as a monthly engagement. We build, iterate, and operate it month to month, with compute billed at cost. Add a one-time setup fee only if the first push warrants it.',
  },
];

/* ────────────────────────── HELPERS ────────────────────────── */

export const byId = (id: string): Service | undefined => SERVICES.find((s) => s.id === id);

export const GROUPS: string[] = Array.from(new Set(SERVICES.map((s) => s.group)));

/** Round to the nearest hundred for clean proposal numbers. */
const round100 = (n: number): number => Math.round(n / 100) * 100;

/**
 * The default proposal price for a service. Midpoint for ranges, floor for
 * "from" units, the rate for hourly, 0 for free. priceBasis() states the math.
 */
export function defaultPrice(s: Service): number {
  switch (s.unit) {
    case 'free':
      return 0;
    case 'hourly':
    case 'fixed_from':
    case 'monthly_from':
      return s.priceMin;
    case 'fixed':
    case 'monthly':
    default:
      return s.priceMax != null && s.priceMax !== s.priceMin
        ? round100((s.priceMin + s.priceMax) / 2)
        : s.priceMin;
  }
}

export function priceBasis(s: Service): string {
  switch (s.unit) {
    case 'free':
      return 'Free';
    case 'hourly':
      return 'Hourly rate, billed against actual time';
    case 'fixed_from':
      return 'Starting price. Final set by scope';
    case 'monthly_from':
      return 'Starting monthly. Final set by scope';
    case 'monthly':
      return s.priceMax != null && s.priceMax !== s.priceMin ? 'Midpoint of the monthly range' : 'Monthly';
    case 'fixed':
    default:
      return s.priceMax != null && s.priceMax !== s.priceMin
        ? 'Midpoint of the range, set by scope'
        : 'Fixed';
  }
}

export const isRecurring = (u: Unit): boolean => u === 'monthly' || u === 'monthly_from';
export const isHourly = (u: Unit): boolean => u === 'hourly';

const money = (n: number): string => `$${n.toLocaleString('en-US')}`;
export const formatMoney = money;

/** The list-price label for the menu, e.g. "$15,000 to $35,000" or "from $2,500". */
export function listPrice(s: Service): string {
  if (s.unit === 'free') return 'Free';
  if (s.unit === 'hourly') return `${money(s.priceMin)}/hr`;
  if (s.unit === 'fixed_from') return `from ${money(s.priceMin)}`;
  if (s.unit === 'monthly_from') return `from ${money(s.priceMin)}/mo`;
  const suffix = isRecurring(s.unit) ? '/mo' : '';
  if (s.priceMax != null && s.priceMax !== s.priceMin) {
    return `${money(s.priceMin)} to ${money(s.priceMax)}${suffix}`;
  }
  return `${money(s.priceMin)}${suffix}`;
}
