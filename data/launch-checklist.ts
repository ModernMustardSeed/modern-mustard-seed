/**
 * The New Business Launch Checklist. Every step a new business owner needs to
 * open and digitize a business, tailored by vertical, with how-tos, official
 * links, and the Modern Mustard Seed offering that does it for them.
 *
 * Powers three surfaces:
 *  - the in-portal checklist clients work through (components/portal/LaunchChecklist)
 *  - the public interactive lead magnet (app/launch-checklist)
 *  - the branded PDF one-pager (lib/launch-checklist-pdf)
 *
 * Keep links official (.gov, the actual tool) and notes specific. No fluff.
 */

export type VerticalId =
  | 'general'
  | 'home-field-trades'
  | 'food-retail-ecom'
  | 'health-beauty-wellness'
  | 'pro-creative-realestate';

export type Vertical = {
  id: VerticalId;
  label: string;
  emoji: string;
  blurb: string;
  examples: string;
};

export const VERTICALS: Vertical[] = [
  {
    id: 'general',
    label: 'General / Other',
    emoji: '🌱',
    blurb: 'The universal path every new business walks. A smart default for any field.',
    examples: 'Any new business, any industry.',
  },
  {
    id: 'home-field-trades',
    label: 'Home, Field Service & Trades',
    emoji: '🔧',
    blurb: 'Licensed, bonded, booked. Built for crews in the field and phones that cannot ring out.',
    examples: 'Landscaping, HVAC, cleaning, contractors, auto, powersports, handyman, plumbing, electrical.',
  },
  {
    id: 'food-retail-ecom',
    label: 'Food, Retail & Ecommerce',
    emoji: '🛍️',
    blurb: 'Permitted, stocked, and sellable online and off. Built for storefronts and carts.',
    examples: 'Restaurants, cafes, food trucks, boutiques, online stores, apparel and CPG brands.',
  },
  {
    id: 'health-beauty-wellness',
    label: 'Health, Beauty, Wellness & Fitness',
    emoji: '💆',
    blurb: 'Credentialed, insured, and fully booked. Built around appointments and memberships.',
    examples: 'Salons, spas, med-spa, gyms, studios, coaches, practitioners, lifestyle brands.',
  },
  {
    id: 'pro-creative-realestate',
    label: 'Professional, Creative & Real Estate',
    emoji: '💼',
    blurb: 'Positioned, contracted, and pipeline-ready. Built for expertise that sells on trust.',
    examples: 'Consultants, agencies, B2B services, law, finance, realtors, photographers, creators.',
  },
];

export const verticalById = (id: string): Vertical =>
  VERTICALS.find((v) => v.id === id) || VERTICALS[0];

export type Phase = {
  id: string;
  title: string;
  eyebrow: string;
  blurb: string;
};

export const PHASES: Phase[] = [
  { id: 'official', title: 'Make it official', eyebrow: 'Phase 1', blurb: 'The legal foundation. Do these first so everything after is in your name and protected.' },
  { id: 'money', title: 'Money and books', eyebrow: 'Phase 2', blurb: 'Separate business money from personal, get paid cleanly, and keep the books from day one.' },
  { id: 'local', title: 'Get found locally', eyebrow: 'Phase 3', blurb: 'Show up on the map and in search the moment someone nearby looks for what you do.' },
  { id: 'online', title: 'Your online home', eyebrow: 'Phase 4', blurb: 'A domain, a real website, and a brand that looks like the business you are becoming.' },
  { id: 'systems', title: 'Systems that run it', eyebrow: 'Phase 5', blurb: 'The CRM, AI agents, and automations that answer, book, and follow up while you work.' },
  { id: 'customers', title: 'Get customers', eyebrow: 'Phase 6', blurb: 'Funnels, lead magnets, ads, and social that turn attention into booked, paying work.' },
];

export type ChecklistLink = { label: string; url: string; official?: boolean };
export type MmsCta = { label: string; href: string };

export type ChecklistItem = {
  id: string;
  phase: string;
  title: string;
  why: string;
  steps: string[];
  links?: ChecklistLink[];
  /** 'all' = applies to every vertical. Otherwise only the listed verticals. */
  verticals: 'all' | VerticalId[];
  /** Per-vertical extra note appended when that vertical is selected. */
  notes?: Partial<Record<VerticalId, string>>;
  /** The Modern Mustard Seed offering that does this for them. */
  mms?: MmsCta;
  /** Quick-glance effort/cost so owners can plan. */
  time?: string;
  cost?: string;
};

const DO_IT_FOR_YOU: MmsCta = { label: 'Have us build it', href: '/work-with-us' };

export const ITEMS: ChecklistItem[] = [
  // ───────────────────────── Phase 1: Make it official ─────────────────────────
  {
    id: 'structure',
    phase: 'official',
    title: 'Choose your business structure',
    why: 'It decides your taxes, your paperwork, and whether your personal assets are on the hook.',
    steps: [
      'For most new owners, an LLC is the sweet spot: liability protection without corporate overhead.',
      'Sole proprietorship is simplest but offers zero personal protection. Avoid it once real money moves.',
      'Ask a CPA whether an S-corp election will save you on self-employment tax once you clear roughly 60K profit.',
    ],
    links: [
      { label: 'SBA: choose a structure', url: 'https://www.sba.gov/business-guide/launch-your-business/choose-business-structure', official: true },
      { label: 'IRS: business structures', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/business-structures', official: true },
    ],
    verticals: 'all',
    time: '1 hour to decide',
    cost: 'Free',
    notes: {
      'home-field-trades': 'Trades carry real injury and property risk, so an LLC (not sole prop) is close to non-negotiable here.',
      'health-beauty-wellness': 'If you take payment for services on bodies, the liability shield of an LLC matters. Pair it with professional liability insurance below.',
    },
  },
  {
    id: 'form-llc',
    phase: 'official',
    title: 'Form your LLC with the state',
    why: 'This is the moment your business legally exists and your name is reserved.',
    steps: [
      'File Articles of Organization with your Secretary of State (online, usually same week).',
      'Appoint a registered agent (you can be your own, or use a service for privacy).',
      'Write a simple operating agreement, even as a single member. Banks and partners ask for it.',
    ],
    links: [
      { label: 'Find your state filing office', url: 'https://www.sba.gov/business-guide/launch-your-business/register-your-business', official: true },
      { label: 'Montana: file with the SOS', url: 'https://biz.sosmt.gov/', official: true },
    ],
    verticals: 'all',
    time: '30 to 60 minutes',
    cost: '$35 to $300 state fee',
  },
  {
    id: 'ein',
    phase: 'official',
    title: 'Get your EIN (free from the IRS)',
    why: 'Your business social security number. You need it to open a bank account, hire, and file taxes.',
    steps: [
      'Apply directly on IRS.gov. It is free and you get the number instantly.',
      'Never pay a third-party site that charges for an EIN. They are reselling a free government service.',
      'Save the EIN confirmation letter (CP 575) somewhere you will find it in a year.',
    ],
    links: [{ label: 'Apply for an EIN (IRS, free)', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online', official: true }],
    verticals: 'all',
    time: '15 minutes',
    cost: 'Free',
  },
  {
    id: 'name-trademark',
    phase: 'official',
    title: 'Lock your name, DBA, and trademark',
    why: 'Build a brand on a name someone else owns and you can be forced to rebrand later.',
    steps: [
      'Search your state business registry and the USPTO to confirm the name is free.',
      'File a DBA (assumed name) if you will operate under a name different from the LLC.',
      'Grab the matching domain and social handles the same day (see the online phase).',
      'For a name you will invest in heavily, file a federal trademark.',
    ],
    links: [
      { label: 'USPTO trademark search', url: 'https://www.uspto.gov/trademarks/search', official: true },
    ],
    verticals: 'all',
    time: '1 hour',
    cost: 'DBA $10 to $50, trademark from $250',
  },
  {
    id: 'licenses',
    phase: 'official',
    title: 'Get your licenses and permits',
    why: 'Operating without the right license can mean fines, shutdowns, and uninsurable claims.',
    steps: [
      'Check requirements at three levels: federal (rare), state, and city or county.',
      'Most cities require a basic business license or tax registration to operate at all.',
      'Build the renewal dates into a calendar now so nothing lapses.',
    ],
    links: [
      { label: 'SBA: licenses and permits', url: 'https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits', official: true },
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'Most trades need a state contractor or specialty license plus a surety bond. Electrical, plumbing, HVAC, and general contracting almost always do. Check your state licensing board before you take a paid job.',
      'food-retail-ecom': 'Food service needs a health department permit and food handler or manager certification. Selling food means inspections. Retail needs a seller permit. Alcohol needs a separate liquor license with a long lead time, so start it early.',
      'health-beauty-wellness': 'Cosmetology, massage, esthetics, and medical services each require a state board license for you and often an establishment license for the space. Med-spa services may need physician oversight.',
      'pro-creative-realestate': 'Real estate, legal, accounting, and financial services require state professional licensing. Most pure consulting and creative work does not, but still needs the basic city business license.',
    },
    time: 'Varies, start early',
    cost: '$50 to $1,000+',
  },
  {
    id: 'insurance',
    phase: 'official',
    title: 'Get business insurance',
    why: 'One claim without coverage can erase the business and reach your personal assets.',
    steps: [
      'Start with general liability. It covers the most common third-party claims.',
      'Add a Business Owner Policy (BOP) to bundle liability with property coverage cheaply.',
      'Add workers comp the moment you have employees (required in most states).',
    ],
    links: [{ label: 'SBA: get business insurance', url: 'https://www.sba.gov/business-guide/launch-your-business/get-business-insurance', official: true }],
    verticals: 'all',
    notes: {
      'home-field-trades': 'You need general liability plus commercial auto for vehicles and tools, and a surety bond if your license requires one. Workers comp is mandatory the day you put a crew on a job.',
      'food-retail-ecom': 'Add product liability (especially for anything ingested or applied to skin) and, if you serve alcohol, liquor liability. Ecommerce sellers still need product liability.',
      'health-beauty-wellness': 'Add professional liability (malpractice) on top of general liability. Bodywork, injectables, and fitness coaching all carry real claim risk.',
      'pro-creative-realestate': 'Add professional liability (errors and omissions). It covers claims that your advice, design, or service caused a financial loss.',
    },
    time: '1 to 2 hours to quote',
    cost: '$40 to $200/mo',
  },

  // ───────────────────────── Phase 2: Money and books ─────────────────────────
  {
    id: 'bank',
    phase: 'money',
    title: 'Open a business bank account',
    why: 'Mixing business and personal money pierces your liability shield and wrecks your taxes.',
    steps: [
      'Bring your EIN, your formation documents, and your ID to a bank or open online.',
      'Get a business debit card and, once you have revenue, a business credit card to build credit.',
      'Keep every business dollar flowing through this account only.',
    ],
    links: [{ label: 'SBA: open a business bank account', url: 'https://www.sba.gov/business-guide/launch-your-business/open-business-bank-account', official: true }],
    verticals: 'all',
    time: '30 to 60 minutes',
    cost: 'Free to $25/mo',
  },
  {
    id: 'bookkeeping',
    phase: 'money',
    title: 'Set up bookkeeping',
    why: 'The owners who track from day one keep more at tax time and always know if they are profitable.',
    steps: [
      'Pick a tool: QuickBooks, Wave (free), or Xero. Connect your business bank account.',
      'Categorize expenses weekly, not at year end. It takes ten minutes when you stay on top of it.',
      'Set aside 25 to 30 percent of profit for taxes in a separate account.',
    ],
    links: [
      { label: 'Wave (free accounting)', url: 'https://www.waveapps.com/' },
      { label: 'QuickBooks', url: 'https://quickbooks.intuit.com/' },
    ],
    verticals: 'all',
    time: '1 hour to set up',
    cost: 'Free to $30/mo',
  },
  {
    id: 'payments',
    phase: 'money',
    title: 'Set up how you get paid',
    why: 'Make it effortless to pay you and you get paid faster, more often, and in full.',
    steps: [
      'For invoices and online sales, Stripe is the standard. For in-person, Square or Stripe Terminal.',
      'Turn on cards, Apple Pay, and ACH. Offer deposits for bigger jobs.',
      'Automate receipts and payment reminders so you are not chasing money.',
    ],
    links: [
      { label: 'Stripe', url: 'https://stripe.com/' },
      { label: 'Square', url: 'https://squareup.com/' },
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'Take a deposit before the job and the balance on completion. Field service apps (below) can collect payment on site the moment work is done.',
      'food-retail-ecom': 'You need a real POS. Square or Toast for food, Square or Shopify POS for retail. Connect it to your inventory and your books.',
      'health-beauty-wellness': 'Use a booking tool that takes payment and deposits up front so no-shows stop costing you. Sell packages and memberships, not just single visits.',
    },
    mms: { label: 'We wire payments end to end', href: '/work-with-us' },
    time: '1 to 2 hours',
    cost: '~2.9% per transaction',
  },
  {
    id: 'sales-tax',
    phase: 'money',
    title: 'Register for sales tax',
    why: 'Collect the wrong amount, or none, and the state will come back for it with penalties.',
    steps: [
      'Register with your state revenue department if you sell taxable goods or services.',
      'Get a resale or seller permit so you do not pay tax on inventory you resell.',
      'Use your POS or Stripe Tax to calculate and file automatically.',
    ],
    links: [{ label: 'Find your state tax office', url: 'https://www.sba.gov/business-guide/manage-your-business/pay-taxes', official: true }],
    verticals: 'all',
    notes: {
      'food-retail-ecom': 'You almost certainly collect sales tax. Ecommerce sellers also owe tax in states where they hit economic nexus, so use automated tax software early.',
      'pro-creative-realestate': 'Many pure services are not taxable, but rules vary by state and some creative deliverables are. Confirm before you assume you are exempt.',
    },
    time: '30 minutes',
    cost: 'Usually free to register',
  },

  // ───────────────────────── Phase 3: Get found locally ─────────────────────────
  {
    id: 'google-business',
    phase: 'local',
    title: 'Claim and verify your Google Business Profile',
    why: 'It is the single highest-leverage free listing. It puts you on Maps and in the local pack.',
    steps: [
      'Create or claim the profile, then complete every field: hours, services, photos, service area.',
      'Verify (by video, postcard, or phone). You are not visible on Maps until you do.',
      'Add real photos and post updates. Active profiles outrank dormant ones.',
    ],
    links: [{ label: 'Google Business Profile', url: 'https://www.google.com/business/', official: true }],
    verticals: 'all',
    notes: {
      'home-field-trades': 'Set a service area rather than a storefront address if you go to customers. List every service as a separate category so you show up for each one.',
      'food-retail-ecom': 'Add your menu or product categories, link online ordering, and keep hours perfect. Food and retail live or die by reviews and photos here.',
      'health-beauty-wellness': 'Connect your booking link so people can book straight from the profile, and turn on the services and team sections.',
    },
    mms: { label: 'We set up and optimize it', href: '/work-with-us' },
    time: '1 hour + verification wait',
    cost: 'Free',
  },
  {
    id: 'bing-apple',
    phase: 'local',
    title: 'Add Bing Places and Apple Business Connect',
    why: 'Apple Maps and Bing power Siri, ChatGPT, and millions of searches Google never sees.',
    steps: [
      'Claim Apple Business Connect so you appear in Apple Maps and Siri.',
      'Claim Bing Places. Bing increasingly feeds AI answers in Copilot and ChatGPT.',
      'Keep name, address, and phone identical across all three to avoid hurting local ranking.',
    ],
    links: [
      { label: 'Apple Business Connect', url: 'https://businessconnect.apple.com/', official: true },
      { label: 'Bing Places', url: 'https://www.bingplaces.com/', official: true },
    ],
    verticals: 'all',
    time: '45 minutes',
    cost: 'Free',
  },
  {
    id: 'directories',
    phase: 'local',
    title: 'List in the directories that matter for your field',
    why: 'The right niche directories send ready-to-buy traffic and feed your search ranking.',
    steps: [
      'Claim the general ones: Yelp, Facebook, Nextdoor.',
      'Then claim the directories specific to your industry where buyers actually look.',
      'Keep your details identical everywhere (consistent NAP is a real ranking signal).',
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'Angi, HomeAdvisor, Thumbtack, and Nextdoor drive real local jobs. Nextdoor word of mouth is gold for home services.',
      'food-retail-ecom': 'Yelp, DoorDash, Uber Eats, and Google food ordering for restaurants. Google Shopping and a marketplace presence for retail and ecommerce.',
      'health-beauty-wellness': 'Vagaro, Booksy, Fresha, Healthgrades, ClassPass, and Mindbody depending on your service. These are booking engines and directories in one.',
      'pro-creative-realestate': 'Clutch and Google for agencies, Zillow and Realtor.com for real estate, Avvo for legal, LinkedIn and industry associations for consultants.',
    },
    time: '1 to 2 hours',
    cost: 'Free to list',
  },
  {
    id: 'reviews',
    phase: 'local',
    title: 'Turn on a reviews engine',
    why: 'Reviews are the deciding factor in local choice and a top driver of Maps ranking.',
    steps: [
      'Ask every happy customer for a review the moment the job is done or the meal is great.',
      'Send a direct link by text. The fewer taps, the more reviews you get.',
      'Respond to every review, good or bad. It signals an active, trustworthy business.',
    ],
    verticals: 'all',
    mms: { label: 'We automate review requests', href: '/work-with-us' },
    time: 'Ongoing',
    cost: 'Free, or automated by us',
  },

  // ───────────────────────── Phase 4: Your online home ─────────────────────────
  {
    id: 'domain',
    phase: 'online',
    title: 'Buy your domain',
    why: 'Your domain is the one piece of online real estate you fully own. Get it before someone else does.',
    steps: [
      'Buy the .com if you can. Keep it short and easy to say out loud.',
      'Use a clean registrar (Cloudflare or Namecheap) and turn on auto-renew and privacy.',
      'Grab the matching social handles the same day.',
    ],
    links: [
      { label: 'Cloudflare Registrar (at cost)', url: 'https://www.cloudflare.com/products/registrar/' },
      { label: 'Namecheap', url: 'https://www.namecheap.com/' },
    ],
    verticals: 'all',
    time: '20 minutes',
    cost: '$10 to $20/yr',
  },
  {
    id: 'email',
    phase: 'online',
    title: 'Set up professional email',
    why: 'you@yourbusiness.com closes more than yourbusiness@gmail.com. It signals you are real.',
    steps: [
      'Set up Google Workspace or Microsoft 365 on your domain.',
      'Create role addresses like hello@ and billing@ alongside your name.',
      'Add a clean signature with your logo, phone, and booking link.',
    ],
    links: [{ label: 'Google Workspace', url: 'https://workspace.google.com/' }],
    verticals: 'all',
    time: '30 minutes',
    cost: '~$6/user/mo',
  },
  {
    id: 'brand',
    phase: 'online',
    title: 'Nail your brand basics',
    why: 'A consistent look and a clear one-liner make a one-person shop look like an established company.',
    steps: [
      'Lock a logo, two or three colors, and one font pairing.',
      'Write a one-line description of what you do and who you do it for.',
      'Use them identically everywhere: site, profiles, invoices, signage.',
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'Put the logo on the truck and the crew shirts. A wrapped vehicle is a moving billboard that pays for itself.',
      'food-retail-ecom': 'Your packaging and storefront are your brand. Carry the look from the website to the bag the customer walks out with.',
    },
    mms: { label: 'We design your brand identity', href: '/work-with-us' },
    time: 'A few days',
    cost: 'DIY or done-for-you',
  },
  {
    id: 'website',
    phase: 'online',
    title: 'Get a real website',
    why: 'Most buyers check your site before they call. A weak one quietly costs you the job.',
    steps: [
      'You need a fast, mobile-first site with clear services, proof, and one obvious next step.',
      'Skip the bloated template builders. They are slow, generic, and hard to rank.',
      'Wire in lead capture, booking, and analytics from day one, not later.',
    ],
    verticals: 'all',
    notes: {
      'food-retail-ecom': 'Ecommerce needs a real store (Shopify or a custom build) with product pages, cart, and checkout that convert. Restaurants need menu, hours, and online ordering front and center.',
      'pro-creative-realestate': 'Lead with proof: case studies, portfolio, and results. Trust is your conversion engine.',
      'health-beauty-wellness': 'Make booking the hero of the homepage. Every section should funnel toward an appointment.',
    },
    mms: { label: 'We build sites that convert', href: '/work-with-us' },
    time: '2 to 4 weeks',
    cost: 'Our core build',
  },
  {
    id: 'seo-geo',
    phase: 'online',
    title: 'Lay an SEO and GEO foundation',
    why: 'Get found on Google AND inside AI answers (ChatGPT, Perplexity, Gemini), where buyers increasingly start.',
    steps: [
      'Cover the basics: titles, meta, fast pages, a sitemap, and local schema markup.',
      'Add GEO: structured data, an llms.txt, and clear factual content so AI tools cite you.',
      'Publish a few pages that answer the exact questions your customers ask.',
    ],
    links: [{ label: 'Google Search Console', url: 'https://search.google.com/search-console/about', official: true }],
    verticals: 'all',
    mms: { label: 'We build SEO + GEO in', href: '/work-with-us' },
    time: 'Ongoing',
    cost: 'Built into our sites',
  },

  // ───────────────────────── Phase 5: Systems that run it ─────────────────────────
  {
    id: 'crm',
    phase: 'systems',
    title: 'Set up a CRM',
    why: 'A lead that falls through the cracks is revenue you already paid to earn. A CRM stops the leak.',
    steps: [
      'Capture every lead in one place: form fills, calls, DMs, and walk-ins.',
      'Track each one through stages so you always know who needs a follow-up.',
      'Automate the reminders so nobody goes cold because you got busy.',
    ],
    verticals: 'all',
    mms: { label: 'We build a CRM around you', href: '/work-with-us' },
    time: '1 to 2 weeks',
    cost: 'Custom or off-the-shelf',
  },
  {
    id: 'ai-sdr',
    phase: 'systems',
    title: 'Put an AI agent on the front line',
    why: 'Most leads call or message once. An AI voice and chat agent answers 24/7, qualifies, and books while you work.',
    steps: [
      'Add an AI chat agent to your site and an AI voice agent on your phone line.',
      'It answers common questions, qualifies the lead, and books the appointment automatically.',
      'Every conversation lands in your CRM with notes, so nothing is lost.',
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'The after-hours call you miss is the job your competitor takes. An AI agent answers at 9pm and books the estimate.',
      'food-retail-ecom': 'Handle reservations, order questions, and hours automatically so staff stay on the floor.',
      'health-beauty-wellness': 'Fill the book and the cancellations list automatically, and cut no-shows with confirmations and reminders.',
      'pro-creative-realestate': 'Qualify and intake new inquiries so only fit, ready prospects reach your calendar.',
    },
    mms: { label: 'Meet Mr. Mustard, our AI SDR', href: '/voice-agents' },
    time: '1 to 2 weeks',
    cost: 'Our specialty',
  },
  {
    id: 'booking',
    phase: 'systems',
    title: 'Turn on online booking',
    why: 'Letting people book themselves, day or night, captures the business you lose to phone tag.',
    steps: [
      'Put a booking link on your site, your Google profile, and your social bios.',
      'Take a deposit at booking to kill no-shows.',
      'Sync it to your calendar and send automatic confirmations and reminders.',
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'Book estimates and service windows online so the schedule fills without back-and-forth.',
      'health-beauty-wellness': 'This is the core of your operation. Use a tool that handles staff, rooms, packages, and memberships.',
    },
    mms: { label: 'We wire booking into your stack', href: '/work-with-us' },
    time: '2 to 5 days',
    cost: 'Tool or custom',
  },
  {
    id: 'automations',
    phase: 'systems',
    title: 'Automate the busywork',
    why: 'Every repetitive task you automate is hours back and one less thing that gets forgotten.',
    steps: [
      'Map the tasks you do the same way every time: intake, quoting, reminders, invoicing, review requests.',
      'Wire them to run automatically when a trigger fires (new lead, job done, payment received).',
      'Connect your tools so data flows without copy-paste.',
    ],
    verticals: 'all',
    mms: { label: 'We build your back-office automations', href: '/work-with-us' },
    time: 'Ongoing',
    cost: 'Custom builds',
  },

  // ───────────────────────── Phase 6: Get customers ─────────────────────────
  {
    id: 'social',
    phase: 'customers',
    title: 'Set up the right social profiles',
    why: 'You do not need every platform. You need the one or two where your buyers actually are.',
    steps: [
      'Claim your handle everywhere so nobody else can. Then go deep on one or two.',
      'Use a consistent profile photo, bio, link, and a clear what-you-do line.',
      'Post proof of work, not just promotions. Show the result you deliver.',
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'Facebook and Nextdoor for local trust, plus before-and-after photos. Instagram and TikTok for visual trades like landscaping and detailing.',
      'food-retail-ecom': 'Instagram and TikTok are non-negotiable. Food and product sell on visuals and short video.',
      'health-beauty-wellness': 'Instagram and TikTok for transformation and results. Reels of real outcomes book appointments.',
      'pro-creative-realestate': 'LinkedIn for B2B and consultants, Instagram for real estate and creative portfolios.',
    },
    time: 'Ongoing',
    cost: 'Free',
  },
  {
    id: 'lead-magnet',
    phase: 'customers',
    title: 'Create a lead magnet',
    why: 'Most visitors are not ready to buy yet. A free, genuinely useful offer captures them so you can earn the sale.',
    steps: [
      'Offer something quick and valuable: a guide, a quote tool, a checklist, a free estimate.',
      'Gate it behind an email (and phone) so you can follow up.',
      'Deliver it instantly and start a short nurture sequence.',
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'A free instant quote or a seasonal maintenance checklist works well and pre-qualifies the lead.',
      'food-retail-ecom': 'A first-order discount or a VIP list for drops and specials builds a list fast.',
      'health-beauty-wellness': 'A free consult, a first-visit offer, or a self-assessment quiz converts well.',
      'pro-creative-realestate': 'A teardown, an audit, or a benchmark report positions you as the expert and starts the relationship.',
    },
    mms: { label: 'We build interactive lead magnets', href: '/work-with-us' },
    time: '1 week',
    cost: 'Custom',
  },
  {
    id: 'funnel',
    phase: 'customers',
    title: 'Build a funnel',
    why: 'A funnel turns a click into a booked job on purpose instead of by luck.',
    steps: [
      'Map the path: ad or post, to landing page, to lead capture, to nurture, to booked or bought.',
      'Make one clear next step on every page. No dead ends.',
      'Follow up automatically by email and text until they book or opt out.',
    ],
    verticals: 'all',
    mms: { label: 'We design the whole funnel', href: '/work-with-us' },
    time: '1 to 2 weeks',
    cost: 'Custom',
  },
  {
    id: 'ads',
    phase: 'customers',
    title: 'Turn on ads once the funnel converts',
    why: 'Ads pour fuel on a funnel that works. Run them before it works and you just burn cash faster.',
    steps: [
      'Prove the funnel converts organic traffic first, then scale with paid.',
      'Start with Google for high-intent search and Meta for local awareness and retargeting.',
      'Track cost per lead and cost per booked job, and only scale what is profitable.',
    ],
    verticals: 'all',
    notes: {
      'home-field-trades': 'Google Local Services Ads (the green checkmark) and search ads catch people who need you right now. Add Meta for brand and retargeting.',
      'food-retail-ecom': 'Meta and TikTok ads for discovery, Google Shopping for product intent. Retarget cart abandoners.',
      'pro-creative-realestate': 'LinkedIn and Google for B2B and high-intent. Meta retargeting for warm audiences.',
    },
    mms: { label: 'We build and run the ad system', href: '/work-with-us' },
    time: 'Ongoing',
    cost: 'Ad spend + management',
  },
  {
    id: 'email-sms',
    phase: 'customers',
    title: 'Own your audience with email and SMS',
    why: 'Social platforms rent you an audience. Email and SMS lists are yours, and they sell on demand.',
    steps: [
      'Collect emails and phone numbers at every touchpoint (with consent).',
      'Send a simple, regular note: an offer, an update, something useful.',
      'Automate the win-back and the rebook so past customers come back.',
    ],
    verticals: 'all',
    mms: { label: 'We set up lifecycle marketing', href: '/work-with-us' },
    time: 'Ongoing',
    cost: 'Low monthly tool',
  },
  {
    id: 'analytics',
    phase: 'customers',
    title: 'Track what actually works',
    why: 'Without tracking you are guessing. With it you double down on what brings paying customers.',
    steps: [
      'Install analytics and conversion tracking on the site and the funnel.',
      'Track the metrics that matter: leads, booked jobs, cost per acquisition, revenue.',
      'Review monthly and move budget toward what works.',
    ],
    links: [{ label: 'Google Analytics', url: 'https://analytics.google.com/', official: true }],
    verticals: 'all',
    mms: { label: 'We wire analytics in by default', href: '/work-with-us' },
    time: 'A few hours',
    cost: 'Free tools',
  },

  // ───────────────────────── Vertical-only extras ─────────────────────────
  {
    id: 'field-software',
    phase: 'systems',
    title: 'Run jobs on field service software',
    why: 'Scheduling, dispatch, estimates, and invoicing in one app is the difference between a job and a business.',
    steps: [
      'Pick a field service platform: Jobber, Housecall Pro, or ServiceTitan for larger crews.',
      'Run scheduling, dispatch, estimates, invoicing, and on-site payment through it.',
      'Connect it to your CRM and books so data flows without re-entry.',
    ],
    links: [
      { label: 'Jobber', url: 'https://getjobber.com/' },
      { label: 'Housecall Pro', url: 'https://www.housecallpro.com/' },
    ],
    verticals: ['home-field-trades'],
    mms: { label: 'We connect it to your whole stack', href: '/work-with-us' },
    time: '1 week',
    cost: '$50 to $300/mo',
  },
  {
    id: 'food-pos-ordering',
    phase: 'systems',
    title: 'Set up POS and online ordering',
    why: 'Your POS is the heart of the operation. Tie it to online ordering and delivery to capture every sale.',
    steps: [
      'Choose a POS built for your format: Toast or Square for Restaurants for food, Shopify or Square for retail.',
      'Turn on first-party online ordering so you keep the margin third-party apps take.',
      'Connect delivery platforms but drive customers to order direct.',
    ],
    links: [
      { label: 'Toast', url: 'https://pos.toasttab.com/' },
      { label: 'Square for Restaurants', url: 'https://squareup.com/us/en/point-of-sale/restaurants' },
    ],
    verticals: ['food-retail-ecom'],
    mms: { label: 'We build direct ordering that keeps your margin', href: '/work-with-us' },
    time: '1 to 2 weeks',
    cost: 'Hardware + monthly',
  },
  {
    id: 'inventory-fulfillment',
    phase: 'money',
    title: 'Set up inventory and fulfillment',
    why: 'Run out of your bestseller or oversell what you do not have and you lose the customer and the trust.',
    steps: [
      'Track inventory in your POS or store platform so stock stays accurate across channels.',
      'For ecommerce, set up shipping, labels, and a fulfillment flow (or a 3PL as you grow).',
      'Set reorder points so you restock before you sell out.',
    ],
    verticals: ['food-retail-ecom'],
    time: '1 week',
    cost: 'Built into POS',
  },
  {
    id: 'memberships',
    phase: 'money',
    title: 'Sell packages and memberships',
    why: 'Recurring revenue and prepaid packages smooth your cash flow and lock in repeat visits.',
    steps: [
      'Bundle visits into packages and offer a monthly membership for your regulars.',
      'Use your booking tool to sell, track, and auto-renew them.',
      'Reward members so they stay and refer.',
    ],
    verticals: ['health-beauty-wellness'],
    mms: { label: 'We build membership billing', href: '/work-with-us' },
    time: '3 to 5 days',
    cost: 'Tool or custom',
  },
  {
    id: 'contracts-esign',
    phase: 'systems',
    title: 'Use contracts, proposals, and e-sign',
    why: 'Clear scope and a signed agreement protect your time, your payment, and the relationship.',
    steps: [
      'Use proposal and e-sign software so prospects can sign and pay in one step.',
      'Template your scope, terms, and deposit so every deal goes out fast and consistent.',
      'Collect a deposit on signature so work starts on solid ground.',
    ],
    links: [{ label: 'PandaDoc', url: 'https://www.pandadoc.com/' }],
    verticals: ['pro-creative-realestate'],
    mms: { label: 'We build proposal-to-payment flows', href: '/work-with-us' },
    time: '3 to 5 days',
    cost: 'Tool or custom',
  },
  {
    id: 'portfolio-proof',
    phase: 'online',
    title: 'Build your proof: portfolio and case studies',
    why: 'Expertise sells on evidence. Documented results turn a cold lead into a warm one before you ever talk.',
    steps: [
      'Document two or three wins as short case studies: the problem, what you did, the result.',
      'Show real work, real numbers, and real names where you can.',
      'Put the strongest proof above the fold on your site.',
    ],
    verticals: ['pro-creative-realestate'],
    mms: { label: 'We build a proof-led site', href: '/work-with-us' },
    time: '1 week',
    cost: 'Custom',
  },
];

// ───────────────────────── Helpers ─────────────────────────

export type ResolvedItem = ChecklistItem & { note?: string };
export type ResolvedPhase = Phase & { items: ResolvedItem[] };

/** Items that apply to a vertical, with the vertical-specific note resolved. */
export function itemsForVertical(verticalId: VerticalId): ResolvedItem[] {
  return ITEMS.filter((it) => it.verticals === 'all' || it.verticals.includes(verticalId)).map((it) => ({
    ...it,
    note: it.notes?.[verticalId],
  }));
}

/** Phases populated with the resolved items for a vertical (empty phases dropped). */
export function checklistForVertical(verticalId: VerticalId): ResolvedPhase[] {
  const items = itemsForVertical(verticalId);
  return PHASES.map((phase) => ({ ...phase, items: items.filter((it) => it.phase === phase.id) })).filter(
    (p) => p.items.length > 0,
  );
}

export function totalSteps(verticalId: VerticalId): number {
  return itemsForVertical(verticalId).length;
}

/** Stable ordered list of item ids for a vertical (for progress + persistence). */
export function itemIdsForVertical(verticalId: VerticalId): string[] {
  return checklistForVertical(verticalId).flatMap((p) => p.items.map((it) => it.id));
}
