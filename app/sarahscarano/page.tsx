import Image from 'next/image';
import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd, personJsonLd } from '@/lib/jsonld';
import { SITE, buildMetadata } from '@/lib/seo';
import SarahPortrait from '@/components/sarah/SarahPortrait';
import { PORTFOLIO_WINGS, PORTFOLIO_WORKS, workImage, type PortfolioWork } from '@/data/sarah-portfolio';

/**
 * Sarah's portfolio, hung inside the studio. The full gallery lives at
 * sarahscarano.com (her own domain, the canonical home); this page shows the
 * same twenty-five works in the studio's own grammar so a visitor who came in
 * through modernmustardseed.com meets the maker without leaving the property.
 * It wears the homepage's Flathead editorial grammar (Sarah, 2026-10-05).
 */

const GALLERY_URL = 'https://sarahscarano.com';
const RESUME_URL = 'https://sarahscarano.com/Sarah-Scarano.pdf';
const PAGE_PATH = '/sarahscarano';

export const metadata = buildMetadata({
  title: 'Sarah Scarano, Portfolio',
  description:
    'Twenty-five live works by Sarah Scarano, founder of Modern Mustard Seed: a product studio run by agents, a voice agent that answers a real phone line, a faith apparel brand, client sites, films, and a book.',
  path: PAGE_PATH,
});

// What she does, in words. Sarah took the number strip off on 2026-09-08
// ("I don't like that"); the disciplines below are the gallery's own four.
const DISCIPLINES: { t: string; d: string }[] = [
  { t: 'Product and software', d: 'Strategy, websites, custom applications, payments.' },
  { t: 'Agentic systems and operations', d: 'Voice agents, lead pipelines, agent back offices, workflow automation.' },
  { t: 'Brand and commerce', d: 'Direction, identity, storefronts, print, creative systems.' },
  { t: 'Story and launch', d: 'Positioning, copy, commercials, films, the go-to-market around a product.' },
];

// What she takes on. Package pricing lives on the studio pages, never here.
const AVAILABLE_FOR: { t: string; d: string }[] = [
  { t: 'Zero to one', d: 'An idea becomes a shipped product with real users, on a stack you own.' },
  { t: 'Fractional leadership', d: 'Product, brand, or growth, a few days a week, for a company that already works.' },
  { t: 'Voice and agents', d: 'A phone line that answers, books, and builds. Agent systems that run a back office.' },
  { t: 'Brand and film', d: 'Identity, storefront, commercials and launch films, written and cut in-house.' },
];

// The global theme sets every <p> in main to the body face; serif lines say so inline.
const SERIF = { fontFamily: 'var(--font-flathead-display), Georgia, serif' };

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={`inline-block border-t pt-1.5 mb-5 text-[10px] font-bold uppercase tracking-[0.17em] leading-relaxed ${
        light ? 'border-[#f5b700]/60 text-[#f5b700]' : 'border-[#103c54]/60 text-[#103c54]'
      }`}
    >
      {children}
    </span>
  );
}

const CTA_LINK =
  'inline-flex items-center gap-6 min-h-[44px] border-b border-[#103c54]/30 py-1.5 text-[13px] font-semibold text-[#103c54] hover:text-[#1e50c8] hover:border-[#1e50c8] transition-colors';

function isExternal(url: string) {
  return /^https?:\/\//.test(url) && !url.startsWith(SITE.url);
}

/**
 * A wing with one work hangs it wide: image beside the text, so a lone piece
 * fills the row instead of sitting in one third of it.
 */
function WorkCard({ work, feature = false }: { work: PortfolioWork; feature?: boolean }) {
  const width = 960;
  const height = Math.round(960 / work.ratio);
  // A film's own URL is a file, not a route: keep it a plain anchor so Next
  // never tries to prefetch it as a page.
  const isFile = Boolean(work.url && /\.(mp4|pdf|jpg|png)$/i.test(work.url));
  const href = work.url && !isFile && work.url.startsWith(SITE.url) ? work.url.slice(SITE.url.length) || '/' : work.url;
  const external = Boolean(work.url && (isFile || isExternal(work.url)));
  const tel = Boolean(work.url && work.url.startsWith('tel:'));

  return (
    <article className={`group ${feature ? 'flex flex-col md:grid md:grid-cols-[1.25fr_1fr] md:gap-12 md:items-center' : 'flex flex-col'}`}>
      <div className="relative bg-[#103c54] border border-[#103c54]/15 overflow-hidden">
        {work.video ? (
          <video
            className="block w-full h-auto"
            controls
            preload="none"
            playsInline
            poster={workImage(work.k)}
            width={width}
            height={height}
            aria-label={`${work.title}, a film`}
          >
            <source src={work.video} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={workImage(work.k)}
            alt={`${work.title}: ${work.medium}`}
            width={width}
            height={height}
            sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"
            className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.015]"
          />
        )}
        {work.tag ? (
          <span className="absolute top-3 left-3 text-[9px] font-bold uppercase tracking-[0.18em] bg-[#f5b700] text-[#103c54] px-2.5 py-1">
            {work.tag}
          </span>
        ) : null}
      </div>
      <div className={`flex flex-col flex-1 pt-5 ${feature ? 'md:pt-0' : ''}`}>
        <p className="!text-[9px] !leading-[1.7] font-bold uppercase tracking-[0.16em] text-[#103c54]/65">{work.medium}</p>
        <div className="flex items-baseline justify-between gap-3 mt-2">
          <h3 className={`leading-tight ${feature ? 'text-[34px] md:text-[42px]' : 'text-[28px]'}`}>{work.title}</h3>
          <span className="font-display text-[15px] text-[#1e50c8] shrink-0">{work.year}</span>
        </div>
        <p className={`text-[15px] leading-[1.8] text-[#103c54]/85 mt-2.5 ${feature ? 'md:text-[16px]' : 'flex-1'}`}>{work.blurb}</p>
        {href ? (
          <div className="mt-4">
            {tel ? (
              <a href={href} className={CTA_LINK}>
                {work.cta}
                <span aria-hidden className="text-lg leading-none">↗</span>
              </a>
            ) : external ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className={CTA_LINK}>
                {work.cta}
                <span aria-hidden className="text-lg leading-none">↗</span>
              </a>
            ) : (
              <Link href={href} className={CTA_LINK}>
                {work.cta}
                <span aria-hidden className="text-lg leading-none">→</span>
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#103c54]/50">A print. Not online.</p>
        )}
      </div>
    </article>
  );
}

export default function SarahScaranoPage() {
  const byWing = PORTFOLIO_WINGS.map((wing) => ({
    wing,
    works: PORTFOLIO_WORKS.filter((w) => w.wing === wing),
  })).filter((g) => g.works.length > 0);

  return (
    <>
      <JsonLd
        data={[
          { ...personJsonLd, url: `${SITE.url}${PAGE_PATH}`, sameAs: [...personJsonLd.sameAs, GALLERY_URL] },
          collectionPageJsonLd({
            url: `${SITE.url}${PAGE_PATH}`,
            name: 'Sarah Scarano, Portfolio',
            description: 'Twenty-five live works by Sarah Scarano, founder of Modern Mustard Seed.',
            itemListElement: PORTFOLIO_WORKS.filter((w) => w.url && /^https?:/.test(w.url)).map((w) => ({ url: w.url as string, name: w.title })),
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Sarah Scarano', url: PAGE_PATH },
          ]),
        ]}
      />
      <div className="relative min-h-screen bg-[#fcf8eb] text-[#103c54] overflow-x-clip">
        {/* ─── Hero ─── */}
        <section className="px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] pt-32 md:pt-40 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-14 lg:gap-24 items-center">
            <div>
              <Eyebrow>Portfolio</Eyebrow>
              <h1 className="text-[clamp(60px,7.6vw,112px)] leading-[0.95]">
                Sarah <em>Scarano.</em>
              </h1>
              <p style={SERIF} className="text-[24px] md:text-[28px] leading-[1.35] mt-8 max-w-[540px] [text-wrap:balance]">
                I turn ideas into products, brands and businesses you can use.
              </p>
              <p className="mt-5 text-[16px] leading-[1.85] max-w-[540px]">
                Full-stack developer, agentic systems builder and creative director, working from Flathead Lake, Montana. Everything below is live.
              </p>
              <div className="flex flex-wrap items-center gap-x-9 gap-y-3 mt-9">
                <a
                  href={GALLERY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-12 min-h-[52px] bg-[#f5b700] text-[#103c54] px-6 text-[13px] font-bold hover:bg-[#ffc81f] transition-colors"
                >
                  Walk the gallery
                  <span aria-hidden className="text-xl leading-none">↗</span>
                </a>
                <a href={RESUME_URL} target="_blank" rel="noopener noreferrer" className={CTA_LINK}>
                  Resume, PDF
                  <span aria-hidden className="text-lg leading-none">↗</span>
                </a>
                <Link href="/book" className={CTA_LINK}>
                  Book 30 minutes
                  <span aria-hidden className="text-lg leading-none">→</span>
                </Link>
              </div>
            </div>
            <SarahPortrait
              priority
              caption="Founder · Modern Mustard Seed"
              className="w-full max-w-[420px] justify-self-center lg:justify-self-end"
            />
          </div>
        </section>

        {/* ─── What I do ─── */}
        <section className="px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-x-8 border-b border-[#103c54]/20">
            {DISCIPLINES.map((s, i) => (
              <div key={s.t} className="py-8 pr-6 border-t border-[#103c54]/20">
                <span className="font-display text-[15px] text-[#1e50c8]">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="text-[26px] leading-tight mt-2">{s.t}</h2>
                <p className="text-[14px] leading-[1.75] text-[#103c54]/80 mt-2">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── The wings ─── */}
        <div className="px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] pt-20 md:pt-28 pb-24 space-y-20 md:space-y-28">
          {byWing.map((g, i) => (
            <section key={g.wing} aria-labelledby={`wing-${i}`}>
              <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 border-b border-[#103c54]/25 pb-5">
                <div>
                  <Eyebrow>Wing {String(i + 1).padStart(2, '0')}</Eyebrow>
                  <h2 id={`wing-${i}`} className="text-[clamp(40px,4vw,58px)] leading-none">
                    {g.wing}
                  </h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#103c54]/55 shrink-0 pb-1">
                  {g.works.length} {g.works.length === 1 ? 'work' : 'works'}
                </span>
              </div>
              {g.works.length === 1 ? (
                <WorkCard work={g.works[0]} feature />
              ) : (
                <div className={`grid sm:grid-cols-2 gap-x-8 gap-y-14 ${g.works.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
                  {g.works.map((w) => (
                    <WorkCard key={w.k} work={w} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* ─── Available for: the ink band ─── */}
        <section className="relative bg-[#103c54] text-[#fcf8eb] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.16) 1.3px, transparent 1.4px)', backgroundSize: '18px 18px' }}
          />
          <div className="relative px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] py-20 md:py-28">
            <Eyebrow light>Available for</Eyebrow>
            <h2 className="!text-[#fcf8eb] text-[clamp(38px,4.4vw,64px)] max-w-[900px]">
              Remote, through the studio, <em className="!text-[#f5b700]">for the right project.</em>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8 mt-12 border-t border-[#fcf8eb]/15 pt-10">
              {AVAILABLE_FOR.map((a) => (
                <div key={a.t}>
                  <h3 className="!text-[#f5b700] text-[26px] leading-tight mb-2">{a.t}</h3>
                  <p className="!text-[#fcf8eb]/80 text-[15px] leading-[1.8]">{a.d}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-14 text-[13px] font-semibold">
              <a href={`mailto:${SITE.email}`} className="text-[#fcf8eb] border-b border-[#f5b700]/60 pb-1 hover:text-[#f5b700]">
                {SITE.email}
              </a>
              <a href="tel:+14062506076" className="text-[#fcf8eb] border-b border-[#f5b700]/60 pb-1 hover:text-[#f5b700]">
                (406) 250-6076
              </a>
              <a href="https://www.linkedin.com/in/sarahmscarano/" target="_blank" rel="noopener noreferrer" className="text-[#fcf8eb] border-b border-[#f5b700]/60 pb-1 hover:text-[#f5b700]">
                LinkedIn
              </a>
              <a href="https://github.com/ModernMustardSeed" target="_blank" rel="noopener noreferrer" className="text-[#fcf8eb] border-b border-[#f5b700]/60 pb-1 hover:text-[#f5b700]">
                GitHub
              </a>
              <a href={GALLERY_URL} target="_blank" rel="noopener noreferrer" className="text-[#fcf8eb] border-b border-[#f5b700]/60 pb-1 hover:text-[#f5b700]">
                sarahscarano.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
