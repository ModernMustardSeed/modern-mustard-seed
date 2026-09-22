import StudioHome from '@/components/home/StudioHome';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, parableJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'A Design and AI Studio in Kalispell, Montana',
  description:
    'Modern Mustard Seed is a boutique design and AI studio. Websites and brand, custom software, voice agents, and advisory for operators building something worth owning. By inquiry.',
});

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://modernmustardseed.com/#webpage',
  url: 'https://modernmustardseed.com',
  name: 'Modern Mustard Seed | A Design and AI Studio in Kalispell, Montana',
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
  name: 'Design and AI Studio Engagements',
  description:
    'Design-led websites and brand, custom software, voice agents, and retained AI advisory. Every engagement is scoped and quoted privately, with a set package price agreed before work starts.',
  provider: { '@id': 'https://modernmustardseed.com/#organization' },
  serviceType: 'Design and custom software development',
  areaServed: 'Worldwide',
};

const HOME_FAQ = [
  {
    q: 'What does Modern Mustard Seed do?',
    a: 'Modern Mustard Seed is a boutique design and AI studio in Kalispell, Montana, founded by Sarah Scarano. Four disciplines: design-led websites and brand, custom software, voice agents, and retained advisory for operators putting AI into a business that already works. We work with clients across Northwest Montana and nationwide.',
  },
  {
    q: 'Who is Sarah Scarano?',
    a: 'Sarah Scarano is the founder, designer, and engineer behind Modern Mustard Seed. She is a full-stack engineer and AI systems architect who has shipped products across AI, e-commerce, real estate, hospitality and SaaS. She sets the direction on every engagement and stays on it from the first note to the handoff.',
  },
  {
    q: 'How do engagements begin?',
    a: 'With a written inquiry at modernmustardseed.com/inquire. Sarah reads every one herself and replies inside one business day. If it is a fit, the next step is one working conversation, then a written scope with a set package price and a fixed timeline.',
  },
  {
    q: 'What does an engagement cost?',
    a: 'There is no price list, because the right answer depends on what you are building. Every engagement is scoped and quoted privately as a set package price, agreed in writing before work starts, and it does not move. Advisory is retained by the quarter.',
  },
  {
    q: 'Are changes billed separately?',
    a: 'No. Changes to what we built are included, permanently. There is no change order and no second invoice. Work that adds a deliverable we never agreed to build is a new engagement, quoted the same way as the first.',
  },
  {
    q: 'How long does a build take?',
    a: 'A website or a voice agent is typically live within a week or two of kickoff. Custom software, full applications, and stores are deeper builds and usually run two to six weeks. The timeline is fixed in the proposal alongside the price.',
  },
  {
    q: 'What is the advisory work?',
    a: 'Retained counsel for operators putting AI into a business that already works. What to build, what to refuse, what to automate, and in what order. It is engaged by the quarter and it is often the right first step when the answer is not yet a specific build.',
  },
  {
    q: 'What tech stack do you use?',
    a: 'React 19, Next.js 16, TypeScript, Tailwind CSS, Supabase, Stripe, Vercel, Trigger.dev, Expo and React Native for mobile, plus Anthropic Claude, OpenAI, and Google Gemini for AI. Vapi for voice agents. The same stack across every engagement, refined in production.',
  },
  {
    q: 'Do I own the work when it is finished?',
    a: 'Yes, outright. You receive the repository, the live deployment, the accounts, and the documentation to run all of it without us. We build assets you own, not a dependency on the studio.',
  },
  {
    q: 'What has the studio built?',
    a: 'Recent work includes Wild Hope, a Flathead Lake retreat village told through seventeen original oil paintings; Cross + Covenant, a direct-to-consumer apparel brand taken from sketch to live storefront in sixty days; Lago Society, a lakeside fashion house with an AI personal stylist; Fiat Lux Design, an AI staging studio for real estate; and D&D Landscaping, a design-build landscaper with a full back office behind it.',
  },
  {
    q: 'Do I need to know AI to work with the studio?',
    a: 'No. Most clients run a business that already works and want a product built without hiring a team. The first conversation translates the goal into a scoped build, in plain language.',
  },
  {
    q: 'Why is it called Modern Mustard Seed?',
    a: 'The name comes from the mustard seed parable in Matthew 13: the smallest seed in the field grows into a tree the birds perch in. Every build here starts seed sized, and that is the plan. The studio builds enduring digital assets from a single, carefully developed idea.',
  },
];

const homeFaq = faqJsonLd(HOME_FAQ);


export default function HomePage() {
  return <><JsonLd data={[homeJsonLd, offerJsonLd, parableJsonLd, homeFaq, breadcrumbJsonLd([{ name: 'Home', url: '/' }])]} /><StudioHome faq={HOME_FAQ} /></>;
}
