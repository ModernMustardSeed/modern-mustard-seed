import ProofBand from '@/components/home/ProofBand';
import RecentWork from '@/components/home/RecentWork';
import JourneyRig from '@/components/journey/JourneyRig';
// Parked 2026-08-08 at Sarah's request: hide the review band until there is
// more than one review to show. Uncomment this and the <GoogleReviews /> tag
// below, plus the 'reviews' beat in data/journey-tour.ts, to bring it back.
// import GoogleReviews from '@/components/home/GoogleReviews';
import {
  JourneyHero,
  JourneyOrchard,
  JourneySigns,
  JourneySquare,
  JourneyGate,
  JourneyPlanting,
  JourneyTree,
  JourneyDoors,
} from '@/components/journey/chapters';
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
    url: 'https://modernmustardseed.com/opengraph-image',
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
    a: 'Modern Mustard Seed is a boutique design and AI studio in Kalispell, Montana, founded by Sarah Scarano. Four disciplines: design-led websites and brand, custom software, voice agents, and retained advisory for operators putting AI into a business that already works. We take a small number of engagements at a time and work with clients nationwide.',
  },
  {
    q: 'Who is Sarah Scarano?',
    a: 'Sarah Scarano is the founder, designer, and engineer behind Modern Mustard Seed. She is a full-stack engineer and AI systems architect who has shipped products across AI, e-commerce, real estate, hospitality and SaaS. She does the design and the build herself, and she is the person you talk to from the first note to the handoff.',
  },
  {
    q: 'How do engagements begin?',
    a: 'With a written inquiry at modernmustardseed.com/inquire. Sarah reads every one herself and replies inside one business day. If it is a fit, the next step is one working conversation, then a written scope with a set package price and a fixed timeline.',
  },
  {
    q: 'What does an engagement cost?',
    a: 'There is no price list, because the right answer depends on what you are building. Every engagement is scoped and quoted privately as a set package price, agreed in writing before work starts, and it does not move. Studio engagements begin in the five figures. Advisory is retained by the quarter.',
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
    a: 'The name comes from the mustard seed parable in Matthew 13: the smallest seed in the field grows into a tree the birds perch in. Every build here starts seed sized, and that is the plan. The homepage is a drive around Flathead Lake that ends at that exact tree.',
  },
];

const homeFaq = faqJsonLd(HOME_FAQ);

/**
 * Homepage: THE FLATHEAD JOURNEY. One scrolling drive around the lake: pickup,
 * orchards, the work, roadside signs, the square, the gate, proof, the
 * planting, the tree, the doors.
 *
 * Sarah 2026-09-11, the boutique pass. Three things came off this page and the
 * reasoning belongs here so nobody puts them back by accident:
 *
 * - Ava's audio narration. An opt-in hostess reading the page out loud is a
 *   gimmick, and it undercuts everything else the page is trying to say.
 * - The missed-revenue calculator, which closed on a free demo build.
 * - Every price, and every use of the word free.
 *
 * RecentWork took the calculator's slot. The portfolio is the better argument
 * and it is the one that belongs on a studio page.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          homeJsonLd,
          offerJsonLd,
          parableJsonLd,
          homeFaq,
          breadcrumbJsonLd([{ name: 'Home', url: '/' }]),
        ]}
      />
      <div className="relative bg-[#FBF6EA] text-[#161616]">
        <JourneyRig />
        <JourneyHero />
        {/* MI 4. The turnout held the "drop your number and Mr. Mustard calls
            you right now" band. Sarah 2026-09-11: a phone capture one screen
            into a studio homepage reads as a lead magnet, not as craft. The
            same widget still lives on /voice-agents, where somebody who is
            already interested can ask for the call themselves. JourneyRing is
            kept in chapters.tsx, unmounted, if it is ever wanted back. */}
        <JourneyOrchard />
        {/* MI 19. The work itself, in browser windows, directly under the three
            things we make. Sarah 2026-09-11: the missed-revenue calculator used
            to sit here and it closed on a free demo build. The portfolio is the
            better argument and it is the one that belongs on a studio page. */}
        <RecentWork />
        <JourneySigns />
        {/* MI 47. How a business gets found and gets chosen: the Google profile,
            the reviews, the AI answers, the conversion path, the follow up. */}
        <JourneySquare />
        <JourneyGate />
        <div className="border-b-2 border-[#161616]">
          <ProofBand />
        </div>
        <JourneyPlanting />
        <JourneyTree />
        {/* Real Google reviews sit directly in front of the ask. Parked until
            there is more than one; see the note on the import above. */}
        {/* <GoogleReviews /> */}
        <JourneyDoors />
        <section className="relative bg-[#F5F0E8] border-t-2 border-[#161616] py-20 md:py-28">
          <div className="relative max-w-3xl mx-auto px-6">
            <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase text-center">
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
                    <span className="flex-shrink-0 text-[#C4160B] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-[#5c554a] leading-relaxed font-body">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
