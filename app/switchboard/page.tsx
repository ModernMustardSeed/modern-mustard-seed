import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata, SITE } from '@/lib/seo';
import { SWITCHBOARD, PRICE_TIERS, BUILD_FEE_USD, whatShips, howItWorks, faq, quoteFor, usd } from '@/data/switchboard';
import CommandBoard from '@/components/switchboard/CommandBoard';
import SwitchboardMotion from '@/components/switchboard/SwitchboardMotion';
import SwitchboardExperiment from '@/components/switchboard/SwitchboardExperiment';
import SwitchboardCable from '@/components/switchboard/SwitchboardCable';

export const metadata = buildMetadata({
  title: SWITCHBOARD.metaTitle,
  description: SWITCHBOARD.metaDescription,
  path: '/switchboard',
});

const examples = [
  { loc: 5, note: 'a small chain' },
  { loc: 25, note: 'a regional brand' },
  { loc: 100, note: 'a national franchise' },
];

export default function SwitchboardPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'The Switchboard by Modern Mustard Seed',
        serviceType: 'Multi-location AI voice concierge for franchises',
        description: SWITCHBOARD.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: PRICE_TIERS.map((t) => ({
          '@type': 'Offer',
          name: `The Switchboard, ${t.label}`,
          price: t.perLocationUsd,
          priceCurrency: 'USD',
          url: `${SITE.url}/switchboard#board`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'HowTo',
        name: 'How a franchise puts an AI concierge on every location',
        step: howItWorks.map((s) => ({ '@type': 'HowToStep', name: s.step, text: s.body })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return (
    <div id="top" className="bg-[#FBF6EA] text-[#161616]">
      {/* Preload the display weights the hero paints with, so the headline never
          reflows on font swap (kept CLS at ~0 on the old fixed-height hero; the
          bright hero's height depends on the type). React hoists these to <head>. */}
      <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKfFunDXbtM.woff2" />
      <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="https://fonts.gstatic.com/s/playfairdisplay/v40/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_iiUXtHA-Q.woff2" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SwitchboardMotion />
      <SwitchboardExperiment />

      {/* The Patch-Cable Connect needs one positioned ancestor spanning the page. */}
      <div id="sb-cable-host" className="relative">
        <SwitchboardCable />

        {/* Top three sections are a flex column so the A/B can float the board above the
            hero (variant B) by CSS order alone. DOM order stays hero-first for SEO. */}
        <div className="flex flex-col">

          {/* ───────────────  HERO — bright exchange  ─────────────── */}
          <section className="sb-slot-hero relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
            <div className="relative z-[2] max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-14 md:pb-20">
              <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
                <div className="lg:col-span-7">
                  <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-white text-[#E0301E] border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
                    ☎ For franchises &amp; multi-location brands
                  </span>
                  <h1 className="mt-6 font-display font-extrabold leading-[0.98] tracking-tight text-5xl md:text-6xl lg:text-[4.6rem] text-[#161616]">
                    One voice answers for <em className="italic text-[#B48600]">all</em> of them.
                  </h1>
                  <p className="mt-6 max-w-xl text-lg md:text-xl text-[#3d382e] font-body leading-relaxed">
                    Give every location a 24/7 AI concierge in one on-brand voice, and watch the recovered revenue from all of them on a single Command Board.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a href="#board" className="rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]">
                      See your locations on the board
                    </a>
                    <Link href={SWITCHBOARD.walkthroughPath} className="rounded-full border-2 border-[#161616] bg-white px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]">
                      Book a walkthrough
                    </Link>
                  </div>
                  <p className="mt-6 font-body text-[15px] text-[#5c554a]">
                    Or hear it right now:{' '}
                    <a href={`tel:${SWITCHBOARD.demoLine.number}`} className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
                      call {SWITCHBOARD.demoLine.display}
                    </a>{' '}
                    and a live AI concierge answers as a location would.
                  </p>
                </div>

                {/* The exchange poster: every line in the building, one gold socket. */}
                <div className="lg:col-span-5 sb-reveal">
                  <figure className="relative rotate-[-1.5deg] rounded-2xl border-[3px] border-[#161616] bg-white p-2.5 shadow-[9px_9px_0_0_#F5B700]">
                    <Image
                      src="/switchboard/exchange-hero.jpg"
                      alt="Pop-art telephone exchange: every line plugs into one glowing gold socket"
                      width={2048}
                      height={1152}
                      priority
                      sizes="(min-width: 1024px) 40vw, 92vw"
                      className="rounded-xl border-2 border-[#161616] w-full h-auto"
                    />
                    <figcaption className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5c554a] text-center">
                      Every line in the building · one voice
                    </figcaption>
                  </figure>
                </div>
              </div>
            </div>
          </section>

          {/* ───────────────  TRY IT LIVE (real callable concierge)  ─────────────── */}
          <section className="sb-slot-try border-b-2 border-[#161616] bg-[#F5B700]">
            <div className="relative z-[2] max-w-5xl mx-auto px-6 py-10 md:py-12 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#161616]/70">{SWITCHBOARD.demoLine.label}</p>
                <h2 className="mt-2 font-display text-2xl md:text-3xl font-extrabold text-[#161616] leading-[1.05]">
                  Don&apos;t take our word for it. Call one.
                </h2>
                <p className="mt-2 text-[#161616]/75 font-body text-[15px] leading-relaxed max-w-xl">{SWITCHBOARD.demoLine.note}</p>
              </div>
              <a
                href={`tel:${SWITCHBOARD.demoLine.number}`}
                className="flex-shrink-0 inline-flex items-center gap-3 rounded-full border-2 border-[#161616] bg-[#161616] text-[#F5B700] px-7 py-4 font-sans font-extrabold text-base uppercase tracking-[0.1em] shadow-[5px_5px_0_0_rgba(22,22,22,.35)] transition-all hover:-translate-y-0.5"
              >
                <span aria-hidden="true">☎</span> {SWITCHBOARD.demoLine.display}
              </a>
            </div>
          </section>

          {/* ───────────────  THE COMMAND BOARD (signature + lead magnet)  ─────────────── */}
          <section id="board" className="sb-slot-board border-b-2 border-[#161616] halftone-bg scroll-mt-20">
            <div className="relative z-[2] max-w-5xl mx-auto px-6 py-16 md:py-24">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">The Command Board</p>
                <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] text-[#161616]">
                  Every call answered. Every booking captured. One board.
                </h2>
                <p className="mt-4 text-[#5c554a] font-body leading-relaxed">
                  The concierge answers every location and hands the work to the systems you already run: orders straight into your POS, appointments into your booking or scheduling tool, whatever your business requires. Enter your brand and location count to see your board live. The recovered revenue is an estimate from your own numbers, not a guess pulled from the air.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {['Orders → Your POS', 'Appointments → Your Scheduler', 'After-Hours → Answered', 'Rollups → One Board'].map((chip) => (
                    <span key={chip} className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold bg-white border-2 border-[#161616] rounded-full px-3 py-1.5 shadow-[2px_2px_0_0_#161616]">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <CommandBoard />
            </div>
          </section>

        </div>{/* end reorderable top-three flex column */}

        {/* ───────────────  WHAT SHIPS  ─────────────── */}
        <section data-cable-stop className="border-b-2 border-[#161616]">
          <div className="relative z-[2] max-w-6xl mx-auto px-6 py-16 md:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">What ships, per franchise</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] max-w-3xl">
              Built once. Cloned to every door.
            </h2>

            {/* Five storefronts, one gold line, one bell. */}
            <figure className="mt-10 sb-reveal rounded-2xl border-[3px] border-[#161616] bg-white p-2.5 shadow-[7px_7px_0_0_#161616]">
              <Image
                src="/switchboard/doors-bell.jpg"
                alt="Five pop-art storefronts connected by one gold telephone wire to a single bell"
                width={2560}
                height={900}
                sizes="(min-width: 1152px) 1104px, 92vw"
                className="rounded-xl border-2 border-[#161616] w-full h-auto"
              />
            </figure>

            <div className="mt-8 grid md:grid-cols-2 gap-5 sb-reveal">
              {whatShips.map((s, i) => (
                <div key={s.title} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] flex gap-4 transition-transform hover:-translate-y-0.5">
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#F5B700] border-2 border-[#161616] grid place-items-center font-mono font-bold text-sm">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#161616]">{s.title}</h3>
                    <p className="mt-1 text-[#5c554a] text-[15px] leading-relaxed font-body">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────  PRICING  ─────────────── */}
        <section data-cable-stop className="border-b-2 border-[#161616] bg-[#F5F0E8]">
          <div className="relative z-[2] max-w-5xl mx-auto px-6 py-16 md:py-24">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">Pricing</p>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] text-[#161616]">Per location. Cheaper as you grow.</h2>
              <p className="mt-4 text-[#5c554a] font-body">The more locations, the lower the price at each door. One {usd(BUILD_FEE_USD)} build covers the brand voice template, the Command Board, and the rollout.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sb-reveal">
              {PRICE_TIERS.map((t, i) => (
                <div
                  key={t.label}
                  className={`relative rounded-2xl border-2 border-[#161616] p-6 shadow-[5px_5px_0_0_#161616] ${i === 2 ? 'bg-[#F5B700] -rotate-1' : 'bg-white'}`}
                >
                  {i === 2 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.18em] font-bold bg-[#161616] text-[#F5B700] rounded-full px-3 py-1">
                      Most brands land here
                    </span>
                  )}
                  <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${i === 2 ? 'text-[#161616]/70' : 'text-[#5c554a]'}`}>{t.label}</p>
                  <p className="mt-2 font-display text-4xl font-extrabold text-[#161616]">${t.perLocationUsd}</p>
                  <p className={`font-mono text-xs ${i === 2 ? 'text-[#161616]/70' : 'text-[#5c554a]'}`}>per location / mo</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {examples.map((ex) => {
                const q = quoteFor(ex.loc);
                return (
                  <div key={ex.loc} className="rounded-2xl border-2 border-dashed border-[#161616]/40 bg-white/60 p-5 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c554a]">{ex.loc} locations · {ex.note}</p>
                    <p className="mt-2 font-display text-2xl font-extrabold text-[#1E50C8]">{usd(q.monthlyUsd)}<span className="text-sm text-[#5c554a] font-body">/mo</span></p>
                    <p className="text-xs text-[#5c554a] font-mono">{usd(q.annualUsd)}/yr</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-center text-sm text-[#5c554a] font-body">
              Cheaper per door than a one-off install, and one chain never churns a location at a time.
            </p>
          </div>
        </section>

        {/* ───────────────  HOW IT WORKS  ─────────────── */}
        <section data-cable-stop className="border-b-2 border-[#161616]">
          <div className="relative z-[2] max-w-5xl mx-auto px-6 py-16 md:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold text-center">How it works</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] text-[#161616] text-center max-w-2xl mx-auto">Live across the whole chain in weeks.</h2>
            <div className="mt-10 grid md:grid-cols-3 gap-5 sb-reveal">
              {howItWorks.map((s, i) => (
                <div key={s.step} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616]">
                  <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-[#F5B700] border-2 border-[#161616] font-mono font-bold text-lg shadow-[3px_3px_0_0_#161616]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-bold text-[#161616]">{s.step}</h3>
                  <p className="mt-1.5 text-[#5c554a] text-[15px] leading-relaxed font-body">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────  FAQ  ─────────────── */}
        <section data-cable-stop className="border-b-2 border-[#161616] bg-[#F5F0E8]">
          <div className="relative z-[2] max-w-3xl mx-auto px-6 py-16 md:py-24">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-[#161616] mb-8 text-center">Questions, answered plainly.</h2>
            <div className="space-y-4">
              {faq.map((f) => (
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

        {/* ───────────────  FINAL CTA — the cable plugs in here  ─────────────── */}
        <section data-cable-stop className="bg-[#F5B700] relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'radial-gradient(#161616 1.5px, transparent 1.6px)', backgroundSize: '18px 18px' }} />
          <div className="relative z-[2] max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#161616]/70 font-bold">One brand. Every door. One board.</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] text-[#161616]">Never miss a call at any location again.</h2>
            <p className="mt-4 max-w-xl mx-auto text-[#161616]/80 font-body">
              See your real locations on the Command Board and the revenue they are leaving on the table after hours. Then put one voice on all of them.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#board" className="rounded-full border-2 border-[#161616] bg-[#161616] text-[#F5B700] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_rgba(22,22,22,.35)] transition-all hover:-translate-y-0.5">
                See your board
              </a>
              <Link href={SWITCHBOARD.walkthroughPath} className="rounded-full border-2 border-[#161616] bg-white px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5">
                Book a walkthrough
              </Link>
            </div>
            <p className="mt-6 font-body text-sm text-[#161616]/80">
              Or call a live one:{' '}
              <a href={`tel:${SWITCHBOARD.demoLine.number}`} className="font-bold text-[#161616] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
                {SWITCHBOARD.demoLine.display}
              </a>
            </p>
            <p className="mt-8 text-xs text-[#161616]/60 max-w-lg mx-auto">
              Each location is answered by an AI concierge in your brand voice, and it says so. The Switchboard, by Modern Mustard Seed, Kalispell, Montana.
            </p>
          </div>
        </section>

      </div>{/* end sb-cable-host */}
    </div>
  );
}
