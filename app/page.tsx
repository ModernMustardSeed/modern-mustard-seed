import HeroIdeaToProduct from '@/components/HeroIdeaToProduct';
import FlagshipPrograms from '@/components/FlagshipPrograms';
import ResultsMarquee from '@/components/ResultsMarquee';
import EraOfEntrepreneur from '@/components/EraOfEntrepreneur';
import StartingPoints from '@/components/StartingPoints';
import WhatAreYouBuilding from '@/components/WhatAreYouBuilding';
import WhatGetsBuilt from '@/components/WhatGetsBuilt';
import AiProofPromo from '@/components/AiProofPromo';
import NewsletterSignup from '@/components/NewsletterSignup';
import CelebrationVideo from '@/components/CelebrationVideo';
import HeroVideo from '@/components/HeroVideo';
import FeaturedSites from '@/components/FeaturedSites';
import Testimonials from '@/components/Testimonials';
import YourSiteWorksForYou from '@/components/YourSiteWorksForYou';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Apps, Sites, and Specialty AI Tools',
  description:
    'Custom apps, websites, and specialty AI tools for your business. Shipped in 30 days. Now booking new builds.',
});

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://modernmustardseed.com/#webpage',
  url: 'https://modernmustardseed.com',
  name: 'Modern Mustard Seed | Apps, Sites, and Specialty AI Tools',
  description:
    'Custom apps, websites, and specialty AI tools for your business. Shipped in 30 days.',
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
  name: 'Idea to Product in 30 Days',
  description:
    'Custom apps, websites, software, and specialty AI tools. Fixed scope, fixed timeline. Now booking new builds.',
  provider: { '@id': 'https://modernmustardseed.com/#organization' },
  serviceType: 'Custom software development',
  areaServed: 'Worldwide',
};

const homeFaq = faqJsonLd([
  {
    q: 'What does Modern Mustard Seed do?',
    a: 'Modern Mustard Seed is a one-person product studio that builds custom apps, websites, and specialty AI tools for businesses. Founded by Sarah Scarano, it ships fixed-scope, fixed-timeline products in 30 days. Now booking new builds.',
  },
  {
    q: 'Who is Sarah Scarano?',
    a: 'Sarah Scarano is the founder, engineer, and strategist behind Modern Mustard Seed. She is a self-taught full-stack engineer and AI systems architect who has shipped 40+ products across AI, e-commerce, real estate, hospitality, and SaaS, and runs four ventures from one desk.',
  },
  {
    q: 'How long does a build take?',
    a: 'Thirty days from kickoff to launch. Fixed scope, fixed timeline, fixed quote. Modern Mustard Seed is now booking new builds and gives each engagement focused attention.',
  },
  {
    q: 'How do I get on the build queue?',
    a: 'Submit your idea at modernmustardseed.com/build-queue. Sarah reviews every submission personally and replies within 3 business days.',
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

export default function HomePage() {
  return (
    <>
      <JsonLd data={[homeJsonLd, offerJsonLd, homeFaq, breadcrumbJsonLd([{ name: 'Home', url: '/' }])]} />
      <HeroIdeaToProduct />

      {/* Light pop-art base for the whole homepage body */}
      <main className="relative bg-[#FBF6EA] text-[#161616]">
        <FlagshipPrograms />
        <ResultsMarquee />
        <EraOfEntrepreneur />
        <StartingPoints />
        <YourSiteWorksForYou />
        <FeaturedSites />
        <WhatAreYouBuilding />
        <WhatGetsBuilt />
        <Testimonials />
        <AiProofPromo />

        {/* Celebration video close: partnership + dreams to fullness */}
        <CelebrationVideo />

        <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-16">
          <NewsletterSignup />
        </section>

        {/* Lion video, at the very bottom of the page */}
        <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 pb-20 border-t-4 border-[#161616]">
          <div className="max-w-4xl mx-auto text-center pt-16">
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold block mb-3">
              Watch
            </span>
            <HeroVideo />
          </div>
        </section>
      </main>
    </>
  );
}
