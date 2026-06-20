export type Service = {
  slug: string;
  icon: string;
  title: string;
  short: string;
  description: string;
  outcomes: string[];
  ideal: string;
};

export const services: Service[] = [
  {
    slug: 'apps-software',
    icon: '📱',
    title: 'Apps & Web Software',
    short:
      'Custom apps and web software built end to end. Frontend, backend, auth, billing, deployment. Real products that scale.',
    description:
      'We build the apps and web software your business needs. From idea to shipped product in weeks, not months. React, Next.js, Supabase, Stripe, Vercel. The same stack we run every business on.',
    outcomes: ['Web apps', 'Mobile apps', 'Custom dashboards'],
    ideal: 'Founders with a clear product vision who need it built once, built right.',
  },
  {
    slug: 'specialty-ai-tools',
    icon: '🛠️',
    title: 'Specialty AI Tools',
    short:
      'Industry-specific AI tools that replace expensive workflows. The $3K service line item becomes the $99 subscription.',
    description:
      'Pick the friction in your industry. We build the AI tool that removes it. Listing description generators, deal analyzers, estimate builders, intake summarizers. Tailored to your industry, owned by you.',
    outcomes: ['Industry-specific AI', 'Replace expensive workflows', 'Per-engagement pricing'],
    ideal: 'Operators with a clear sense of where AI will pay back fastest.',
  },
  {
    slug: 'brand-sites',
    icon: '🎨',
    title: 'Brand & Marketing Sites',
    short:
      'Production-grade marketing sites. Design system, copy, animation, SEO foundation, launch assets.',
    description:
      'A site that looks like the brand you are trying to be, not the brand you were. Headless commerce, WebGL hero treatments, structured data, performance budgets, all of it. Ships with launch copy and the social assets.',
    outcomes: ['Brand identity', 'Marketing site', 'Launch assets'],
    ideal: 'Founders launching something they want to last.',
  },
  {
    slug: 'agentic-systems',
    icon: '🤖',
    title: 'Agentic Systems & Automation',
    short:
      'Multi-agent workflows, internal copilots, end-to-end automation. Replace the human glue with software that runs itself.',
    description:
      'Most businesses run on a stack of disconnected tools and human glue. We replace the glue. Trigger.dev for orchestration, Claude for reasoning, custom agents tuned for your specific operation. Voice agents available when the workflow is phone-driven.',
    outcomes: ['Workflow automation', 'Multi-agent systems', 'Voice agents'],
    ideal: 'Operations-heavy businesses ready to take the small jobs off the operator plate.',
  },
];
