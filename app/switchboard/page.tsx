import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata, SITE } from '@/lib/seo';
import { SWITCHBOARD, PRICE_TIERS, BUILD_FEE_USD, whatShips, howItWorks, faq, quoteFor, usd } from '@/data/switchboard';
import CommandBoard from '@/components/switchboard/CommandBoard';
import SwitchboardMotion from '@/components/switchboard/SwitchboardMotion';

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SwitchboardMotion />

      {/* ───────────────  HERO  ─────────────── */}
      <section className="relative overflow-hidden border-b-2 border-[#161616] text-[#FBF6EA]">
        {/* Cinematic backdrop: every location glowing, wired to one hub. */}
        <div aria-hidden className="absolute inset-0">
          <Image src="/switchboard/command-hero.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(5,7,13,.95) 0%, rgba(5,7,13,.82) 38%, rgba(5,7,13,.34) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 130% at 50% 128%, rgba(5,7,13,.9), transparent 58%)' }} />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 pt-24 md:pt-36 pb-20 md:pb-28">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-full px-3 py-1 shadow-[3px_3px_0_0_rgba(0,0,0,.4)]">
            For franchises &amp; multi-location brands
          </span>
          <h1 className="mt-6 font-display font-extrabold leading-[0.95] tracking-tight text-5xl md:text-7xl lg:text-[5.5rem]" style={{ textShadow: '0 2px 40px rgba(0,0,0,.5)' }}>
            One voice answers<br className="hidden md:block" /> for <span className="text-[#F5B700]">all</span> of them.
          </h1>
          <p className="mt-6 max-w-xl text-lg md:text-xl text-[#FBF6EA]/90 font-body">
            Give every location a 24/7 AI concierge in one on-brand voice, and watch the recovered revenue from all of them on a single Command Board.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#board" className="rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5">
              See your locations on the board
            </a>
            <Link href={SWITCHBOARD.walkthroughPath} className="rounded-full border-2 border-[#FBF6EA]/60 bg-[#05070d]/30 backdrop-blur-sm px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] text-[#FBF6EA] transition-all hover:bg-[#FBF6EA] hover:text-[#161616]">
              Book a walkthrough
            </Link>
          </div>
          <p className="mt-5 font-body text-sm text-[#FBF6EA]/75">
            Or hear it right now:{' '}
            <a href={`tel:${SWITCHBOARD.demoLine.number}`} className="font-bold text-[#F5B700] underline decoration-2 underline-offset-2 hover:text-white">
              call {SWITCHBOARD.demoLine.display}
            </a>
            <span className="text-[#FBF6EA]/55"> and a live AI concierge answers as a location would.</span>
          </p>
        </div>
      </section>

      {/* ───────────────  TRY IT LIVE (real callable concierge)  ─────────────── */}
      <section className="border-b-2 border-[#161616] bg-[#F5B700]">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-12 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
          <div className="flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#161616]/70">{SWITCHBOARD.demoLine.label}</p>
            <h2 className="mt-2 font-display text-2xl md:text-3xl font-extrabold text-[#161616] leading-[1.05]">
              Don&apos;t take our word for it. Call one.
            </h2>
            <p className="mt-2 text-[#161616]/75 font-body text-[15px] leading-relaxed max-w-xl">{SWITCHBOARD.demoLine.note}</p>
          </div>
          <a
            href={`tel:${SWITCHBOARD.demoLine.number}`}
            className="flex-shrink-0 inline-flex items-center gap-3 rounded-full border-2 border-[#161616] bg-[#161616] text-[#F5B700] px-7 py-4 font-sans font-extrabold text-base uppercase tracking-[0.1em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5"
          >
            <span aria-hidden="true">☎</span> {SWITCHBOARD.demoLine.display}
          </a>
        </div>
      </section>

      {/* ───────────────  THE COMMAND BOARD (signature + lead magnet)  ─────────────── */}
      <section id="board" className="border-b-2 border-[#161616] bg-[#161616] scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-9 text-[#FBF6EA]">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#F5B700] font-bold">The Command Board</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05]">See your whole brand on one board.</h2>
            <p className="mt-4 text-[#FBF6EA]/75 font-body leading-relaxed">
              Enter your brand and location count. This is the board your team logs into, and the recovered revenue is a live estimate, not a guess pulled from the air.
            </p>
          </div>
          <CommandBoard />
        </div>
      </section>

      {/* ───────────────  WHAT SHIPS  ─────────────── */}
      <section className="border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">What ships, per franchise</p>
          <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] max-w-3xl">
            Built once. Cloned to every door.
          </h2>
          <div className="mt-10 grid md:grid-cols-2 gap-5 sb-reveal">
            {whatShips.map((s, i) => (
              <div key={s.title} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] flex gap-4">
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
      <section className="border-b-2 border-[#161616] bg-[#F5F0E8]">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold">Pricing</p>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] text-[#161616]">Per location. Cheaper as you grow.</h2>
            <p className="mt-4 text-[#5c554a] font-body">The more locations, the lower the price at each door. One {usd(BUILD_FEE_USD)} build covers the brand voice template, the Command Board, and the rollout.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sb-reveal">
            {PRICE_TIERS.map((t, i) => (
              <div key={t.label} className={`rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] ${i === 2 ? 'ring-4 ring-[#F5B700]' : ''}`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c554a]">{t.label}</p>
                <p className="mt-2 font-display text-4xl font-extrabold text-[#161616]">${t.perLocationUsd}</p>
                <p className="font-mono text-xs text-[#5c554a]">per location / mo</p>
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
      <section className="border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold text-center">How it works</p>
          <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] text-[#161616] text-center max-w-2xl mx-auto">Live across the whole chain in weeks.</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5 sb-reveal">
            {howItWorks.map((s, i) => (
              <div key={s.step} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616]">
                <span className="font-mono font-bold text-[#F5B700] text-3xl">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-2 font-display text-xl font-bold text-[#161616]">{s.step}</h3>
                <p className="mt-1.5 text-[#5c554a] text-[15px] leading-relaxed font-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────  FAQ  ─────────────── */}
      <section className="border-b-2 border-[#161616] bg-[#F5F0E8]">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
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

      {/* ───────────────  FINAL CTA  ─────────────── */}
      <section className="text-[#FBF6EA]" style={{ background: 'radial-gradient(120% 130% at 20% -10%, #14203a, #05070d 62%)' }}>
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#F5B700] font-bold">One brand. Every door. One board.</p>
          <h2 className="mt-4 font-display text-3xl md:text-5xl font-extrabold leading-[1.05]">Never miss a call at any location again.</h2>
          <p className="mt-4 max-w-xl mx-auto text-[#FBF6EA]/80 font-body">
            See your real locations on the Command Board and the revenue they are leaving on the table after hours. Then put one voice on all of them.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#board" className="rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5">
              See your board
            </a>
            <Link href={SWITCHBOARD.walkthroughPath} className="rounded-full border-2 border-[#FBF6EA]/60 px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] text-[#FBF6EA] transition-all hover:bg-[#FBF6EA] hover:text-[#161616]">
              Book a walkthrough
            </Link>
          </div>
          <p className="mt-6 font-body text-sm text-[#FBF6EA]/70">
            Or call a live one:{' '}
            <a href={`tel:${SWITCHBOARD.demoLine.number}`} className="font-bold text-[#F5B700] underline decoration-2 underline-offset-2 hover:text-white">
              {SWITCHBOARD.demoLine.display}
            </a>
          </p>
          <p className="mt-8 text-xs text-[#FBF6EA]/50 max-w-lg mx-auto">
            Each location is answered by an AI concierge in your brand voice, and it says so. The Switchboard, by Modern Mustard Seed, Kalispell, Montana.
          </p>
        </div>
      </section>
    </div>
  );
}
