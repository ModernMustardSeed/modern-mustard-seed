export type Engagement = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  deliverables: string[];
  timeline: string;
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
    id: 'online-presence',
    name: 'Online Presence Build',
    tagline: 'Your first real online home, shipped in 30 days.',
    description:
      'A complete online presence for a small business, creator, or service pro. We build the brand, the site, the way you get paid or booked, and the SEO foundation. You walk away with a paying-customer-grade site and everything that runs on it.',
    deliverables: [
      'Brand identity (logo, colors, type, voice)',
      'Production-grade marketing site',
      'Booking or payment integration',
      'Real copy, written for your business',
      'SEO + structured data foundation',
      'Launch assets (social, email, OG)',
      'Full handoff: repo, accounts, docs',
    ],
    timeline: '30 days',
    cta: 'Start your site',
    ctaHref: '/contact?package=online-presence',
    ideal: 'Small businesses, creators, service pros. Anyone who needs to actually show up online.',
  },
  {
    id: 'idea-to-product',
    name: 'Idea to Product',
    tagline: 'Your app, tool, or specialty AI product. Shipped in 30 days.',
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
    timeline: '30 days',
    cta: 'Scope your build',
    ctaHref: '/contact?package=idea-to-product',
    ideal: 'Founders, second-business operators, anyone with a clear vision ready to ship.',
    highlighted: true,
  },
  {
    id: 'ai-proof',
    name: 'AI-Proof Your Business',
    tagline: 'For owners with revenue to protect.',
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
    cta: 'AI-proof your business',
    ctaHref: '/ai-proof',
    ideal: 'Existing operators. Service businesses. Owners ready to lead the shift, not get hit by it.',
  },
  {
    id: 'fractional',
    name: 'Fractional AI Partner',
    tagline: 'Embedded leadership, monthly.',
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
    q: 'I do not know much about AI. Is this still for me?',
    a: 'Yes. The Online Presence Build does not require AI at all. The Idea to Product engagement starts with us figuring out what to build together. You bring the vision and the domain knowledge. We bring the technical decisions.',
  },
  {
    q: 'What if my project does not fit one of these engagements?',
    a: 'Most do not, exactly. Book a discovery call. We will map your situation against our model and propose a custom scope before any large commitment.',
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
