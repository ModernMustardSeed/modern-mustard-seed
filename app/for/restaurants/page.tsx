import Link from 'next/link';
import RestaurantCalculator from '@/components/RestaurantCalculator';
import RestaurantVoiceSection from '@/components/RestaurantVoiceSection';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'AI for Restaurants and Franchises. Phone Ordering and Missed-Call Revenue.',
  description:
    'An always-on voice agent for restaurants and multi-unit franchise operators that takes phone orders, books tables, captures catering, and saves the dinner rush from voicemail. Fires orders to Toast, Square, or Clover, and rolls out per location across your whole footprint.',
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
    a: 'Most restaurant systems are live in about two weeks, answering the number you already have. Pricing is per store and scoped to the fleet: a single location, a committed fleet, and a whole-brand rollout are three different pieces of work, so each is quoted privately as a set package price agreed before anything goes live. That covers to-go and catering ordering, the operator dashboard, and the answered-call volume we agree on. One recovered catering order a month more than covers a store, and a thirty-day pilot proves the number before you commit the fleet.',
  },
  {
    q: 'Does it actually sound human?',
    a: 'Yes. Natural voice, natural pacing, and your menu in your words. Most callers cannot tell, and the ones who can do not mind, because they got their order taken instead of a voicemail beep.',
  },
  {
    q: 'Do you work with restaurant franchises and multi-unit operators?',
    a: 'Yes, and multi-unit operators are the best fit for this. We train the AI host once on your brand and menu, then roll it out per location with one dashboard that shows the revenue it recovered at each store. Pricing is per location and discounts by volume, so whether you run three locations or forty it is one contract and one point of contact. Catering and large-party capture, the highest-ticket calls a busy store drops, is where multi-unit operators see the fastest return.',
  },
  {
    q: 'We are a franchisee. Can we add this ourselves, or do we need corporate approval?',
    a: 'In almost every franchise system the individual operator owns their own phone line and local vendor decisions, so you can add an AI host at the store or group level without waiting on corporate. A few brands mandate a specific ordering stack from headquarters, so we confirm your exact situation on a short call before anything goes live. Most franchisees start with one store, hear it answer their own restaurant, and roll it out across their locations from there.',
  },
  {
    q: 'Can one voice agent cover all of my locations?',
    a: 'Yes. The host is trained on your brand once and then deployed to each location on its own number, so every store answers in the same voice with its own hours, menu, and specials. You get a single dashboard across the whole footprint that shows calls answered, orders taken, and catering captured per location, so you can see which stores were leaking the most and how much came back.',
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
            name: 'Voice Agents and Ordering Systems for Restaurants',
            description:
              'Custom 24/7 voice agents for restaurants that take phone orders, book tables, recover missed calls, and run commission-free online ordering. Integrates with Toast, Square, Clover, and Olo. Built and live in about two weeks.',
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
              <Link
                href="/inquire"
                className="px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Start a rollout
              </Link>
              <a
                href="#calculator"
                className="px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Calculate my leak
              </a>
            </div>
            <p className="mt-4 text-[13px] font-body text-[#161616]/55 max-w-md mx-auto">
              Trained on your menu, your hours, and the questions your callers actually ask.{' '}
              <Link
                href="/inquire"
                className="text-[#1E50C8] font-semibold underline underline-offset-2 hover:text-[#E0301E] transition-colors"
              >
                Tell us about your restaurant.
              </Link>
            </p>
          </div>

          {/* Hear it live: the studio line, which is the standard of the work */}
          <div className="pop-card p-8 md:p-10 bg-[#F5B700] mb-24">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">
                  New · Hear it first
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight leading-[1.1] mb-3">
                  Hear one trained on your restaurant.
                </h2>
                <p className="text-[#161616]/75 text-base font-body leading-7 max-w-xl">
                  Your host is trained on your restaurant: the menu, the hours, the catering questions,
                  and the way your regulars ask for things. It answers in your voice and fires the order
                  straight through. Tell us the restaurant and we will tell you exactly what it would do.
                </p>
              </div>
              <Link
                href="/inquire"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border-2 border-[#161616] bg-[#161616] text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#FBF6EA] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all whitespace-nowrap"
              >
                Start a rollout →
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
            <RestaurantCalculator />
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

          {/* Franchises & multi-unit operators (the conquest layer) */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-5 block">
                Franchises &amp; multi-unit operators
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.1]">
                Run more than one location? Plug the leak across{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  all of them
                </span>
              </h2>
              <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto mt-5">
                The revenue your busiest store loses to a ringing phone, times every store you run. We
                train the host once on your brand, then roll it out per location with one dashboard
                that shows the revenue it recovered at each one. Franchisee or multi-unit owner, you
                run your own phone line, so you do not have to wait on corporate to stop losing orders.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {[
                {
                  title: 'One host, your whole footprint',
                  body: 'Trained once on your brand and menu, then deployed to every location. A new store opens and the host is live on its number day one.',
                },
                {
                  title: 'Revenue recovered, per location',
                  body: 'One dashboard shows how many calls, orders, and catering jobs each store recovered this month. The number that makes the rollout obvious.',
                },
                {
                  title: 'Catering capture at every store',
                  body: 'The highest-ticket calls are the ones a slammed shift drops. The host qualifies and routes every catering and large-party lead, at all of them, around the clock.',
                },
                {
                  title: 'Volume pricing for fleets',
                  body: 'Per-location pricing that discounts as your count grows. One contract, one invoice, one point of contact across three locations or forty.',
                },
              ].map((c) => (
                <article key={c.title} className="pop-card p-7 md:p-8 hover:-translate-y-1 transition-transform duration-300">
                  <h3 className="font-display text-xl font-black text-[#161616] tracking-tight mb-2 leading-snug">
                    {c.title}
                  </h3>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{c.body}</p>
                </article>
              ))}
            </div>
            <div className="pop-card-yellow p-8 md:p-10 text-center">
              <p className="text-[#161616]/80 text-base md:text-lg font-body font-medium max-w-2xl mx-auto mb-6">
                Say a single store leaks about <span className="font-black">$1,900 a month</span> to
                missed calls. Ten locations is over <span className="font-black">$225,000 a year</span>{' '}
                ringing out to the place down the street. Recover a third of it and the rollout has paid
                for itself many times over.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/inquire"
                  className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#FBF6EA] bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
                >
                  Start a rollout →
                </Link>
                <Link
                  href="/inquire"
                  className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Talk multi-unit rollout
                </Link>
              </div>
            </div>
          </div>

          {/* Pricing: the order-taking concierge system, priced per store */}
          <div className="mb-24">
            <div className="text-center mb-10">
              <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-5 block">
                How a rollout is scoped
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.1]">
                The order-taking system,{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  scoped per store
                </span>
              </h2>
              <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto mt-5">
                This is the full system: it takes to-go and catering orders into your POS, recognizes
                returning guests, and rolls recovered revenue up per location. Scoped per store and
                quoted privately, with a thirty-day pilot to prove the number before you commit the
                fleet.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
              {[
                {
                  name: 'Standard',
                  note: 'Single or a few stores',
                  price: 'Per store',
                  cadence: '',
                  setup: 'Quoted privately, activation included',
                  includes: [
                    'Answered-call volume set in your scope',
                    'To-go + catering ordering',
                    'Catering lead capture',
                    'Returning-guest recognition',
                    'Operator revenue dashboard',
                    'Overage rate agreed up front',
                  ],
                  featured: false,
                },
                {
                  name: 'Fleet',
                  note: '25+ stores · most operators',
                  price: 'Fleet rate',
                  cadence: '',
                  setup: 'Better per store, activation waived',
                  includes: [
                    'Everything in Standard',
                    'Fleet rollup dashboard',
                    'Per-location 86 board + specials push',
                    'Multilingual (100+ languages)',
                    'Daily GM briefing',
                    'Priority support',
                  ],
                  featured: true,
                },
                {
                  name: 'Group / enterprise',
                  note: 'Whole brand, one rollout',
                  price: 'Custom',
                  cadence: '',
                  setup: 'Scoped with your brand team',
                  includes: [
                    'Every location, one rollout',
                    'POS integration (Olo, Toast, Square)',
                    'Brand-trained voice + guardrails',
                    'Dedicated success manager',
                    'Plan tied to recovered revenue',
                  ],
                  featured: false,
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className={`rounded-2xl border-2 border-[#161616] p-7 flex flex-col ${
                    t.featured ? 'bg-[#F5B700] shadow-[6px_6px_0_0_#161616]' : 'bg-white shadow-[4px_4px_0_0_#161616]'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/55 font-mono font-bold block mb-1">
                    {t.note}
                  </span>
                  <h3 className="font-display text-2xl font-black text-[#161616] mb-3">{t.name}</h3>
                  <div className="mb-1">
                    <span className="font-display text-3xl font-black text-[#161616] tracking-tight">{t.price}</span>
                    {t.cadence && <span className="font-mono text-sm text-[#161616]/60 ml-1">{t.cadence}</span>}
                  </div>
                  <span className="text-[#161616]/60 text-xs font-body block mb-5">{t.setup}</span>
                  <ul className="flex flex-col gap-2.5">
                    {t.includes.map((inc) => (
                      <li key={inc} className="flex items-start gap-2 text-[#161616]/80 text-sm font-body leading-snug">
                        <span className="text-[#E0301E] font-black mt-px" aria-hidden="true">
                          ✓
                        </span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-center text-[#161616]/55 text-sm font-body mt-6 max-w-2xl mx-auto">
              One recovered catering order a month more than covers a store. Every quote is one set
              package price, fixed and in writing, and the thirty-day pilot proves the number on your
              own phones before you roll out the fleet.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/voice-agents"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-center"
              >
                Hear one answer →
              </Link>
              <Link
                href="/inquire"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all text-center"
              >
                Start a rollout →
              </Link>
            </div>
            <p className="text-center mt-6">
              <Link
                href="/voice-agents"
                className="text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#E0301E] transition-colors"
              >
                See how the voice agent works →
              </Link>
            </p>
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
                href="/inquire"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a Discovery Call
              </Link>
              <Link
                href="/inquire"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Begin an Engagement
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
