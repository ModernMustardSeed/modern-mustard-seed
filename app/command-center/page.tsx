import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';
import StackCalculator from '@/components/command-center/StackCalculator';

// One product, one price. The bundle, the paired middle rung and the voice
// agent's price all used to be imported here to build a three-column comparison
// grid whose job was to push the buyer into the bundle where this came free.
// That rule is gone (Sarah, 2026-08-22) and so is the grid.
const os = DEMO_PRODUCTS.os;

export const metadata = buildMetadata({
  title: 'Business Command Center: the AI back office for your whole business',
  description:
    'One board that runs the whole business: every call transcribed, your website traffic, customers, reviews, invoices, and reports, wired together. $197/mo, built by hand and scoped with you first.',
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
    a: `${formatUsd(os.setupCents)} to set up plus ${formatUsd(os.monthlyCents)} a month, month to month, cancel anytime, no trials. It is sold on its own and it is not bundled with anything: every one is built by hand around the tools you already run, so it is scoped with you before it is built.`,
  },
  {
    q: 'What does it replace?',
    a: 'A separate CRM, a call-transcription or AI-notetaker tool, a paid website analytics tier, a review-management app, invoicing and payment-chasing software, a scheduling tool, and a reporting dashboard. Most owners pay a monthly for several of those. The command center does all of it on one board.',
  },
  {
    q: 'How does it get my real data?',
    a: 'If you run one of our voice agents, every call flows in with a full transcript and a filed lead. If you run one of our websites, its traffic and form fills flow in too. Connect your Google for reviews, and your invoicing for the money view. It also wires into plenty of software you already have, which is what the scoping conversation is for.',
  },
  {
    q: 'Can I buy just the command center?',
    a: `That is the only way it is sold. ${formatUsd(os.setupCents)} setup plus ${formatUsd(os.monthlyCents)} a month, month to month. It is not part of the free demo suite and it is not bundled with anything: every one is built by hand around the software you already run, so it starts with a short conversation rather than a form.`,
  },
  {
    q: 'How fast can I have it?',
    a: 'Faster than most software migrations and slower than our other two doors, because this one is built by hand around the tools you already use. We scope it with you first, then build. If you want to see one working before you decide, ask and we will walk you through a live board.',
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
          'One AI back-office board that runs the whole business: every call transcribed, website traffic and leads, customers, reviews, invoices, and reports, wired together. Sold on its own, built by hand.',
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        url: `${SITE.url}/command-center`,
        offers: {
          '@type': 'Offer',
          name: 'Business Command Center',
          description: 'Standalone, or free when the website and the voice agent are taken together.',
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
      // breadcrumbJsonLd prepends SITE.url itself, so these are PATHS.
      breadcrumbJsonLd([
        { name: 'Modern Mustard Seed', url: '' },
        { name: 'Business Command Center', url: '/command-center' },
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
                The AI back office // Sold on its own
              </span>
              <h1 className="font-display text-[2.6rem] sm:text-5xl xl:text-6xl font-bold mt-4 leading-[1.02] tracking-tight">
                The command center that <em className="italic text-[#C4160B]">runs the whole business.</em>
              </h1>
              <p className="font-body text-[17px] text-[#161616]/75 mt-5 leading-relaxed">
                Every call transcribed, your website traffic, customers, reviews, invoices, and reports, wired
                together on one board with an AI that sees all of it. {formatUsd(os.monthlyCents)}/mo, built by
                hand around the software you already run.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
                >
                  Scope mine with Sarah →
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Book a call
                </Link>
              </div>
              <p className="font-body text-[13px] text-[#161616]/70 mt-4">
                Forged free and open right away. No card, no meeting.
              </p>
            </div>

            {/* Hero visual: a real screenshot of a live command center. */}
            <div className="lg:col-span-6 xl:col-span-7">
              <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] shadow-[8px_8px_0_0_#161616] overflow-hidden">
                <Image
                  src="/command-center-hero.png"
                  alt="A roofing company's Business Command Center: three calls caught overnight, today's schedule, rescued revenue, and $61,400 of claim value in motion, all on one board"
                  width={1280}
                  height={800}
                  priority
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="block w-full h-auto"
                />
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

        {/* ── Pricing ──
            ONE CARD, ON PURPOSE (Sarah, 2026-08-22). This section used to be a
            three-column grid whose whole job was to push the buyer into the
            bundle where the command center came free. It is not in the bundle
            any more and it is not in the demo suite, so a grid that compares it
            to two things it no longer ships with would be selling a rule that
            does not exist. It is one product at one price, and the honest thing
            about it is that it is hand built, which is also why it is not free.
        */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Pricing // One product, one price
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Built by hand, around what you already run.
          </h2>
          <p className="font-body text-[16px] text-[#161616]/75 mt-4 max-w-2xl leading-relaxed">
            Most businesses that want this already have software doing pieces of it. That is exactly why every one of
            these is scoped before it is built: the point is one board, not a sixth login. So this is not part of the
            free demo suite, and it is never bundled with anything else.
          </p>

          <div className="mt-9 max-w-xl border-2 border-[#161616] bg-[#F5B700] rounded-2xl shadow-[8px_8px_0_0_#161616] p-7 sm:p-9">
            <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#161616]">Business Command Center</span>
            <p className="font-mono font-bold text-[20px] mt-3 text-[#161616]">
              {formatUsd(os.monthlyCents)}/mo <span className="text-[#161616]/75">+ {formatUsd(os.setupCents)} setup</span>
            </p>
            <p className="font-body text-[14px] text-[#161616]/80 mt-4 leading-relaxed">
              The whole back office, wired to your phone, your site, and your customers. Month to month, cancel
              anytime. We scope it with you first so it replaces tools instead of joining them.
            </p>
            <Link
              href="/book"
              className="mt-7 inline-block text-center border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-7 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
            >
              Scope mine with Sarah
            </Link>
          </div>
          <p className="font-body text-[13px] text-[#161616]/70 mt-6 max-w-xl">
            Month to month, cancel anytime, no trials.
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              ['1', 'We scope it together', 'A short call about the software you already run, so this replaces tools instead of joining them.'],
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
              Let us scope your command center.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/80 mt-4 max-w-xl mx-auto leading-relaxed">
              Enter your business once and tour a working command center, open right away. Keep it for
              {' '}{formatUsd(os.monthlyCents)}/mo, or take the website and the voice agent together and it is free.
            </p>
            <Link
              href="/book"
              className="mt-7 inline-block border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
            >
              Scope mine with Sarah →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
