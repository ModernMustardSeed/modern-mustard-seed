import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';
import StackCalculator from '@/components/command-center/StackCalculator';

const os = DEMO_PRODUCTS.os;
const site = DEMO_PRODUCTS.site;

export const metadata = buildMetadata({
  title: 'Business Command Center: the AI back office for your whole business',
  description:
    'One board that runs the whole business: every call transcribed, your website traffic, customers, reviews, invoices, and reports, wired together. $197/mo on its own, free with a website or AI receptionist. See yours built free.',
  path: '/command-center',
});

const MODULES = [
  { icon: '📞', name: 'Calls', desc: 'Every call your AI answers, transcribed and searchable, the lead already filed.' },
  { icon: '🌐', name: 'Website', desc: 'Live traffic, sources, top pages, and how many visitors became leads on the board.' },
  { icon: '👥', name: 'Customers', desc: 'One CRM. Every call, lead, and job, with the whole history a tap away.' },
  { icon: '📄', name: 'Quotes', desc: 'Branded quotes that get signed on the spot and book the job themselves.' },
  { icon: '💵', name: 'Money', desc: 'Every finished job becomes an invoice. Chase the late ones with one tap.' },
  { icon: '⭐', name: 'Reviews', desc: 'The 5-star chase runs on autopilot, and every review gets a warm reply.' },
  { icon: '⚡', name: 'Automations', desc: 'Missed-call rescue, follow-up, review requests, the busywork running itself.' },
  { icon: '🤖', name: 'Assistant', desc: 'An AI that can see the whole board. Ask it anything, or hand it the writing.' },
];

const FAQ = [
  {
    q: 'What is the Business Command Center?',
    a: 'It is one back-office dashboard that runs your whole business: every call transcribed, your website traffic and leads, your customers and pipeline, reviews, invoices, and reports, all wired together on a single board with an AI assistant that can see all of it. It replaces the pile of separate tools most owners juggle.',
  },
  {
    q: 'How much does it cost?',
    a: `The command center is ${formatUsd(os.setupCents)} to set up plus ${formatUsd(os.monthlyCents)} a month on its own. It is FREE with either a new website or an AI receptionist, because a website needs a back office and so does a phone line, so its price is waived the moment you add either. Month to month, cancel anytime, no trials.`,
  },
  {
    q: 'What does it replace?',
    a: 'A separate CRM, a call-transcription or AI-notetaker tool, a paid website analytics tier, a review-management app, invoicing and payment-chasing software, a scheduling tool, and a reporting dashboard. Most owners pay a monthly for several of those. The command center does all of it on one board.',
  },
  {
    q: 'How does it get my real data?',
    a: 'When your AI receptionist goes live, every call flows in with a full transcript and a filed lead. When your website goes live, its traffic and form fills flow in too. Connect your Google for reviews, and your invoicing for the money view. The demo shows sample data; the real build wires your actual calls, site, and customers.',
  },
  {
    q: 'Can I buy just the command center?',
    a: `Yes. You can order the command center on its own for ${formatUsd(os.setupCents)} setup plus ${formatUsd(os.monthlyCents)} a month. If you add a website (${formatUsd(site.monthlyCents)}/mo) or an AI receptionist, the command center comes free, so most owners take a paid piece and get the back office at no extra cost.`,
  },
  {
    q: 'How fast can I have it?',
    a: 'Your command center is forged free in about twenty seconds so you can tour it before you decide. Once you order, we customize it to your business by hand and release the real thing within seven days.',
  },
  {
    q: 'Do I own it, and can I cancel?',
    a: 'It is month to month and you can cancel anytime, no contract. There are no free trials because the free demo was the trial: you get to use the real thing before you pay a cent.',
  },
];

function commandCenterJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Business Command Center by Modern Mustard Seed',
        serviceType: 'AI business operations dashboard (CRM, call transcripts, website analytics, reviews, invoicing)',
        description:
          'One AI back-office board that runs the whole business: every call transcribed, website traffic and leads, customers, reviews, invoices, and reports, wired together. Sold standalone or free with a website or AI receptionist.',
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        url: `${SITE.url}/command-center`,
        offers: {
          '@type': 'Offer',
          name: 'Business Command Center',
          description: 'Standalone, or free with a website or AI receptionist.',
          price: Math.round(os.monthlyCents / 100),
          priceCurrency: 'USD',
          priceSpecification: [
            {
              '@type': 'UnitPriceSpecification',
              price: Math.round(os.monthlyCents / 100),
              priceCurrency: 'USD',
              billingIncrement: 1,
              unitText: 'MONTH',
            },
            {
              '@type': 'UnitPriceSpecification',
              priceType: 'https://schema.org/Installment',
              price: Math.round(os.setupCents / 100),
              priceCurrency: 'USD',
              description: 'One-time setup',
            },
          ],
          url: `${SITE.url}/command-center`,
          availability: 'https://schema.org/InStock',
        },
      },
      faqJsonLd(FAQ),
      breadcrumbJsonLd([
        { name: 'Modern Mustard Seed', url: SITE.url },
        { name: 'Business Command Center', url: `${SITE.url}/command-center` },
      ]),
    ],
  };
}

export default function CommandCenterPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd data={commandCenterJsonLd()} />

      {/* ── Hero ── */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-16 md:pt-40 lg:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 xl:col-span-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#C4160B] font-bold">
                The AI back office // Free with either
              </span>
              <h1 className="font-display text-[2.6rem] sm:text-5xl xl:text-6xl font-bold mt-4 leading-[1.02] tracking-tight">
                The command center that <em className="italic text-[#C4160B]">runs the whole business.</em>
              </h1>
              <p className="font-body text-[17px] text-[#161616]/75 mt-5 leading-relaxed">
                Every call transcribed, your website traffic, customers, reviews, invoices, and reports, wired
                together on one board with an AI that sees all of it. {formatUsd(os.monthlyCents)}/mo on its own.
                Free with a website or an AI receptionist.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/demos"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
                >
                  Build mine free →
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Book a call
                </Link>
              </div>
              <p className="font-body text-[13px] text-[#161616]/70 mt-4">
                Forged free in about twenty seconds. No card, no meeting.
              </p>
            </div>

            {/* Hero visual: a rendered mini command-center board, not a flat block. */}
            <div className="lg:col-span-6 xl:col-span-7">
              <div className="relative rounded-2xl border-2 border-[#161616] bg-[#161616] shadow-[8px_8px_0_0_#161616] overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-28"
                  style={{ background: 'radial-gradient(60% 120% at 50% 0%, rgba(245,183,0,0.16), transparent 70%)' }}
                />
                {/* top bar */}
                <div className="relative flex items-center gap-3 px-5 h-14 border-b border-[#FBF6EA]/12">
                  <span className="h-8 w-8 rounded-lg bg-[#F5B700] text-[#161616] font-black grid place-items-center">S</span>
                  <div className="leading-tight">
                    <p className="font-bold text-[14px] text-[#FBF6EA]">Summit Roofing Co</p>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#FBF6EA]/65">Command Center · Kalispell, MT</p>
                  </div>
                  <span className="ml-auto text-[9px] uppercase tracking-[0.16em] font-bold rounded-full px-2.5 py-1 border border-[#F5B700] text-[#F5B700]">
                    Live
                  </span>
                </div>
                {/* live wire */}
                <div className="relative mx-4 mt-4 rounded-lg border border-[#FBF6EA]/12 bg-[#1F1F1F] flex items-center gap-2 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-[#F5B700] animate-pulse" />
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#F5B700]">Live wire</span>
                  <span className="text-[11px] font-mono text-[#FBF6EA]/70 truncate">9:12 PM · Rita M. · ceiling leak → booked 7 AM</span>
                </div>
                {/* stat tiles */}
                <div className="relative grid grid-cols-3 gap-3 p-4">
                  {[
                    ['Rescued', '$38,400', 'this week'],
                    ['Caught overnight', '3', 'zero missed'],
                    ['Reviews', '4.9', '+7 this month'],
                  ].map(([label, value, sub]) => (
                    <div key={label} className="rounded-xl border border-[#FBF6EA]/12 bg-[#1F1F1F] p-3">
                      <p className="text-[8.5px] uppercase tracking-[0.16em] font-bold text-[#FBF6EA]/65">{label}</p>
                      <p className="font-mono text-lg font-bold text-[#FBF6EA] mt-1 leading-none">{value}</p>
                      <p className="text-[9px] text-[#FBF6EA]/65 mt-1">{sub}</p>
                    </div>
                  ))}
                </div>
                {/* module chips */}
                <div className="relative flex flex-wrap gap-1.5 px-4 pb-5">
                  {['Today', 'Calls', 'Website', 'Customers', 'Quotes', 'Money', 'Reviews', 'Assistant'].map((m, i) => (
                    <span
                      key={m}
                      className={`text-[10px] font-semibold rounded-md px-2.5 py-1 border ${
                        i === 1 ? 'bg-[#F5B700] text-[#161616] border-[#F5B700]' : 'text-[#FBF6EA]/70 border-[#FBF6EA]/15'
                      }`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 lg:py-20 space-y-20">
        {/* ── One board, wired to everything ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            One board // Not eight logins
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Everything it takes to run the business, in one place.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed">
            Your phone and your website stop being separate things. Every call and every form lands on the same board,
            with the AI already following up.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {MODULES.map((m) => (
              <div
                key={m.name}
                className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-5 transition-transform hover:-translate-y-1"
              >
                <span className="text-2xl leading-none" aria-hidden>{m.icon}</span>
                <h3 className="font-display font-extrabold text-lg mt-2.5">{m.name}</h3>
                <p className="font-body text-[13px] text-[#161616]/70 mt-1.5 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Signature moment: replace your stack ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            The math // Add up what you replace
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            One board instead of a pile of subscriptions.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed mb-9">
            Most owners quietly pay a monthly for a CRM, a notetaker, an analytics tier, a review app, invoicing, and
            more. Tap what you pay for and watch it stack up.
          </p>
          <StackCalculator />
        </section>

        {/* ── Pricing ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Pricing // Free with either paid piece
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Buy it on its own, or get it on the house.
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mt-10 items-stretch">
            {/* Standalone */}
            <div className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-7">
              <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#C4160B]">On its own</span>
              <h3 className="font-display italic font-extrabold text-2xl mt-2">Command Center</h3>
              <p className="font-mono font-bold text-[15px] mt-3">
                {formatUsd(os.monthlyCents)}/mo <span className="text-[#161616]/70">+ {formatUsd(os.setupCents)} setup</span>
              </p>
              <p className="font-body text-[13px] text-[#161616]/70 mt-3 leading-relaxed flex-1">
                The whole back office, wired to your existing phone, site, and customers. Month to month.
              </p>
              <Link
                href="/demos"
                className="mt-6 text-center border-2 border-[#161616] bg-[#F5B700] text-[#161616] rounded-full px-5 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Build mine free
              </Link>
            </div>

            {/* Free with website — featured */}
            <div className="relative flex flex-col border-2 border-[#161616] bg-[#F5B700] rounded-2xl shadow-[8px_8px_0_0_#161616] p-7">
              <span
                aria-hidden
                className="absolute -top-4 -right-3 rotate-[8deg] bg-[#C4160B] text-[#FBF6EA] font-mono font-extrabold text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616]"
              >
                Smartest move
              </span>
              <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#161616]">Add a website</span>
              <h3 className="font-display italic font-extrabold text-2xl mt-2">Website + free command center</h3>
              <p className="font-mono font-bold text-[15px] mt-3 text-[#161616]">
                {formatUsd(site.monthlyCents)}/mo <span className="text-[#161616]/75">+ {formatUsd(site.setupCents)} setup</span>
              </p>
              <p className="font-body text-[13px] text-[#161616]/80 mt-3 leading-relaxed flex-1">
                A new site on your own domain, and the command center rides free. It costs less per month than the
                command center alone, and you get both.
              </p>
              <Link
                href="/demos"
                className="mt-6 text-center border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-5 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
              >
                Build both free
              </Link>
            </div>

            {/* Whole system */}
            <div className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-7">
              <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#C4160B]">Everything</span>
              <h3 className="font-display italic font-extrabold text-2xl mt-2">The Whole System</h3>
              <p className="font-mono font-bold text-[15px] mt-3">
                {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo <span className="text-[#161616]/70">+ {formatUsd(DEMO_BUNDLE.setupCents)} setup</span>
              </p>
              <p className="font-body text-[13px] text-[#161616]/70 mt-3 leading-relaxed flex-1">
                Receptionist + website + the command center that ties them together, free. One system, one login.
              </p>
              <Link
                href="/demos"
                className="mt-6 text-center border-2 border-[#161616] bg-[#F5B700] text-[#161616] rounded-full px-5 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Build all three free
              </Link>
            </div>
          </div>
          <p className="font-body text-[13px] text-[#161616]/70 mt-6 text-center">
            Month to month, cancel anytime, no trials. We customize everything by hand and release it within 7 days.
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              ['1', 'Forge it free', 'Tell us your business and your command center is built in about twenty seconds. Tour it, try the assistant, poke around. No card.'],
              ['2', 'We wire it up', 'Order it and we connect your real calls, your website traffic, your customers, and your reviews, customized to your business by hand.'],
              ['3', 'Run the whole thing', 'Live within a week. Every call, lead, review, and dollar on one board, with the AI following up while you work.'],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4 sm:block">
                <span className="font-display text-5xl font-bold text-[#F5B700] leading-none shrink-0">{n}</span>
                <div className="sm:mt-3">
                  <h3 className="font-display font-bold text-lg text-[#FBF6EA] leading-tight">{t}</h3>
                  <p className="font-body text-[13.5px] text-[#FBF6EA]/65 mt-1.5 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase text-center">
            Straight answers // No sales call required
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] text-center">
            Questions, answered plainly.
          </h2>
          <div className="mt-10 max-w-3xl mx-auto space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border-2 border-[#161616] bg-white p-5 open:shadow-[4px_4px_0_0_#F5B700] transition-shadow">
                <summary className="font-display text-lg font-bold cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="flex-shrink-0 text-[#C4160B] transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[#5c554a] leading-relaxed font-body">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Close ── */}
        <section className="relative halftone-bg border-2 border-[#161616] rounded-2xl bg-[#F5B700] p-10 md:p-14 text-center overflow-hidden">
          <div className="relative">
            <h2 className="font-display italic font-extrabold text-3xl md:text-5xl leading-[1.02]">
              See your command center, built free.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/80 mt-4 max-w-xl mx-auto leading-relaxed">
              Enter your business once and tour a working command center in about twenty seconds. Keep it for
              {' '}{formatUsd(os.monthlyCents)}/mo, or get it free with a website or receptionist.
            </p>
            <Link
              href="/demos"
              className="mt-7 inline-block border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
            >
              Build mine free →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
