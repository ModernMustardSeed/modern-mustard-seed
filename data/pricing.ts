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

// Engagement structures are the way we work. Pricing is per-project,
// quoted after a discovery call, scoped to your specific situation.
export const packages: Engagement[] = [
  {
    id: 'audit',
    name: 'AI Audit + Roadmap',
    tagline: 'Find your AI leverage in 14 days',
    description:
      'A two-week deep dive into your business. We map every workflow, identify the highest-leverage AI opportunities, and deliver a 30-day implementation roadmap with prioritized wins, ROI projections, and a build sequence you could hand to any team.',
    deliverables: [
      'Business workflow map',
      'AI opportunity matrix (impact vs. effort)',
      '30-day implementation roadmap',
      'Tool recommendations with ROI projections',
      'Two 60-min strategy sessions',
      'Loom walkthrough of the full deliverable',
    ],
    timeline: '2 weeks',
    cta: 'Start the audit',
    ctaHref: '/contact?package=audit',
    ideal: 'Founders ready to commit to AI but unsure where to start.',
    highlighted: true,
  },
  {
    id: 'voice-agent',
    name: 'Voice Agent Launch',
    tagline: 'A 24/7 phone agent live in 2 weeks',
    description:
      'We design, build, and deploy a production voice agent on your business phone number. Handles inbound calls, qualifies leads, books appointments, and transfers to humans when needed. Includes call analytics, transcript review, and 30 days of post-launch tuning.',
    deliverables: [
      'Custom voice agent (Vapi or equivalent)',
      'Phone number provisioning',
      'CRM + calendar integration',
      'Call analytics dashboard',
      '30 days of post-launch tuning',
      'Loom training for your team',
    ],
    timeline: '2 weeks',
    cta: 'Launch your agent',
    ctaHref: '/contact?package=voice-agent',
    ideal: 'Service businesses losing leads after hours or to slow callbacks.',
  },
  {
    id: 'custom-build',
    name: 'Custom AI Build',
    tagline: 'Production-grade product, end to end',
    description:
      'A fully designed and engineered AI product, shipped to production. Web app, dashboard, agentic workflow, internal tool. Whatever your business needs to leap forward. Architected to scale, built to last, owned by you.',
    deliverables: [
      'Discovery + technical architecture',
      'Full UI/UX design system',
      'Production engineering (Next.js, Supabase, Stripe, Vercel)',
      'AI integration (OpenAI, Anthropic, Gemini)',
      'Deployment + monitoring',
      '30 days of post-launch support',
    ],
    timeline: '4 to 12 weeks',
    cta: 'Scope your build',
    ctaHref: '/contact?package=custom-build',
    ideal: 'Founders with a clear product vision who need it built right, fast.',
  },
  {
    id: 'fractional',
    name: 'Fractional AI Partner',
    tagline: 'Embedded AI leadership, monthly',
    description:
      'A monthly retainer for ongoing AI strategy, build work, and team enablement. Treat us as your fractional CTO and AI lead. Weekly strategy, hands-on building, and a continually evolving roadmap as your business grows.',
    deliverables: [
      'Weekly strategy sessions',
      'Generous monthly build allotment',
      'Continuous roadmap evolution',
      'Direct Slack access',
      'Quarterly business review',
    ],
    timeline: 'Monthly, 3-month minimum',
    cta: 'Become a partner',
    ctaHref: '/contact?package=fractional',
    ideal: 'Founders who want a long-term AI partner inside their business.',
  },
];

export const pricingFaq = [
  {
    q: 'How is this different from a traditional agency?',
    a: 'Traditional agencies bill for hours and hand off to junior staff. We work as a single embedded operator-engineer who owns your project end to end. AI handles the leverage. You pay for outcomes, not hours.',
  },
  {
    q: 'How does pricing work?',
    a: 'Every engagement is quoted after a discovery call. We propose a flat fee tied to a defined deliverable and a tight timeline, no hourly billing. You will know the full cost and timeline before any work begins.',
  },
  {
    q: 'What if my project does not fit one of these engagements?',
    a: 'Most do not, exactly. Start with the audit. We will map your project against our model and propose a custom scope before any large commitment.',
  },
  {
    q: 'Do you offer payment plans?',
    a: 'Yes. Larger builds and ongoing partnerships can be split into monthly milestones. Audit and Voice Agent engagements are typically paid up front to keep timelines tight.',
  },
  {
    q: 'Who owns the code and assets?',
    a: 'You do, fully. All code is delivered to your repos. All credentials, accounts, and infrastructure are yours from day one.',
  },
  {
    q: 'What is your refund policy?',
    a: 'If you are not happy with the audit deliverable within 7 days of delivery, we refund the full amount. For builds, we refund any unworked milestone if we part ways early.',
  },
];
