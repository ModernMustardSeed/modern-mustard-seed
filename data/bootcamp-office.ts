/**
 * THE OFFICE: the crew that runs Modern Mustard Seed, as the bootcamp shows it.
 *
 * This is the real roster. Every agent here is a Claude subagent with its own
 * charter in Sarah's setup (~/.claude/agents, generated from agents-src). The
 * departments and one-line jobs are copied from agents-src/page/build-page.mjs,
 * the same source The Mustard Office page builds from. When the crew grows,
 * copy the new DEPTS here; scripts/bootcamp-office-test.mts fails on a count
 * drift or a desk with no routing words.
 *
 * The router is plain keyword scoring in the browser. No model call, no cost,
 * nothing leaves the page: a visitor types a job and sees which desks take it.
 */

export type OfficeAgent = { id: string; title: string; does: string };
export type OfficeDept = { key: string; name: string; color: string; charter: string; agents: OfficeAgent[] };

/** The desk every job lands on first. */
export const CHIEF: OfficeAgent = {
  id: 'chief-of-staff',
  title: 'Chief of Staff',
  does: 'Holds the whole picture, routes every job to the right desk, and brings Sarah the three decisions waiting for a yes.',
};

export const OFFICE_DEPTS: OfficeDept[] = [
  {
    key: 'build',
    name: 'Build',
    color: '#0a7c78',
    charter: 'The engineers who write the software: product features, apps, AI and the plumbing between services.',
    agents: [
      { id: 'fullstack-engineer', title: 'Fullstack Engineer', does: 'Ships whole features end to end: page, API, database, payments and tests, live on the domain.' },
      { id: 'frontend-engineer', title: 'Frontend Engineer', does: 'Turns designs into fast, pixel-true, accessible interfaces that hold up from phone to desktop.' },
      { id: 'backend-engineer', title: 'Backend Engineer', does: 'APIs, webhooks, queues and data pipelines that stay correct under retries, races and bad input.' },
      { id: 'mobile-engineer', title: 'Mobile Engineer', does: 'iOS and Android apps with Expo, from TestFlight builds to subscriptions and App Store review.' },
      { id: 'ai-engineer', title: 'AI Engineer', does: 'Claude-powered features and agent offices, measured by evals and kept inside a cost budget.' },
      { id: 'automation-engineer', title: 'Automation Engineer', does: 'Crons, workers and schedulers that run unattended and fail loudly, never silently.' },
      { id: 'integrations-engineer', title: 'Integrations Engineer', does: 'Stripe, Supabase, mail, SMS, Meta, Google and DNS, wired so money and data move exactly once.' },
      { id: 'db-steward', title: 'Database Steward', does: 'Migrations, row-level security, indexes and backups. Every schema change probed in production.' },
    ],
  },
  {
    key: 'quality',
    name: 'Quality and Release',
    color: '#2a9d97',
    charter: 'Nothing reaches a customer until it has been reviewed, tested, measured and watched live on the real domain.',
    agents: [
      { id: 'code-reviewer', title: 'Code Reviewer', does: 'Senior review before every merge. Real bugs only, each with the exact line and the failure it causes.' },
      { id: 'qa-tester', title: 'QA Tester', does: 'Clicks through every customer journey on real phone and desktop browsers and proves it works end to end.' },
      { id: 'performance-auditor', title: 'Performance Auditor', does: 'Core Web Vitals and Lighthouse, measured as a median of five, with the biggest lever fixed first.' },
      { id: 'accessibility-auditor', title: 'Accessibility Auditor', does: 'WCAG 2.2 AA on everything we ship, so no client inherits an ADA problem from us.' },
      { id: 'release-captain', title: 'Release Captain', does: 'Lane checks, preflight, merge, deploy and live verification. Decides whether "shipped" is true.' },
      { id: 'incident-responder', title: 'Incident Responder', does: 'First on scene when something breaks. Restores service, finds the cause and adds the guard.' },
    ],
  },
  {
    key: 'security',
    name: 'Security',
    color: '#ff6f59',
    charter: 'Keys, accounts, abuse and client systems, guarded before anything goes wrong instead of after.',
    agents: [
      { id: 'security-auditor', title: 'Security Auditor', does: 'Reviews apps for auth gaps, exposed data, unsigned webhooks and abuse routes. Read-only, with fixes.' },
      { id: 'secrets-warden', title: 'Secrets Warden', does: 'Knows where every key lives and when it was rotated. Scans every repo and backup for leaks.' },
      { id: 'access-guardian', title: 'Access Guardian', does: 'Who can get into which account, two-factor status, domain renewals and clean offboarding.' },
      { id: 'abuse-sentinel', title: 'Abuse Sentinel', does: 'Spots toll fraud, card testing, spam floods and runaway spend before they cost money.' },
      { id: 'client-hardening', title: 'Client Hardening', does: 'The security baseline on every client deploy: headers, DNS, admin auth, backups and monitoring.' },
    ],
  },
  {
    key: 'audits',
    name: 'Audits',
    color: '#e0a800',
    charter: 'The audits we sell to prospects and the audits we run on ourselves. Every finding is a receipt, never a guess.',
    agents: [
      { id: 'presence-auditor', title: 'Presence Auditor', does: 'The three-pillar Presence Audit: website, reviews and Google profile, printed or emailed.' },
      { id: 'ai-visibility-auditor', title: 'AI Visibility Auditor', does: 'Asks ChatGPT, Perplexity and Gemini who to hire, and shows a business whether its name comes up.' },
      { id: 'systems-auditor', title: 'Systems Auditor', does: 'Proves which parts of the studio machine work in production today, ranked by money at risk.' },
      { id: 'truth-auditor', title: 'Truth Auditor', does: 'Checks every public price, stat and claim against its source, then fixes the drift at the source.' },
      { id: 'conversion-auditor', title: 'Conversion Auditor', does: 'Finds why visitors leave without booking or buying, and ships the biggest fix first.' },
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    color: '#81d8d0',
    charter: 'Getting found on Google, in the map pack and in AI answers, then turning attention into booked calls.',
    agents: [
      { id: 'seo-strategist', title: 'SEO Strategist', does: 'Technical and on-page SEO: indexing, schema, titles and internal links, fixed in code.' },
      { id: 'geo-engine', title: 'GEO Engine', does: 'Generative engine optimization. Tracks and grows how often AI answers name and cite us.' },
      { id: 'local-seo', title: 'Local SEO', does: 'Google Business Profile, categories, posts and citations that win the map pack.' },
      { id: 'content-strategist', title: 'Content Strategist', does: 'Topic clusters, pillar pages and case studies built on verified facts.' },
      { id: 'programmatic-pages', title: 'Programmatic Pages', does: 'City and trade page sets at quality, with a script that blocks thin or duplicate pages.' },
      { id: 'digital-pr', title: 'Digital PR', does: 'Podcasts, press and placements on the pages AI answers already cite.' },
      { id: 'social-producer', title: 'Social Producer', does: 'Makes, schedules and verifies posts across Facebook, Instagram, LinkedIn and Pinterest.' },
      { id: 'paid-ads', title: 'Paid Ads', does: 'Meta and Google campaigns where every dollar ties to a measured result.' },
      { id: 'email-lifecycle', title: 'Email Lifecycle', does: 'Sequences people asked for, and the sending reputation of every domain we hold.' },
      { id: 'analytics-attribution', title: 'Analytics and Attribution', does: 'The weekly scorecard: leads by source, booked calls and revenue, with bots filtered out.' },
      { id: 'reputation-manager', title: 'Reputation Manager', does: 'Real reviews, replies that sound like the owner, and testimonials with permission.' },
    ],
  },
  {
    key: 'sales',
    name: 'Sales',
    color: '#f5b700',
    charter: 'From a name on a map to a signed engagement at a set package price.',
    agents: [
      { id: 'lead-researcher', title: 'Lead Researcher', does: 'Finds and scores businesses that fit, with facts read from their own live presence.' },
      { id: 'outreach-writer', title: 'Outreach Writer', does: 'One specific observation, one outcome, one small ask. Never a template.' },
      { id: 'call-prep', title: 'Call Prep', does: 'A one-page brief before every call: the business, the person, the offer and the close.' },
      { id: 'proposal-closer', title: 'Proposal Closer', does: 'Maps scope to the right package, writes the proposal and follows through to the yes.' },
      { id: 'pipeline-steward', title: 'Pipeline Steward', does: 'Every open deal has a next action and a date. The daily list of who to call.' },
      { id: 'partner-channel', title: 'Partner Channel', does: 'Agencies and referral partners who resell the studio on clear, fixed terms.' },
    ],
  },
  {
    key: 'delivery',
    name: 'Client Delivery',
    color: '#d8f3f0',
    charter: 'Clients get results they can see, and leave with assets they own and can run without us.',
    agents: [
      { id: 'client-onboarding', title: 'Client Onboarding', does: 'From yes to kickoff: intake, access checklist, milestones and the welcome.' },
      { id: 'site-builder', title: 'Site Builder', does: "Client and demo websites to the launch standard, in the business's own voice." },
      { id: 'voice-agent-engineer', title: 'Voice Agent Engineer', does: 'AI receptionists that answer fast, book jobs and hand off cleanly.' },
      { id: 'voice-qa', title: 'Voice QA', does: 'Listens to every call, scores it and writes the fix list.' },
      { id: 'client-success', title: 'Client Success', does: 'The monthly review, health scores and the next package a client actually needs.' },
      { id: 'handoff-packager', title: 'Hand Off Packager', does: 'Full transfer of code, accounts, keys and know-how. Stewardship made real.' },
    ],
  },
  {
    key: 'studio',
    name: 'The Studio',
    color: '#ff8a65',
    charter: 'The creative department: words, pictures, films, paper, decks and the Mustard family itself.',
    agents: [
      { id: 'copy-chief', title: 'Copy Chief', does: "Every sentence that ships, in Sarah's voice: direct, specific and warm." },
      { id: 'art-director', title: 'Art Director', does: 'Heroes, posters and social art that look expensive, true and unmistakably ours.' },
      { id: 'film-producer', title: 'Film Producer', does: "Launch films, music films and ad spots at the studio's own bar." },
      { id: 'campaign-director', title: 'Campaign Director', does: 'One sharp idea becomes a full kit: film cuts, posters, captions and tracked links.' },
      { id: 'print-producer', title: 'Print Producer', does: 'Flyers, postcards, cards and printed audits, press-ready with tracked QR codes.' },
      { id: 'mustard-universe', title: 'Mustard Universe', does: 'Keeper of Mr. Mustard, Mrs. Mustard, Dijon and the seed cast. Same faces, same family, every time.' },
      { id: 'deck-designer', title: 'Deck Designer', does: 'Sales, pitch and workshop decks that argue a case and end on a clear ask.' },
      { id: 'experience-designer', title: 'Experience Designer', does: 'Signature interactive moments and microsites that still load fast on a phone.' },
      { id: 'design-critic', title: 'Design Critic', does: 'Screenshots every page, grades it hard and fixes it until it passes.' },
    ],
  },
  {
    key: 'cxc',
    name: 'Cross + Covenant',
    color: '#ffd166',
    charter: 'The Christian streetwear house: scripture-true designs and a store with a weekly rhythm of sales.',
    agents: [
      { id: 'cxc-merch', title: 'CXC Merch', does: 'From verse to print file to a live product with real photos.' },
      { id: 'cxc-growth', title: 'CXC Growth', does: 'Store conversion, churches and youth groups, creators and the weekly numbers.' },
    ],
  },
  {
    key: 'strategy',
    name: 'Strategy and Money',
    color: '#b8c9cb',
    charter: 'What we sell, what it costs, who we compete with and where every dollar goes.',
    agents: [
      { id: 'offer-architect', title: 'Offer Architect', does: 'Fixed-scope, fixed-price packages a busy owner can say yes to in one read.' },
      { id: 'competitive-intel', title: 'Competitive Intel', does: 'Competitor offers and pricing, sourced and dated, with a battlecard for each.' },
      { id: 'finance-ledger', title: 'Finance Ledger', does: 'Revenue, receivables, tool costs and margin, pulled live and never from memory.' },
      { id: 'product-strategist', title: 'Product Strategist', does: 'The Idea to Product method: test the riskiest bet first, then sequence the build.' },
      { id: 'compliance-counsel', title: 'Compliance Counsel', does: 'Calls, texts, email, privacy, trademarks and contracts, checked against the current rule.' },
    ],
  },
];

export const OFFICE_AGENT_COUNT = OFFICE_DEPTS.reduce((n, d) => n + d.agents.length, 0) + 1;

/** Skills in ~/.claude/skills, each a playbook the crew follows the same way every time. */
export const OFFICE_SKILL_COUNT = 46;

/** What the skills cover, in words a buyer recognizes. Each line names real skills in the setup. */
export const OFFICE_PLAYBOOKS = [
  'Brand voice',
  'Proposals',
  'Client onboarding',
  'Monthly client review',
  'Outreach',
  'Launch films',
  'Music films',
  'Pitch decks',
  'Social for Instagram, LinkedIn, TikTok and YouTube',
  'Print documents',
  'Websites',
  'Image and mockups',
  'Video edits and motion',
  'Charts and diagrams',
  'Shipping discipline',
  'Design loop',
] as const;

/**
 * What a person types, mapped to the desks that take it. Words are matched as
 * substrings of the cleaned job, so "review" catches "reviews" and "reviewed".
 */
export const OFFICE_KEYWORDS: Record<string, string[]> = {
  'chief-of-staff': ['overwhelm', 'too much', 'bottleneck', 'everything', 'priorit', 'scattered', 'busy', 'no time', 'my week', 'drowning'],
  'fullstack-engineer': ['app', 'feature', 'software', 'portal', 'dashboard', 'saas', 'platform', 'mvp'],
  'frontend-engineer': ['design', 'layout', 'interface', 'looks bad', 'ugly', 'on my phone'],
  'backend-engineer': ['api', 'webhook', 'database', 'sync', 'import', 'export'],
  'mobile-engineer': ['iphone', 'android', 'app store', 'mobile app', 'ios'],
  'ai-engineer': ['ai ', 'agent', 'chatbot', 'chat bot', 'claude', 'gpt', 'assistant', 'bottleneck'],
  'automation-engineer': ['automat', 'repetitive', 'manual', 'every week', 'every day', 'spreadsheet', 'copy paste', 'data entry', 'by hand', 'bottleneck', 'no time', 'overwhelm', 'invoice', 'paperwork'],
  'integrations-engineer': ['stripe', 'quickbooks', 'crm', 'calendar', 'zapier', 'connect', 'jobber', 'housecall', 'servicetitan', 'buildertrend', 'gmail', 'outlook'],
  'db-steward': ['database', 'backup', 'records', 'customer list'],
  'code-reviewer': ['bug', 'code'],
  'qa-tester': ['broken', 'not working', 'doesnt work', 'checkout', 'test'],
  'performance-auditor': ['slow', 'speed', 'load', 'performance'],
  'accessibility-auditor': ['ada', 'accessib', 'screen reader', 'wcag'],
  'release-captain': ['go live', 'deploy', 'ship it'],
  'incident-responder': ['down', 'outage', 'crash', 'emergency', 'hacked'],
  'security-auditor': ['security', 'hack', 'breach', 'secure', 'vulnerab'],
  'secrets-warden': ['password', 'credential', 'api key'],
  'access-guardian': ['account', 'access', 'login', 'domain', 'two factor', '2fa', 'employee left', 'offboard'],
  'abuse-sentinel': ['spam', 'fraud', 'bots', 'fake', 'chargeback'],
  'client-hardening': ['protect', 'hipaa', 'secure'],
  'presence-auditor': ['google', 'presence', 'website', 'review', 'listing', 'online', 'found', 'find us', 'audit'],
  'ai-visibility-auditor': ['chatgpt', 'ai search', 'perplexity', 'gemini', 'recommend', 'ai answer'],
  'systems-auditor': ['audit', 'what works', 'systems', 'messy', 'chaos', 'scattered', 'bottleneck', 'everything', 'mess'],
  'truth-auditor': ['wrong info', 'outdated', 'accurate', 'claims', 'old info'],
  'conversion-auditor': ['convert', 'nobody books', 'no bookings', 'visitors', 'bounce', 'traffic but', 'dont call'],
  'seo-strategist': ['seo', 'google', 'rank', 'search', 'found', 'find us', 'traffic', 'visible'],
  'geo-engine': ['chatgpt', 'ai search', 'perplexity', 'gemini', 'recommend', 'cited', 'ai answer'],
  'local-seo': ['google', 'map', 'local', 'near me', 'business profile', 'gbp', 'found', 'find us'],
  'content-strategist': ['blog', 'content', 'article', 'case study'],
  'programmatic-pages': ['city', 'cities', 'service area', 'towns', 'locations'],
  'digital-pr': ['press', 'podcast', 'news', 'media', 'featured'],
  'social-producer': ['social', 'instagram', 'facebook', 'tiktok', 'linkedin', 'post', 'pinterest'],
  'paid-ads': ['ads', 'advertis', 'ppc', 'campaign'],
  'email-lifecycle': ['email', 'newsletter', 'nurture', 'drip', 'mailing list'],
  'analytics-attribution': ['numbers', 'track', 'analytics', 'roi', 'where leads', 'metrics', 'what works'],
  'reputation-manager': ['review', 'reputation', 'stars', 'testimonial', 'yelp'],
  'lead-researcher': ['leads', 'prospect', 'new customers', 'more customers', 'more clients', 'find clients', 'more jobs', 'jobs', 'customers', 'clients', 'grow'],
  'outreach-writer': ['outreach', 'cold', 'reach out', 'follow up', 'follows up'],
  'call-prep': ['sales call', 'meeting', 'prep', 'pitch'],
  'proposal-closer': ['proposal', 'quote', 'estimate', 'bid', 'close', 'pricing', 'sow'],
  'pipeline-steward': ['follow up', 'follows up', 'followup', 'pipeline', 'slip', 'forget', 'quote'],
  'partner-channel': ['partner', 'referral', 'affiliate', 'resell', 'agency'],
  'client-onboarding': ['onboard', 'intake', 'new client', 'kickoff', 'welcome'],
  'site-builder': ['website', 'site', 'landing page', 'web page', 'redesign', 'ten years old'],
  'voice-agent-engineer': ['phone', 'call', 'receptionist', 'answer', 'voicemail', 'after hours', 'after 5', 'booking', 'book', 'appointment'],
  'voice-qa': ['phone', 'call quality', 'missed call', 'miss calls', 'receptionist'],
  'client-success': ['retention', 'churn', 'clients leave', 'monthly report', 'check in', 'upsell', 'repeat'],
  'handoff-packager': ['handoff', 'hand off', 'own it', 'documentation', 'transfer', 'sop'],
  'copy-chief': ['copy', 'words', 'write', 'headline', 'message'],
  'art-director': ['logo', 'brand', 'image', 'photo', 'poster', 'visual', 'graphic', 'looks'],
  'film-producer': ['video', 'film', 'commercial', 'reel', 'youtube'],
  'campaign-director': ['campaign', 'launch', 'promo', 'promotion', 'sale', 'spring', 'season', 'slow month'],
  'print-producer': ['flyer', 'postcard', 'print', 'mailer', 'business card', 'door hanger', 'brochure'],
  'mustard-universe': ['mascot', 'character', 'cartoon'],
  'deck-designer': ['deck', 'presentation', 'slides', 'investor', 'workshop'],
  'experience-designer': ['interactive', 'microsite', 'wow', 'experience', 'quiz', 'calculator'],
  'design-critic': ['ugly', 'outdated', 'polish', 'looks', 'old'],
  'cxc-merch': ['merch', 'shirt', 'apparel', 'print on demand', 'hoodie'],
  'cxc-growth': ['store', 'shop', 'ecommerce', 'shopify', 'church', 'sell online'],
  'offer-architect': ['offer', 'package', 'pricing', 'what to sell', 'productize', 'second business'],
  'competitive-intel': ['competitor', 'competition', 'compete', 'other companies'],
  'finance-ledger': ['money', 'cash', 'invoice', 'books', 'margin', 'profit', 'expenses', 'bookkeeping', 'revenue'],
  'product-strategist': ['idea', 'new product', 'second business', 'side business', 'validate', 'mvp'],
  'compliance-counsel': ['legal', 'contract', 'privacy', 'trademark', 'compliance', 'texting', 'sms', 'terms'],
};

/** Jobs a visitor can tap instead of typing. Real complaints from the trades we serve. */
export const OFFICE_PRESETS = [
  'Nobody finds us on Google',
  'We miss calls after 5 PM',
  'Quotes go out and nobody follows up',
  'Our reviews are thin and old',
  'I need a pitch deck by Friday',
  'I have an idea for a second business',
  'I am the bottleneck for everything',
  'Our website looks ten years old',
] as const;

/** The two agents every attendee builds on Day 3, and the words that point at each. */
export const DAY3_AGENTS = {
  presence: {
    name: 'The presence agent',
    does: 'Reads your site, your listings and your reviews every week and files the fixes.',
    words: ['google', 'found', 'find', 'review', 'website', 'site', 'seo', 'map', 'listing', 'online', 'social', 'search', 'chatgpt', 'visible', 'rank', 'old'],
  },
  frontDesk: {
    name: 'The front desk',
    does: 'Answers the missed call or the form, qualifies the lead and books the appointment.',
    words: ['call', 'phone', 'miss', 'lead', 'book', 'follow', 'quote', 'answer', 'form', 'schedule', 'appointment', 'voicemail', 'after', 'customer', 'estimate'],
  },
} as const;

export type Day3Key = keyof typeof DAY3_AGENTS;
export type Routed = { agents: OfficeAgent[]; day3: Day3Key; matched: boolean };

export const OFFICE_ALL: OfficeAgent[] = [CHIEF, ...OFFICE_DEPTS.flatMap((d) => d.agents)];

const FALLBACK = ['product-strategist', 'systems-auditor', 'automation-engineer'];

/**
 * Score every desk against the job and keep the top four. Ties go to the order
 * of the org chart, so the same job always routes the same way. The chief of
 * staff takes every job first, so it is never in the list it hands out.
 */
export function routeJob(job: string): Routed {
  const q = ` ${job.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ')} `;
  const scored = OFFICE_ALL.map((a, i) => {
    const words = OFFICE_KEYWORDS[a.id] ?? [];
    const score = words.reduce((s, w) => s + (q.includes(w) ? (w.includes(' ') ? 3 : 2) : 0), 0);
    return { a, i, score };
  })
    .filter((x) => x.score > 0 && x.a.id !== CHIEF.id)
    .sort((x, y) => y.score - x.score || x.i - y.i)
    .slice(0, 4)
    .map((x) => x.a);
  // One desk alone reads thin: the next desk in its department backs it up.
  if (scored.length === 1) {
    const mate = deptOf(scored[0].id)?.agents.find((a) => a.id !== scored[0].id);
    if (mate) scored.push(mate);
  }
  const matched = scored.length > 0;
  const agents = matched ? scored : OFFICE_ALL.filter((a) => FALLBACK.includes(a.id));
  const hits = (ws: readonly string[]) => ws.reduce((n, w) => n + (q.includes(w) ? 1 : 0), 0);
  const day3: Day3Key = hits(DAY3_AGENTS.frontDesk.words) > hits(DAY3_AGENTS.presence.words) ? 'frontDesk' : 'presence';
  return { agents, day3, matched };
}

export function deptOf(id: string): OfficeDept | undefined {
  return OFFICE_DEPTS.find((d) => d.agents.some((a) => a.id === id));
}
