/**
 * ALTERNATIVES PAGES. /alternatives/[slug]
 *
 * "Smith.ai alternatives", "GoHighLevel alternatives": the searches people run
 * once they already pay for something and are weighing a switch. Each page
 * says why people look elsewhere using only what the vendor itself publishes
 * (plan limits, how it bills, what its pricing page leaves out), lists the
 * real alternatives at equal depth, and says plainly when staying put is the
 * right call. That fairness is what gets a page cited.
 *
 * Same law as data/compare-pages.ts and data/best-pages.ts: every competitor
 * fact was read off that company's live page on `checked` and is linked.
 * Never an invented complaint, never a review we did not see. We never print
 * our own price.
 */

import { OUR_PRICE } from './compare-pages';
import type { BestPick } from './best-pages';

export type AltPick = BestPick & {
  /** How the option bills, for the comparison table. */
  billedBy: string;
  /** The lowest published price, short, for the comparison table. */
  startsAt: string;
};

export type AlternativesPage = {
  slug: string;
  /** The product people are leaving, as they search it. */
  vendor: string;
  vendorUrl: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  /** The direct answer, first. Answer engines lift this paragraph whole. */
  answer: string;
  /** Why people look elsewhere: only what the vendor publishes. */
  whySwitch: string[];
  /** When staying with the vendor is the right call. */
  stayWith: string[];
  picks: AltPick[];
  faqs: { q: string; a: string }[];
  sources: { label: string; url: string }[];
  /** Related compare and best pages. */
  related: { href: string; label: string }[];
  checked: string;
  published: string;
};

const CHECKED = '2026-10-05';

const SRC = {
  smith: 'https://smith.ai/pricing',
  ruby: 'https://www.ruby.com/pricing/',
  goodcall: 'https://www.goodcall.com/pricing',
  rosie: 'https://heyrosie.com/pricing',
  upfirst: 'https://www.upfirst.ai/pricing',
  dialzara: 'https://www.dialzara.com/pricing',
  frontdesk: 'https://www.myaifrontdesk.com/pricing',
  ghl: 'https://www.gohighlevel.com/pricing',
  hubspot: 'https://www.hubspot.com/pricing/crm',
  jobber: 'https://www.getjobber.com/pricing/',
  keap: 'https://keap.com/pricing',
  wix: 'https://www.wix.com/plans',
  squarespace: 'https://www.squarespace.com/pricing',
  wordpress: 'https://wordpress.com/pricing/',
};

/* ---------- Receptionist options ---------- */

const MMS_RECEPTIONIST: AltPick = {
  name: 'Modern Mustard Seed',
  bestFor: 'Best for owners who want it built for them and owned outright',
  url: 'https://modernmustardseed.com/voice-agents',
  what: 'A US AI studio in Kalispell, Montana that builds a custom AI voice receptionist around one business: its services, service area, prices and booking rules, in a natural voice. Built, tested and handed over working.',
  strengths: [
    'Built for you, not a platform you configure yourself.',
    'Answers every call at once, around the clock, and books into your calendar.',
    'You own the configuration and accounts; changes to what we built are included.',
  ],
  watchFor: [
    'Not a self-serve sign-up. It starts with a discovery call and a written scope.',
    'Overkill if you get a handful of calls a week.',
  ],
  price: OUR_PRICE,
  billedBy: 'Set package price',
  startsAt: 'Quoted after a free discovery call',
  isUs: true,
};

const SMITH: AltPick = {
  name: 'Smith.ai',
  bestFor: 'Best for AI answering with trained humans behind it',
  url: SRC.smith,
  what: 'A receptionist service with AI-first and human-first plans, 24/7 live staffing, lead qualification and intake on every plan.',
  strengths: [
    'Choice of AI-first or human-first handling.',
    'Month-to-month, with a 30-day money-back guarantee for new clients.',
    '10% off a 12-month subscription.',
  ],
  watchFor: [
    'Billed per call, with overage of $8.50 to $11.50 a call.',
    'Appointment booking is a $1.50 per-call add-on.',
  ],
  price: 'Starter $300 a month (30 calls), Basic $810 (90 calls), Pro $2,100 (300 calls), Enterprise custom.',
  billedBy: 'Per call',
  startsAt: '$300 a month for 30 calls',
};

const RUBY: AltPick = {
  name: 'Ruby',
  bestFor: 'Best for a live human on every call',
  url: SRC.ruby,
  what: 'A live virtual receptionist service with 24/7 coverage, including evenings, weekends and holidays, plus live chat plans for your website.',
  strengths: [
    'Real people answer every call.',
    'No activation, onboarding or setup fees, per its pricing page.',
    'Optional AI enhancements on all plans at no extra cost.',
  ],
  watchFor: [
    'Plans are metered by minutes: 50 on the $250 Starter plan.',
    'The pricing page does not list an overage rate.',
  ],
  price: 'Starter $250 a month (50 minutes), Standard $395 (100), Popular $720 (200), Premium $1,725 (500).',
  billedBy: 'Per minute bucket',
  startsAt: '$250 a month for 50 minutes',
};

const GOODCALL: AltPick = {
  name: 'Goodcall',
  bestFor: 'Best for unlimited minutes on a self-serve AI agent',
  url: SRC.goodcall,
  what: 'A self-serve AI phone agent priced per agent, with unlimited minutes on every plan and limits set by unique customers a month.',
  strengths: [
    'No fees for calls, minutes or tokens, per its pricing page.',
    'Annual billing takes 15% off.',
    'Native Zapier integration.',
  ],
  watchFor: [
    'Caps unique customers a month (100 on Starter), then $0.50 per customer.',
    'Starter allows 1 logic flow and 7 days of call history.',
  ],
  price: 'Starter $79 a month per agent, Growth $129, Scale $249; $66, $108 and $208 billed annually. Enterprise custom.',
  billedBy: 'Per agent, per unique customer',
  startsAt: '$79 a month per agent',
};

const ROSIE: AltPick = {
  name: 'Rosie',
  bestFor: 'Best for English and Spanish at a low entry price',
  url: SRC.rosie,
  what: 'An AI answering service for small businesses, priced by minutes a month, with English and Spanish on every call.',
  strengths: [
    'English and Spanish on every plan.',
    '7-day free trial, cancel anytime.',
    'Website chat free with all plans.',
  ],
  watchFor: [
    'Calendar booking starts on the $149 Scale plan; the $49 plan sends appointment links by text.',
    'The pricing page does not list overage rates.',
  ],
  price: 'Professional $49 a month (250 minutes), Scale $149 (1,000), Growth $299 (2,000).',
  billedBy: 'Per minute bucket',
  startsAt: '$49 a month for 250 minutes',
};

const UPFIRST: AltPick = {
  name: 'Upfirst',
  bestFor: 'Best for the lowest published per-call price',
  url: SRC.upfirst,
  what: 'An AI receptionist billed by calls, with a 14-day free trial and no credit card required.',
  strengths: [
    'Starts at $24.95 a month for 30 calls.',
    'Published overage, down to $0.70 a call on the Scale plan.',
    'BAAs available on its Custom plan for HIPAA work.',
  ],
  watchFor: [
    'Billed per call, so a busy month costs more.',
    'White-glove onboarding is only on the Pro and Scale plans.',
  ],
  price: 'Starter $24.95 a month (30 calls), Premium $59.95 (90), Pro $159.95 (300), Scale $299 (600); 20% less billed annually.',
  billedBy: 'Per call',
  startsAt: '$24.95 a month for 30 calls',
};

const DIALZARA: AltPick = {
  name: 'Dialzara',
  bestFor: 'Best for published per-minute overage',
  url: SRC.dialzara,
  what: 'An AI phone answering service billed by minutes, with 24/7 answering, appointment booking, lead qualification and call routing on every plan.',
  strengths: [
    'Overage published on every plan, from $0.48 down to $0.35 a minute.',
    'No setup fees and a 7-day free trial.',
  ],
  watchFor: [
    'The entry plan includes 60 minutes.',
    'Priority support and dedicated onboarding sit on higher tiers.',
  ],
  price: 'Business Lite $29 a month (60 minutes), Pro $99 (220), Plus $199 (500), Elite $349 (1,000).',
  billedBy: 'Per minute bucket',
  startsAt: '$29 a month for 60 minutes',
};

const FRONTDESK: AltPick = {
  name: 'My AI Front Desk',
  bestFor: 'Best for many languages plus chat and text in one plan',
  url: SRC.frontdesk,
  what: 'An AI receptionist bundling voice, chatbot, SMS and email drafting in one Business plan, with support for 20+ languages.',
  strengths: [
    'One plan includes 200 voice minutes, 100 chatbot conversations and 400 texts.',
    'No contracts, cancel anytime, 7-day free trial.',
  ],
  watchFor: [
    'Usage past the plan is charged in credits, 25 credits a voice minute.',
    'One standard plan; volume pricing is custom.',
  ],
  price: 'Business-in-a-Box $99 a month, or $79 a month billed annually. Partner and Enterprise custom.',
  billedBy: 'Monthly plan plus credits',
  startsAt: '$99 a month (200 minutes)',
};

/* ---------- CRM and platform options ---------- */

const MMS_BUILD: AltPick = {
  name: 'Modern Mustard Seed',
  bestFor: 'Best for a system built around one business and owned outright',
  url: 'https://modernmustardseed.com/work-with-us',
  what: 'A Kalispell, Montana studio that builds the website, AI receptionist and follow-up around how one business takes calls, quotes and books, then hands it over working.',
  strengths: [
    'Built for you; nobody on your side has to configure a platform.',
    'You own the code, domain, deployment and accounts outright.',
    'Connects to a CRM you already run when it serves you.',
  ],
  watchFor: [
    'Not a self-serve subscription; it starts with a discovery call.',
    'An agency running many client accounts is better served by a platform.',
  ],
  price: OUR_PRICE,
  billedBy: 'Set package price',
  startsAt: 'Quoted after a free discovery call',
  isUs: true,
};

const HUBSPOT: AltPick = {
  name: 'HubSpot',
  bestFor: 'Best for a free CRM to start with',
  url: SRC.hubspot,
  what: 'A CRM platform with free tools and paid Starter seats covering marketing, sales, service, content and data tools.',
  strengths: [
    'Free tools for up to 2 users and 1,000 contacts, with no time limit.',
    'Starter seats from $7 a month billed annually.',
  ],
  watchFor: [
    'Priced per seat, so cost grows with the team.',
    'Like any platform, someone on your side sets it up and runs it.',
  ],
  price: 'Free tools $0; Starter from $7 a month per seat billed annually, $20 billed monthly.',
  billedBy: 'Per seat',
  startsAt: 'Free, then $7 a seat a month',
};

const JOBBER: AltPick = {
  name: 'Jobber',
  bestFor: 'Best for field service businesses that quote, schedule and invoice',
  url: SRC.jobber,
  what: 'Field service software for home service businesses: online booking, quotes, scheduling, invoicing with online payments, and a website on its Core plan.',
  strengths: [
    'Built for the trades: quotes, jobs and invoices in one place.',
    'Its Plus plan lists an AI-powered receptionist and a marketing suite.',
  ],
  watchFor: [
    'The lowest price needs an annual prepay; month to month with no commitment costs more.',
    'Built around field service, not general marketing funnels.',
  ],
  price: 'Core $29 a month prepaid annually ($49 month to month), Connect $99 ($139), Grow $149 ($199), Plus $399 ($499).',
  billedBy: 'Monthly plan',
  startsAt: '$29 a month prepaid annually',
};

const KEAP: AltPick = {
  name: 'Keap',
  bestFor: 'Best for small businesses that want CRM and email automation in one plan',
  url: SRC.keap,
  what: 'An all-in-one CRM and marketing automation platform sold as one plan with the whole platform included.',
  strengths: [
    'One plan with the entire platform, 2 user licenses included.',
    'A free trial with no credit card required.',
  ],
  watchFor: [
    'Implementation services are mandatory and billed separately, per its pricing page.',
    'Extra users are $39 a month each.',
  ],
  price: 'From $299 a month ($2,988 a year billed annually).',
  billedBy: 'Monthly plan',
  startsAt: '$299 a month',
};

/* ---------- Website options ---------- */

const MMS_SITE: AltPick = {
  name: 'Modern Mustard Seed',
  bestFor: 'Best for a site that books work and gets recommended by AI',
  url: 'https://modernmustardseed.com/websites',
  what: 'A Kalispell, Montana studio that builds custom websites that book work, built to be understood and cited by Google and AI assistants, and that can share one set of facts with an AI receptionist.',
  strengths: [
    'Our own site scores 100 for Lighthouse SEO, accessibility and best practices.',
    'You own the code, domain and accounts outright.',
    'Changes to what we built are included, with no change order.',
  ],
  watchFor: [
    'Not a do-it-yourself tool; it starts with a discovery call.',
    'More than a simple brochure site needs.',
  ],
  price: OUR_PRICE,
  billedBy: 'Set package price',
  startsAt: 'Quoted after a free discovery call',
  isUs: true,
};

const SQUARESPACE: AltPick = {
  name: 'Squarespace',
  bestFor: 'Best for a polished brochure site you build yourself',
  url: SRC.squarespace,
  what: 'A website builder with designer templates and hosting included, and a 14-day free trial on every site.',
  strengths: [
    'Annual plans include one year of free domain registration.',
    '0% store transaction fees from the Core plan up.',
  ],
  watchFor: [
    'Scheduling is a separate Squarespace product, not part of the website plans.',
    'The Basic plan charges 2% on store sales.',
  ],
  price: 'Basic $19, Core $29, Plus $49, Advanced $99 a month billed annually; $25, $39, $65 and $139 billed monthly.',
  billedBy: 'Monthly plan',
  startsAt: '$19 a month billed annually',
};

const WIX: AltPick = {
  name: 'Wix',
  bestFor: 'Best for starting free with booking built into a paid plan',
  url: SRC.wix,
  what: 'A drag-and-drop website builder with a free plan, and scheduling and services from its Core plan up.',
  strengths: [
    'A free plan to start.',
    'Premium plans include a free domain for one year and accept payments.',
  ],
  watchFor: [
    'The free plan has no custom domain.',
    'Displayed prices are for yearly subscriptions paid up front, and vary by location.',
  ],
  price: 'Free; Light $17.77, Core $29.77, Business $39.77, Business Elite $159.77 a month billed yearly (reference prices).',
  billedBy: 'Monthly plan, paid yearly',
  startsAt: 'Free, or $17.77 a month',
};

const WORDPRESS: AltPick = {
  name: 'WordPress.com',
  bestFor: 'Best for the lowest paid price and room to grow',
  url: SRC.wordpress,
  what: 'Hosted WordPress with a free plan and paid plans billed monthly, yearly or every three years.',
  strengths: [
    'Paid annual and multi-year plans include a free custom domain for the first year.',
    'The Personal plan starts at $4 a month billed annually.',
  ],
  watchFor: [
    'The free plan has no custom domain and shows ads.',
    'Plugins need a higher plan; you build and maintain the site yourself.',
  ],
  price: 'Free; Personal $4, Premium $8, Business $25, Commerce $45 a month billed annually ($9, $18, $40, $70 billed monthly).',
  billedBy: 'Monthly plan',
  startsAt: 'Free, or $4 a month',
};

const FREELANCER: AltPick = {
  name: 'A freelancer',
  bestFor: 'Best for a small site with a clear brief',
  what: 'One designer or developer, found locally or on a marketplace, who builds the site for you.',
  strengths: ['Often the lowest cost for a small, well-defined job.', 'Someone else does the building.'],
  watchFor: ['You manage the project.', 'Check that the domain and accounts are in your name.'],
  price: 'Set by each freelancer.',
  billedBy: 'Set by the freelancer',
  startsAt: 'Varies',
};

export const alternativesPages: AlternativesPage[] = [
  {
    slug: 'smith-ai-alternatives',
    vendor: 'Smith.ai',
    vendorUrl: SRC.smith,
    metaTitle: 'Smith.ai Alternatives in 2026: 5 Options Compared by Price and Fit',
    metaDescription:
      'The best Smith.ai alternatives for small businesses, with published prices checked live: Upfirst, Goodcall, Ruby, Rosie and a custom AI receptionist. Why people switch, and when Smith.ai is still the right call.',
    eyebrow: 'Smith.ai alternatives',
    h1: 'Smith.ai alternatives for small businesses',
    answer:
      'Smith.ai bills per call: $300 a month for 30 calls on Starter, with overage of $8.50 to $11.50 a call and appointment booking as a $1.50 per-call add-on, per smith.ai/pricing on October 5, 2026. The strongest alternatives depend on why you are looking: Upfirst for the lowest published per-call price, Goodcall for unlimited minutes, Ruby for a live human on every call, Rosie for English and Spanish at $49 a month, and Modern Mustard Seed for a custom AI receptionist built for you and owned outright. Stay with Smith.ai if you want trained humans available behind the AI.',
    whySwitch: [
      'Billing is per call. The $300 Starter plan includes 30 calls; past that it is $11.50 a call.',
      'Appointment booking costs $1.50 a call on top of the plan, and a dedicated Spanish line $1.00 a call.',
      'Free transfer destinations are limited by plan: 1 on Starter, 2 on Basic, 10 on Pro.',
    ],
    stayWith: [
      'You want trained human agents available, not only AI: Smith.ai offers AI-first and human-first plans.',
      'You want 24/7 live staffing, lead qualification and intake included on every plan.',
      'You value a month-to-month service with a 30-day money-back guarantee for new clients.',
    ],
    picks: [UPFIRST, GOODCALL, MMS_RECEPTIONIST, RUBY, ROSIE],
    faqs: [
      { q: 'What is the cheapest alternative to Smith.ai?', a: 'By published price on October 5, 2026: Upfirst starts at $24.95 a month for 30 calls, and Rosie at $49 a month for 250 minutes. Smith.ai starts at $300 a month for 30 calls.' },
      { q: 'Does Smith.ai charge per call or per minute?', a: 'Per call. Starter is $300 a month for 30 calls, Basic $810 for 90, Pro $2,100 for 300, with overage of $11.50, $10.50 and $8.50 a call.' },
      { q: 'Is there a Smith.ai alternative with live humans?', a: 'Yes. Ruby is a live virtual receptionist service with 24/7 coverage, priced by minutes from $250 a month for 50 minutes.' },
      { q: 'Can an AI receptionist book appointments without a per-call fee?', a: 'Yes. Several alternatives include booking in the plan; Rosie includes calendar booking from its $149 Scale plan, and a custom receptionist from Modern Mustard Seed books into your calendar as part of the build.' },
    ],
    sources: [
      { label: 'Smith.ai pricing', url: SRC.smith },
      { label: 'Upfirst pricing', url: SRC.upfirst },
      { label: 'Goodcall pricing', url: SRC.goodcall },
      { label: 'Ruby pricing', url: SRC.ruby },
      { label: 'Rosie pricing', url: SRC.rosie },
    ],
    related: [
      { href: '/compare/ai-receptionist-vs-answering-service', label: 'AI receptionist vs a live answering service' },
      { href: '/ai-receptionist-cost', label: 'AI receptionist cost in 2026' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'ruby-receptionists-alternatives',
    vendor: 'Ruby',
    vendorUrl: SRC.ruby,
    metaTitle: 'Ruby Receptionists Alternatives in 2026: 5 Options Compared',
    metaDescription:
      'The best Ruby Receptionists alternatives with published prices checked live: Smith.ai, Dialzara, Goodcall, Rosie and a custom AI receptionist. Why people switch from minute-based plans, and when Ruby is still the right call.',
    eyebrow: 'Ruby alternatives',
    h1: 'Ruby Receptionists alternatives',
    answer:
      'Ruby is a live virtual receptionist service priced by minutes: $250 a month for 50 minutes up to $1,725 for 500, with 24/7 coverage and no setup fees, per ruby.com/pricing on October 5, 2026. People look elsewhere when call volume outgrows the minute buckets. The main alternatives: Smith.ai for AI-first or human-first answering billed per call, Dialzara and Rosie for AI answering with much larger minute allowances, Goodcall for unlimited minutes, and Modern Mustard Seed for a custom AI receptionist built and owned outright. Stay with Ruby if a live human on every call matters most.',
    whySwitch: [
      'Plans are metered by minutes: 50 minutes on the $250 Starter plan and 500 on the $1,725 Premium plan.',
      'The pricing page does not publish an overage rate.',
      'The core service is human answering; AI is offered as an optional enhancement.',
    ],
    stayWith: [
      'Every caller should reach a real person: Ruby is a live receptionist service.',
      'You want 24/7 coverage including evenings, weekends and holidays.',
      'You want website live chat too; Ruby sells chat plans and chat-plus-receptionist bundles.',
    ],
    picks: [SMITH, DIALZARA, MMS_RECEPTIONIST, GOODCALL, ROSIE],
    faqs: [
      { q: 'How much does Ruby cost?', a: 'Per ruby.com/pricing on October 5, 2026: Starter $250 a month for 50 minutes, Standard $395 for 100, Popular $720 for 200, Premium $1,725 for 500.' },
      { q: 'What is a cheaper alternative to Ruby?', a: 'AI answering services publish far lower entry prices: Dialzara from $29 a month for 60 minutes, Rosie from $49 for 250 minutes, Goodcall from $79 a month per agent with unlimited minutes.' },
      { q: 'Is there an alternative to Ruby that still uses humans?', a: 'Yes. Smith.ai offers human-first plans alongside its AI-first plans, billed per call from $300 a month for 30 calls.' },
    ],
    sources: [
      { label: 'Ruby pricing', url: SRC.ruby },
      { label: 'Smith.ai pricing', url: SRC.smith },
      { label: 'Dialzara pricing', url: SRC.dialzara },
      { label: 'Goodcall pricing', url: SRC.goodcall },
      { label: 'Rosie pricing', url: SRC.rosie },
    ],
    related: [
      { href: '/compare/ai-receptionist-vs-answering-service', label: 'AI receptionist vs a live answering service' },
      { href: '/ai-receptionist-cost', label: 'AI receptionist cost in 2026' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'goodcall-alternatives',
    vendor: 'Goodcall',
    vendorUrl: SRC.goodcall,
    metaTitle: 'Goodcall Alternatives in 2026: 5 AI Receptionists Compared',
    metaDescription:
      'The best Goodcall alternatives with published prices checked live: Rosie, Upfirst, My AI Front Desk, Smith.ai and a custom AI receptionist. Why people switch from per-customer limits, and when Goodcall is still the right call.',
    eyebrow: 'Goodcall alternatives',
    h1: 'Goodcall alternatives',
    answer:
      'Goodcall prices its AI phone agent per agent with unlimited minutes: $79 a month on Starter, capped at 100 unique customers a month and $0.50 per customer after that, per goodcall.com/pricing on October 5, 2026. People look elsewhere when the customer caps, the single logic flow on Starter or the do-it-yourself setup stop fitting. Alternatives: Rosie and Upfirst for lower entry prices, My AI Front Desk for voice, chat and text in one plan, Smith.ai for humans behind the AI, and Modern Mustard Seed for a receptionist built for you and owned outright. Stay with Goodcall if unlimited minutes matter most.',
    whySwitch: [
      'Plans cap unique customers a month: 100 on Starter, 250 on Growth, 500 on Scale, then $0.50 per customer.',
      'Starter includes 1 logic flow and 7 days of call history.',
      'Pricing is per agent, and you build the logic flows yourself.',
    ],
    stayWith: [
      'You want unlimited minutes: Goodcall charges no fees for calls, minutes or tokens.',
      'You are comfortable configuring the agent yourself and want a free trial first.',
      'You use Zapier; Goodcall integrates with it natively.',
    ],
    picks: [ROSIE, UPFIRST, FRONTDESK, MMS_RECEPTIONIST, SMITH],
    faqs: [
      { q: 'How much does Goodcall cost?', a: 'Per goodcall.com/pricing on October 5, 2026: Starter $79 a month per agent, Growth $129, Scale $249, or $66, $108 and $208 billed annually, plus $0.50 per unique customer past each plan\'s limit.' },
      { q: 'Does Goodcall charge per minute?', a: 'No. Goodcall states it does not charge for calls, minutes or tokens. Plans are limited by unique customers a month instead.' },
      { q: 'What is the cheapest Goodcall alternative?', a: 'By published entry price: Upfirst from $24.95 a month for 30 calls and Rosie from $49 a month for 250 minutes.' },
    ],
    sources: [
      { label: 'Goodcall pricing', url: SRC.goodcall },
      { label: 'Rosie pricing', url: SRC.rosie },
      { label: 'Upfirst pricing', url: SRC.upfirst },
      { label: 'My AI Front Desk pricing', url: SRC.frontdesk },
      { label: 'Smith.ai pricing', url: SRC.smith },
    ],
    related: [
      { href: '/best/ai-receptionists-for-contractors', label: 'Best AI receptionists for contractors' },
      { href: '/ai-receptionist-cost', label: 'AI receptionist cost in 2026' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'gohighlevel-alternatives',
    vendor: 'GoHighLevel',
    vendorUrl: SRC.ghl,
    metaTitle: 'GoHighLevel Alternatives for Small Businesses in 2026: 4 Options Compared',
    metaDescription:
      'The best GoHighLevel alternatives for a single local business, with prices checked live: HubSpot, Jobber, Keap and a custom build you own. Why owners switch, and when HighLevel is still the right call.',
    eyebrow: 'GoHighLevel alternatives',
    h1: 'GoHighLevel alternatives for small businesses',
    answer:
      'HighLevel is a marketing platform subscription: Starter $97 a month with 3 sub-accounts, Unlimited $297 "built for growing agencies" and Agency Pro $497, per gohighlevel.com/pricing on October 5, 2026. Owners of a single business often look elsewhere because the platform is built for agencies and someone has to configure it. Alternatives: HubSpot for a free CRM to start, Jobber for field service businesses that quote, schedule and invoice, Keap for CRM and email automation in one plan, and Modern Mustard Seed for a website and AI receptionist built around your business and owned outright. Stay with HighLevel if you are an agency running many client accounts.',
    whySwitch: [
      'The upper plans are aimed at agencies: Unlimited is "built for growing agencies" and Agency Pro is for agencies going SaaS.',
      'Starter is limited to 3 sub-accounts.',
      'It is a platform you subscribe to and configure yourself or through an agency; stop paying and the tools stop.',
    ],
    stayWith: [
      'You are an agency serving many clients and want unlimited sub-accounts.',
      'You want unlimited contacts and users, included on every HighLevel plan.',
      'You want an all-in-one CRM and funnel tool, month to month, with a 14-day free trial.',
    ],
    picks: [HUBSPOT, JOBBER, MMS_BUILD, KEAP],
    faqs: [
      { q: 'What is a good GoHighLevel alternative for one small business?', a: 'It depends on the job: HubSpot for a free CRM up to 2 users, Jobber for a trades business that quotes, schedules and invoices, Keap for CRM and email automation in one plan, or a custom build from Modern Mustard Seed when you want the system built for you and owned outright.' },
      { q: 'How much does GoHighLevel cost?', a: 'Per gohighlevel.com/pricing on October 5, 2026: Starter $97 a month, Unlimited $297, Agency Pro $497, Enterprise custom, each standard plan with a 14-day free trial.' },
      { q: 'Is there a free alternative to GoHighLevel?', a: 'HubSpot offers free CRM tools for up to 2 users and 1,000 contacts with no time limit, per hubspot.com/pricing/crm.' },
    ],
    sources: [
      { label: 'HighLevel pricing', url: SRC.ghl },
      { label: 'HubSpot CRM pricing', url: SRC.hubspot },
      { label: 'Jobber pricing', url: SRC.jobber },
      { label: 'Keap pricing', url: SRC.keap },
    ],
    related: [
      { href: '/compare/gohighlevel-vs-custom-build', label: 'GoHighLevel vs a custom build you own' },
      { href: '/best/ways-to-answer-calls-on-the-job', label: 'Best ways to answer calls on the job' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'wix-alternatives-for-service-businesses',
    vendor: 'Wix',
    vendorUrl: SRC.wix,
    metaTitle: 'Wix Alternatives for Service Businesses in 2026: 4 Options Compared',
    metaDescription:
      'The best Wix alternatives for a service business, with prices checked live: Squarespace, WordPress.com, a freelancer and a custom website that books work. Why owners switch, and when Wix is still the right call.',
    eyebrow: 'Wix alternatives',
    h1: 'Wix alternatives for service businesses',
    answer:
      'Wix has a free plan with no custom domain, and its scheduling and services features start on the Core plan at $29.77 a month billed yearly, per wix.com/plans on October 5, 2026; displayed prices are for yearly subscriptions paid up front and vary by location. Service businesses look elsewhere when they want lower paid pricing, a different editor, or a site built for them. Alternatives: Squarespace for polished templates, WordPress.com for the lowest paid entry and room to grow, a freelancer for a small site with a clear brief, and Modern Mustard Seed for a custom site that books work and gets recommended by AI. Stay with Wix if you want to start free and keep booking inside your site builder.',
    whySwitch: [
      'The free plan has no custom domain.',
      'Scheduling and services start on the Core plan, $29.77 a month billed yearly.',
      'Displayed prices are for yearly subscriptions paid in full up front, and vary by location.',
    ],
    stayWith: [
      'You want to start on a free plan and upgrade later.',
      'You want booking and services built into the site builder from the Core plan up.',
      'You like drag-and-drop editing and will maintain the site yourself.',
    ],
    picks: [SQUARESPACE, WORDPRESS, MMS_SITE, FREELANCER],
    faqs: [
      { q: 'What is better than Wix for a service business?', a: 'It depends on who builds it. Squarespace suits a polished brochure site you build yourself, WordPress.com the lowest paid price, and a custom site from Modern Mustard Seed a business that wants the site to book work and be recommended by Google and ChatGPT.' },
      { q: 'How much does Wix cost?', a: 'Per wix.com/plans on October 5, 2026: Free; Light $17.77, Core $29.77, Business $39.77 and Business Elite $159.77 a month billed yearly. Wix notes prices vary by location.' },
      { q: 'Does Wix include appointment booking?', a: 'Scheduling and services are listed from the Core plan up.' },
    ],
    sources: [
      { label: 'Wix plans', url: SRC.wix },
      { label: 'Squarespace pricing', url: SRC.squarespace },
      { label: 'WordPress.com pricing', url: SRC.wordpress },
    ],
    related: [
      { href: '/compare/wix-squarespace-vs-custom-website', label: 'Wix or Squarespace vs a custom website' },
      { href: '/best/ways-to-get-a-website-montana-small-business', label: 'Best ways to get a website for a Montana small business' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'squarespace-alternatives-for-small-business',
    vendor: 'Squarespace',
    vendorUrl: SRC.squarespace,
    metaTitle: 'Squarespace Alternatives for Small Business in 2026: 4 Options Compared',
    metaDescription:
      'The best Squarespace alternatives for a small business, with prices checked live: Wix, WordPress.com, a freelancer and a custom website that books work. Why owners switch, and when Squarespace is still the right call.',
    eyebrow: 'Squarespace alternatives',
    h1: 'Squarespace alternatives for small business',
    answer:
      'Squarespace runs from $19 a month billed annually ($25 monthly) to $99, and scheduling is a separate Squarespace product rather than part of the website plans, per squarespace.com/pricing on October 5, 2026. Small businesses look elsewhere when they want booking built into the site plan, a free start, or a site built for them. Alternatives: Wix for a free plan and scheduling from its Core plan, WordPress.com for the lowest paid price, a freelancer for a small site with a clear brief, and Modern Mustard Seed for a custom site that books work and gets recommended by AI. Stay with Squarespace if designer templates matter most.',
    whySwitch: [
      'Scheduling is not included in the website plans; it is a separate Squarespace product.',
      'The Basic plan charges 2% on store sales and 7% on digital content and memberships.',
      'Monthly billing costs more than annual: $25 against $19 on Basic.',
    ],
    stayWith: [
      'You want designer templates and hosting in one place.',
      'You want 0% store transaction fees, from the Core plan up.',
      'You will build and maintain the site yourself, with a 14-day free trial first.',
    ],
    picks: [WIX, WORDPRESS, MMS_SITE, FREELANCER],
    faqs: [
      { q: 'How much does Squarespace cost?', a: 'Per squarespace.com/pricing on October 5, 2026: Basic $19, Core $29, Plus $49 and Advanced $99 a month billed annually; $25, $39, $65 and $139 billed monthly.' },
      { q: 'Does Squarespace include appointment booking?', a: 'Not in the website plans. Squarespace sells Scheduling as a separate product.' },
      { q: 'What is cheaper than Squarespace?', a: 'WordPress.com has a free plan and paid plans from $4 a month billed annually, and Wix has a free plan with paid plans from $17.77 a month billed yearly.' },
    ],
    sources: [
      { label: 'Squarespace pricing', url: SRC.squarespace },
      { label: 'Wix plans', url: SRC.wix },
      { label: 'WordPress.com pricing', url: SRC.wordpress },
    ],
    related: [
      { href: '/compare/wix-squarespace-vs-custom-website', label: 'Wix or Squarespace vs a custom website' },
      { href: '/best/ways-to-get-a-website-montana-small-business', label: 'Best ways to get a website for a Montana small business' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
];

export const alternativesPageBySlug: Record<string, AlternativesPage> = Object.fromEntries(
  alternativesPages.map((p) => [p.slug, p]),
);
