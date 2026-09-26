import { buildMetadata, SITE } from '@/lib/seo';
import DemoStation from '@/components/DemoStation';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';
import { PREVIEW } from '@/data/preview-promise';

/**
 * The title leads with the SEARCHED thing, not the internal product name.
 *
 * This page shipped as "The Demo Station: three free AI demos..." which put a
 * brand term nobody types in the highest-weighted position on the page. Nothing
 * on the page matched "free voice agent demo" or "free website demo for my
 * business," which is what people and AI answer engines actually ask for. Brand
 * name stays (buildMetadata appends "| Modern Mustard Seed" and the H1 still
 * says Demo Station), it just no longer leads. (Retitled 2026-07-25.)
 */
export const metadata = buildMetadata({
  title: 'Free Website Preview and Audit for Your Business',
  description:
    'A free website preview sketched from scratch for your business, plus a free audit of your site, Google profile and reviews. No card and no sales call. Both are with you within 24 hours.',
  path: '/demos',
});

const FAQ = [
  {
    q: 'Is it really free?',
    a: 'Yes. The preview and the audit cost you nothing, and there is no card and no meeting. We build them because the work sells itself; keep the website from $147 a month, or walk away.',
  },
  {
    q: 'What exactly do I get?',
    a: 'Two things, personalized to your business: a website preview sketched from scratch in your look, and a free audit that grades your current site, your Google profile and your reviews, with every check printed. Both live at your private hub link.',
  },
  {
    q: 'Is the website the finished product?',
    a: 'No, and that is the point. ' + PREVIEW.body,
  },
  {
    q: 'How fast?',
    a: 'Within 24 hours. The website is designed from scratch rather than filled into a template, and then we record you a walkthrough of it. The audit lands alongside it. Both appear at your hub on their own and we email you the moment they land, so you can close the tab.',
  },
  {
    q: 'What happens if I want to keep something?',
    a: 'Order right at your hub. Month to month, cancel anytime, a one-time setup covers customization, and we release the real thing within 7 days. No trials and no surprise bills; the demo was the trial.',
  },
];

const PIECES = [
  {
    icon: '🌐',
    title: 'Your Website Preview',
    desc: 'Sketched from scratch for your trade, your town, your phone number. A working preview of what yours could become. The real one is made bespoke.',
    pill: `Free · keep from ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo`,
    tone: 'gold' as const,
  },
  {
    icon: '🔍',
    title: 'Your Free Audit',
    desc: 'Your current site, your Google profile and your reviews, graded, with every check printed and the fixes in order. Yours to keep either way.',
    pill: 'Free · yours to keep',
    tone: 'ink' as const,
  },
];

/**
 * THE DEMO STATION: the ad-funnel front door. Ads land here, the visitor
 * builds their own three-demo suite, the hub sells the keep, and the dial
 * floor follows up on everyone who stalls.
 *
 * Layout law here (learned the hard way): this page is a CONVERSION page, so
 * it is deliberately asymmetric and top-heavy. The film carries the hero (flat
 * color blocks read as a template), the form sits at the top of the fold on
 * desktop instead of below three cards, and every card is a flex column with
 * its price pill pinned to a common baseline so the buttons never float at
 * ragged heights.
 */
/**
 * The full schema graph for /demos. This page previously carried FAQPage ONLY,
 * so AI crawlers could read the questions but had no idea what the Demo Station
 * offers or costs (added 2026-07-20 to match the /voice-agents/build graph).
 *
 * Every price is DERIVED from DEMO_PRODUCTS. Never type one
 * here: see the $197/$297 split that leaked into the trade FAQ schema.
 */
function demosJsonLd() {
  // Two, not three: the command center is not one of the demos we build, so it
  // is not one of the offers this page advertises (Sarah, 2026-08-25).
  const products = [DEMO_PRODUCTS.site];
  const offer = (name: string, monthlyCents: number, setupCents: number, desc: string) => ({
    '@type': 'Offer' as const,
    name,
    description: desc,
    price: Math.round(monthlyCents / 100),
    priceCurrency: 'USD',
    priceSpecification: [
      {
        '@type': 'UnitPriceSpecification',
        price: Math.round(monthlyCents / 100),
        priceCurrency: 'USD',
        billingIncrement: 1,
        unitText: 'MONTH',
      },
      {
        '@type': 'UnitPriceSpecification',
        priceType: 'https://schema.org/Installment',
        price: Math.round(setupCents / 100),
        priceCurrency: 'USD',
        description: 'One-time setup',
      },
    ],
    url: `${SITE.url}/demos`,
    availability: 'https://schema.org/InStock',
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'The Demo Station by Modern Mustard Seed',
        serviceType: 'Free website preview and presence audit',
        description:
          'A free self-serve build. Enter your business once and receive a website preview designed from scratch and a free audit of your site, Google profile and reviews. No account and no credit card.',
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: [
          ...products.map((p) =>
            offer(
              p.name,
              p.monthlyCents,
              p.setupCents,
              p.blurb,
            ),
          ),
        ],
      },
      {
        '@type': 'HowTo',
        name: 'Get a free website preview and audit for your business',
        totalTime: 'PT1H',
        step: [
          {
            '@type': 'HowToStep',
            name: 'Tell the build about your business',
            text: 'Business name, what you do, and where you are. One short form, no account and no card.',
          },
          {
            '@type': 'HowToStep',
            name: 'Your preview and audit land',
            text: 'The website is designed from scratch rather than filled into a template, then we record you a walkthrough of it. It lands within 24 hours with your free audit, at your private hub, and we email you when it is ready.',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Modern Mustard Seed', item: SITE.url },
          { '@type': 'ListItem', position: 2, name: 'The Demo Station', item: `${SITE.url}/demos` },
        ],
      },
    ],
  };
}

export default function DemosPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(demosJsonLd()) }}
      />

      {/* ── Hero: headline left, the build itself right. Never a centered column. ──
           The site Navbar is FIXED, and its height CHANGES with width (70px on
           phone and desktop, 84px at ~1024, 102px around 768 where it wraps), so
           hero padding must clear the worst case before it starts breathing.
           Measured: this keeps a 64-96px gap under the nav at every breakpoint. */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-14 md:pt-40 lg:pb-20">
          <div className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* The pitch */}
            <div className="lg:col-span-6 xl:col-span-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold">
                The Demo Station
              </span>
              <h1 className="font-display text-[2.6rem] sm:text-5xl xl:text-6xl font-bold mt-4 leading-[1.02] tracking-tight">
                We sketch your{' '}
                <em className="italic text-[#C4160B]">new website.</em> Free.
              </h1>
              <p className="font-body text-[17px] text-[#161616]/70 mt-5 leading-relaxed">
                A website preview with your name on the door, sketched from scratch in your look, plus a free audit
                of the site, Google profile and reviews you have now. {PREVIEW.short}
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  'No card. No meeting. No sales call to sit through.',
                  'Your preview and your audit are with you within 24 hours.',
                  `Keep what you love from ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo. Or keep nothing.`,
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 font-body text-[15px] text-[#161616]/80">
                    <span
                      aria-hidden
                      className="mt-[3px] shrink-0 grid place-items-center h-5 w-5 rounded-md bg-[#F5B700] border-2 border-[#161616] text-[11px] font-bold leading-none"
                    >
                      ✓
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <a
                href="#build"
                className="mt-8 inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-xl px-7 py-4 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform lg:hidden"
              >
                Build my preview →
              </a>
            </div>

            {/* The proof: the film. Real motion beats another color block.
                This is the STATION's own film (the build), not the Demo Suite's
                welcome film. Different audience: cold ad traffic who have never
                heard of us, versus someone who already has their demos. Served
                from the 3.4MB web cut, not the 23MB master: this page is the
                landing pad for paid mobile traffic. */}
            <div className="lg:col-span-6 xl:col-span-7">
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#161616] overflow-hidden">
                <video
                  controls
                  preload="metadata"
                  poster="/video/tv/make-it-real.webp"
                  src="/video/tv/make-it-real.mp4"
                  className="w-full aspect-video bg-[#161616]"
                />
                <div className="flex items-center gap-3 px-4 py-3 border-t-2 border-[#161616]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/mascot.png" alt="" width={34} height={34} className="shrink-0" />
                  <p className="font-body text-[13px] text-[#161616]/70 leading-snug">
                    Make It Real: forty seconds on what we build, and who it is for.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16 space-y-16">
        {/* ── The form. The whole point of the page, so it does not hide below cards. ── */}
        <section id="build" className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-12 gap-8 lg:gap-12 items-start scroll-mt-8">
          <div className="lg:col-span-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">Start the build</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 leading-[1.08]">
              One short form from you. Then the build does the rest.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/70 mt-4 leading-relaxed">
              Your phone number goes on your preview site and is how we reach you about the build, nothing more.
              Nothing is charged and nobody calls you unless you ask.
            </p>
            <div className="mt-6 bg-[#161616] rounded-2xl border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">What lands, and when</p>
              <ul className="mt-3 space-y-2">
                {[
                  ['Within 24 hours', 'Your website preview, designed from scratch (not a template), with a recorded walkthrough of it.'],
                  ['Alongside it', 'Your free audit: your site, your Google profile and your reviews, graded, with the fixes in order.'],
                ].map(([when, what]) => (
                  <li key={when} className="font-body text-[14px] text-[#FBF6EA]/80 leading-relaxed">
                    <span className="font-sans font-bold uppercase tracking-[0.08em] text-[11px] text-[#F5B700] block">{when}</span>
                    {what}
                  </li>
                ))}
              </ul>
              <p className="font-body text-[12.5px] text-[#FBF6EA]/55 mt-3 leading-relaxed">
                Close the tab if you like. We email you the second the website lands.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <DemoStation />
          </div>
        </section>

        {/* ── The three pieces. Flex columns, pills pinned to one baseline. ── */}
        <section>
          <h2 className="font-display text-3xl sm:text-4xl font-bold">What actually shows up</h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-2 max-w-2xl">
            Two things with your name on them. Keep the website, keep the audit either way.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 mt-7">
            {PIECES.map((c) => (
              <div
                key={c.title}
                className={`flex flex-col border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 ${
                  c.tone === 'ink'
                    ? 'bg-[#161616] text-[#FBF6EA]'
                    : c.tone === 'gold'
                      ? 'bg-[#F5B700] text-[#161616]'
                      : 'bg-white text-[#161616]'
                }`}
              >
                <span className="text-3xl leading-none">{c.icon}</span>
                <h3 className="font-display text-xl font-bold mt-3 leading-tight">{c.title}</h3>
                <p
                  className={`font-body text-[13.5px] mt-2 leading-relaxed ${
                    c.tone === 'ink' ? 'text-[#FBF6EA]/70' : 'text-[#161616]/70'
                  }`}
                >
                  {c.desc}
                </p>
                {/* mt-auto is the fix for the ragged buttons: every pill sits on one line. */}
                <p
                  className={`mt-auto pt-5 font-mono text-[12px] font-bold ${
                    c.tone === 'gold' ? 'text-[#161616]' : c.tone === 'ink' ? 'text-[#F5B700]' : 'text-[#161616]'
                  }`}
                >
                  {c.pill}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              { n: '1', t: 'You tell us who you are', d: 'One short form, the one above. No card, no meeting.' },
              { n: '2', t: 'The build runs', d: 'Your website is designed from scratch, then we record you a walkthrough of it, and your free audit is graded alongside. Both are with you within 24 hours, at your hub, on their own.' },
              {
                n: '3',
                t: 'Keep what you love',
                d: `Keep the website at your hub from ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo, live within 7 days, or work with us on the bespoke one.`,
              },
            ].map((s) => (
              <div key={s.n} className="flex gap-4 sm:block">
                <span className="font-display text-5xl font-bold text-[#F5B700] leading-none shrink-0">{s.n}</span>
                <div className="sm:mt-3">
                  <h3 className="font-display text-lg font-bold text-[#FBF6EA] leading-tight">{s.t}</h3>
                  <p className="font-body text-[13.5px] text-[#FBF6EA]/65 mt-1.5 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <h2 className="font-display text-3xl font-bold">Fair questions</h2>
            <p className="font-body text-[14px] text-[#161616]/60 mt-3">
              Still stuck? Call us at{' '}
              <a href="tel:+14063121223" className="font-bold text-[#B92417] underline underline-offset-2">
                (406) 312-1223
              </a>
              . Yes, a voice agent answers our phone too. Try to stump it.
            </p>
          </div>
          <div className="lg:col-span-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 group">
                <summary className="font-sans font-bold cursor-pointer list-none flex justify-between items-center gap-4">
                  {f.q}
                  <span className="text-[#C4160B] group-open:rotate-45 transition-transform text-xl leading-none shrink-0">+</span>
                </summary>
                <p className="font-body text-[14px] text-[#161616]/70 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="font-mono text-[11px] text-[#161616]/70 text-center pb-4">
          Modern Mustard Seed · Kalispell, MT · Mr. Mustard (406) 312-1223 · Sarah (406) 250-6076
        </p>
      </div>
    </div>
  );
}
