import FrontDeskHero from '@/components/home/FrontDeskHero';
import DemoForgeStrip from '@/components/home/DemoForgeStrip';
import HomeTicker from '@/components/home/HomeTicker';
import HomeVine from '@/components/home/HomeVine';
import HomeFilmStage from '@/components/home/HomeFilmStage';
import RecentWork from '@/components/home/RecentWork';
import ProofBand from '@/components/home/ProofBand';
import BuildCabinet from '@/components/home/BuildCabinet';
import ThreeDoors from '@/components/home/ThreeDoors';
import ComicRack from '@/components/home/ComicRack';
import TheClose from '@/components/home/TheClose';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Websites, Voice Agents, and AI Command Centers',
  description:
    'Do you want your business to thrive? Custom websites, voice agents, and AI command centers, live in about a week. Custom apps and stores too. Now booking new builds.',
});

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://modernmustardseed.com/#webpage',
  url: 'https://modernmustardseed.com',
  name: 'Modern Mustard Seed | Websites, Voice Agents, and AI Command Centers',
  description:
    'Do you want your business to thrive? Custom websites, voice agents, and AI command centers, live in about a week. Custom apps and stores too.',
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
  name: 'Idea to Product, Fast',
  description:
    'Custom websites, voice agents, and AI command centers live in about a week. Custom apps, software, and stores in weeks. Fixed scope, fixed timeline. Now booking new builds.',
  provider: { '@id': 'https://modernmustardseed.com/#organization' },
  serviceType: 'Custom software development',
  areaServed: 'Worldwide',
};

const HOME_FAQ = [
  {
    q: 'What does Modern Mustard Seed do?',
    a: 'Modern Mustard Seed is a one-person product studio that builds custom websites, voice agents, AI command centers, and apps for businesses. Founded by Sarah Scarano, it ships fixed-scope, fixed-quote builds fast: websites, voice agents, and command centers go live in about a week. Now booking new builds.',
  },
  {
    q: 'Who is Sarah Scarano?',
    a: 'Sarah Scarano is the founder, engineer, and strategist behind Modern Mustard Seed. She is a self-taught full-stack engineer and AI systems architect who has shipped 40+ products across AI, e-commerce, real estate, hospitality, and SaaS, and runs four ventures from one desk.',
  },
  {
    q: 'How long does a build take?',
    a: 'Websites, voice agents, and command centers go live in about a week from kickoff. Custom software, full apps, and online stores are deeper builds and usually take two to four weeks. Fixed scope, fixed timeline, fixed quote. Modern Mustard Seed is now booking new builds and gives each engagement focused attention.',
  },
  {
    q: 'How do I get started?',
    a: 'Book a free 30-minute call at modernmustardseed.com/book. Sarah takes every call herself. Every client also gets Mr. Mustard, the studio AI, on call 24/7 for questions between conversations.',
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
    q: 'What kinds of products has Modern Mustard Seed built?',
    a: 'Recent builds include DEED AI (FSBO command center for home sellers), PTG AI Deal Analyzer (real estate investment analyzer), Cross + Covenant (direct-to-consumer faith apparel brand), Olive Shoot (agentic OS for solopreneurs), Make Me Studio (AI creative studio), Alive Notes (mobile OS for human intention), Luxe Design (AI real estate staging), and the Wild Daisy Command Center (30-agent operations hub).',
  },
  {
    q: 'Do I need to know AI to work with Modern Mustard Seed?',
    a: 'No. The studio is built for everyone, from a small business owner who needs their first real website to a founder shipping a custom AI tool. The discovery call translates your goal into a scoped build.',
  },
  {
    q: 'Why is it called Modern Mustard Seed?',
    a: 'The name comes from the mustard seed parable in Matthew 13: the smallest seed in the field grows into a tree the birds perch in. Every build here starts seed-sized, and that is the plan.',
  },
];

const homeFaq = faqJsonLd(HOME_FAQ);

/**
 * Homepage: six beats, Studio Arcade direction (approved 2026-07-02).
 * 01 Front Desk hero · 02 ticker · 03 proof band · 04 Build Cabinet ·
 * 05 Three Doors + free audit · 06 the close.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd data={[homeJsonLd, offerJsonLd, homeFaq, breadcrumbJsonLd([{ name: 'Home', url: '/' }])]} />
      <DemoForgeStrip />
      <FrontDeskHero />

      {/* The Growing Vine draws down this whole container as you scroll:
          seed under the hero, a leaf pair at each data-vine-stop boundary,
          two perched birds at the close (Matthew 13:32). */}
      <main id="mm-vine-host" className="relative bg-[#FBF6EA] text-[#161616]">
        <HomeVine />
        <HomeTicker />
        <div data-vine-stop><HomeFilmStage /></div>
        <div data-vine-stop><ProofBand /></div>
        <div data-vine-stop><BuildCabinet /></div>
        <HomeTicker reverse />
        <div data-vine-stop><ThreeDoors /></div>
        <div data-vine-stop><RecentWork /></div>
        <div data-vine-stop><ComicRack /></div>
        <div data-vine-stop>
          <section className="relative bg-[#F5F0E8] border-t-2 border-[#161616] py-20 md:py-28">
            <div className="relative max-w-3xl mx-auto px-6">
              <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase text-center">
                Straight answers // No sales call required
              </p>
              <h2 className="font-display italic font-extrabold text-4xl md:text-5xl text-[#161616] mt-3 leading-[1.02] text-center">
                Questions, answered plainly.
              </h2>
              <div className="mt-10 space-y-4">
                {HOME_FAQ.map((f) => (
                  <details key={f.q} className="group rounded-xl border-2 border-[#161616] bg-white p-5 open:shadow-[4px_4px_0_0_#F5B700] transition-shadow">
                    <summary className="font-display text-lg font-bold text-[#161616] cursor-pointer list-none flex items-center justify-between gap-4">
                      {f.q}
                      <span className="flex-shrink-0 text-[#E0301E] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p className="mt-3 text-[#5c554a] leading-relaxed font-body">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </div>
        <div data-vine-stop><TheClose /></div>
      </main>
    </>
  );
}
