import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { BRAND, brandTiers, brandWeeks, brandFaq } from '@/data/brand';

export const metadata = buildMetadata({
  title: BRAND.metaTitle,
  description: BRAND.metaDescription,
  path: '/brand',
  // buildMetadata sets openGraph.images, which overrides the file-based
  // opengraph-image convention, so the route card must be named here.
  image: '/brand/opengraph-image',
});

const BOOK_HREF = '/book?idea=' + encodeURIComponent('A brand or rebrand: new identity, site, voice agent, and the plan behind it');

const SURFACES = [
  { verb: 'Sees', what: 'The mark on the truck, the site on their phone, the card on the counter. One look, everywhere.' },
  { verb: 'Hears', what: 'The voice that answers the phone at 9pm, in the tone you chose, saying the name the way you say it.' },
  { verb: 'Reads', what: 'The tagline, the quote email, the review ask, the proposal. Written in one voice, by one hand.' },
];

const MARKET = [
  { who: 'A designer', sells: 'the mark' },
  { who: 'An agency', sells: 'the site' },
  { who: 'A copywriter', sells: 'the voice' },
  { who: 'A consultant', sells: 'the deck' },
  { who: 'Nobody', sells: 'the phone' },
];

export default function BrandPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'BRAND / REBRAND by Modern Mustard Seed',
        serviceType: 'Brand identity, rebranding, website, voice agent, and business plan package',
        description: BRAND.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: brandTiers.map((t) => ({
          '@type': 'Offer',
          name: `BRAND / REBRAND ${t.name}`,
          price: t.priceUsd,
          priceCurrency: 'USD',
          url: `${SITE.url}/brand#tiers`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: brandFaq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div id="top" className="bg-[#FBF6EA] text-[#161616]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── HERO ─── */}
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">{BRAND.eyebrow}</p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.98]">
              A logo file is <em className="not-italic md:italic">not</em> a brand.
            </h1>
            <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-2xl mx-auto mt-6 leading-relaxed">{BRAND.promise}</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={BOOK_HREF}
                className="inline-block rounded-full bg-[#161616] border-2 border-[#161616] px-9 py-4 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#F5B700] transition-all hover:-translate-y-0.5"
              >
                Book the discovery call
              </Link>
              <a href="#tiers" className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#161616]/60 underline underline-offset-4">
                See the three packages
              </a>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#161616]/50 mt-6">
              Set prices · Three weeks · Changes included · You own every file
            </p>
          </div>
        </div>
      </section>

      {/* ─── TWO WAYS IN ─── */}
      <section className="py-16 md:py-20 border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="pop-card p-7 md:p-9">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">Brand</p>
              <h2 className="font-display text-3xl md:text-4xl font-black mt-2 leading-tight">Starting from a blank page.</h2>
              <p className="font-body text-[#161616]/75 mt-4 leading-relaxed">
                A new company, a second venture from an operator who already runs one, or a product line that needs its own name.
                Naming is included. Week one is discovery of a business that is about to exist.
              </p>
            </div>
            <div className="pop-card pop-card-yellow p-7 md:p-9">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#161616] font-bold">Rebrand</p>
              <h2 className="font-display text-3xl md:text-4xl font-black mt-2 leading-tight">Starting from what works.</h2>
              <p className="font-body text-[#161616]/80 mt-4 leading-relaxed">
                A company whose work is better than its brand. Keep the name or change it; either way the old URLs, listings, and
                search history hand off cleanly. Week one is discovery of a business that already exists.
              </p>
            </div>
          </div>
          <p className="font-body text-center text-[#161616]/60 mt-8 max-w-2xl mx-auto">
            Same deliverables, same prices. The only thing that changes is where the first week starts.
          </p>
        </div>
      </section>

      {/* ─── THE NINETY SECONDS ─── */}
      <section className="py-16 md:py-24 bg-[#161616] text-[#FBF6EA] border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#F5B700] font-bold mb-4 text-center">The first ninety seconds</p>
          <h2 className="font-display text-3xl md:text-5xl font-black text-center leading-[1.05] max-w-3xl mx-auto">
            A customer meets your brand three ways. We ship all three.
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {SURFACES.map((s) => (
              <div key={s.verb} className="border-2 border-[#F5B700] p-6 md:p-7 rounded-2xl shadow-[5px_5px_0_0_#F5B700]">
                <p className="font-display text-3xl font-black text-[#F5B700]">{s.verb}</p>
                <p className="font-body text-[#FBF6EA]/80 mt-3 leading-relaxed">{s.what}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 md:mt-16 max-w-3xl mx-auto">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#FBF6EA]/50 text-center mb-5">How the market sells it</p>
            <ul className="divide-y divide-[#FBF6EA]/15 border-y border-[#FBF6EA]/15">
              {MARKET.map((m) => (
                <li key={m.who} className="flex items-baseline justify-between py-3 font-body">
                  <span className={m.who === 'Nobody' ? 'text-[#F5B700] font-bold' : 'text-[#FBF6EA]/80'}>{m.who}</span>
                  <span className={m.who === 'Nobody' ? 'text-[#F5B700] font-bold' : 'text-[#FBF6EA]/60'}>sells {m.sells}</span>
                </li>
              ))}
            </ul>
            <p className="font-body text-[#FBF6EA]/70 mt-6 text-center leading-relaxed">
              Five vendors, six months, and the mark, the site, and the way the phone gets answered never agree with each other.
              Here it is one identity, decided once, pushed into every surface in the same three weeks.
            </p>
          </div>
        </div>
      </section>

      {/* ─── TIERS ─── */}
      <section id="tiers" className="py-16 md:py-24 border-b-2 border-[#161616] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">Three packages</p>
            <h2 className="font-display text-3xl md:text-5xl font-black leading-[1.05]">Each one contains the one before it.</h2>
            <p className="font-body text-[#161616]/70 mt-4 max-w-2xl mx-auto">
              Fixed before work starts. Half to begin, half on delivery. Changes to anything we built are included, with no change order, ever.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {brandTiers.map((t) => (
              <div
                key={t.key}
                className={
                  t.halo
                    ? 'rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-7 shadow-[6px_6px_0_0_#F5B700] lg:-mt-4'
                    : 'pop-card p-7'
                }
              >
                {t.halo && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold mb-3">The one most owners choose</p>
                )}
                <h3 className="font-display text-3xl font-black">{t.name}</h3>
                <p className={`font-sans text-4xl font-extrabold tracking-tight mt-3 ${t.halo ? 'text-[#F5B700]' : ''}`}>
                  {t.priceLabel}
                  <span className={`font-body text-sm font-semibold ml-2 ${t.halo ? 'text-[#FBF6EA]/60' : 'text-[#161616]/55'}`}>one time</span>
                </p>
                {t.monthly && (
                  <p className={`font-mono text-[11px] uppercase tracking-[0.2em] mt-1 ${t.halo ? 'text-[#FBF6EA]/60' : 'text-[#161616]/55'}`}>{t.monthly}</p>
                )}
                <p className={`font-mono text-[11px] uppercase tracking-[0.2em] mt-3 ${t.halo ? 'text-[#F5B700]' : 'text-[#E0301E]'}`}>{t.timeline}</p>
                <p className={`font-body mt-4 leading-relaxed ${t.halo ? 'text-[#FBF6EA]/85' : 'text-[#161616]/75'}`}>{t.lede}</p>
                <ul className={`mt-5 space-y-2 font-body text-sm leading-relaxed ${t.halo ? 'text-[#FBF6EA]/85' : 'text-[#161616]/80'}`}>
                  {t.includes.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className={`shrink-0 font-bold ${t.halo ? 'text-[#F5B700]' : 'text-[#E0301E]'}`}>+</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={BOOK_HREF}
                  className={
                    t.halo
                      ? 'mt-7 block text-center rounded-full bg-[#F5B700] border-2 border-[#F5B700] px-6 py-3.5 font-sans font-extrabold text-[#161616] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5'
                      : 'mt-7 block text-center rounded-full bg-[#161616] border-2 border-[#161616] px-6 py-3.5 font-sans font-extrabold text-[#FBF6EA] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5'
                  }
                >
                  Start with {t.name}
                </Link>
              </div>
            ))}
          </div>

          <p className="font-body text-center text-[#161616]/60 mt-10 max-w-2xl mx-auto text-sm">
            Presence and Whole Company hand off into{' '}
            <Link href="/talking-website" className="underline underline-offset-4 text-[#161616]">The Talking Website</Link>: your site and your
            voice agent off one brain. The setup fee is waived because the brand build covered it. Never the monthly.
          </p>
        </div>
      </section>

      {/* ─── THE THREE WEEKS ─── */}
      <section className="py-16 md:py-24 border-b-2 border-[#161616] halftone-bg">
        <div className="max-w-4xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4 text-center">How the three weeks run</p>
          <h2 className="font-display text-3xl md:text-5xl font-black text-center leading-[1.05]">Designed once. Live everywhere.</h2>
          <ol className="mt-12 space-y-4">
            {brandWeeks.map((w) => (
              <li key={w.label} className="pop-card p-6 md:p-7 grid md:grid-cols-[110px_1fr] gap-3 md:gap-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#E0301E] font-bold pt-1">{w.label}</p>
                <div>
                  <p className="font-display text-xl md:text-2xl font-black">{w.title}</p>
                  <p className="font-body text-[#161616]/75 mt-2 leading-relaxed">{w.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 md:py-24 border-b-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4 text-center">Questions owners ask</p>
          <h2 className="font-display text-3xl md:text-4xl font-black text-center leading-[1.05]">Straight answers.</h2>
          <div className="mt-10 divide-y-2 divide-[#161616]/10">
            {brandFaq.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-display text-lg md:text-xl font-bold">
                  <span>{f.q}</span>
                  <span className="font-mono text-[#E0301E] shrink-0 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="font-body text-[#161616]/75 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 md:py-24 bg-[#F5B700] border-t-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
            Your work is better than your brand.<br className="hidden md:block" /> Fix that in three weeks.
          </h2>
          <p className="font-body text-[#161616]/75 mt-4 max-w-xl mx-auto">
            A 30-minute discovery call. You tell us what the business is and where it is going. We tell you which package it is and the exact price. No line of work starts before you see the number.
          </p>
          <Link
            href={BOOK_HREF}
            className="inline-block mt-8 rounded-full bg-[#161616] border-2 border-[#161616] px-10 py-4 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5"
          >
            Book the discovery call
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#161616]/60 mt-6">
            Or call the ranch line, {SITE.phone ?? '(406) 312-1223'}. Mr. Mustard answers.
          </p>
        </div>
      </section>
    </div>
  );
}
