/**
 * BEST-OF PAGES. /best/[slug]
 *
 * Buyer's-guide lists for the questions our buyers ask an AI assistant:
 * "best AI receptionist for contractors", "best way to get a website in
 * Montana". We are on every list, and every pick gets the same depth: what it
 * is, who it is best for, its strengths, what to watch for, and its price as
 * the company itself publishes it.
 *
 * Same law as data/compare-pages.ts: every competitor fact was read off that
 * company's live page on `checked` and is linked. Where a company does not
 * publish a price, the page says so. We never print our own price.
 */

import { OUR_PRICE } from './compare-pages';

export type BestPick = {
  name: string;
  /** One line, "Best for ...". This is the segmentation answer engines lift. */
  bestFor: string;
  url?: string;
  what: string;
  strengths: string[];
  watchFor: string[];
  price: string;
  /** True on our own entry, so the page can disclose it. */
  isUs?: boolean;
};

export type BestPage = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  /** The short answer, first. */
  answer: string;
  method: string[];
  picks: BestPick[];
  faqs: { q: string; a: string }[];
  /** Optional further reading shown under the answer. */
  related?: { href: string; label: string }[];
  checked: string;
  published: string;
};

const CHECKED = '2026-10-05';

const MMS_RECEPTIONIST: BestPick = {
  name: 'Modern Mustard Seed',
  bestFor: 'Best for owners who want it built for them and owned outright',
  url: 'https://modernmustardseed.com/voice-agents',
  what: 'A US AI studio in Kalispell, Montana that builds a custom AI voice receptionist around one business: its services, service area, prices and booking rules, in a natural voice. Built, tested and handed over.',
  strengths: [
    'Built for you, not a platform to configure yourself.',
    'Answers every call at once, around the clock, and books into your calendar.',
    'Can share one set of business facts with your website and Google profile.',
    'You own the configuration and accounts; changes to what we built are included.',
  ],
  watchFor: [
    'Not a self-serve sign-up. It starts with a discovery call and a written scope.',
    'Overkill if you get a handful of calls a week.',
  ],
  price: OUR_PRICE,
  isUs: true,
};

const RUBY: BestPick = {
  name: 'Ruby',
  bestFor: 'Best for businesses that want a live human on every call',
  url: 'https://www.ruby.com/pricing/',
  what: 'A live virtual receptionist service. Ruby describes its service as "100% live, personalized communication," with coverage 24/7 including after hours, weekends and holidays.',
  strengths: [
    'Real people answer every call.',
    'No activation, onboarding or setup fees, per its pricing page.',
    'Live chat plans for your website too.',
  ],
  watchFor: [
    'Plans are metered by minutes: 50 minutes on the Starter plan.',
    'Cost grows with call volume.',
  ],
  price: '$250 a month for 50 minutes, $395 for 100, $720 for 200, $1,725 for 500 (plans are named by minutes).',
};

const SMITH: BestPick = {
  name: 'Smith.ai',
  bestFor: 'Best for AI answering with trained human agents behind it',
  url: 'https://smith.ai/pricing',
  what: 'A receptionist service with two plan families: AI-first plans, where AI answers and complex calls can go to a live receptionist, and human-first plans, live-staffed 24/7 with lead screening and intake.',
  strengths: [
    'AI-first plans start free for 25 calls and list AI scheduling on every plan.',
    'Human-first plans do not charge for spam calls, per its pricing page.',
    'Human-first plans carry a 30-day money-back guarantee.',
  ],
  watchFor: [
    'Billed per call: AI-first extra calls run $2.10 to $3.00, human-first overage $8.50 to $11.50.',
    'On human-first plans, appointment booking is a $1.50 per-call add-on.',
  ],
  price: 'AI-first: Free $0 (25 calls), Pro from $150 (75 calls), Enterprise from $500 (300 calls) a month. Human-first: Starter $300 (30 calls), Basic $810 (90 calls), Pro $2,100 (300 calls), Enterprise custom. Checked October 10, 2026.',
};

const GOODCALL: BestPick = {
  name: 'Goodcall',
  bestFor: 'Best for a low-cost AI agent you set up yourself',
  url: 'https://www.goodcall.com/pricing',
  what: 'A self-serve AI phone agent priced by unique customers a month, with no metering of minutes, calls or tokens.',
  strengths: [
    'No per-minute charges on any plan.',
    'Start free with a demo agent; you pay when you connect a number.',
    'Call history from 30 days on Starter to unlimited on Scale.',
  ],
  watchFor: [
    'Plans cap unique customers a month (100 on Starter), then 79 cents per extra customer.',
    'You build and configure the agent yourself.',
  ],
  price: 'Starter $79 a month (100 unique customers), Growth $129 (500), Scale $299 (2,000). Enterprise volume pricing. No annual price listed. Checked October 10, 2026.',
};

const ROSIE: BestPick = {
  name: 'Rosie',
  bestFor: 'Best for the lowest entry price',
  url: 'https://heyrosie.com/pricing',
  what: 'An AI answering service for small businesses, priced by minutes a month.',
  strengths: [
    'The lowest starting price on this list.',
    '7-day free trial, cancel anytime.',
  ],
  watchFor: [
    'Minute caps per plan; the pricing page does not list overage rates.',
    'Self-serve setup.',
  ],
  price: 'Professional $49 a month (250 minutes), Scale $149 (1,000), Growth $299 (2,000).',
};

const AVOCA: BestPick = {
  name: 'Avoca',
  bestFor: 'Best for larger home service companies running ServiceTitan',
  url: 'https://www.avoca.ai/',
  what: 'Calls itself "The AI Front Office for Service Businesses": an AI CSR for inbound booking, outbound campaigns, call coaching and web chat, for HVAC, plumbing, electrical, roofing, garage door, pest control and more.',
  strengths: [
    'A certified ServiceTitan app, with Housecall Pro and FieldRoutes integrations named on its site.',
    'Built specifically for the trades.',
    'Call coaching and analytics for a CSR team.',
  ],
  watchFor: [
    'Pricing is not published; it starts with a demo.',
    'Aimed at companies with a dispatch board and a CSR team.',
  ],
  price: 'Not published. Book a demo.',
};

export const bestPages: BestPage[] = [
  {
    slug: 'ai-receptionists-for-contractors',
    related: [
      { href: '/ai-receptionist-cost', label: 'AI receptionist cost in 2026: every published price compared' },
      { href: '/alternatives/goodcall-alternatives', label: 'Goodcall alternatives' },
      { href: '/alternatives/smith-ai-alternatives', label: 'Smith.ai alternatives' },
    ],
    metaTitle: 'Best AI Receptionists for Contractors (2026): 6 Options Compared',
    metaDescription:
      'The best AI receptionists and answering services for contractors and trades in 2026: Modern Mustard Seed, Avoca, Goodcall, Rosie, Smith.ai and Ruby, with prices checked live and who each is best for.',
    eyebrow: 'Buyer\'s guide',
    h1: 'The best AI receptionists for contractors in 2026',
    answer:
      'For a contractor who wants an AI receptionist built and owned outright, Modern Mustard Seed. For a larger shop on ServiceTitan, Avoca. For a low-cost agent you set up yourself, Goodcall from $79 a month or Rosie from $49. For a human on every call, Ruby from $250 a month, or Smith.ai, whose AI-first plans start free for 25 calls and whose human-first plans start at $300 a month. Prices are from each company\'s pricing page, checked October 5, 2026, with Goodcall and Smith.ai re-checked October 10, 2026.',
    method: [
      'We read each company\'s own pricing and product pages on October 5, 2026, re-read Goodcall and Smith.ai on October 10, 2026, and only list what they publish.',
      'We sorted by who each option fits, not by a single ranking, because a one-truck roofer and a forty-tech HVAC company need different things.',
      'We judged on what a contractor actually needs: answering every call during a rush, after-hours coverage, booking the job, and what happens to the bill when volume spikes.',
      'Modern Mustard Seed wrote this page and builds AI receptionists. We are on the list, and we gave every option the same space.',
    ],
    picks: [MMS_RECEPTIONIST, AVOCA, GOODCALL, ROSIE, SMITH, RUBY],
    faqs: [
      { q: 'What is the best AI receptionist for a small contractor?', a: 'It depends on who will set it up. If you want it built for you and owned, a studio like Modern Mustard Seed. If you want to configure it yourself on a budget, Goodcall or Rosie. If you need a human on every call, Ruby.' },
      { q: 'How much does an AI receptionist cost for a contractor?', a: 'Self-serve AI agents start around $49 to $79 a month (Rosie, Goodcall), and Smith.ai has a free AI-first plan for 25 calls. Live services start at $250 to $300 a month (Ruby, Smith.ai human-first). Built-for-you receptionists are quoted as a set package price.' },
      { q: 'Can an AI receptionist book jobs into my calendar?', a: 'Yes, most can. Check whether booking is included or an add-on: Smith.ai lists appointment booking at $1.50 a call on its human-first plans and AI scheduling on its AI-first plans.' },
      { q: 'Where can I hear an AI receptionist before I buy?', a: 'Call (406) 312-1223 to hear Mr. Mustard, the Modern Mustard Seed voice agent, any time.' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'ways-to-answer-calls-on-the-job',
    metaTitle: 'Best Ways to Answer Calls When You Are on a Job (Home Services, 2026)',
    metaDescription:
      'Six ways a home service business can stop missing calls while on a job: voicemail, live answering, AI-first answering, self-serve AI agents, a built AI receptionist and a ServiceTitan AI CSR. Who each fits.',
    eyebrow: 'Buyer\'s guide',
    h1: 'The best ways to answer calls when you are on a job',
    answer:
      'If most callers are existing customers, voicemail is fine. If new customers call while you are on a roof or under a sink, use something that answers: a self-serve AI agent such as Rosie or Goodcall if you will set it up yourself, a live service such as Ruby if every caller needs a human, an AI receptionist built for you by Modern Mustard Seed if you want it done and owned, or Avoca if you run a larger shop on ServiceTitan.',
    method: [
      'Written for owner-operators and small crews in plumbing, HVAC, roofing, electrical, landscaping and cleaning.',
      'Competitor facts come from each company\'s own pages, read October 5, 2026.',
      'Sorted by business size and how much setup you will do yourself.',
      'Modern Mustard Seed wrote this page and is one of the options. Every option gets the same space.',
    ],
    picks: [
      {
        name: 'Voicemail',
        bestFor: 'Best when almost every caller is an existing customer',
        what: 'The greeting and beep that comes with your phone plan.',
        strengths: ['Usually included with your phone plan.', 'Nothing to set up.'],
        watchFor: ['A new customer who reaches voicemail can call the next business on the list.', 'Every message is a callback you still owe.'],
        price: 'Usually included with your phone plan.',
      },
      { ...ROSIE, bestFor: 'Best for a one-truck business on a tight budget' },
      { ...GOODCALL, bestFor: 'Best for a small crew that will configure its own AI agent' },
      { ...MMS_RECEPTIONIST, bestFor: 'Best for an owner who wants it built, tested and handed over' },
      { ...RUBY, bestFor: 'Best when every caller needs a live human' },
      { ...AVOCA, bestFor: 'Best for a multi-truck shop with a dispatch board on ServiceTitan' },
    ],
    faqs: [
      { q: 'How do contractors stop missing calls?', a: 'Put something on the line that answers when you cannot: a live answering service, a self-serve AI agent, or an AI receptionist built for your business. Voicemail alone only works when callers will wait.' },
      { q: 'Is an AI receptionist better than an answering service?', a: 'For high volume and after-hours calls, AI usually costs less per call and answers every call at once. For sensitive calls that need a human, a live service wins. See the full comparison at modernmustardseed.com/compare/ai-receptionist-vs-answering-service.' },
      { q: 'Can I try before I commit?', a: 'Rosie offers a 7-day free trial, and Goodcall lets you start free with a demo agent and pay when you connect a number. You can hear the Modern Mustard Seed voice agent at (406) 312-1223.' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'ways-to-get-a-website-montana-small-business',
    related: [
      { href: '/alternatives/wix-alternatives-for-service-businesses', label: 'Wix alternatives for service businesses' },
      { href: '/alternatives/squarespace-alternatives-for-small-business', label: 'Squarespace alternatives for small business' },
    ],
    metaTitle: 'Best Ways to Get a Website for a Small Business in Montana (2026)',
    metaDescription:
      'The best ways for a Montana small business to get a website in 2026: Squarespace, Wix, a freelancer, a local agency, or a Kalispell studio. Prices checked live and who each fits.',
    eyebrow: 'Buyer\'s guide',
    h1: 'The best ways to get a website for a small business in Montana',
    answer:
      'Build it yourself on Squarespace (from $19 a month billed annually) or Wix (from $17.77 a month billed yearly, plus a free plan) if the site is a simple brochure and you have the time. Hire a freelancer for a small, well-defined site. Hire a local agency for a large brand campaign. Hire a studio like Modern Mustard Seed in Kalispell when the site has to book work, answer questions and be recommended by Google and ChatGPT, and you want to own it outright.',
    method: [
      'Written for Montana owner-operators: trades, outfitters, restaurants, practices and shops from Kalispell to Billings.',
      'Platform prices come from Squarespace and Wix pricing pages, read October 5, 2026.',
      'Sorted by what the site needs to do for the business, not by a single ranking.',
      'Modern Mustard Seed is a Kalispell studio and wrote this page. Every option gets the same space.',
    ],
    picks: [
      {
        name: 'Squarespace (do it yourself)',
        bestFor: 'Best for a polished brochure site you build yourself',
        url: 'https://www.squarespace.com/pricing',
        what: 'A website builder with designer templates and hosting included.',
        strengths: ['14-day free trial, no credit card required.', 'Annual plans include a year of free domain registration.', 'Strong templates for visual businesses.'],
        watchFor: ['You build and maintain it yourself.', 'The site lives on their platform.'],
        price: 'Basic $19, Core $29, Plus $49, Advanced $99 a month billed annually; $25 to $139 billed monthly.',
      },
      {
        name: 'Wix (do it yourself)',
        bestFor: 'Best for starting free and upgrading later',
        url: 'https://www.wix.com/plans',
        what: 'A drag-and-drop website builder with a free plan and premium upgrades.',
        strengths: ['A free plan to start.', 'Premium plans include a free domain for one year.'],
        watchFor: ['Displayed prices are for yearly subscriptions paid up front, and vary by location.', 'You build and maintain it yourself.'],
        price: 'Free; Light $17.77, Core $29.77, Business $39.77, Business Elite $159.77 a month billed yearly.',
      },
      {
        name: 'A freelancer',
        bestFor: 'Best for a small site with a clear brief',
        what: 'One designer or developer, found locally or on a marketplace.',
        strengths: ['Flexible and often the lowest cost for a small job.', 'Good for a single, well-defined task.'],
        watchFor: ['You manage the project.', 'Check that the domain and accounts are in your name.'],
        price: 'Set by each freelancer.',
      },
      {
        name: 'A traditional agency',
        bestFor: 'Best for a large, multi-channel brand campaign',
        what: 'A full-service firm with account managers, designers and marketers.',
        strengths: ['A large team for big campaigns.', 'Someone on call for ongoing marketing.'],
        watchFor: ['Often a project fee plus a monthly retainer.', 'Ask who owns the hosting and accounts.'],
        price: 'Varies by agency.',
      },
      {
        name: 'Modern Mustard Seed',
        bestFor: 'Best for a site that books work and gets recommended by AI',
        url: 'https://modernmustardseed.com/websites',
        what: 'A Kalispell, Montana studio that builds custom websites that book work, built to be understood and cited by Google and AI assistants, and that can share one set of facts with an AI receptionist.',
        strengths: ['Our own site scores 100 for Lighthouse SEO, accessibility and best practices.', 'You own the code, domain and accounts outright.', 'Changes to what we built are included, with no change order.'],
        watchFor: ['Not a do-it-yourself tool; it starts with a discovery call.', 'More than a simple brochure site needs.'],
        price: OUR_PRICE,
        isUs: true,
      },
    ],
    faqs: [
      { q: 'How much does a website cost for a small business in Montana?', a: 'Doing it yourself costs a platform subscription: Squarespace from $19 a month billed annually, Wix from $17.77 a month billed yearly or its free plan. Hiring someone ranges from a freelancer\'s quote to a studio\'s set package price.' },
      { q: 'Is there a web design studio in Kalispell?', a: 'Yes. Modern Mustard Seed is based in Kalispell and builds websites, AI receptionists and custom software for businesses across Montana and every other state.' },
      { q: 'Do I need a Google Business Profile too?', a: 'Yes. It is free, per Google, and it is where most local searches start. Your website and profile should tell the same story.' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'ways-for-non-technical-founders-to-build-a-product',
    metaTitle: 'Best Ways for a Non-Technical Founder to Get a Product Built (2026)',
    metaDescription:
      'How a non-technical founder or second-business operator can get an app or AI product built without hiring a team: a product studio, Toptal, Bubble, Glide or a full-time hire. Who each fits.',
    eyebrow: 'Buyer\'s guide',
    h1: 'The best ways for a non-technical founder to get a product built',
    answer:
      'Use a product studio like Modern Mustard Seed when you want the product specified, built, launched and handed over without hiring a team. Use Toptal when you want a vetted freelancer and will manage the work. Use Bubble or Glide when you want to build it yourself on a platform. Hire in-house when software is the whole business and you can manage engineers.',
    method: [
      'Written for operators who already run a business that works and want a product built without hiring a team.',
      'Facts about Toptal, Bubble and Glide come from their own pages, read October 5, 2026. Salary data is from the US Bureau of Labor Statistics.',
      'Sorted by how much of the work you will do yourself.',
      'Modern Mustard Seed wrote this page and is one of the options. Every option gets the same space.',
    ],
    picks: [
      {
        name: 'Modern Mustard Seed',
        bestFor: 'Best for operators who want the whole product built and handed over',
        url: 'https://modernmustardseed.com/work-with-us',
        what: 'An AI product studio in Kalispell, Montana. Idea to Product runs in four tiers: Scope and Sequence (the build plan), Build and Ship (the product in front of real users), Launch (the product goes to market), Hand Off (full transfer of the asset, access and operating knowledge).',
        strengths: ['One accountable studio from plan to hand off.', 'Standard code in accounts you own.', 'Changes to what we built are included.'],
        watchFor: ['Not a marketplace; one studio, so capacity is limited.', 'More than a weekend prototype needs.'],
        price: OUR_PRICE,
        isUs: true,
      },
      {
        name: 'Toptal',
        bestFor: 'Best for a vetted freelancer you will manage yourself',
        url: 'https://www.toptal.com/pricing',
        what: 'A network of vetted freelance developers and designers, engaged part time or full time.',
        strengths: ['A trial period with each new freelancer; if they do not meet your needs, Toptal says you will not be charged.', 'Fixed weekly billing for part-time and full-time engagements.'],
        watchFor: ['You manage the project and the product decisions.', 'A multi-skill build may need several freelancers.'],
        price: 'Quoted per engagement; published as weekly billing.',
      },
      {
        name: 'Bubble',
        bestFor: 'Best for building a web app yourself without code',
        url: 'https://bubble.io/pricing',
        what: 'A visual, no-code platform for building web apps.',
        strengths: ['A free plan to start.', 'No code required.'],
        watchFor: ['Plans include set monthly workload units.', 'Your app lives on the platform.'],
        price: 'Free; Starter $59, Growth $209, Team $549 a month billed annually; Enterprise by quote.',
      },
      {
        name: 'Glide',
        bestFor: 'Best for an internal tool built from a spreadsheet',
        url: 'https://www.glideapps.com/pricing',
        what: 'Builds "internal business apps from a spreadsheet, a prompt, or a file."',
        strengths: ['Fast for internal tools.', 'A free plan to start.'],
        watchFor: ['Built for internal apps, not public products.', 'Your app lives on the platform.'],
        price: 'Free; Basic $25, Plus $50, Pro $125 a month; Enterprise custom.',
      },
      {
        name: 'A full-time hire',
        bestFor: 'Best when software is the whole business',
        url: 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm',
        what: 'An in-house software developer on payroll.',
        strengths: ['Dedicated every day.', 'Builds long-term knowledge in house.'],
        watchFor: ['Median annual pay for US software developers was $135,980 in May 2025 (BLS), before benefits and recruiting.', 'Someone technical has to manage them.'],
        price: 'Salary plus benefits.',
      },
    ],
    faqs: [
      { q: 'How can I build an app without a technical cofounder?', a: 'Hire a product studio to build and hand it over, hire a vetted freelancer and manage them, or build it yourself on a no-code platform such as Bubble or Glide.' },
      { q: 'What does a product studio do?', a: 'It turns an idea into a specified plan, builds the product, puts it in front of real users and hands over the asset and the operating knowledge.' },
      { q: 'Will I own the code?', a: 'With Modern Mustard Seed, yes: the code, deployment, domain and every account are yours. On no-code platforms, the app lives on the platform.' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'ways-to-get-recommended-by-chatgpt-and-google-ai',
    metaTitle: 'Best Ways for a Local Business to Get Recommended by ChatGPT and Google AI (2026)',
    metaDescription:
      'How a local business gets recommended by ChatGPT, Google AI Overviews and Perplexity: a Google Business Profile, reviews, consistent listings, comparison pages, structured data and a site built for answer engines.',
    eyebrow: 'Buyer\'s guide',
    h1: 'The best ways for a local business to get recommended by ChatGPT and Google AI',
    answer:
      'Start with the free foundation: a complete Google Business Profile and steady reviews. Then make sure your name, address and phone match everywhere you are listed. Then publish pages that answer the exact questions buyers ask an AI assistant, including honest comparisons and "best for" guides, with structured data and an llms.txt file so answer engines can read them. A studio like Modern Mustard Seed builds that last layer for you; the first three you can do yourself this week.',
    method: [
      'These are the levers AI assistants draw on: your own site, third-party pages that mention you, your Google profile and your reviews.',
      'Ordered from free and do-it-yourself to built for you.',
      'Modern Mustard Seed wrote this page and builds sites for answer engines. Every option gets the same space.',
    ],
    picks: [
      {
        name: 'A complete Google Business Profile',
        bestFor: 'Best first step, and free',
        url: 'https://business.google.com/us/business-profile/',
        what: 'Your listing on Google Search and Maps: hours, services, photos, posts and reviews.',
        strengths: ['"Creating a Business Profile and listing your business on Google is free," per Google.', 'It is where most local searches start.'],
        watchFor: ['It has to be kept current: hours, photos and posts.', 'Incomplete categories and services leave it out of answers.'],
        price: 'Free.',
      },
      {
        name: 'Steady reviews',
        bestFor: 'Best for trust signals that AI answers repeat',
        what: 'A habit of asking every happy customer for a review, and replying to every review.',
        strengths: ['Fresh reviews show the business is active.', 'Replies show how you treat people.'],
        watchFor: ['Never buy or gate reviews.', 'It only works as a habit.'],
        price: 'Free, your time.',
      },
      {
        name: 'Consistent listings everywhere',
        bestFor: 'Best for making sure AI knows which business you are',
        what: 'The same name, address, phone and one-sentence description on every directory, social profile and listing.',
        strengths: ['Removes confusion with businesses that share your name.', 'Each listing is another source that mentions you.'],
        watchFor: ['Old addresses and phone numbers undo it.', 'Takes an afternoon of careful copying.'],
        price: 'Free, your time.',
      },
      {
        name: 'Comparison and "best for" pages',
        bestFor: 'Best for showing up when buyers compare options',
        what: 'Honest pages on your own site that compare you with the alternatives and say who each one fits, with sources.',
        strengths: ['Answers the exact questions buyers ask AI assistants.', 'Fair comparisons are the kind of page answer engines cite.'],
        watchFor: ['Every competitor fact has to be accurate and sourced.', 'One-sided pages read as ads.'],
        price: 'Free if you write them; included in a studio build.',
      },
      {
        name: 'Modern Mustard Seed',
        bestFor: 'Best for having the whole answer-engine layer built for you',
        url: 'https://modernmustardseed.com/agentic-websites',
        what: 'A Kalispell, Montana studio that builds websites for answer engines: structured data, an llms.txt directory, comparison and guide pages, and a free presence audit that grades your website, Google profile and reviews.',
        strengths: ['Our own site scores 100 for Lighthouse SEO, accessibility and best practices.', 'Free presence audit to see where you stand.', 'You own everything we build.'],
        watchFor: ['Not instant: AI assistants pick up new pages over weeks.', 'Starts with a discovery call.'],
        price: OUR_PRICE,
        isUs: true,
      },
    ],
    faqs: [
      { q: 'How do I get my business recommended by ChatGPT?', a: 'Be easy to verify: a complete Google Business Profile, steady reviews, matching listings everywhere, and pages on your own site that directly answer the questions your buyers ask, with structured data so they can be read.' },
      { q: 'Is a Google Business Profile free?', a: 'Yes. Google states, "creating a Business Profile and listing your business on Google is free."' },
      { q: 'How long does it take to show up in AI answers?', a: 'Weeks, not days, for most assistants. Live-search assistants can pick up new pages faster than ones that rely on their training data.' },
      { q: 'Can I see where my business stands now?', a: 'Yes. The Modern Mustard Seed presence audit is free and grades your website, Google profile and reviews: modernmustardseed.com/presence-audit.' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
];

export const bestPageBySlug: Record<string, BestPage> = Object.fromEntries(
  bestPages.map((p) => [p.slug, p]),
);
