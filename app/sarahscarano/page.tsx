import Image from 'next/image';
import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd, personJsonLd } from '@/lib/jsonld';
import { SITE, buildMetadata } from '@/lib/seo';
import { PORTFOLIO_WINGS, PORTFOLIO_WORKS, workImage, type PortfolioWork } from '@/data/sarah-portfolio';

/**
 * Sarah's portfolio, hung inside the studio. The full gallery lives at
 * sarahscarano.com (her own domain, the canonical home); this page shows the
 * same twenty-five works in the studio's own grammar so a visitor who came in
 * through modernmustardseed.com meets the maker without leaving the property.
 */

const GALLERY_URL = 'https://sarahscarano.com';
const RESUME_URL = 'https://sarahscarano.com/Sarah-Scarano.pdf';
const PAGE_PATH = '/sarahscarano';

export const metadata = buildMetadata({
  title: 'Sarah Scarano, Portfolio',
  description:
    'Twenty-five live works by Sarah Scarano, founder of Modern Mustard Seed: an AI product studio run by agents, a voice agent that answers a real phone line, a faith apparel brand, client sites, films, and a book.',
  path: PAGE_PATH,
});

// What she does, in words. Sarah took the number strip off on 2026-09-08
// ("I don't like that"); the disciplines below are the gallery's own four.
const DISCIPLINES: { t: string; d: string }[] = [
  { t: 'Product and software', d: 'Strategy, websites, custom applications, payments.' },
  { t: 'AI and operations', d: 'Voice agents, lead pipelines, agent back offices, workflow automation.' },
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">
      {children}
    </span>
  );
}

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
    <article className={`pop-card overflow-hidden ${feature ? 'flex flex-col md:grid md:grid-cols-[1.2fr_1fr]' : 'flex flex-col'}`}>
      <div className={`relative border-[#161616] bg-[#161616] ${feature ? 'border-b-2 md:border-b-0 md:border-r-2 md:flex md:items-center' : 'border-b-2'}`}>
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
            className="block w-full h-auto"
          />
        )}
        {work.tag ? (
          <span className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-[0.25em] font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-full px-2.5 py-1 pop-shadow">
            {work.tag}
          </span>
        ) : null}
      </div>
      <div className={`flex flex-col flex-1 p-5 md:p-6 ${feature ? 'md:p-8 md:justify-center' : ''}`}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={`font-display font-black text-[#161616] tracking-tight leading-tight ${feature ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>{work.title}</h3>
          <span className="font-mono text-[11px] text-[#161616]/55 shrink-0">{work.year}</span>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#161616]/60 mt-1.5">{work.medium}</p>
        <p className={`font-body text-[15px] text-[#3A3733] leading-relaxed mt-3 ${feature ? 'md:text-[16px]' : 'flex-1'}`}>{work.blurb}</p>
        {href ? (
          <div className="mt-5">
            {tel ? (
              <a href={href} className="inline-flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.15em] text-[#161616] underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:decoration-[#161616]">
                {work.cta}
                <span aria-hidden>↗</span>
              </a>
            ) : external ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.15em] text-[#161616] underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:decoration-[#161616]"
              >
                {work.cta}
                <span aria-hidden>↗</span>
              </a>
            ) : (
              <Link href={href} className="inline-flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.15em] text-[#161616] underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:decoration-[#161616]">
                {work.cta}
                <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#161616]/45">A print. Not online.</p>
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
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 md:px-8">
          {/* ─── Hero ─── */}
          <div className="grid md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center max-w-4xl mx-auto">
            <div className="justify-self-center md:justify-self-start">
              <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] bg-[#F5B700]">
                <Image src="/brand/sarah-avatar.jpg" alt="Sarah Scarano" fill sizes="176px" className="object-cover" priority />
              </div>
            </div>
            <div className="text-center md:text-left">
              <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-5 block">Portfolio</span>
              <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight leading-[0.95] mb-5">
                Sarah{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                  Scarano
                </span>
              </h1>
              <p className="font-body text-lg md:text-xl text-[#3A3733] leading-relaxed max-w-xl">
                I turn ideas into products, brands and businesses you can use. Full-stack developer, AI builder and creative director, working from Flathead Lake, Montana. Everything below is live.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-7">
                <a
                  href={GALLERY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-full px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.15em] pop-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition"
                >
                  Walk the gallery
                  <span aria-hidden>↗</span>
                </a>
                <a
                  href={RESUME_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.15em] pop-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition"
                >
                  Resume, PDF
                </a>
                <Link
                  href="/inquire"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.15em] shadow-[4px_4px_0_0_#F5B700] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#F5B700] transition"
                >
                  Book 30 minutes
                </Link>
              </div>
            </div>
          </div>

          {/* ─── What I do ─── */}
          <div className="mt-14 md:mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
            {DISCIPLINES.map((s) => (
              <div key={s.t} className="pop-card p-5">
                <h2 className="font-display text-lg font-black text-[#161616] tracking-tight leading-tight">{s.t}</h2>
                <p className="font-body text-[14px] text-[#3A3733] leading-relaxed mt-1.5">{s.d}</p>
              </div>
            ))}
          </div>

          {/* ─── The wings ─── */}
          <div className="mt-20 md:mt-24 space-y-16 md:space-y-20">
            {byWing.map((g, i) => (
              <section key={g.wing} aria-labelledby={`wing-${i}`}>
                <div className="flex items-end justify-between gap-4 mb-6 md:mb-8 border-b-2 border-[#161616] pb-3">
                  <div>
                    <Eyebrow>Wing {String(i + 1).padStart(2, '0')}</Eyebrow>
                    <h2 id={`wing-${i}`} className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight leading-none">
                      {g.wing}
                    </h2>
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/50 shrink-0 pb-1">
                    {g.works.length} {g.works.length === 1 ? 'work' : 'works'}
                  </span>
                </div>
                {g.works.length === 1 ? (
                  <WorkCard work={g.works[0]} feature />
                ) : (
                  <div className={`grid sm:grid-cols-2 gap-5 md:gap-6 ${g.works.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
                    {g.works.map((w) => (
                      <WorkCard key={w.k} work={w} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* ─── Available for ─── */}
          <div className="relative mt-24 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#F5B700] overflow-hidden">
            <div aria-hidden className="absolute inset-0 halftone-bg opacity-[0.15]" />
            <div className="relative p-8 md:p-12">
              <Eyebrow>Available for</Eyebrow>
              <p className="font-display text-2xl md:text-4xl font-black tracking-tight leading-[1.12] max-w-3xl">
                Remote, through the studio, for the right project.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-6 mt-8 max-w-4xl">
                {AVAILABLE_FOR.map((a) => (
                  <div key={a.t}>
                    <h3 className="font-display text-lg font-black text-[#F5B700] mb-1">{a.t}</h3>
                    <p className="font-body text-[15px] text-[#FBF6EA]/80 leading-relaxed">{a.d}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3 mt-10 font-mono text-[12px] uppercase tracking-[0.15em]">
                <a href={`mailto:${SITE.email}`} className="text-[#FBF6EA] underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:text-[#F5B700]">
                  {SITE.email}
                </a>
                <a href="tel:+14062506076" className="text-[#FBF6EA] underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:text-[#F5B700]">
                  (406) 250-6076
                </a>
                <a href="https://www.linkedin.com/in/sarahmscarano/" target="_blank" rel="noopener noreferrer" className="text-[#FBF6EA] underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:text-[#F5B700]">
                  LinkedIn
                </a>
                <a href="https://github.com/ModernMustardSeed" target="_blank" rel="noopener noreferrer" className="text-[#FBF6EA] underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:text-[#F5B700]">
                  GitHub
                </a>
                <a href={GALLERY_URL} target="_blank" rel="noopener noreferrer" className="text-[#FBF6EA] underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:text-[#F5B700]">
                  sarahscarano.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
