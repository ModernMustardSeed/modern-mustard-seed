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
    slug: 'ai-products',
    icon: '🤖',
    title: 'AI-Powered Products',
    short:
      'Custom AI applications that solve real problems. Multi-agent systems, content generation, intelligent automation, production-grade tools that scale.',
    description:
      'We build custom AI products end to end. From the model selection and prompt architecture to the UI, the database, the auth, the billing, and the deployment. Every product is shipped to production, owned by you, and engineered to scale.',
    outcomes: ['Custom AI tools', 'Multi-agent systems', 'Intelligent automation'],
    ideal: 'Founders with a clear AI product vision who want it built once, built right.',
  },
  {
    slug: 'voice-agents',
    icon: '📞',
    title: 'Voice Agents',
    short:
      'Enterprise-grade voice AI for phone conversations, appointment booking, customer service, and lead qualification. 24/7.',
    description:
      'A voice agent that picks up your business phone, handles inbound calls intelligently, books appointments on your calendar, qualifies leads, and transfers complex calls to humans. Powered by Vapi, integrated with your CRM, monitored end to end.',
    outcomes: ['24/7 phone coverage', 'Lead qualification', 'Appointment booking'],
    ideal: 'Service businesses where every missed call is a missed customer.',
  },
  {
    slug: 'full-stack',
    icon: '🏗️',
    title: 'Full-Stack Development',
    short:
      'Production-grade web applications from concept to deployment. React, Next.js, databases, APIs, authentication, payments. The full stack.',
    description:
      'We build web apps the way modern teams ship: Next.js + Supabase + Stripe + Vercel. Designed for performance, secured by default, deployed continuously, and easy to extend. Our stack is the same one we run every business on.',
    outcomes: ['Production apps', 'API architecture', 'Database design'],
    ideal: 'Founders who need a real product, not a prototype.',
  },
  {
    slug: 'business-automation',
    icon: '⚙️',
    title: 'Business Automation',
    short:
      'End-to-end workflow orchestration, CRM pipelines, multi-system integrations. Cut manual work, scale capacity.',
    description:
      'Most businesses run on a stack of disconnected tools and human glue. We replace the human glue with automation. Trigger.dev, Zapier, custom workflows, AI agents, scheduled jobs. The work that used to take hours happens in seconds.',
    outcomes: ['Workflow orchestration', 'CRM pipelines', 'Multi-system sync'],
    ideal: 'Operations-heavy businesses ready to remove themselves from the inbox.',
  },
  {
    slug: 'brand-strategy',
    icon: '🎯',
    title: 'Brand & Strategy',
    short:
      'Brand DNA extraction, content strategy, go-to-market execution. Building identities that resonate and strategies that convert.',
    description:
      'Strategy work for founders who treat their brand like a moat. We extract your brand DNA, design the system, and ship the go-to-market. Positioning, voice, content engine, launch sequence. Built to convert and engineered to compound.',
    outcomes: ['Brand identity', 'Content strategy', 'Go-to-market'],
    ideal: 'Founders launching something they want to last.',
  },
  {
    slug: 'creative-tech',
    icon: '✨',
    title: 'Creative & Generative Tech',
    short:
      'Immersive digital experiences, generative art, interactive visualizations. Brand expression as software.',
    description:
      'When the brief calls for something that has not existed before. WebGL, Three.js, p5, generative art, scroll-driven storytelling, 3D product configurators. Brand expression where the website itself is the demo.',
    outcomes: ['WebGL experiences', 'Generative art', '3D product configurators'],
    ideal: 'Brands competing on craft, not commodity.',
  },
];
