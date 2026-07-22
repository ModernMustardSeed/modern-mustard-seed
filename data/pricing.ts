export type Engagement = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  deliverables: string[];
  timeline: string;
  priceRange: string;
  cta: string;
  ctaHref?: string;
  highlighted?: boolean;
  ideal?: string;
};

// Engagement structures, aligned with the three customer paths on the homepage
// (New to online / Already running / Building something new) plus the ongoing
// partnership option. Pricing is per-project, quoted after a discovery call.
export const packages: Engagement[] = [
  {
    id: 'seed-site',
    name: 'Seed Site',
    tagline: 'A beautiful site that gets you online for real, in about a week',
    description:
      'For when you do not need an engine yet. You need a storefront. A clean, fast, brand-aligned site that loads in under two seconds, looks like a real business, and converts the visitors you already have. No AI agents, no SDR, no back office. Just the site you needed years ago, shipped in about a week. Step up to a Full-Service Business Build whenever you are ready.',
    deliverables: [
      'Brand identity (logo, colors, type, voice)',
      '3 to 5 page production-grade site',
      'Mobile-optimized, fast (Lighthouse 90+)',
      'Booking or payment integration',
      'Contact form routed to your inbox',
      'Real copy, written for your business',
      'SEO foundation (metadata, sitemap, structured data)',
      'Launch assets (social, email, OG image)',
      'Full handoff: repo, accounts, every credential',
    ],
    timeline: 'About a week',
    priceRange: 'Quoted after a free discovery call',
    cta: 'Plant my Seed Site',
    ctaHref: '/contact?package=seed-site',
    ideal: 'Small businesses, creators, service pros, and faith-driven brands who need a clean, real online home right now. No AI bells. Just a beautiful site that works.',
  },
  {
    id: 'online-presence',
    name: 'Full-Service Business Build',
    tagline: 'A site that runs your business, not just shows it off',
    description:
      'Not a website. A working business system with the site as the front door. Brand, production-grade site, bespoke booking services with embedded CRM, personalized client-care software, an AI sales-development rep capturing every lead, built-in funnels and lead magnets, a back office that surfaces what matters, AI agents embedded in both your site and your back office, and the Mustard Seed chatbot answering for you when you cannot. Restaurants, shops, service pros, custom academies, courses, rendering studios, ad command centers, zero-to-one software: same engine, scoped to you.',
    deliverables: [
      'Brand identity (logo, colors, type, voice)',
      'Production-grade marketing site',
      'Bespoke booking services with embedded CRM (Zoho, HubSpot, Acuity, or custom)',
      'Personalized client care software (intake, onboarding, status updates, retention)',
      'Mustard Seed AI chatbot embedded on the site, trained on your business',
      'AI SDR that captures and qualifies every lead 24/7',
      'Built-in funnels and lead magnets, tested and converting on day one',
      'Vertical app when it fits (ordering for restaurants, ecommerce shop, rendering studio, academy or course platform, ad command center, zero-to-one MVP)',
      'Back office dashboard: leads, revenue, content, ops in one view',
      'AI agents embedded on the public site and inside the back office',
      'Real copy, written for your business',
      'SEO + structured data foundation',
      'Launch assets (social, email, OG)',
      'Full handoff: repo, accounts, docs, every credential',
    ],
    timeline: '1 to 2 weeks',
    priceRange: 'Quoted after a free discovery call',
    cta: 'Build my business engine',
    ctaHref: '/contact?package=online-presence',
    ideal: 'Small businesses, restaurants, shops, service pros, coaches, course creators, agencies, operators with revenue, and zero-to-one founders who want a partner to ship the whole thing.',
  },
  {
    id: 'idea-to-product',
    name: 'Idea to Product',
    tagline: 'Your app, tool, or specialty AI product. Shipped in weeks, not months',
    description:
      'A full-stack product build for founders with a vision. We design it, build it, brand it, and ship it to production end to end. The deliverable is a live product real customers can use. You own the code, the deploys, and the docs from day one.',
    deliverables: [
      'Discovery + scoping call',
      'Full UI/UX design system',
      'Full-stack engineering (Next.js, Supabase, Stripe, Vercel)',
      'AI integration where it fits (Anthropic, OpenAI, Gemini, Vapi)',
      'Branded marketing site',
      'Deployment + monitoring',
      '30 days of post-launch support',
      'Repo + docs + credentials handoff',
    ],
    timeline: '2 to 4 weeks',
    priceRange: 'Quoted after a free discovery call',
    cta: 'Scope your build',
    ctaHref: '/contact?package=idea-to-product',
    ideal: 'Founders, second-business operators, anyone with a clear vision ready to ship.',
    highlighted: true,
  },
  {
    id: 'ai-proof',
    name: 'AI-Proof Your Business',
    tagline: 'For owners with revenue to protect',
    description:
      'A three-phase engagement for existing operations. We audit your business against the AI shift, harden the surfaces AI will hit first, and re-equip your team to run the new stack. Your business stays yours. You become the AI-native version of your industry, not the casualty.',
    deliverables: [
      'Phase 1: workflow audit + risk matrix',
      'Phase 2: AI deployment where it defends margin',
      'Phase 3: team enablement + documentation',
      'Internal copilots tuned to your operation',
      'Voice / chat / automation where it fits',
      'Ongoing roadmap as the AI shift evolves',
    ],
    timeline: '8 to 12 weeks',
    priceRange: 'Quoted after a free discovery call',
    cta: 'AI-proof your business',
    ctaHref: '/ai-proof',
    ideal: 'Existing operators. Service businesses. Owners ready to lead the shift, not get hit by it.',
  },
  {
    id: 'fractional',
    name: 'Fractional AI Partner',
    tagline: 'Embedded leadership, monthly',
    description:
      'A monthly retainer for ongoing strategy and build work. Treat us as your fractional CTO and AI lead. Weekly sessions, hands-on building, and a continually evolving roadmap as your business grows. Most retainers begin after a shipped engagement, when the partnership has already proven itself.',
    deliverables: [
      'Weekly strategy sessions',
      'Generous monthly build allotment',
      'Continuous roadmap evolution',
      'Direct Slack access',
      'Quarterly business review',
      'Priority slot in the build queue',
    ],
    timeline: 'Monthly, 3-month minimum',
    priceRange: 'Quoted after a free discovery call',
    cta: 'Become a partner',
    ctaHref: '/contact?package=fractional',
    ideal: 'Established operators wanting a long-term AI partner inside the business.',
  },
];

export const pricingFaq = [
  {
    q: 'How is this different from a traditional agency?',
    a: 'Traditional agencies bill for hours and hand off to junior staff. We work as a single embedded operator-engineer who owns your project end to end. AI handles the leverage. You pay for outcomes, not hours.',
  },
  {
    q: 'How does pricing work?',
    a: 'Every engagement is quoted after a free discovery call. We propose a flat fee tied to a defined deliverable and a tight timeline, no hourly billing. You will know the full cost and timeline before any work begins.',
  },
  {
    q: 'How fast will my build go live?',
    a: 'Websites, voice agents, and command centers go live in about a week from kickoff. Custom apps, software, and online stores usually take two to four weeks. AI-Proof engagements run longer because they cover a whole operation. You see the exact timeline in your quote before work begins.',
  },
  {
    q: 'I do not know much about AI. Is this still for me?',
    a: 'Yes. A website or an AI receptionist does not require you to know any AI at all, and a custom build starts with us figuring out what to build together. You bring the vision and the domain knowledge. We bring the technical decisions.',
  },
  {
    q: 'What if my project does not fit a productized door?',
    a: 'Many do not, exactly, and that is what the bespoke path is for. Book a discovery call. We will map your situation and propose a custom scope before any large commitment.',
  },
  {
    q: 'Do you offer payment plans?',
    a: 'Yes. Most engagements can be split into milestone payments that fit your situation. Tell us what works during the discovery call and we will structure it together.',
  },
  {
    q: 'Who owns the code and assets?',
    a: 'You do, fully. All code is delivered to your repos. All credentials, accounts, and infrastructure are yours from day one.',
  },
  {
    q: 'What if I am not happy with what gets built?',
    a: 'We do not work in handoffs. We work in iterations. We do not stop until the build is right by you. Revision rounds are baked into every engagement, not bolted on. We do not offer refunds because we do not walk away. We finish the work until it is what you wanted.',
  },
];
