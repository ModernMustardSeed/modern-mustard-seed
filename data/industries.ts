// Industry pillar pages. Each entry renders at /for/[slug] via app/for/[industry]/page.tsx.
// Optimized for LLM citation (Bing/ChatGPT/Perplexity grounding): definitive claims,
// specific numbers, named tools, real case study anchors. Roughly 1500 words per entry.

export type IndustryBuild = {
  title: string;
  body: string;
  caseStudySlug?: string;
};

export type IndustryReceipt = {
  caseStudySlug: string;
  caseStudyTitle: string;
  headline: string;
  body: string;
  metrics?: { label: string; value: string }[];
};

export type IndustryFaq = { q: string; a: string };

export type Industry = {
  slug: string;
  name: string;
  shortName: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lede: string;
  buildsHeadline: string;
  builds: IndustryBuild[];
  receipt: IndustryReceipt;
  pricing: { typicalRange: string; body: string };
  faqs: IndustryFaq[];
  cta: { headline: string; body: string };
};

export const industries: Industry[] = [
  // 1. Real Estate Investors
  {
    slug: 'real-estate-investors',
    name: 'Real Estate Investors',
    shortName: 'Investors',
    metaTitle: 'AI Tools for Real Estate Investors. What to Build First.',
    metaDescription:
      'Custom AI tools for real estate investors. Deal analyzers, virtual staging, off-market sourcing, FSBO command centers. Shipped in weeks by Modern Mustard Seed.',
    eyebrow: 'AI for Real Estate Investors',
    h1: 'AI Tools for Real Estate Investors. What to Build First',
    lede:
      'Real estate investing rewards speed and ruthlessness. Most investors spend two hours on the math of every deal that crosses the desk. By the time the underwriting is finished, the deal is gone. AI does not replace your judgment. It compresses the math, the comps, the staging, and the follow-up so you can run ten times the deals through the same brain. We build the specific AI tools active investors actually need: a deal analyzer that takes 90 seconds, virtual staging that finishes in under a minute, off-market sourcing that runs while you sleep, and a FSBO command center for the flips you do not want to hand 3% to an agent. Custom, owned by you, shipped in weeks, not months.',
    buildsHeadline: 'What we build for investors',
    builds: [
      {
        title: 'AI Deal Analyzer',
        caseStudySlug: 'ptg-deal-analyzer',
        body:
          'Paste a property address. Six AI intelligence layers running on RentCast data pull comps, calculate ARV, estimate repair cost from the property record, run the 70% rule for Maximum Allowable Offer, and surface ROI scenarios for fix-and-flip, BRRRR, and long-term rental. Output is a one-page underwriting brief in under two minutes. The PTG Deal Analyzer we shipped took an investor from analyzing four deals a week to forty.',
      },
      {
        title: 'Virtual Staging AI',
        caseStudySlug: 'luxe-design',
        body:
          'Empty room photos in, fully designed staging out in under a minute. Eight design styles, eight room types, instant download. Replaces a $3,000 traditional staging order with a sub-$100 subscription. Built for flippers who shoot listings on weekends and need to push to MLS by Monday.',
      },
      {
        title: 'FSBO Command Center',
        caseStudySlug: 'deed-ai',
        body:
          'For investors offloading flips without paying a 3% commission. DEED AI handles the listing creation, pricing analysis, offer routing, contract drafting, and showing scheduling. Replaces a $30K commission on a $1M flip with a flat-fee infrastructure that you own.',
      },
      {
        title: 'Off-Market Deal Sourcing Agent',
        body:
          'An AI agent that scans expired listings, FSBO sources, divorce filings, probate records, and tax delinquency lists for properties that match your buy-box. Sends qualified leads to a single inbox or a CRM webhook. Replaces a virtual assistant for sourcing, runs 24/7, never asks for vacation.',
      },
      {
        title: 'Lead Follow-Up Automation',
        body:
          'Inbound seller leads from your bandit signs, mailers, or PPC routed through an AI voice agent that qualifies the lead, books the call, and drops it in your CRM with notes. Same agent fires the text and email sequences for warm leads that have not yet pulled the trigger. No lead dies in voicemail.',
      },
    ],
    receipt: {
      caseStudySlug: 'ptg-deal-analyzer',
      caseStudyTitle: 'PTG AI Deal Analyzer: 2 Hours of Analysis in 90 Seconds',
      headline: 'Two hours of underwriting in 90 seconds',
      body:
        'The brief was simple: deal analysis takes 30 minutes per address. I want it to take 30 seconds. The build was the PTG AI Deal Analyzer. You paste an address. Six AI intelligence layers running on RentCast data pull comps, calculate ARV, estimate repair cost, compute Maximum Allowable Offer using the 70% rule, surface fix-and-flip and BRRRR scenarios, and output a one-page underwriting brief. The stack: Next.js, Supabase, RentCast for property data, Anthropic Claude for the underwriting reasoning, Vercel for deploy. Built and shipped in a few weeks. The investor went from analyzing four deals a week to forty. Same person. Same hours. Ten times the throughput. This is what specialty AI tools actually do for investors. They do not replace your buy-box, your gut, or your relationships. They compress the parts of the workflow that should never have been manual in the first place.',
      metrics: [
        { label: 'Analysis time', value: '2 hr → 90 sec' },
        { label: 'Deals per week', value: '4 → 40' },
        { label: 'Build duration', value: '2 to 4 weeks' },
      ],
    },
    pricing: {
      typicalRange: 'Quoted after a free Bottleneck Breaker',
      body:
        'A custom deal analyzer like the PTG build is scoped to your data sources and the depth of the underwriting model. Virtual staging tools come in lighter, and a full investor OS that includes deal analysis, sourcing, follow-up, and reporting is the larger build. The free Bottleneck Breaker is the right first step. We tell you in 60 minutes which build is highest leverage for your model and what it would cost. Every project is quoted in writing before any work begins. Most investors split into milestone payments so the cost lines up with deal flow.',
    },
    faqs: [
      {
        q: 'What kind of AI tools work best for real estate investors?',
        a: 'The four highest-leverage AI tools for active investors are: (1) a deal analyzer that pulls comps and outputs a buy decision in under two minutes, (2) virtual staging that turns empty flips into MLS-ready listings without paying a stager, (3) an off-market sourcing agent that scans expired listings, FSBO sources, and public records for fit, and (4) a voice agent that qualifies and books seller leads 24/7. These four cover the entire investor workflow from acquisition to disposition. The tools that fail are generic AI chatbots and one-size-fits-all "investor CRMs" that do not understand your buy-box.',
      },
      {
        q: 'How much does it cost to build a custom AI deal analyzer?',
        a: 'A production-grade AI deal analyzer like the PTG build is scoped to the data sources you want connected (RentCast, ATTOM, MLS, Zillow scraping) and the depth of the underwriting model. Shipping timeline is two to four weeks from kickoff. You own the code, the database, and the AI prompts when it is done. There is no SaaS subscription on the underlying tool because you are not renting it. Most investors recoup the build cost on the first deal it surfaces or saves.',
      },
      {
        q: 'How is this different from DealCheck, PropStream, or Privy?',
        a: 'DealCheck and PropStream are off-the-shelf tools built for the average investor. They cap at the analysis their UI supports. A custom AI deal analyzer is shaped to your exact buy-box: your rehab cost assumptions per market, your preferred rent comps source, your specific ROI thresholds, and your reporting style. You are not paying $50 a month forever and praying they add the feature you need. You own the tool. You change it when your strategy changes. Most active investors who run more than five deals a quarter outgrow off-the-shelf tools within a year.',
      },
      {
        q: 'Can the AI handle BRRRR, fix-and-flip, and long-term rental analysis?',
        a: 'Yes. The PTG Deal Analyzer runs all three scenarios in parallel on a single address. Fix-and-flip calculates ARV, repair budget, 70% rule MAO, holding cost, and exit profit. BRRRR computes refinance equity, cash-out potential, and post-refi cashflow. Long-term rental projects gross rent, vacancy, opex, debt service, and cap rate. The output is a single underwriting brief that tells you which strategy the property actually supports. You can also restrict the model to your preferred strategy and skip the rest.',
      },
      {
        q: 'How fast can you ship a working tool?',
        a: 'A few weeks from kickoff to a live, working deal analyzer. Week one is scope and data source connections. Week two is the underwriting model and AI reasoning layer. Week three is the front-end and the report output. Week four is iteration, edge cases, and your specific market assumptions. You see weekly demos and can request changes mid-build. We do not stop until the underwriting matches what you would do manually.',
      },
      {
        q: 'What if my market is different from the demo?',
        a: 'The underwriting model adapts to your market. The PTG build was tuned for an investor working primarily in the Mountain West, but the same architecture works in any market with MLS or RentCast coverage. Your specific repair cost assumptions, your local rent comps, your preferred ARV adjustment factors, and your market-specific exit cap rates all get baked in during week four. The tool gets sharper every time you run a deal through it.',
      },
      {
        q: 'Do I own the code and the data?',
        a: 'Yes. Every line of code, the database, the AI prompts, the deployment, and every credential is transferred to you on day one. We do not host the tool on our infrastructure. It runs on your Vercel account, your Supabase project, and your data vendor accounts. You can hire any other engineer to maintain or extend it later. There is no vendor lock-in and no recurring agency fee unless you specifically want a retainer.',
      },
    ],
    cta: {
      headline: 'Stop losing deals to slow underwriting',
      body:
        'Run the free Bottleneck Breaker. Sixty seconds. We will tell you exactly which AI tool would compress your investing workflow the most, what it would cost, and how fast we could ship it.',
    },
  },

  // 2. Realtors / Real Estate Agents
  {
    slug: 'realtors',
    name: 'Real Estate Agents',
    shortName: 'Realtors',
    metaTitle: 'AI Tools for Realtors and Real Estate Agents. Win the Next Five Years.',
    metaDescription:
      'AI virtual staging, listing description generators, voice agents for buyer follow-up. Custom AI tools for real estate agents who refuse to lose listings to AI-powered competition. Built in weeks, not months.',
    eyebrow: 'AI for Real Estate Agents',
    h1: 'AI Tools for Realtors. Stop Losing Listings to AI-Powered Competition',
    lede:
      'Real estate agents are getting squeezed from two directions. Buyers research listings on AI-powered platforms before they ever call you. Sellers test FSBO tools that promise to save the 3% commission with AI-driven listing, pricing, and contract workflows. The agents who win the next five years are the ones who fight back with the same tools, used better. We build the AI that makes your listings convert faster: virtual staging that finishes in under a minute, listing descriptions that read like a $400-an-hour copywriter wrote them, and voice agents that follow up with warm buyers 24/7. Real production tools, owned by you, shipped in weeks, not months.',
    buildsHeadline: 'What we build for agents',
    builds: [
      {
        title: 'Virtual Staging AI',
        caseStudySlug: 'luxe-design',
        body:
          'Empty listing photos in, fully designed staging in under a minute. Eight design styles, eight room types. Replaces a $3,000 traditional staging order with a $99 subscription. Agents use it on listings the seller will not pay to stage and on rentals where staging cost would never be recovered.',
      },
      {
        title: 'Listing Description Generator',
        body:
          'Paste the MLS facts, add your three best features, get a listing description that reads like real estate copywriting at its best. MLS-compliant. Brand-voiced. Three variants per run so you pick the one that lands. Replaces 45 minutes of writing per listing.',
      },
      {
        title: 'Buyer Follow-Up Voice Agent',
        body:
          'A voice agent that calls back open-house registrations, online inquiries, and dropped leads. Qualifies the buyer against your active listings, books a showing, and drops the booking into your calendar and CRM. Catches the warm leads your inbox would have killed.',
      },
      {
        title: 'CMA + Comp Comparison Tool',
        body:
          'Address in, full comparable market analysis out: three best comps with adjusted values, suggested list price range, days-on-market projections, and a one-page CMA PDF for the seller meeting. Replaces an hour of MLS gymnastics.',
      },
      {
        title: 'Off-Market Buyer Notifier',
        body:
          'Your buyers get an alert the moment a property matching their criteria hits the MLS or is whispered off-market. They feel taken care of. You stay top-of-mind. The agent who shows the off-market deal first usually writes the deal.',
      },
    ],
    receipt: {
      caseStudySlug: 'luxe-design',
      caseStudyTitle: 'Luxe Design: AI Virtual Staging in Under a Minute',
      headline: 'Virtual staging in under a minute, ready for MLS',
      body:
        'Luxe Design is a specialty AI tool that turns empty listing photos into fully staged interior renderings in under 60 seconds. Eight design styles. Eight room types. Stripe-metered usage with a subscription tier and a credits tier. Built end-to-end on Next.js and Replicate, hosted on Vercel, payments on Stripe. The agents and investors who use it stage three listings on a Saturday afternoon. The output looks like a thousand-dollar interior designer set the room. The cost lands closer to a hundred dollars a month than a thousand a project. This is the pattern: AI compresses the part of the workflow that should never have been manual, and the agent reclaims the time and the margin. The same tooling can be branded for your brokerage, tuned to your local design preferences, and delivered with your logo. Or you can use ours and skip the build.',
      metrics: [
        { label: 'Staging time', value: 'Under 60 sec' },
        { label: 'Cost vs traditional', value: '$99/mo vs $3K/project' },
        { label: 'Build duration', value: '2 to 4 weeks' },
      ],
    },
    pricing: {
      typicalRange: 'Quoted after a free Bottleneck Breaker',
      body:
        'A single-purpose AI tool like a listing description generator or a buyer follow-up voice agent is the entry point. A custom virtual staging platform branded to your brokerage is a step up, and a full agent OS that combines staging, descriptions, CMA, and a follow-up voice agent is the largest build. Start with the free Bottleneck Breaker. We tell you in 60 minutes which tool would move your numbers fastest, what it would cost, and how fast we can ship it. Every quote is fixed and in writing before any work begins.',
    },
    faqs: [
      {
        q: 'What AI tools should I be using as a Realtor in 2026?',
        a: 'The four AI tools every active agent should be running by 2026 are: (1) virtual staging on every empty listing, (2) AI-written listing descriptions on every MLS upload, (3) an AI voice agent for buyer follow-up so no online inquiry dies in your inbox, and (4) a comp comparison tool that turns a seller meeting prep from an hour to ten minutes. Agents who skip these are competing on time and craft they do not have. Agents who run them write more deals from the same database.',
      },
      {
        q: 'How does virtual staging AI compare to traditional staging?',
        a: 'Traditional staging runs $2,000 to $5,000 per listing and takes a week to schedule. AI virtual staging runs under $100 per use and finishes in under a minute. Buyers know the photos are virtual. They do not care. They care about envisioning themselves in the space. AI virtual staging consistently increases time-on-listing, saves-to-favorites, and showing requests on listings that previously photographed as empty rooms. It does not replace physical staging on luxury homes where the buyer will tour. It dominates on every other category.',
      },
      {
        q: 'Can AI write MLS-compliant listing descriptions?',
        a: 'Yes. A properly prompted AI writes MLS-compliant descriptions that avoid fair housing violations, banned phrases, and exaggerated claims. The trick is the prompting layer that constrains the model. Our build includes a compliance gate that flags any phrase that would trigger an MLS rejection or a fair housing concern before the text ever reaches you. The output is a clean, brand-voiced description in your tone, length-matched to your MLS, with three variants per run.',
      },
      {
        q: 'What about the AI tools that Zillow, Compass, and Realtor.com offer?',
        a: 'Brokerage AI tools are useful for the average agent. They cap at the brokerage average. A custom AI tool is shaped to your specific volume, your niche, and your reputation. Top producers outgrow brokerage tools the same way top investors outgrow off-the-shelf analyzers. If you write 25 or more deals a year, the math on a custom build pencils out within a single year of use. If you write fewer, the brokerage tools are probably enough.',
      },
      {
        q: 'Can the AI voice agent really book showings on my calendar?',
        a: 'Yes. The voice agent integrates with Google Calendar, Calendly, Acuity, or Follow Up Boss. It checks your availability, books the showing into the right slot, sends the confirmation to the buyer, and drops the lead with notes into your CRM. If the buyer asks something the agent does not know, it routes the call to you or takes a message and emails you. You sound staffed even when you are at a closing.',
      },
      {
        q: 'How much does a custom AI tool cost compared to monthly software?',
        a: 'A custom AI tool is a one-time build you own. Brokerage software adds up to $3,000 to $7,000 per year depending on the stack. The break-even on a custom build is usually under two years, and at the end you own the tool instead of renting it. The bigger win is that the custom tool is yours: branded to your business, tuned to your market, and changed when your strategy changes.',
      },
      {
        q: 'Will this work for luxury listings?',
        a: 'Yes, with a caveat. Virtual staging is rarely used on luxury homes because luxury buyers tour in person and the photography is already premium. But AI listing descriptions, voice agents for buyer follow-up, and comp comparison tools all work in luxury. The volume is lower, the stakes are higher, and the time saved per deal is more valuable. Several of our luxury clients use the AI tooling specifically because their assistant is overloaded, not understaffed.',
      },
    ],
    cta: {
      headline: 'Fight back with better tools',
      body:
        'Run the free Bottleneck Breaker. We will tell you which AI tool would protect your listings, your time, and your commission split the fastest.',
    },
  },

  // 3. Service Businesses
  {
    slug: 'service-businesses',
    name: 'Service Businesses',
    shortName: 'Service Pros',
    metaTitle: 'AI for Service Businesses. AI Voice Agents and Automation, Built Custom.',
    metaDescription:
      'AI voice agents that answer 24/7, qualify leads, and book appointments. Custom AI tools for plumbers, HVAC, cleaning, med spas, and contractors. Shipped in weeks, not months.',
    eyebrow: 'AI for Service Businesses',
    h1: 'AI for Service Businesses. Stop Missing the Calls That Pay the Bills',
    lede:
      'The average small service business misses 24% of its inbound calls. Of those callers, 80% never call back. They call the next business on Google. If your average ticket is $400, even five missed calls a week is $80,000 a year on the floor. The fix is not hiring a $40,000-a-year evening receptionist. It is an AI voice agent that picks up 24/7, qualifies the lead, books the appointment, and writes the notes into your CRM. We build them custom. They sound human. They work on day one. And they pay for themselves in the first month.',
    buildsHeadline: 'What we build for service businesses',
    builds: [
      {
        title: 'AI Voice Receptionist',
        caseStudySlug: 'voicestaff',
        body:
          'A live AI voice agent on your real business number. Answers in your brand voice. Qualifies callers against your actual service area, ticket size, and emergency policy. Books appointments onto your calendar. Logs the call in your CRM. 24/7. Sounds human enough that callers do not realize they are talking to AI until the call is over.',
      },
      {
        title: 'Lead Follow-Up Workflow',
        body:
          'Every online form submission, missed call, and lost-bid lead gets routed through an automated follow-up: a text within 5 minutes, a call within an hour, an email within a day, a check-in at one week. Closes the leads your team would have forgotten by Tuesday. Built on Trigger.dev with your CRM as the source of truth.',
      },
      {
        title: 'Online Booking and Instant Quote Tool',
        body:
          'A clean booking page that gives customers a price range before they have to talk to anyone, then routes the booking into your dispatch system. Reduces tire-kicker calls and increases conversion on serious buyers. Works on any service vertical with a quotable scope.',
      },
      {
        title: 'Review Generation Workflow',
        body:
          'A short SMS sent after every completed job asking for a review, with branching: a 5-star response goes to Google or Yelp, a sub-5 response routes to a private feedback form so the unhappy customer talks to you instead of the public internet. Doubles or triples review velocity for most businesses.',
      },
      {
        title: 'Dispatch and Job Scheduling Assistant',
        body:
          'For owners running multiple techs, an AI scheduling layer that matches incoming jobs to the best-fit tech based on location, skillset, and existing route. Reduces drive time, increases jobs-per-day, and stops the dispatch chaos that eats your Saturday.',
      },
    ],
    receipt: {
      caseStudySlug: 'voicestaff',
      caseStudyTitle: 'VoiceStaff: AI Voice Agents That Actually Sound Human',
      headline: '24/7 phone coverage without a receptionist hire',
      body:
        'VoiceStaff is a production voice agent platform for service businesses. Real phone numbers. Real inbound calls. Real appointments booked. The architecture: Vapi handles the voice layer, Anthropic Claude handles the reasoning, Supabase stores the transcripts and CRM payloads, Trigger.dev orchestrates the follow-up sequences. The result for the businesses running on it: 24/7 phone coverage, zero missed leads, and an interface that lets the owner review every call as a transcript instead of a recording. Setup runs four to six weeks depending on integrations. The voice agent picks up on the first ring, identifies the caller, asks the qualifying questions you would ask, books the appointment in your calendar, and emails you a daily summary of everything it booked, declined, or routed to you. Most clients break even on the build cost inside the first 60 days. Some hit ROI on the first emergency call the agent saves on a Sunday night.',
      metrics: [
        { label: 'Phone coverage', value: '24/7' },
        { label: 'Missed calls', value: '0' },
        { label: 'Typical payback', value: '60 days' },
      ],
    },
    pricing: {
      typicalRange: 'Quoted after a free Bottleneck Breaker',
      body:
        'A production voice agent is scoped to your integrations (calendar, CRM, dispatch software). A full service-business OS that combines a voice agent, lead follow-up, review generation, and dispatch assistance is the larger build. The free Bottleneck Breaker is the right place to start. We will tell you in 60 minutes how much revenue you are losing to missed calls and slow follow-up, what to fix first, and what the payback period looks like. Most service businesses pay back the build inside 60 to 120 days from missed-call recovery alone.',
    },
    faqs: [
      {
        q: 'Does AI actually sound human on the phone?',
        a: 'Yes. Modern voice AI on Vapi or similar platforms sounds indistinguishable from a human receptionist for the first 90 seconds of any call. The voice has natural pauses, handles interruptions, recovers from mid-sentence corrections, and uses your brand voice. The caller almost never realizes they are talking to AI unless the conversation goes deeply off-script. Most service-business calls are 60 to 90 seconds, exactly the window where AI is strongest.',
      },
      {
        q: 'What happens when a caller asks something the AI does not know?',
        a: 'Two options, chosen at build time. Option one: the AI takes a message, confirms the callback time, and routes the lead to your inbox with a transcript. Option two: the AI transfers the call to your cell during business hours, or to voicemail with priority routing after hours. Most service businesses use option one for routine calls and option two for emergencies. The decision tree is built into the agent during week two of the engagement.',
      },
      {
        q: 'Can the AI book onto my calendar?',
        a: 'Yes. The voice agent integrates with Google Calendar, Acuity, Calendly, Jobber, ServiceTitan, Housecall Pro, and most modern field service management systems. It checks real-time availability, books into the right calendar, sends the confirmation SMS and email to the customer, and drops a note into your CRM. If the customer needs to reschedule, the agent handles that too.',
      },
      {
        q: 'How is this different from a traditional answering service?',
        a: 'A traditional answering service costs $1 to $2 per minute, hands you a written message hours later, and never books an appointment. A custom voice agent costs a fixed monthly platform fee under $300, books appointments in real time, qualifies leads against your criteria, and gives you a searchable transcript of every call. The numbers are not close. The only thing answering services do better is handle ambiguous edge cases, and AI is closing that gap every quarter.',
      },
      {
        q: 'What does it cost to run monthly after the build?',
        a: 'Monthly operating cost for a production voice agent typically runs $150 to $400 depending on call volume. That covers the Vapi platform fees, the Anthropic API for reasoning, your phone number, and the CRM connections. There is no additional agency retainer unless you specifically want one. A $40,000-a-year human receptionist costs $3,300 a month. The voice agent costs less than ten percent of that and works 24/7.',
      },
      {
        q: 'Can the AI take payment or send a quote?',
        a: 'Yes, with a caveat. The agent can collect payment for booking deposits via Stripe Payment Links and can send quotes from a template library. It cannot price an unusual or one-off job that requires your judgment. For standard ticket sizes (drain unclogs, dryer vent cleans, lawn care quotes), it works perfectly. For custom jobs, it qualifies the lead and books the in-person estimate.',
      },
      {
        q: 'What about emergency calls?',
        a: 'Emergency calls are the highest-priority routing in the agent. The agent identifies an emergency keyword (water leak, no heat, lockout, gas smell, electrical) within the first ten seconds, confirms with the caller, then either pages the on-call tech via SMS, transfers the call directly, or escalates to an emergency line you specify. The decision tree for emergencies is built during week three of the engagement and tested with you before going live.',
      },
      {
        q: 'How long until the voice agent pays for itself?',
        a: 'Most service businesses pay back the build cost in 60 to 120 days. The math is simple: average missed-call rate of 24%, average ticket size of $400, average closing rate on recovered calls of 30%. A business doing 200 inbound calls a month was missing 48 of them, recovering 14 to 15 with the voice agent, and booking $5,600 to $6,000 a month of previously-lost revenue. That puts payback at 60 to 90 days for most builds.',
      },
    ],
    cta: {
      headline: 'Stop bleeding revenue to voicemail',
      body:
        'Run the free Bottleneck Breaker. We will tell you how much revenue you are losing to missed calls, slow follow-up, and unstaffed evenings. Then we tell you what to build first.',
    },
  },

  // 4. DTC Brands and Apparel
  {
    slug: 'dtc-brands',
    name: 'DTC and Apparel Brands',
    shortName: 'DTC Brands',
    metaTitle: 'AI for DTC and Apparel Brands. Sketch to Shipped Drop, Faster.',
    metaDescription:
      'Custom AI design studios, headless storefronts, AI product photography. Apparel and DTC builds shipped in weeks, not months. From sketch to live storefront in under 60.',
    eyebrow: 'AI for DTC and Apparel',
    h1: 'AI for Apparel and DTC Brands. From Sketch to Shipped Drop, Faster',
    lede:
      'Running a DTC brand in 2026 means competing with brands that ship a drop every two weeks and run AI on every touchpoint of the customer journey. The good news is you can do the same thing without hiring a team. We built Cross + Covenant from sketch to live storefront in under 60 days using a custom AI design pipeline, a headless Shopify storefront, and a two-tier production model with Printify and Apliiq. The same pattern works for any apparel brand willing to let AI do the heavy lifting on design exploration, product photography, listing copy, and email sequences. You own the brand. AI accelerates everything around it.',
    buildsHeadline: 'What we build for DTC brands',
    builds: [
      {
        title: 'AI Design Studio',
        caseStudySlug: 'cxc-studio',
        body:
          'A custom multi-model generation pipeline routed to the right model for the right job. Six input modes (text, mood board, sketch, reference photo, color palette, brand style), eight apparel types, one Generate Drop button. Output is print-ready artwork that respects your brand voice and visual constraints. Replaces the design exploration phase that traditionally takes weeks.',
      },
      {
        title: 'Headless Storefront',
        caseStudySlug: 'cross-and-covenant',
        body:
          'Shopify Storefront API on the back, Next.js on the front. Custom hero animation, custom product page, custom checkout flow. Faster than Shopify themes, more flexible than Webflow, and pixel-perfect to your brand. Live on a real domain in under 60 days with full payments, fulfillment, and inventory.',
      },
      {
        title: 'AI Product Photography',
        body:
          'On-model shots and flatlays generated from a single design file. Eight aesthetic styles, multiple poses, background variations. Replaces a $2,000 photoshoot per drop with a sub-$100 per-drop AI render workflow. Photos look real, perform on ads, and ship same-day.',
      },
      {
        title: 'AI Ad Creative Engine',
        caseStudySlug: 'ugc-studio-secret',
        body:
          'A four-agent creative supply chain that takes a product URL and a competitor and outputs a production-ready ad kit in 45 seconds: hook variants, full script, storyboard frames, casting brief, and micro-tribe recruitment templates. Replaces the first two weeks of an ad agency engagement.',
      },
      {
        title: 'AI Listing Copy and Email Sequences',
        body:
          'Product page copy, abandoned cart sequences, welcome series, and post-purchase flows all generated in your brand voice from a single brand brief. Tuned for conversion. Tested against the alternatives. Edited by you, never by committee.',
      },
      {
        title: 'Signature Collection Infrastructure',
        caseStudySlug: 'cross-and-covenant',
        body:
          'Hand-numbered, limited-edition product infrastructure with an edition counter, a Shopify webhook, an Upstash KV store, and an Apliiq production integration. For drops that need to feel rare without feeling fake. Live example: the C+C Signature Collection.',
      },
    ],
    receipt: {
      caseStudySlug: 'cxc-studio',
      caseStudyTitle: 'CXC Studio: A Custom AI Fashion House OS',
      headline: 'A custom AI design studio for a single brand',
      body:
        'Cross + Covenant needed to move from sketch to drop faster than a traditional apparel cycle allows. We built CXC Studio: a bespoke AI design platform with six input modes, eight apparel types, and one Generate Drop button. The architecture routes each generation request to the right model: Ideogram V3 for type-heavy work, Recraft for technical apparel illustration, fal for fast iteration, and custom guardrails for brand consistency. Output is print-ready artwork that drops into the Printify or Apliiq production pipeline without a designer-in-the-loop step. The shipping stack: Next.js, Supabase, multi-model generation pipeline, Vercel. Built and live in under five weeks. The brand uses it weekly to explore drops in hours instead of weeks. The same architecture is fully portable to any apparel brand with a defined design point of view. You bring the brand. We build the studio.',
      metrics: [
        { label: 'Build duration', value: 'Under 5 weeks' },
        { label: 'Design modes', value: '6 inputs, 8 apparel types' },
        { label: 'Live URL', value: 'cxc-studio-zeta.vercel.app' },
      ],
    },
    pricing: {
      typicalRange: 'Quoted after a free Bottleneck Breaker',
      body:
        'A headless Shopify storefront with custom design is the foundation. A custom AI design studio like CXC Studio scales with the number of generation modes and the depth of the brand guardrails. A combined apparel OS that includes storefront, design studio, AI photography, and email automation is the largest build. The free Bottleneck Breaker is the right first step. We tell you which build is highest leverage for your current revenue stage, what it would cost, and how fast we can ship it. Every quote is fixed and in writing before any work begins.',
    },
    faqs: [
      {
        q: 'Can AI really design apparel that does not look generic?',
        a: 'Yes, but only with the right pipeline. Generic Midjourney prompts produce generic apparel. A production AI design studio uses multi-model routing (different models for different jobs), brand-specific style guardrails, and a tight prompt template that bakes in your brand voice. CXC Studio routes type-heavy work to Ideogram V3 and technical apparel illustration to Recraft because no single model is best at everything. The output respects the brand because the system was designed to.',
      },
      {
        q: 'How is this different from using Midjourney or Ideogram directly?',
        a: 'Midjourney is a tool. A custom AI design studio is a workflow. The studio bakes in your brand voice, your apparel constraints (print bleed, palette, max colors for screen printing), and your production pipeline (Printify, Apliiq, in-house). It routes each request to the best model for the job and outputs print-ready files instead of social-ready JPEGs. The studio is yours: branded, tuned, and connected to your storefront. Midjourney is a $30 subscription that anyone can run.',
      },
      {
        q: 'Do you build on Shopify or fully custom?',
        a: 'Headless Shopify. We use the Shopify Storefront API for products, inventory, cart, checkout, and orders, then build a fully custom Next.js front-end. You get Shopify\'s reliability for the commerce backbone and full design control on the front-end. The result is faster than any Shopify theme and pixel-perfect to your brand. Cross + Covenant runs this stack.',
      },
      {
        q: 'Can you handle print-on-demand integrations like Printify and Apliiq?',
        a: 'Yes. Both Printify and Apliiq are integrated on the Cross + Covenant production stack. Apliiq handles the hand-numbered, premium-quality apparel (signature collections). Printify handles the wider catalog. The site routes each order to the right production partner automatically based on the SKU. We can wire any major POD platform during the build, including Gelato, Printful, and SPOD.',
      },
      {
        q: 'How long until I am taking real orders?',
        a: 'Sixty days from kickoff to a live storefront taking real orders. Week one is brand discovery and product strategy. Weeks two and three are the front-end build. Week four is the AI design studio (if included in scope). Week five is payments, fulfillment, and QA. Week six is launch prep and the first drop. You own the domain, the Shopify account, and the AI tooling from day one.',
      },
      {
        q: 'Do I own the code and the AI prompts?',
        a: 'Yes. Every line of code, every AI prompt template, the Shopify account, the Supabase project, and every credential is transferred to you on day one. We do not host your store. You own it. Most brands keep us on a small retainer for ongoing iteration, but that is optional. You can hand the codebase to any other engineer the day after launch.',
      },
      {
        q: 'What about fulfillment?',
        a: 'Fulfillment is handled by your production partners (Printify, Apliiq, or your own warehouse if you have one). The store hands off orders automatically. We build the order-routing logic during week five and test it with real orders before launch. You also get an admin dashboard that surfaces every order, every status update, and every fulfillment failure so nothing falls through.',
      },
    ],
    cta: {
      headline: 'Ship faster than your competition',
      body:
        'Run the free Bottleneck Breaker. We will tell you what to build first, how fast we can ship it, and how much faster your next drop could go live.',
    },
  },

  // 5. Solopreneurs and Creators
  {
    slug: 'solopreneurs',
    name: 'Solopreneurs and Creators',
    shortName: 'Solopreneurs',
    metaTitle: 'AI for Solopreneurs and Creators. The OS You Should Have Built Years Ago.',
    metaDescription:
      'Custom solo operating systems, personal brand sites, AI content engines, intentional capture apps. For solopreneurs who refuse to live inside 47 SaaS subscriptions.',
    eyebrow: 'AI for Solopreneurs',
    h1: 'AI for Solopreneurs. The OS You Should Have Built Two Years Ago',
    lede:
      'Solopreneurs do not need 47 SaaS subscriptions. They need one operating system that ties together their leads, content, projects, calendar, finances, and follow-up so nothing slips through. The solopreneurs who win are the ones where the founder owns the system, not the system that owns the founder. We built Olive Shoot to prove the pattern: a Next.js and Supabase agentic operating system that handles 30 plus projects, leads, outreach, social, and analytics from one command palette. Yours can look different. The pattern is the same: custom, owned, and shaped to how you actually work.',
    buildsHeadline: 'What we build for solos',
    builds: [
      {
        title: 'Custom Solo OS',
        caseStudySlug: 'olive-shoot',
        body:
          'A single operating system for your projects, leads, outreach, social scheduling, files, calendar, and analytics. Built on Next.js and Supabase, deployable to your Vercel account, owned by you. Command palette navigation. Keyboard-shortcut driven. Replaces the eight tools you are paying for and barely using.',
      },
      {
        title: 'AI Content Engine',
        caseStudySlug: 'make-me-studio',
        body:
          'A creator studio for AI-generated video, image, and asset work. BYOK on the AI providers (Anthropic, OpenAI, Gemini, Replicate). Stripe-metered if you want to license access to your team or community. Built for creators who are also operators.',
      },
      {
        title: 'Intentional Capture App',
        caseStudySlug: 'alive-notes',
        body:
          'A mobile-first capture app for notes, voice memos, ideas, and intentions that actually act on what you capture. Built with Expo and React Native. Beautifully crafted, AI-aware, and shaped to how a working creator actually thinks.',
      },
      {
        title: 'Personal Brand Site and Newsletter',
        body:
          'A premium personal brand site, a newsletter that compounds, and a lead magnet flow that converts. Built on Next.js with Resend for email and Supabase for the subscriber list. Replaces the WordPress and Substack and ConvertKit Frankenstein with one clean stack you own.',
      },
      {
        title: 'Lead and CRM and Outreach Pipeline',
        body:
          'A simple lead pipeline tuned for solo operators: a single inbox, AI-drafted replies, automated follow-up sequences, and analytics that tell you which conversations move money. No 14-stage enterprise CRM. Just enough structure to stop losing warm leads.',
      },
    ],
    receipt: {
      caseStudySlug: 'olive-shoot',
      caseStudyTitle: 'Olive Shoot: An Agentic OS for Solopreneurs, Built in 6 Weeks',
      headline: 'A solo OS shipped in six weeks',
      body:
        'Olive Shoot was the prove-it project: an agentic operating system for solopreneurs managing 30-plus projects in parallel. The build had to ship in under six weeks from blank repo to live deploy. The stack: Next.js 16 with the App Router, tRPC v11, Zod v4, Supabase with row-level security, Zustand v5, Anthropic Claude for the agentic reasoning, Vercel for the deploy. The result: 116 files, 17,779 lines of code, 25 routes, 14 database tables, command palette navigation, OAuth, file management, lead and outreach workflows, social scheduling, and analytics. Zero TypeScript errors at deploy. Seeded with 22 real projects and live URLs ready to go on first signup. The pattern is portable. Your solo OS can be styled differently, scoped differently, and connected to your specific stack. The shipping cadence is the same: six weeks from blank repo to public deploy.',
      metrics: [
        { label: 'Build duration', value: '6 weeks' },
        { label: 'Files shipped', value: '116' },
        { label: 'TypeScript errors at launch', value: '0' },
      ],
    },
    pricing: {
      typicalRange: 'Quoted after a free Bottleneck Breaker',
      body:
        'A personal brand site plus newsletter pipeline is the entry point. A focused AI content engine or capture app is a step up. A full custom solo OS like Olive Shoot is the largest build, scaling with integrations and the depth of the agentic logic. The free Bottleneck Breaker is the right place to start. We will tell you in 60 minutes which build would give you the most leverage on the time you actually have, what it would cost, and how fast we can ship it.',
    },
    faqs: [
      {
        q: 'Why not just use Notion, Airtable, or ClickUp?',
        a: 'Notion and Airtable are databases with opinions. ClickUp is project management with opinions. A custom solo OS is shaped to how you actually work, not to how the average user works. You stop paying $30 a month per tool, you stop adapting your workflow to fit someone else\'s schema, and you start owning the system that runs your business. For solos doing under $200K a year, the off-the-shelf tools are usually enough. Past that, the custom OS pays back fast.',
      },
      {
        q: 'What does a custom solo OS cost versus 12 SaaS subscriptions?',
        a: 'A typical solopreneur spends $300 to $700 a month on SaaS subscriptions across Notion, Airtable, Calendly, ConvertKit, Stripe, an analytics tool, a project tool, a social scheduler, and a CRM. That is $4,000 to $8,000 a year, every year, forever. A custom solo OS is a one-time build that runs on $30 a month in hosting and database fees. Break-even is usually 4 to 6 years on cost alone, faster if you value owning the system.',
      },
      {
        q: 'Can I run my podcast and newsletter from it?',
        a: 'Yes. Podcast publishing (RSS feed generation, episode pages, transcript management) and newsletter publishing (subscriber list, drafts, send queue, analytics) are both common modules. We build them as needed during the engagement. The newsletter pipeline uses Resend for delivery and Supabase for the subscriber list, which scales to hundreds of thousands of subscribers without changing the stack.',
      },
      {
        q: 'How does AI actually fit in?',
        a: 'AI in a solo OS shows up in four specific places: (1) email and outreach drafting that sounds like you, (2) content repurposing from one source asset into multiple platform formats, (3) lead qualification and follow-up sequence selection, and (4) summary and digest generation across your projects so you can see the state of the business in 60 seconds. The AI is a layer, not the centerpiece. The OS still works if you turn the AI off.',
      },
      {
        q: 'Can you build it on top of Notion or my existing stack?',
        a: 'Yes, with limits. We can connect to Notion as a data source or migration source, but a custom OS performs better as a native Next.js plus Supabase build than as a Notion overlay. Notion\'s API is rate-limited, slower than a native database, and constrained by Notion\'s data model. Most solos who hire us replace Notion entirely within six months of launch because the custom build is just faster and more flexible.',
      },
      {
        q: 'What if I outgrow it?',
        a: 'You will not outgrow the stack. Next.js plus Supabase scales from solo founder to 100,000 users with the same codebase. The OS grows with you because it is yours: when you decide to hire your first team member, you add a user role and an invite flow, and the same OS now runs for two people. When you scale to ten, the same OS still runs. You can also fork the codebase into a productized SaaS if your solo OS turns out to be a product other people want.',
      },
      {
        q: 'Do I own the code?',
        a: 'Yes. Every line of code, the database, the deployment, and every credential is transferred to you on day one. The OS runs on your Vercel account, your Supabase project, and your domain. You can hire any engineer to maintain or extend it later. There is no vendor lock-in, no per-seat fee, and no recurring agency cost unless you specifically want a retainer.',
      },
    ],
    cta: {
      headline: 'Stop renting your business from 12 SaaS companies',
      body:
        'Run the free Bottleneck Breaker. We will tell you which piece of your solo stack is most worth owning, what it would cost to build, and how fast we can ship it.',
    },
  },

  // 6. Coaches and Consultants
  {
    slug: 'coaches-consultants',
    name: 'Coaches and Consultants',
    shortName: 'Coaches',
    metaTitle: 'AI for Coaches and Consultants. Reclaim Your Calendar.',
    metaDescription:
      'AI intake bots, content engines, proposal generators, voice agents. Custom AI tools for coaches and consultants who want every hour back from admin work.',
    eyebrow: 'AI for Coaches and Consultants',
    h1: 'AI for Coaches and Consultants. Reclaim Your Calendar',
    lede:
      'If you are a coach or consultant, your business is not your expertise. Your business is your calendar. Every hour you spend on intake forms, follow-up, content production, and proposal writing is an hour you are not in front of a paying client. We build the AI infrastructure that gives those hours back: intake bots that pre-qualify before a discovery call, content engines that turn a 30-minute voice memo into a week of LinkedIn posts, proposal generators that draft from your template in 60 seconds, and CRM automations that follow up so no warm lead ever goes cold again. Custom, owned, and shaped to how you actually work.',
    buildsHeadline: 'What we build for coaches and consultants',
    builds: [
      {
        title: 'AI Intake and Qualification Bot',
        body:
          'A pre-call intake flow that asks the right qualifying questions, summarizes the prospect for you before the discovery call, and routes unqualified leads to a self-serve resource instead of your calendar. Replaces 20 minutes of "what does your business do" with a structured brief that lets you start every call from minute one.',
      },
      {
        title: 'Content Engine',
        caseStudySlug: 'make-me-studio',
        body:
          'A creator-style AI engine tuned for consultant content: turn one 30-minute voice memo into a week of LinkedIn posts, a newsletter draft, a short video script, and a sales asset. Brand-voiced. On-tone. Edited by you, not generated for you. Pattern proven on Make Me Studio.',
      },
      {
        title: 'AI Proposal Generator',
        body:
          'Paste the discovery call notes, get a fully drafted proposal in your template, with the scope, timeline, deliverables, and quote auto-populated from your library. Editable by you in 5 minutes. Replaces 90 minutes of proposal writing per opportunity.',
      },
      {
        title: 'Voice Agent for Discovery Calls',
        body:
          'A voice agent that books, reschedules, and confirms your discovery calls. Asks the qualifying questions you would ask, drops the brief into your inbox, and handles the no-shows. For coaches and consultants who are tired of 30 minutes of "tell me about yourself" on every first call.',
      },
      {
        title: 'Personal Brand Site and Lead Magnet',
        body:
          'A premium personal brand site, a lead magnet that converts, and a follow-up sequence that warms strangers into clients. Built on Next.js with Resend and Supabase. Replaces the WordPress and ConvertKit and Calendly Frankenstein with one stack you own.',
      },
    ],
    receipt: {
      caseStudySlug: 'make-me-studio',
      caseStudyTitle: 'Make Me Studio: A Creator\'s AI Studio with BYOK and Stripe',
      headline: 'A content engine you actually use',
      body:
        'Make Me Studio is a creator-style AI studio for video, image, and asset generation. The pattern is exactly what coaches and consultants need: BYOK on the AI providers so you control the spend and the model selection, Stripe-metered usage if you want to license access to a team or community, and a clean output workflow that produces brand-voiced assets instead of generic AI slop. Stack: Next.js 15, Supabase for auth and project storage, Stripe for metered billing, Google Gemini and OpenAI for the generation, Vercel for deploy. Shipped to production with auth and usage tracking in five weeks. For a coach or consultant, the same architecture turns one 30-minute voice memo into a week of LinkedIn posts, a newsletter draft, three short videos scripts, and a sales asset. You stop dreading content week. You start treating content as exhaust from the work you were already doing.',
      metrics: [
        { label: 'Build duration', value: '5 weeks' },
        { label: 'Content from one voice memo', value: 'A full week' },
        { label: 'Stack', value: 'Next.js, Supabase, Stripe, Gemini' },
      ],
    },
    pricing: {
      typicalRange: 'Quoted after a free Bottleneck Breaker',
      body:
        'A single-purpose AI tool like an intake bot or proposal generator is the entry point. A custom content engine is a step up. A full consultant OS that combines intake, content, proposals, and a follow-up voice agent is the largest build. Start with the free Bottleneck Breaker. We will tell you in 60 minutes which task in your week is bleeding the most hours, what to automate first, and what the payback period looks like. Most consultants recover the build cost inside the first quarter from reclaimed calendar time alone.',
    },
    faqs: [
      {
        q: 'Will AI replace my coaching or consulting?',
        a: 'No. AI cannot replicate the relationship, the judgment, or the accountability that drives a coaching or consulting engagement. What AI can replace is the 15 hours a week you spend on intake, follow-up, content production, proposal writing, and admin. That is the time AI was built for. The hour you spend with a client is still the hour your client pays for, and that hour does not change.',
      },
      {
        q: 'What is the easiest thing to automate first?',
        a: 'For most consultants, the highest-ROI first build is the intake and qualification bot. It saves 20 minutes of "what does your business do" on every discovery call, surfaces unqualified leads before they touch your calendar, and gives you a structured brief that lets every first call start from minute one of actual work. Second priority is usually the content engine. Third is the proposal generator.',
      },
      {
        q: 'How is this different from ChatGPT plus Zapier?',
        a: 'ChatGPT plus Zapier is a duct-tape solution. It works until it breaks, costs $40 a month per tool, and produces output that sounds generic because every consultant on Earth is running the same prompts. A custom build is shaped to your brand voice, your client persona, your service offerings, and your sales process. The output is yours, not borrowed from a million ChatGPT users. You also own it: the brand voice you train into the system is your asset, not a Zap that disappears when the integration breaks.',
      },
      {
        q: 'Can the AI actually sound like me?',
        a: 'Yes. The brand voice is captured during the first week of the engagement through a 60-minute interview, three pieces of your best existing content, and a short calibration loop where you review and refine the AI output until it sounds correct. The prompt template that drives the voice is yours, editable by you, and stored in your codebase. Most clients hit "this sounds like me" within the first two weeks.',
      },
      {
        q: 'What about confidentiality and client data?',
        a: 'Client data lives in your Supabase project under row-level security. AI calls go to the providers you choose (Anthropic, OpenAI, Google) with their enterprise privacy terms. No client data passes through any Modern Mustard Seed infrastructure. If your work requires HIPAA, we route through HIPAA-compliant providers and add a Business Associate Agreement to the engagement. If it requires SOC 2, we use SOC 2 compliant providers across the stack.',
      },
      {
        q: 'Will this work for high-ticket B2B consulting?',
        a: 'Yes. The pattern works at any price point. For high-ticket B2B, the content engine and proposal generator are especially valuable because they let you nurture a smaller, higher-quality pipeline without giving up the touch. Voice agents are less common in high-ticket B2B because the prospects often expect a human first call. We adjust the build accordingly during scoping.',
      },
      {
        q: 'How long until I see results?',
        a: 'Immediate, on the calendar side. The first week the intake bot is live, you stop spending 20 minutes per discovery call on qualifying questions. The first month the content engine is live, you publish more than you ever did, with less effort. The first quarter the proposal generator is live, you ship proposals same-day instead of letting them sit on your desk for a week. The compounding effect on close rate and capacity shows up by month three.',
      },
    ],
    cta: {
      headline: 'Get your calendar back',
      body:
        'Run the free Bottleneck Breaker. We will tell you which task in your week is bleeding the most hours, what to automate first, and how fast we can ship it.',
    },
  },
];

export const industryBySlug = Object.fromEntries(industries.map((i) => [i.slug, i]));

export function listIndustries(): Industry[] {
  return industries;
}
