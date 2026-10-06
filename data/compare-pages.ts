/**
 * COMPARISON PAGES. /compare/[slug]
 *
 * One page per question a buyer types when they are choosing between us and
 * something else: a freelancer, an agency, a DIY builder, a platform, an
 * answering service, a voicemail box, a no-code tool, a hire.
 *
 * The rules these pages live by, because they are what gets a page cited by
 * Google's AI answers and by ChatGPT, and what keeps it honest:
 *
 * 1. Every competitor fact (a plan, a price, a feature) was read off that
 *    company's own live page on the date in `checked`, and the page is linked
 *    in `sources`. A fact we could not read live is not on the page.
 * 2. Every page says plainly when the other option is the better choice.
 * 3. We never print our own price. The studio publishes none
 *    (lib/public-pricing.ts). Our column says a set package price, quoted.
 *
 * Re-check the competitor numbers before changing `checked`.
 */

export type CompareRow = { factor: string; them: string; us: string };
export type CompareUseCase = { who: string; pick: string; why: string };
export type CompareSource = { label: string; url: string };

export type ComparePage = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  /** The direct answer, first. Answer engines lift this paragraph whole. */
  answer: string;
  /** Column headings for the table. */
  themLabel: string;
  /** The other option in a sentence: "a freelancer", "Wix or Squarespace". */
  themShort: string;
  usLabel: string;
  rows: CompareRow[];
  /** When the other option is the right call. Honest, specific. */
  chooseThem: string[];
  chooseUs: string[];
  useCases: CompareUseCase[];
  faqs: { q: string; a: string }[];
  sources: CompareSource[];
  /** Optional further reading shown under the answer. */
  related?: { href: string; label: string }[];
  /** ISO date the page and its competitor facts were last checked live. */
  checked: string;
  published: string;
};

/** Our price cell, everywhere. Never a number. */
export const OUR_PRICE = 'Set package price, quoted after a free discovery call';

const CHECKED = '2026-10-05';

export const comparePages: ComparePage[] = [
  {
    slug: 'freelancer-vs-studio',
    metaTitle: 'Hiring a Freelancer vs an AI Product Studio (Upwork vs Modern Mustard Seed)',
    metaDescription:
      'Should a small business hire a freelancer on a marketplace like Upwork or a product studio to build its website, app or AI receptionist? An honest side-by-side, with when the freelancer wins.',
    eyebrow: 'Freelancer vs studio',
    h1: 'Hiring a freelancer vs hiring a product studio',
    answer:
      'Hire a freelancer when the job is small, clearly specified, and you are comfortable managing the work yourself: a bug fix, a landing page, a logo. Hire a product studio like Modern Mustard Seed when the job crosses more than one skill (design, code, hosting, AI, phone systems), when nobody on your side has time to manage it, or when you need the result to keep running after the person who built it moves on. A freelancer sells their time on a task. A studio sells a finished, working asset at a set package price, and owns the whole outcome.',
    themLabel: 'Freelancer (e.g. a marketplace like Upwork)',
    themShort: 'a freelancer',
    usLabel: 'Modern Mustard Seed',
    rows: [
      { factor: 'What you buy', them: 'One person and their skills, on the terms you agree in the contract.', us: 'A finished, working asset: the website, the app or the voice agent, live and in front of customers.' },
      { factor: 'Who manages the project', them: 'You do. You write the brief, review the work and coordinate any second freelancer.', us: 'We do. One point of contact, Sarah Scarano, owns the outcome end to end.' },
      { factor: 'Skills covered', them: 'Whatever that one person does well. A designer, a developer and an AI specialist are usually three hires.', us: 'Design, code, hosting, search and AI visibility, voice agents and automation under one roof.' },
      { factor: 'Price', them: 'Set by each freelancer, plus any fees the marketplace charges. Varies widely.', us: OUR_PRICE },
      { factor: 'Changes after delivery', them: 'Usually a new contract or a new milestone.', us: 'Included. Adjustments and refinements to what we built cost nothing extra and need no change order.' },
      { factor: 'Ownership', them: 'Depends on the contract and on whose accounts the work was built in.', us: 'You own the code, the domain, the deployment and every account outright.' },
      { factor: 'Best at', them: 'Small, well-defined tasks with a clear finish line.', us: 'Multi-part builds that have to work together and keep working.' },
    ],
    chooseThem: [
      'The task is small and you can describe it in a paragraph.',
      'You already know exactly what you want and only need hands to build it.',
      'You or someone on your team has the time and know-how to review technical work.',
      'Budget is the deciding factor and the work is not mission critical.',
    ],
    chooseUs: [
      'The project needs more than one skill: a site that books jobs, a phone that answers itself, a system that follows up.',
      'Nobody on your side has time to project-manage a build.',
      'You want one accountable party, a fixed scope and a set package price before work starts.',
      'You want to own everything outright and be able to run it without us.',
    ],
    useCases: [
      { who: 'A one-page fix or a logo refresh', pick: 'Freelancer', why: 'Small, clear scope. A studio engagement is more than the job needs.' },
      { who: 'A contractor who wants the site, the Google profile and the phones working together', pick: 'Studio', why: 'Three skills that have to share one set of business facts.' },
      { who: 'A founder with a technical cofounder who needs extra hands', pick: 'Freelancer', why: 'The cofounder can manage and review the work.' },
      { who: 'An operator launching a second business without hiring a team', pick: 'Studio', why: 'They need the whole product built and handed over, not a person to manage.' },
    ],
    faqs: [
      { q: 'Is a freelancer cheaper than a studio?', a: 'For a single small task, usually yes. For a multi-part build, the comparison has to include your own time managing it, the cost of hiring two or three specialists, and what happens when one of them disappears. A studio quotes the whole outcome as one set package price.' },
      { q: 'Can I hire a freelancer to maintain what Modern Mustard Seed builds?', a: 'Yes. You own the code, the domain and every account, and the Hand Off includes the runbook and access transfer, so any competent developer can pick it up.' },
      { q: 'Does Modern Mustard Seed bill by the task or by time?', a: 'Neither. Scope maps to a package and each package has a set price, agreed in writing before work starts. Changes to what we built are included.' },
      { q: 'What does Modern Mustard Seed build?', a: 'Websites that Google and AI assistants understand, AI voice agents that answer and book every call, AI agents that automate follow-ups and intake, and custom software. Nationwide, from Kalispell, Montana.' },
    ],
    sources: [
      { label: 'Upwork', url: 'https://www.upwork.com/' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'web-agency-vs-product-studio',
    metaTitle: 'Traditional Web Agency vs AI Product Studio: Which Should a Small Business Hire?',
    metaDescription:
      'A traditional web design agency vs an AI product studio like Modern Mustard Seed: what each builds, how each prices, who owns the result, and when the agency is the better choice.',
    eyebrow: 'Agency vs studio',
    h1: 'A traditional web agency vs an AI product studio',
    answer:
      'A traditional web agency builds a website and often keeps you on a monthly retainer to host, update and market it. An AI product studio like Modern Mustard Seed builds the website plus the systems around it, such as an AI receptionist that answers every call and agents that follow up on leads, and hands you full ownership so you can run it without the studio. Choose the agency when you want a large team, a long brand campaign, or someone permanently on call. Choose the studio when you want a site that works for the business, AI built in, and no dependency.',
    themLabel: 'Traditional web agency',
    themShort: 'a traditional agency',
    usLabel: 'Modern Mustard Seed',
    rows: [
      { factor: 'What gets built', them: 'A website, sometimes with ongoing SEO and ads.', us: 'A website plus the systems behind it: AI voice agents, follow-up agents, booking and custom software.' },
      { factor: 'Built for AI search', them: 'Varies by agency. Ask whether they build for ChatGPT and Google AI answers, not only blue links.', us: 'Yes. Structured data, an llms.txt directory and pages written to be cited. Our own site scores 100 for Lighthouse SEO, accessibility and best practices.' },
      { factor: 'Pricing model', them: 'Varies. Often a project fee plus a monthly retainer.', us: OUR_PRICE },
      { factor: 'Changes after launch', them: 'Often billed as change requests or drawn from a retainer.', us: 'Included, with no change order.' },
      { factor: 'Ownership', them: 'Sometimes the agency holds the hosting, the theme license or the accounts.', us: 'You own the code, domain, deployment and every account outright.' },
      { factor: 'Team size', them: 'Account managers, designers, developers, often many people.', us: 'A small senior studio. You talk to the person building it.' },
    ],
    chooseThem: [
      'You need a large in-person team for a big brand campaign across many channels.',
      'You want a firm permanently on call and are happy to pay a retainer for that.',
      'Your company requires a vendor with a large staff for procurement reasons.',
    ],
    chooseUs: [
      'You want the website to book work, not just look good.',
      'You want an AI receptionist, follow-up agents or custom software built alongside the site.',
      'You want to own everything and not be locked into a retainer.',
      'You want to be found in ChatGPT and Google AI answers, not only in classic search results.',
    ],
    useCases: [
      { who: 'A regional chain rolling out a national brand campaign', pick: 'Agency', why: 'Large multi-channel campaigns need a large team.' },
      { who: 'A roofer who misses calls on the roof', pick: 'Studio', why: 'The site and an AI receptionist share one set of facts and catch every lead.' },
      { who: 'A practice that wants a site Google and ChatGPT recommend', pick: 'Studio', why: 'Built for answer engines from the first line.' },
    ],
    faqs: [
      { q: 'What is the difference between a web agency and a product studio?', a: 'A web agency usually sells websites and ongoing marketing services. A product studio builds products: a site, an app, an AI agent, a system, as finished assets the client owns and operates.' },
      { q: 'Do I need a monthly retainer with Modern Mustard Seed?', a: 'No. We build assets you own and can operate without us. Ongoing services exist for clients who want them, but the build does not depend on them.' },
      { q: 'Where is Modern Mustard Seed based?', a: 'Kalispell, Montana. We serve businesses in every state, remote first.' },
    ],
    sources: [],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'wix-squarespace-vs-custom-website',
    related: [
      { href: '/alternatives/wix-alternatives-for-service-businesses', label: 'Wix alternatives for service businesses' },
      { href: '/alternatives/squarespace-alternatives-for-small-business', label: 'Squarespace alternatives for small business' },
    ],
    metaTitle: 'Wix or Squarespace vs a Custom Website for a Small Business (2026)',
    metaDescription:
      'Wix and Squarespace plan prices checked live, compared with a custom website built by Modern Mustard Seed. When DIY is the right call and when a custom build pays for itself.',
    eyebrow: 'DIY builder vs custom',
    h1: 'Wix or Squarespace vs a custom-built website',
    answer:
      'Wix and Squarespace are the right choice when you want to build and edit a simple site yourself for a low monthly fee: Squarespace plans run from $19 to $99 a month billed annually, and Wix premium plans from $17.77 to $159.77 a month billed yearly, per their pricing pages checked October 5, 2026. A custom website from Modern Mustard Seed is the right choice when the site has to do work for the business, such as booking jobs, feeding an AI receptionist the same facts, or being cited by ChatGPT and Google AI answers, and when you want to own the code outright instead of renting a platform.',
    themLabel: 'Wix or Squarespace (DIY)',
    themShort: 'Wix or Squarespace',
    usLabel: 'Custom site by Modern Mustard Seed',
    rows: [
      { factor: 'Price', them: 'Squarespace: Basic $19, Core $29, Plus $49, Advanced $99 a month billed annually ($25 to $139 billed monthly). Wix: Light $17.77, Core $29.77, Business $39.77, Business Elite $159.77 a month billed yearly. Wix also has a free plan.', us: OUR_PRICE },
      { factor: 'Who builds it', them: 'You do, with templates and a drag-and-drop editor.', us: 'We do, around how your business actually works.' },
      { factor: 'Time it takes you', them: 'Your evenings and weekends.', us: 'A discovery call and your review of the build.' },
      { factor: 'Ownership', them: 'You rent the platform. The site lives on their servers and moving off means rebuilding.', us: 'You own the code, the domain and the deployment. Take it anywhere.' },
      { factor: 'AI and automation', them: 'Built-in tools within the platform.', us: 'Anything the business needs: an AI receptionist, booking, quoting, follow-up agents, custom tools.' },
      { factor: 'Search and AI visibility', them: 'Solid basics; depends on how you set it up.', us: 'Structured data, llms.txt and pages written to be cited by answer engines, built in.' },
    ],
    chooseThem: [
      'You are just starting out and the budget is a few hundred dollars a year.',
      'You enjoy building and want to edit every page yourself.',
      'The site is a simple brochure and is not expected to book work.',
    ],
    chooseUs: [
      'Your site should book jobs, answer questions and capture every lead.',
      'You want your phone, your Google profile and your site telling one consistent story.',
      'You have outgrown a template and you are spending your own hours fighting it.',
      'You want to own the site, not rent it.',
    ],
    useCases: [
      { who: 'A new side business testing an idea', pick: 'Wix or Squarespace', why: 'Low cost, fast to start, easy to change your mind.' },
      { who: 'An established trade business that lives on inbound calls', pick: 'Custom', why: 'The site and the phone have to work together to catch every job.' },
      { who: 'A portfolio for a photographer', pick: 'Squarespace', why: 'Its templates are built for visual portfolios.' },
      { who: 'A business that wants to be recommended by ChatGPT', pick: 'Custom', why: 'Every page is built for answer engines from the start.' },
    ],
    faqs: [
      { q: 'How much does Squarespace cost in 2026?', a: 'Per squarespace.com/pricing on October 5, 2026: Basic $19, Core $29, Plus $49 and Advanced $99 a month billed annually, or $25, $39, $65 and $139 billed monthly, with a 14-day free trial.' },
      { q: 'How much does Wix cost in 2026?', a: 'Per wix.com/plans on October 5, 2026: Light $17.77, Core $29.77, Business $39.77 and Business Elite $159.77 a month for yearly subscriptions, plus a free plan. Wix notes prices vary by location.' },
      { q: 'Can Modern Mustard Seed move my Wix or Squarespace site to a custom build?', a: 'Yes. We rebuild it as a custom site you own, keep your content and domain, and set up redirects so search rankings carry over.' },
      { q: 'Is a custom website worth it for a small business?', a: 'When the site is expected to bring in work, yes. When it is a simple brochure, a DIY builder is often enough. That is the honest line.' },
    ],
    sources: [
      { label: 'Squarespace pricing', url: 'https://www.squarespace.com/pricing' },
      { label: 'Wix plans', url: 'https://www.wix.com/plans' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'gohighlevel-vs-custom-build',
    related: [{ href: '/alternatives/gohighlevel-alternatives', label: 'GoHighLevel alternatives for small businesses' }],
    metaTitle: 'GoHighLevel vs a Custom Build: Which Is Right for a Local Business? (2026)',
    metaDescription:
      'HighLevel plans checked live ($97, $297, $497 a month) compared with a custom website and AI system built and owned outright. Who HighLevel is built for, and when it is the better choice.',
    eyebrow: 'Platform vs owned build',
    h1: 'GoHighLevel vs a custom build you own',
    answer:
      'HighLevel is a subscription marketing platform: its Starter plan is $97 a month, Unlimited $297 and Agency Pro $497, each with a 14-day free trial, per gohighlevel.com/pricing on October 5, 2026. Its upper plans are built for agencies managing many client accounts. It is the right choice when you want an all-in-one CRM and funnel tool and are willing to set it up and run it yourself. A custom build from Modern Mustard Seed is the right choice when you want the website, the AI receptionist and the follow-up built around your business and handed to you, owned outright, with no platform subscription holding it hostage.',
    themLabel: 'HighLevel (platform subscription)',
    themShort: 'HighLevel',
    usLabel: 'Custom build by Modern Mustard Seed',
    rows: [
      { factor: 'Price', them: 'Starter $97 a month, Unlimited $297 a month, Agency Pro $497 a month, Enterprise custom. 14-day free trial.', us: OUR_PRICE },
      { factor: 'Who it is built for', them: 'Starter: "smaller businesses and solo marketers." Unlimited: "growing agencies." Agency Pro: agencies reselling the platform.', us: 'The business itself. Built around how you take calls, quote and book.' },
      { factor: 'Who sets it up', them: 'You, or an agency you hire to configure it.', us: 'We build it and hand it over working.' },
      { factor: 'Ownership', them: 'You subscribe. Stop paying and the tools stop.', us: 'You own the code, domain, deployment and accounts outright.' },
      { factor: 'Contacts and users', them: 'Unlimited contacts and users on all plans.', us: 'Whatever the build needs, on infrastructure in your name.' },
    ],
    chooseThem: [
      'You are an agency serving many clients and want one platform for all of them.',
      'You want an all-in-one CRM, funnels and email tool and have time to configure it.',
      'You prefer a monthly subscription to a one-time build.',
    ],
    chooseUs: [
      'You want the system built for you, not a platform to learn.',
      'You want to own everything, with no subscription that can switch your business off.',
      'You want an AI receptionist in a natural voice that books real appointments.',
      'You want a website built to be cited by ChatGPT and Google AI answers.',
    ],
    useCases: [
      { who: 'A marketing agency with twenty local clients', pick: 'HighLevel', why: 'Unlimited sub-accounts are built for exactly that.' },
      { who: 'A plumber who wants the phone answered and the job booked', pick: 'Custom build', why: 'Built for one business, handed over, owned.' },
      { who: 'A coach who wants funnels and email in one tool', pick: 'HighLevel', why: 'The all-in-one model fits a do-it-yourself marketer.' },
    ],
    faqs: [
      { q: 'How much does GoHighLevel cost?', a: 'Per gohighlevel.com/pricing on October 5, 2026: Starter $97 a month ($970 a year), Unlimited $297 a month ($2,970 a year), Agency Pro $497 a month ($4,970 a year), Enterprise custom, each with a 14-day free trial.' },
      { q: 'Is GoHighLevel good for a single small business?', a: 'Its Starter plan is described as for smaller businesses and solo marketers. It works when someone on your side will configure and run it. If nobody will, a built system is usually the better fit.' },
      { q: 'Can Modern Mustard Seed connect to a CRM I already use?', a: 'Yes. We build around the tools you already run where they serve you, and we tell you plainly when one does not.' },
    ],
    sources: [
      { label: 'HighLevel pricing', url: 'https://www.gohighlevel.com/pricing' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'ai-receptionist-vs-answering-service',
    related: [
      { href: '/ai-receptionist-cost', label: 'AI receptionist cost in 2026: every published price compared' },
      { href: '/alternatives/smith-ai-alternatives', label: 'Smith.ai alternatives' },
      { href: '/alternatives/ruby-receptionists-alternatives', label: 'Ruby Receptionists alternatives' },
    ],
    metaTitle: 'AI Receptionist vs Answering Service (Ruby, Smith.ai): 2026 Comparison',
    metaDescription:
      'AI receptionist vs a live answering service like Ruby or Smith.ai. Plan prices checked live, what each does well, and which fits a contractor, a practice or a busy local business.',
    eyebrow: 'AI vs live answering',
    h1: 'AI receptionist vs a live answering service',
    answer:
      'A live answering service puts trained people on your phone line and charges by usage: Ruby runs from $250 a month for 50 minutes to $1,725 for 500, and Smith.ai from $300 a month for 30 calls to $2,100 for 300, per their pricing pages on October 5, 2026. An AI receptionist answers every call at once, around the clock, knows your services and prices, and books the job, without per-minute meters. Choose a live service when callers need a human for sensitive or complex conversations. Choose an AI receptionist when volume, after-hours calls and cost per call matter, and when you want it to book straight into your calendar.',
    themLabel: 'Live answering service (Ruby, Smith.ai)',
    themShort: 'a live answering service',
    usLabel: 'AI receptionist by Modern Mustard Seed',
    rows: [
      { factor: 'Who answers', them: 'Trained human receptionists. Ruby describes itself as "100% live." Smith.ai offers AI-first and human-first plans.', us: 'An AI voice agent in a natural voice, trained on your business facts.' },
      { factor: 'Price model', them: 'Ruby: $250 for 50 minutes, $395 for 100, $720 for 200, $1,725 for 500 a month. Smith.ai: $300 for 30 calls, $810 for 90, $2,100 for 300 a month, overage $8.50 to $11.50 a call.', us: OUR_PRICE },
      { factor: 'Hours', them: 'Both advertise 24/7 coverage.', us: 'Every hour of every day, and every call at once.' },
      { factor: 'Booking', them: 'Smith.ai lists appointment booking as a $1.50 per-call add-on.', us: 'Books into your calendar on the call.' },
      { factor: 'Busy seasons', them: 'Cost rises with call volume.', us: 'A storm day costs the same as a quiet one.' },
      { factor: 'Ownership', them: 'A service you subscribe to.', us: 'Configuration, voice and data in accounts you own.' },
    ],
    chooseThem: [
      'Your callers are often distressed or need a human judgment call on every conversation.',
      'Your call volume is low and steady, so a small minute bucket covers it.',
      'Your industry or clients require a human to answer.',
    ],
    chooseUs: [
      'You miss calls during busy seasons, storms or after hours.',
      'You want every caller qualified and the job booked on the first call.',
      'You want the receptionist to know your exact services, service area and process.',
      'You do not want a bill that rises with every ring.',
    ],
    useCases: [
      { who: 'A family law practice with emotional first calls', pick: 'Live answering service', why: 'A human voice matters most on those calls.' },
      { who: 'A roofer after a hailstorm', pick: 'AI receptionist', why: 'Hundreds of calls at once, every one answered and booked.' },
      { who: 'An HVAC company with heavy after-hours emergencies', pick: 'AI receptionist', why: 'Answers at 2 a.m., triages the emergency, books the visit.' },
      { who: 'A solo consultant with five calls a week', pick: 'Either', why: 'Low volume. Pick on voice and how you want callers handled.' },
    ],
    faqs: [
      { q: 'How much does Ruby cost?', a: 'Per ruby.com/pricing on October 5, 2026: $250 a month for 50 minutes, $395 for 100, $720 for 200 (its most popular plan), and $1,725 for 500.' },
      { q: 'How much does Smith.ai cost?', a: 'Per smith.ai/pricing on October 5, 2026: Starter $300 a month for 30 calls, Basic $810 for 90, Pro $2,100 for 300, with overage from $8.50 to $11.50 a call and add-ons such as appointment booking at $1.50 a call.' },
      { q: 'Will callers know they are talking to an AI?', a: 'The voice is natural, and it says what it is if asked. Most callers care that they were answered, helped and booked.' },
      { q: 'Can I hear a Modern Mustard Seed AI receptionist?', a: 'Yes. Call (406) 312-1223. Mr. Mustard, the studio\'s own voice agent, answers around the clock.' },
    ],
    sources: [
      { label: 'Ruby pricing', url: 'https://www.ruby.com/pricing/' },
      { label: 'Smith.ai pricing', url: 'https://smith.ai/pricing' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'ai-receptionist-vs-voicemail',
    metaTitle: 'AI Receptionist vs Voicemail: What Happens to the Calls You Miss',
    metaDescription:
      'Voicemail vs an AI receptionist for a contractor or local business. What each does with a missed call, when voicemail is enough, and when an AI receptionist pays for itself.',
    eyebrow: 'AI vs voicemail',
    h1: 'AI receptionist vs voicemail',
    answer:
      'Voicemail records a message and waits for you to call back. An AI receptionist answers the call, asks the right questions, gives the caller real answers about your services and service area, and books the job before they hang up. Voicemail is enough when callers are existing customers who will wait for you. An AI receptionist is worth it when new customers are calling, because a caller who reaches voicemail can call the next business on the list.',
    themLabel: 'Voicemail',
    themShort: 'voicemail',
    usLabel: 'AI receptionist by Modern Mustard Seed',
    rows: [
      { factor: 'What the caller gets', them: 'A greeting and a beep.', us: 'A conversation: answers, a quote range if you allow it, a booked time.' },
      { factor: 'What you get', them: 'A recording to listen to later.', us: 'A booked job, a written summary and the caller\'s details.' },
      { factor: 'After hours', them: 'Same greeting and beep.', us: 'Answers and books at any hour.' },
      { factor: 'Many calls at once', them: 'Every extra caller hits voicemail too.', us: 'Answers every call at the same time.' },
      { factor: 'Cost', them: 'Usually included with your phone plan.', us: OUR_PRICE },
    ],
    chooseThem: [
      'Nearly every caller is an existing customer who will wait for a callback.',
      'You have the time to return every message within the hour.',
      'New-customer calls are rare.',
    ],
    chooseUs: [
      'New customers call you and you are often on a job, a roof or a ladder.',
      'Calls come in after hours and on weekends.',
      'You want the job booked, not a message to chase.',
    ],
    useCases: [
      { who: 'A bookkeeper with a fixed client list', pick: 'Voicemail', why: 'Clients will wait for the callback.' },
      { who: 'A one-truck plumbing business', pick: 'AI receptionist', why: 'The owner is under a sink when the next job calls.' },
      { who: 'A landscaper in spring', pick: 'AI receptionist', why: 'Calls pile up exactly when the crew is busiest.' },
    ],
    faqs: [
      { q: 'Is voicemail bad for a small business?', a: 'Not always. It works when callers already know you. It loses work when new customers can call the next business instead of leaving a message.' },
      { q: 'Can an AI receptionist transfer to me when it matters?', a: 'Yes. We set the rules: emergencies, certain callers or certain requests ring through to you.' },
      { q: 'How do I hear one?', a: 'Call (406) 312-1223. Mr. Mustard, the studio\'s own AI voice agent, answers around the clock.' },
    ],
    sources: [],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'bubble-no-code-vs-custom-app',
    metaTitle: 'Bubble and No-Code vs a Custom App: Which Should a Non-Technical Founder Choose?',
    metaDescription:
      'Bubble and Glide plan prices checked live, compared with a custom app built and handed over by Modern Mustard Seed. When no-code is the right call and when custom is.',
    eyebrow: 'No-code vs custom',
    h1: 'Bubble and no-code vs a custom-built app',
    answer:
      'No-code tools like Bubble and Glide let you build an app yourself on their platform: Bubble paid plans run $59, $209 and $549 a month billed annually, and Glide paid plans are listed at $25, $50 and $125 a month, per their pricing pages on October 5, 2026. They are the right choice for testing an idea or building an internal tool you are willing to learn and maintain. A custom app from Modern Mustard Seed is the right choice when you want it built for you, on standard code you own outright, with no platform limits or workload meters between you and your customers.',
    themLabel: 'No-code (Bubble, Glide)',
    themShort: 'no-code',
    usLabel: 'Custom app by Modern Mustard Seed',
    rows: [
      { factor: 'Price', them: 'Bubble: Free, Starter $59, Growth $209, Team $549 a month billed annually, with monthly workload unit allowances. Glide: Free, Basic $25, Plus $50, Pro $125 a month.', us: OUR_PRICE },
      { factor: 'Who builds it', them: 'You, in the platform\'s visual editor.', us: 'We do, and hand it over working.' },
      { factor: 'What you own', them: 'Your app lives on the platform. Leaving usually means rebuilding.', us: 'Standard code in your own repository, deployed in your own accounts.' },
      { factor: 'Limits', them: 'Bubble plans include set workload units a month; Glide is built for internal business apps.', us: 'Whatever the product needs, on infrastructure you control.' },
      { factor: 'Best at', them: 'Prototypes, internal tools, learning by building.', us: 'Products that customers pay for and that have to scale.' },
    ],
    chooseThem: [
      'You want to test an idea this month with almost no budget.',
      'You enjoy building and want to learn the tool.',
      'It is an internal tool for your team, not a product customers pay for.',
    ],
    chooseUs: [
      'You want the product built and in front of real users without learning a platform.',
      'You want to own the code and never be locked to one vendor.',
      'The app takes payments, handles customer data or has to grow.',
    ],
    useCases: [
      { who: 'A founder validating a marketplace idea', pick: 'Bubble', why: 'Cheap to test before committing.' },
      { who: 'A crew lead tracking jobs in a spreadsheet', pick: 'Glide', why: 'Internal app from a spreadsheet, fast.' },
      { who: 'An operator launching a paid product to the public', pick: 'Custom', why: 'Owned code, payments and room to grow.' },
    ],
    faqs: [
      { q: 'How much does Bubble cost?', a: 'Per bubble.io/pricing on October 5, 2026: Free; Starter $59, Growth $209 and Team $549 a month billed annually; Enterprise by quote. Each includes a monthly workload unit allowance.' },
      { q: 'Can Modern Mustard Seed rebuild my Bubble app?', a: 'Yes. We rebuild it as standard code you own, move your data and hand it over with a runbook.' },
      { q: 'What stack does Modern Mustard Seed build on?', a: 'Standard, widely used tools: Next.js and TypeScript, with Supabase for data and Stripe for payments, deployed in accounts in your name.' },
    ],
    sources: [
      { label: 'Bubble pricing', url: 'https://bubble.io/pricing' },
      { label: 'Glide pricing', url: 'https://www.glideapps.com/pricing' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
  {
    slug: 'in-house-developer-vs-product-studio',
    metaTitle: 'Hire a Developer In-House or Use a Product Studio? (2026)',
    metaDescription:
      'Hiring a software developer in-house vs using a product studio to build your app, site or AI system. The salary math from the Bureau of Labor Statistics, and when hiring wins.',
    eyebrow: 'Hire vs studio',
    h1: 'Hiring a developer in-house vs using a product studio',
    answer:
      'Hire in-house when software is the business itself and you will need someone building every week for years. The median annual pay for software developers in the United States was $135,980 in May 2025, per the Bureau of Labor Statistics, before benefits, recruiting and management. Use a product studio like Modern Mustard Seed when you need a product built, launched and handed over, with the operating knowledge transferred to you, so you get the asset without carrying a team.',
    themLabel: 'In-house developer',
    themShort: 'an in-house hire',
    usLabel: 'Modern Mustard Seed',
    rows: [
      { factor: 'Cost', them: 'Median annual pay for US software developers: $135,980 (BLS, May 2025), plus benefits, equipment and recruiting.', us: OUR_PRICE },
      { factor: 'Time to start', them: 'Recruiting, interviewing and onboarding first.', us: 'A discovery call, a written scope, then the build.' },
      { factor: 'Skills', them: 'One person\'s strengths. Design, AI and infrastructure may need more hires.', us: 'Design, code, AI agents, voice and deployment in one studio.' },
      { factor: 'Management', them: 'Someone on your side manages, reviews and retains them.', us: 'We own delivery. You review the product.' },
      { factor: 'After launch', them: 'They stay, and so does the payroll.', us: 'Full hand off: code, access and operating knowledge. Changes to what we built stay included.' },
    ],
    chooseThem: [
      'Software is your core product and will need daily work for years.',
      'You have someone technical to hire and manage engineers.',
      'You need a person in the building every day.',
    ],
    chooseUs: [
      'You run a business that works and want a product built without hiring a team.',
      'You need several skills for one build and do not want several hires.',
      'You want to own the result and run it yourself.',
    ],
    useCases: [
      { who: 'A funded software startup', pick: 'In-house', why: 'Software is the company; build the team.' },
      { who: 'A contractor launching a customer portal', pick: 'Studio', why: 'One product, built and handed over.' },
      { who: 'An operator starting a second business', pick: 'Studio', why: 'The asset without the payroll.' },
    ],
    faqs: [
      { q: 'How much does it cost to hire a software developer?', a: 'The Bureau of Labor Statistics puts the median annual pay for US software developers at $135,980 as of May 2025. Total cost is higher once benefits, recruiting and equipment are added.' },
      { q: 'What happens when the studio is done?', a: 'The Hand Off transfers the code, every account and a runbook, so you or anyone you hire can operate it. Changes to what we built remain included.' },
      { q: 'What is the Idea to Product program?', a: 'Four tiers: Scope and Sequence (the build plan), Build and Ship (the product in front of real users), Launch (the product goes to market), Hand Off (full transfer of the asset and operating knowledge).' },
    ],
    sources: [
      { label: 'US Bureau of Labor Statistics, Software Developers', url: 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm' },
    ],
    checked: CHECKED,
    published: CHECKED,
  },
];

export const comparePageBySlug: Record<string, ComparePage> = Object.fromEntries(
  comparePages.map((p) => [p.slug, p]),
);
