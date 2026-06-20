import Link from 'next/link';
import MissedCallCalculator from '@/components/MissedCallCalculator';
import RestaurantVoiceSection from '@/components/RestaurantVoiceSection';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'AI for Restaurants. Phone Ordering and Missed-Call Revenue.',
  description:
    'A 24/7 AI voice agent for restaurants that takes phone orders, books tables, and saves the dinner rush from voicemail. Fires orders to Toast, Square, or Clover, plus a commission-free online ordering site. Built and live in about two weeks.',
  path: '/for/restaurants',
});

// Plugs into the systems a restaurant already runs. Naming them makes the
// "sends it to your POS" claim concrete (and is good for AI-search citation).
const posSystems = ['Toast', 'Square', 'Clover', 'Olo', 'ChowNow', 'DoorDash', 'Uber Eats'];

const builds = [
  {
    title: 'Phone Ordering Agent',
    body: 'Answers the line in your voice, reads your menu, takes the full takeout or delivery order, repeats it back, and fires it to your POS or kitchen. Toast, Square, Clover, and Olo all wire in. Takes payment up front with a pay link when you want it.',
  },
  {
    title: 'Reservation and Waitlist Agent',
    body: 'Books tables against your real availability, manages the waitlist, and texts the guest when their table is ready. Party size, timing, and special requests captured without anyone leaving the floor.',
  },
  {
    title: 'Missed-Call Recovery',
    body: 'Every call that still slips through gets an instant text back with your menu and an order link, so a missed ring during the rush becomes an order instead of a lost customer.',
  },
  {
    title: 'Commission-Free Online Ordering',
    body: 'Your own branded ordering page that keeps the 15 to 30 percent the delivery apps take on every ticket. Run it alongside DoorDash and Uber Eats, or steer regulars to it and keep the whole margin.',
  },
  {
    title: 'Catering and Events Funnel',
    body: 'The highest-ticket calls get qualified, captured, and routed straight to you with the details, then followed up by text and email so a big party never falls through the cracks of a busy shift.',
  },
  {
    title: 'Review Engine',
    body: 'A short text after the meal asks happy guests for a Google review and routes an unhappy one to you privately first. More five-star reviews, fewer public surprises, on autopilot.',
  },
];

const faqs = [
  {
    q: 'Can the AI take restaurant orders and send them to my POS?',
    a: 'Yes. It reads your menu, takes the full takeout or delivery order, repeats it back to the caller, and sends it to your kitchen or POS. Toast, Square, Clover, and Olo are the common integrations, and it can take payment up front with a pay link if you want it.',
  },
  {
    q: 'Will it handle the dinner rush when every call comes at once?',
    a: 'That is when it earns its keep. The agent answers every line at the same time, so the Friday-night flood of takeout and reservation calls all get handled instead of rolling to voicemail. There is no hold music and no busy signal.',
  },
  {
    q: 'Can it take reservations and manage a waitlist?',
    a: 'Yes. It books tables against your real availability, captures party size and special requests, manages the waitlist, and texts the guest when their table is ready. It writes everything into your reservation system so the host stand always has the full picture.',
  },
  {
    q: 'How is this different from DoorDash or Uber Eats?',
    a: 'The delivery apps take 15 to 30 percent of every order and own your customer. This is your own phone line and your own commission-free ordering page. You keep the margin, the customer data, and the relationship. Most restaurants run both: the apps for discovery, this for the regulars who would rather order direct.',
  },
  {
    q: 'How fast can it go live, and what does it cost?',
    a: 'Most restaurant voice agents are live on your number in about two weeks. Cost is quoted after a short discovery call and scoped to your call volume. It usually runs less than a part-time host and recovers its cost from the orders it saves during the first month of rushes.',
  },
  {
    q: 'Does it actually sound human?',
    a: 'Yes. Natural voice, natural pacing, and your menu in your words. Most callers cannot tell, and the ones who can do not mind, because they got their order taken instead of a voicemail beep.',
  },
];

export default function RestaurantsPage() {
  const pageUrl = `${SITE.url}/for/restaurants`;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: metadata.title,
    description: metadata.description,
    inLanguage: 'en-US',
    isPartOf: { '@id': `${SITE.url}/#website` },
    about: { '@id': `${SITE.url}/#organization` },
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2', '.resto-lede'] },
  };

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd,
          serviceJsonLd({
            name: 'AI Voice Agents and Ordering Systems for Restaurants',
            description:
              'Custom 24/7 AI voice agents for restaurants that take phone orders, book tables, recover missed calls, and run commission-free online ordering. Integrates with Toast, Square, Clover, and Olo. Built and live in about two weeks.',
          }),
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Industries', url: '/for' },
            { name: 'Restaurants', url: '/for/restaurants' },
          ]),
        ]}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <Link
              href="/for"
              className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold hover:text-[#E0301E] transition-colors inline-block mb-8"
            >
              ← All industries
            </Link>
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
              AI for Restaurants
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6 leading-[1.05]">
              Stop losing the rush to{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                voicemail
              </span>
            </h1>
            <p className="resto-lede text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto mb-9">
              Your phone rings hardest when the kitchen is slammed. A Modern Mustard Seed voice agent
              answers every call in a natural human voice, takes the order, books the table, and fires
              it straight to your POS. Phone orders, reservations, and catching the dinner rush, all
              without pulling a single person off the floor.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#calculator"
                className="px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Calculate Your Leak
              </a>
              <Link
                href="/book"
                className="px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a Call
              </Link>
            </div>
          </div>

          {/* Shared restaurant section: capability cards + rush-hour math */}
          <RestaurantVoiceSection />

          {/* Works with your POS */}
          <div className="pop-card p-8 md:p-10 mb-24 text-center">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">
              Plugs into what you already run
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-6">
              Works with your POS and ordering stack
            </h2>
            <div className="flex flex-wrap justify-center gap-2.5">
              {posSystems.map((p) => (
                <span
                  key={p}
                  className="px-5 py-2.5 text-sm font-sans font-bold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616]"
                >
                  {p}
                </span>
              ))}
            </div>
            <p className="text-[#161616]/55 text-sm font-body mt-6 max-w-xl mx-auto">
              Already on a different system? If it has an API or an order inbox, the agent connects to
              it. We confirm your exact setup on the discovery call.
            </p>
          </div>

          {/* Calculator (signature interactive moment + lead magnet) */}
          <div id="calculator" className="scroll-mt-28 mb-24">
            <MissedCallCalculator />
          </div>

          {/* What we build */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-5 block">
                What we build
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.1]">
                The full restaurant{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  phone stack
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {builds.map((b) => (
                <article key={b.title} className="pop-card p-7 md:p-8 hover:-translate-y-1 transition-transform duration-300">
                  <h3 className="font-display text-xl font-black text-[#161616] tracking-tight mb-2 leading-snug">
                    {b.title}
                  </h3>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{b.body}</p>
                </article>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="pop-card p-8 md:p-12 mb-24">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-4 block">
              What this costs
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-3">
              Quoted after a free discovery call
            </h2>
            <p className="text-[#3a3733] text-base font-body leading-7 max-w-2xl">
              A phone ordering agent is scoped to your menu, your call volume, and your POS. A full
              restaurant phone stack that adds reservations, missed-call recovery, a commission-free
              ordering page, and the review engine is the larger build. Most restaurants live on about
              two weeks and recover the cost from saved orders inside the first month of rushes. Every
              quote is fixed and in writing before any work begins.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href="/book"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all text-center"
              >
                Book a Discovery Call
              </Link>
              <Link
                href="/voice-agents"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-center"
              >
                How the Voice Agent Works
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto mb-24">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                Common{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  Questions
                </span>
              </h2>
            </div>
            <div className="space-y-4">
              {faqs.map((item) => (
                <details key={item.q} className="pop-card p-6 group cursor-pointer">
                  <summary className="flex justify-between items-start gap-4 list-none">
                    <h3 className="font-display text-lg font-black text-[#161616] tracking-tight">
                      {item.q}
                    </h3>
                    <span className="text-[#E0301E] text-2xl flex-shrink-0 transition-transform group-open:rotate-45 font-black">
                      +
                    </span>
                  </summary>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mt-4">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center pop-card-yellow p-10">
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-4">
              Answer every order this month
            </h2>
            <p className="text-[#161616]/75 text-base font-body font-medium mb-6 max-w-lg mx-auto">
              One discovery call. We scope your phone agent to your menu and your POS, and you stop
              sending takeout orders, tables, and catering jobs to voicemail. Your number, your brand,
              your kitchen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/book"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a Discovery Call
              </Link>
              <Link
                href="/build-queue"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Join the Build Queue
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
