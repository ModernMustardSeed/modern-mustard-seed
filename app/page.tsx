import FrontDeskHero from '@/components/home/FrontDeskHero';
import HomeTicker from '@/components/home/HomeTicker';
import ProofBand from '@/components/home/ProofBand';
import BuildCabinet from '@/components/home/BuildCabinet';
import ThreeDoors from '@/components/home/ThreeDoors';
import TheClose from '@/components/home/TheClose';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Apps, Sites, and Specialty AI Tools',
  description:
    'Do you want your business to thrive? Custom apps, websites, and specialty AI tools for your business, shipped in weeks, not months. Now booking new builds.',
});

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://modernmustardseed.com/#webpage',
  url: 'https://modernmustardseed.com',
  name: 'Modern Mustard Seed | Apps, Sites, and Specialty AI Tools',
  description:
    'Do you want your business to thrive? Custom apps, websites, and specialty AI tools for your business, shipped in weeks, not months.',
  isPartOf: { '@id': 'https://modernmustardseed.com/#website' },
  about: { '@id': 'https://modernmustardseed.com/#organization' },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: 'https://modernmustardseed.com/opengraph-image',
    width: 1200,
    height: 630,
  },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', 'h2'],
  },
};

const offerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Idea to Product in Weeks',
  description:
    'Custom apps, websites, software, and specialty AI tools. Fixed scope, fixed timeline. Now booking new builds.',
  provider: { '@id': 'https://modernmustardseed.com/#organization' },
  serviceType: 'Custom software development',
  areaServed: 'Worldwide',
};

const homeFaq = faqJsonLd([
  {
    q: 'What does Modern Mustard Seed do?',
    a: 'Modern Mustard Seed is a one-person product studio that builds custom apps, websites, and specialty AI tools for businesses. Founded by Sarah Scarano, it ships fixed-scope, fixed-timeline products in weeks, not months. Now booking new builds.',
  },
  {
    q: 'Who is Sarah Scarano?',
    a: 'Sarah Scarano is the founder, engineer, and strategist behind Modern Mustard Seed. She is a self-taught full-stack engineer and AI systems architect who has shipped 40+ products across AI, e-commerce, real estate, hospitality, and SaaS, and runs four ventures from one desk.',
  },
  {
    q: 'How long does a build take?',
    a: 'Most builds go live two to four weeks from kickoff, depending on scope. Some, like a voice agent, go live in about two. Fixed scope, fixed timeline, fixed quote. Modern Mustard Seed is now booking new builds and gives each engagement focused attention.',
  },
  {
    q: 'How do I get on the build queue?',
    a: 'Submit your idea at modernmustardseed.com/build-queue. Sarah reviews every submission personally and replies fast, usually the same day. Every client also gets Mr. Mustard, the studio AI, on call 24/7 for questions between conversations.',
  },
  {
    q: 'What does it cost?',
    a: 'Each engagement is quoted per project after a free 30-minute discovery call. Pricing is fixed before work starts. No hourly billing, no surprises.',
  },
  {
    q: 'What tech stack do you use?',
    a: 'React 19, Next.js 16, TypeScript, Tailwind CSS, Supabase, Stripe, Vercel, Trigger.dev, Expo and React Native for mobile, plus Anthropic Claude, OpenAI, and Google Gemini for AI. Vapi for voice agents. Same stack across every engagement, refined in production.',
  },
  {
    q: 'Do I own the code when the build is finished?',
    a: 'Yes. You receive the repository, the live deployment, and the documentation. You own the product outright.',
  },
  {
    q: 'What is MUSTARD MODE?',
    a: 'MUSTARD MODE is the coach-led way to master Claude and Claude Code. Mr. Mustard, a live AI coach, trains you through four tracks (Code, Design, Cowork, Ideate) with 28 missions, a prompt library, and a progress HUD. The first coaching session is free at modernmustardseed.com/mustard-mode, and paid levels start at $197 once with lifetime access.',
  },
  {
    q: 'What is the AI-Proof Your Business offer?',
    a: 'A defensive engagement for existing businesses with revenue to protect. Modern Mustard Seed audits the moat, hardens the operation with AI on the front lines and in the back office, and re-equips the team. Quoted per business after a free discovery call.',
  },
  {
    q: 'What kinds of products has Modern Mustard Seed built?',
    a: 'Recent builds include DEED AI (FSBO command center for home sellers), PTG AI Deal Analyzer (real estate investment analyzer), Cross + Covenant (direct-to-consumer faith apparel brand), Olive Shoot (agentic OS for solopreneurs), Make Me Studio (AI creative studio), Alive Notes (mobile OS for human intention), Luxe Design (AI real estate staging), and the Wild Daisy Command Center (30-agent operations hub).',
  },
  {
    q: 'Do I need to know AI to work with Modern Mustard Seed?',
    a: 'No. The studio is built for everyone, from a small business owner who needs their first real website to a founder shipping a custom AI tool. The discovery call translates your goal into a scoped build.',
  },
]);

/**
 * Homepage: six beats, Studio Arcade direction (approved 2026-07-02).
 * 01 Front Desk hero · 02 ticker · 03 proof band · 04 Build Cabinet ·
 * 05 Three Doors + free audit · 06 the close.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd data={[homeJsonLd, offerJsonLd, homeFaq, breadcrumbJsonLd([{ name: 'Home', url: '/' }])]} />
      <FrontDeskHero />

      <main className="relative bg-[#FBF6EA] text-[#161616]">
        <HomeTicker />
        <ProofBand />
        <BuildCabinet />
        <HomeTicker reverse />
        <ThreeDoors />
        <TheClose />
      </main>
    </>
  );
}
