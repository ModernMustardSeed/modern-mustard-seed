import FlatheadHome from '@/components/home/FlatheadHome';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, parableJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Agentic Systems, Websites & AI Voice Agents',
  description:
    'Agentic systems, AI agents and websites that work for you, built for businesses across the United States and made to be found on Google and ChatGPT. AI voice agents that answer and book every call, and custom software. Set package prices; you own everything. Based in Kalispell, MT.',
});

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://modernmustardseed.com/#webpage',
  url: 'https://modernmustardseed.com',
  name: 'Modern Mustard Seed | Agentic Systems, AI Agents & Websites That Work for You',
  description: SITE.description,
  isPartOf: { '@id': 'https://modernmustardseed.com/#website' },
  about: { '@id': 'https://modernmustardseed.com/#organization' },
  // The planting chapter and the footer card are the same verse.
  hasPart: { '@id': 'https://modernmustardseed.com/#parable' },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${SITE.url}${SITE.ogImage}`,
    width: 1200,
    height: 630,
  },
};

const offerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Design and Agentic Systems Studio Engagements',
  description:
    'Design-led websites and brand, custom software, voice agents, marketing, and retained agentic systems advisory. Every engagement is scoped and quoted privately, with a set package price agreed before work starts.',
  provider: { '@id': 'https://modernmustardseed.com/#organization' },
  serviceType: 'Design and custom software development',
  areaServed: { '@type': 'Country', name: 'United States' },
};

const HOME_FAQ = [
  {
    "q": "What does Modern Mustard Seed do?",
    "a": "Modern Mustard Seed is a design and AI product studio in Kalispell, Montana, founded by Sarah Scarano. We build websites and brands, custom software, voice agents, marketing systems, and AI automations for new ventures and established businesses ready to scale. We also deliver white-label work for agencies. Clients work directly with Sarah, from the first conversation through launch and handoff, across Northwest Montana and throughout the United States."
  },
  {
    "q": "Who is Sarah Scarano?",
    "a": "Sarah Scarano is the founder, designer, and engineer behind Modern Mustard Seed. She is a full-stack engineer and agentic systems architect who has shipped products across agentic systems, e-commerce, real estate, hospitality and SaaS. She sets the direction on every engagement and stays on it from the first note to the handoff."
  },
  {
    "q": "How do engagements begin?",
    "a": "With a written inquiry at modernmustardseed.com/inquire. Sarah reads every one herself and replies inside one business day. If it is a fit, the next step is one working conversation, then a written scope with a set package price and a fixed timeline."
  },
  {
    "q": "What does an engagement cost?",
    "a": "There is no price list, because the right answer depends on what you are building. Every engagement is scoped and quoted privately as a set package price, agreed in writing before work starts, and it does not move. Advisory is retained by the quarter."
  },
  {
    "q": "Are refinements included?",
    "a": "Yes. Adjustments, refinements, and rework on what we built are included at no additional charge. A new deliverable outside the agreed scope is a separate engagement at a set package price."
  },
  {
    "q": "How long does a build take?",
    "a": "A website or a voice agent is typically live within a week or two of kickoff. Custom software, full applications, and stores are deeper builds and usually run two to six weeks. The timeline is fixed in the proposal alongside the price."
  },
  {
    "q": "What is the advisory work?",
    "a": "Retained counsel for operators putting agentic systems into a business that already works. What to build, what to refuse, what to automate, and in what order. It is engaged by the quarter and it is often the right first step when the answer is not yet a specific build."
  },
  {
    "q": "What tech stack do you use?",
    "a": "React 19, Next.js 16, TypeScript, Tailwind CSS, Supabase, Stripe, Vercel, Trigger.dev, Expo and React Native for mobile, plus Anthropic Claude, OpenAI, and Google Gemini for the models. Vapi for voice agents. The same stack across every engagement, refined in production."
  },
  {
    "q": "Do I own the work when it is finished?",
    "a": "Yes, outright. You receive the repository, the live deployment, the accounts, and the documentation to run all of it without us. We build assets you own, not a dependency on the studio."
  },
  {
    "q": "What has the studio built?",
    "a": "Recent work includes Cross + Covenant, a direct-to-consumer apparel brand taken from sketch to live storefront in sixty days; Lago Society, a lakeside fashion house with an agentic personal stylist; Fiat Lux Design, an agentic staging studio for real estate; and D&D Landscaping, a design-build landscaper with a full back office behind it."
  },
  {
    "q": "Do I need to know agentic systems to work with the studio?",
    "a": "No. Most clients run a business that already works and want a product built without hiring a team. The first conversation translates the goal into a scoped build, in plain language."
  },
  {
    "q": "Why is it called Modern Mustard Seed?",
    "a": "The name comes from the mustard seed parable in Matthew 13: the smallest seed in the field grows into a tree the birds perch in. Every build here starts seed sized, and that is the plan. The studio builds enduring digital assets from a single, carefully developed idea."
  },
  {
    "q": "Can you help scale an existing business?",
    "a": "Yes. We start with the operation you already run: lead handling, booking, sales follow-up, marketing, and back-office work. Then we identify the bottleneck and build the website, custom software, voice agent, or connected AI system that addresses it. Advisory is available when you need direction before choosing a build."
  },
  {
    "q": "Do you offer white-label services for agencies?",
    "a": "Yes. Modern Mustard Seed provides white-label websites, custom software, AI systems, and creative production for agencies. Your brand stays in front. The scope, ownership, delivery responsibilities, and handoff are agreed before work begins."
  }
];

const homeFaq = faqJsonLd(HOME_FAQ);


export default function HomePage() {
  return <><JsonLd data={[homeJsonLd, offerJsonLd, parableJsonLd, homeFaq, breadcrumbJsonLd([{ name: 'Home', url: '/' }])]} /><FlatheadHome /></>;
}
