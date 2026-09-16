import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { CHAPTERS, FAQ, GOOGLE_STEPS, HANDBOOK_META, type Block, type Chapter } from '@/data/handbook';
import { ReadingProgress, SectionRail, type RailItem } from '@/components/FieldGuide';
import { BereanCheck, PrintButton, Shelf } from '@/components/Handbook';

/**
 * /handbook - The Final Word. A Christian's handbook for AI.
 *
 * Sarah 2026-09-16: "a copy on cxc and mms sites". The canonical home is
 * crossandcovenant.co/handbook; this page carries the same text from the same
 * content file (data/handbook.ts, mirrored in the CXC repo) and points its
 * canonical there, so search engines consolidate on one URL while both sites
 * serve the whole thing to readers and to AI answer engines.
 *
 * Every word on this page comes from data/handbook.ts. Nothing is typed here
 * except the doors at the end, which are this studio's and not the store's.
 */

const CANONICAL = HANDBOOK_META.canonicalUrl;

const base = buildMetadata({
  title: HANDBOOK_META.title,
  description: HANDBOOK_META.description,
  path: '/handbook',
});

export const metadata = {
  ...base,
  keywords: HANDBOOK_META.keywords,
  alternates: { canonical: CANONICAL },
  openGraph: { ...base.openGraph, type: 'article' as const },
};

const RAIL: RailItem[] = CHAPTERS.map((c) => ({ id: c.id, label: c.short }));

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to make your pastor a preferred source in Google',
  description:
    'Mark your church, your pastor, and the ministries you trust as preferred sources so Google pulls them forward in Top Stories, AI Overviews, and AI Mode.',
  totalTime: 'PT4M',
  step: GOOGLE_STEPS.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.title,
    text: s.body,
  })),
};

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: HANDBOOK_META.title,
  alternativeHeadline: HANDBOOK_META.headline,
  description: HANDBOOK_META.description,
  author: { '@type': 'Person', name: SITE.founder },
  publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  datePublished: HANDBOOK_META.published,
  dateModified: HANDBOOK_META.updated,
  inLanguage: 'en-US',
  isAccessibleForFree: true,
  keywords: HANDBOOK_META.keywords.join(', '),
  url: CANONICAL,
  mainEntityOfPage: CANONICAL,
  sameAs: [`${SITE.url}/handbook`],
  about: [
    { '@type': 'Thing', name: 'Artificial intelligence' },
    { '@type': 'Thing', name: 'Christian discernment' },
    { '@type': 'Thing', name: 'The Holy Spirit' },
  ],
};

const PRINT_CSS = `
@media print {
  body { background: #fff !important; }
  #handbook-hero-doors, #handbook-doors, #handbook-nav, .print\\:hidden { display: none !important; }
  #handbook { padding-top: 0 !important; }
  #handbook .chapter { break-before: page; }
  #handbook .chapter:first-of-type { break-before: auto; }
  #handbook .pop-card, #handbook .pop-card-yellow, #handbook .pop-card-cream { box-shadow: none !important; break-inside: avoid; }
  #handbook a { color: inherit; text-decoration: none; }
}
`;

export default function HandbookPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Playbooks', url: '/playbooks' },
            { name: HANDBOOK_META.title, url: '/handbook' },
          ]),
          faqJsonLd(FAQ.map((f) => ({ q: f.q, a: f.a }))),
          howToJsonLd,
          articleJsonLd,
        ]}
      />
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <ReadingProgress />

      <div id="handbook" className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-32 md:pt-40 pb-24">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />

        <div className="relative">
          {/* ================= HERO ================= */}
          <header className="max-w-[1180px] mx-auto px-6 md:px-8 mb-16 md:mb-24 xl:pl-[254px]">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 lg:items-start">
              <div className="min-w-0">
                <span className="block text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-7">
                  {HANDBOOK_META.subtitle} · Free, forever
                </span>

                <h1 className="font-display font-black text-[#161616] tracking-tight mb-8">
                  <span className="block text-[2.6rem] sm:text-6xl md:text-7xl leading-[1.06] pb-1">
                    The Spirit has the <em className="italic text-[#E0301E]">final word.</em>
                  </span>
                  <span className="block text-[2.6rem] sm:text-6xl md:text-7xl leading-[1.06] pb-1">
                    The machine is a tool.
                  </span>
                  <span className="block mt-5 text-[11px] sm:text-xs md:text-sm font-mono font-bold uppercase tracking-[0.32em] leading-[1.7] text-[#161616]/45">
                    {HANDBOOK_META.title}
                  </span>
                </h1>

                <p className="text-[#3a3733] text-base md:text-xl font-body leading-relaxed max-w-2xl mb-9">
                  {HANDBOOK_META.lede}
                </p>

                <div id="handbook-hero-doors" className="flex flex-wrap gap-3 mb-10">
                  <a
                    href="#sources"
                    className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                  >
                    Build your shelf
                  </a>
                  <a
                    href="#test"
                    className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                  >
                    Run the Berean check
                  </a>
                  <a
                    href={HANDBOOK_META.pdfPath}
                    className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
                  >
                    Download the PDF
                  </a>
                  <a
                    href={HANDBOOK_META.checkPdfPath}
                    className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                  >
                    Print the Berean Check card
                  </a>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    `${HANDBOOK_META.chapterCount} chapters`,
                    `${HANDBOOK_META.testCount} tests of discernment`,
                    `${HANDBOOK_META.readingMinutes} minute read`,
                    'No signup',
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616]/60 bg-white border-2 border-[#161616]/20 rounded-full px-3 py-1.5"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              <blockquote className="mt-10 lg:mt-12 pop-card-cream p-6 md:p-7 border-l-[6px] border-l-[#F5B700]">
                <p className="font-serif italic text-lg md:text-xl leading-relaxed text-[#161616] mb-3">
                  {HANDBOOK_META.keyVerse.text}
                </p>
                <cite className="not-italic font-mono text-[10px] uppercase tracking-[0.18em] text-[#161616]/50">
                  {HANDBOOK_META.keyVerse.ref}
                </cite>
              </blockquote>
            </div>
          </header>

          {/* ================= BODY ================= */}
          <div className="max-w-[1180px] mx-auto px-6 md:px-8 xl:grid xl:grid-cols-[190px_minmax(0,1fr)] xl:gap-16">
            <div id="handbook-nav">
              <SectionRail items={RAIL} />
            </div>

            <div className="min-w-0 space-y-20 md:space-y-28">
              {CHAPTERS.map((c) => (
                <ChapterView key={c.id} chapter={c} />
              ))}

              {/* --------------- FAQ --------------- */}
              <section id="faq" className="scroll-mt-32">
                <div className="border-b-2 border-[#161616] pb-5 mb-8">
                  <span className="block text-[10px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold mb-3">
                    Questions
                  </span>
                  <h2 className="font-display text-2xl md:text-[2.4rem] font-black text-[#161616] tracking-tight leading-[1.2] pb-1">
                    The ones people actually type
                  </h2>
                </div>
                <div className="grid gap-3">
                  {FAQ.map((f) => (
                    <details key={f.q} className="pop-card p-5 md:p-6 group">
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-display text-base md:text-lg font-black text-[#161616] leading-snug">
                        {f.q}
                        <span
                          aria-hidden="true"
                          className="shrink-0 mt-1 font-mono text-[#E0301E] transition-transform duration-200 group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-3.5 text-[#3a3733] text-sm md:text-[15px] font-body leading-7">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>

              {/* --------------- DOORS --------------- */}
              <section id="handbook-doors" className="scroll-mt-32">
                <div className="pop-card-yellow p-7 md:p-11">
                  <span className="block text-[10px] uppercase tracking-[0.35em] text-[#8A1006] font-mono font-bold mb-4">
                    Two doors, both open
                  </span>
                  <h2 className="font-display text-2xl md:text-4xl font-black text-[#161616] tracking-tight leading-[1.15] mb-5">
                    If you want to build, start here. If you want it built, bring the idea.
                  </h2>
                  <p className="text-[#161616]/80 text-sm md:text-base font-body font-medium leading-7 max-w-2xl mb-8">
                    Chapter 07 says the distance from an idea to a working thing is now measured in evenings. The
                    Claude Code Field Guide is the free, plain-English start for doing that yourself. If you would rather
                    a studio built it with you, Modern Mustard Seed takes an idea to a specified, sequenced plan, then
                    to a product real people use, and you own every piece of it on hand-off.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/fieldguide"
                      className="px-7 py-4 text-center text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                    >
                      Read the Field Guide
                    </Link>
                    <Link
                      href="/inquire"
                      className="px-7 py-4 text-center text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.28)] hover:-translate-y-0.5 transition-all"
                    >
                      Bring the idea
                    </Link>
                  </div>
                </div>

                <div className="mt-8 pop-card p-5 md:p-6 grid sm:grid-cols-[180px_minmax(0,1fr)] gap-5 items-center">
                  <a href={HANDBOOK_META.checkPdfPath} className="block border-2 border-[#161616] shadow-[4px_4px_0_0_#F5B700] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={HANDBOOK_META.checkPreviewPath}
                      alt="The Berean Check card, front side: the eight tests on one sheet"
                      className="block w-full h-auto"
                      loading="lazy"
                    />
                  </a>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">
                      Take the eight tests with you
                    </span>
                    <h3 className="font-display text-xl font-black text-[#161616] leading-snug mb-2">The Berean Check card</h3>
                    <p className="text-[#3a3733] text-sm font-body leading-6 mb-4">
                      {HANDBOOK_META.checkLabel}. The eight tests, the verse behind each one, and the verse-check drill,
                      on one sheet for the small group table or the fridge. Free to print and hand out.
                    </p>
                    <a
                      href={HANDBOOK_META.checkPdfPath}
                      className="inline-flex px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                    >
                      Download the card
                    </a>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-[12px] font-body italic text-[#161616]/55 max-w-xl">
                    Free to share, print, and hand to your church. The handbook lives at{' '}
                    <a href={CANONICAL} className="underline underline-offset-2">
                      crossandcovenant.co/handbook
                    </a>
                    , a project of this studio. {HANDBOOK_META.esvNotice}
                  </p>
                  <PrintButton />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Chapter and block rendering                                         */
/* ------------------------------------------------------------------ */

function ChapterView({ chapter }: { chapter: Chapter }) {
  return (
    <section id={chapter.id} className="chapter scroll-mt-32">
      <div className="border-b-2 border-[#161616] pb-5 mb-8">
        <span className="block text-[10px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold mb-3">
          Chapter {chapter.n}
        </span>
        <h2 className="font-display text-2xl md:text-[2.4rem] font-black text-[#161616] tracking-tight leading-[1.2] pb-1">
          {chapter.title}
        </h2>
        <p className="mt-4 text-[#3a3733] text-base md:text-lg font-body leading-7 max-w-2xl">{chapter.lead}</p>
      </div>
      <div className="space-y-6">
        {chapter.blocks.map((b, i) => (
          <BlockView key={`${chapter.id}-${i}`} block={b} />
        ))}
      </div>
    </section>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return (
        <p
          className="text-[#3a3733] text-[15px] md:text-base font-body leading-7 max-w-2xl [&_strong]:text-[#161616] [&_strong]:font-extrabold"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case 'lead':
      return <p className="text-[#3a3733] text-base md:text-lg font-body leading-7 max-w-2xl">{block.text}</p>;
    case 'h3':
      return (
        <h3
          id={block.id}
          className="font-display text-xl md:text-2xl font-black text-[#161616] leading-snug pt-6 scroll-mt-32"
        >
          {block.text}
        </h3>
      );
    case 'h4':
      return <h4 className="font-display text-lg font-black text-[#161616] leading-snug pt-2">{block.text}</h4>;
    case 'scripture':
      return (
        <blockquote className="border-l-4 border-[#F5B700] pl-5 py-1 max-w-2xl">
          <p className="font-serif italic text-lg md:text-xl leading-relaxed text-[#161616] mb-2">{block.text}</p>
          <cite className="not-italic font-mono text-[10px] uppercase tracking-[0.18em] text-[#161616]/50">
            {block.ref}
          </cite>
        </blockquote>
      );
    case 'ul':
      return (
        <ul className="grid gap-2.5 max-w-2xl">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-[#F5B700] border border-[#161616]" />
              <span
                className="text-[15px] font-body leading-7 text-[#3a3733] [&_strong]:text-[#161616] [&_strong]:font-extrabold"
                dangerouslySetInnerHTML={{ __html: item }}
              />
            </li>
          ))}
        </ul>
      );
    case 'callout': {
      const tone = {
        plain: 'border-[#161616]/20 bg-white',
        warn: 'border-[#E0301E] bg-white',
        good: 'border-[#1F7A3F] bg-white',
        gold: 'border-[#161616] bg-[#F5B700]',
      }[block.tone];
      const eye = {
        plain: 'text-[#E0301E]',
        warn: 'text-[#E0301E]',
        good: 'text-[#1F7A3F]',
        gold: 'text-[#8A1006]',
      }[block.tone];
      return (
        <div className={`rounded-xl border-2 px-5 py-4 max-w-2xl ${tone} ${block.tone === 'gold' ? 'shadow-[5px_5px_0_0_#161616]' : ''}`}>
          <span className={`block text-[9px] uppercase tracking-[0.22em] font-mono font-bold mb-1.5 ${eye}`}>
            {block.eyebrow}
          </span>
          <p className={`text-[14.5px] font-body leading-7 ${block.tone === 'gold' ? 'text-[#161616] font-medium' : 'text-[#3a3733]'}`}>
            {block.text}
          </p>
        </div>
      );
    }
    case 'order':
      return (
        <ol className="grid gap-3 max-w-2xl">
          {block.items.map((item, i) => (
            <li
              key={item.title}
              className={`pop-card p-5 grid grid-cols-[3rem_minmax(0,1fr)] gap-4 items-start ${item.tool ? 'border-dashed' : ''}`}
            >
              <span className="grid place-items-center h-10 rounded-lg border-2 border-[#161616] bg-[#F5B700] font-display font-black text-lg text-[#161616]">
                {i + 1}
              </span>
              <div>
                <h4 className="font-display text-lg font-black text-[#161616] leading-snug mb-1">{item.title}</h4>
                <p className="text-[#3a3733] text-sm font-body leading-6">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    case 'tiles': {
      const top =
        block.tone === 'never' ? 'border-t-[6px] border-t-[#E0301E]' : block.tone === 'always' ? 'border-t-[6px] border-t-[#1F7A3F]' : '';
      const eye = block.tone === 'never' ? 'text-[#E0301E]' : block.tone === 'always' ? 'text-[#1F7A3F]' : 'text-[#E0301E]';
      return (
        <div className="grid md:grid-cols-2 gap-4">
          {block.items.map((t) => (
            <div key={t.title} className={`pop-card p-5 md:p-6 min-w-0 ${top}`}>
              {t.eyebrow ? (
                <span className={`block text-[9px] uppercase tracking-[0.22em] font-mono font-bold mb-2 ${eye}`}>
                  {t.eyebrow}
                </span>
              ) : null}
              <h4 className="font-display text-lg font-black text-[#161616] leading-snug mb-2">{t.title}</h4>
              <p className="text-[#3a3733] text-sm font-body leading-6">{t.body}</p>
            </div>
          ))}
        </div>
      );
    }
    case 'steps':
      return (
        <ol className="grid gap-3 max-w-2xl">
          {block.items.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 items-start">
              <span className="grid place-items-center h-8 w-8 rounded-full border-2 border-[#161616] bg-[#F5B700] font-mono font-bold text-xs text-[#161616]">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h4 className="font-display text-base font-black text-[#161616] leading-snug">{s.title}</h4>
                <p className="text-[#3a3733] text-sm font-body leading-6 mt-0.5 [overflow-wrap:anywhere]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    case 'code':
      return (
        <div className="max-w-2xl min-w-0">
          <div className="rounded-xl border-2 border-[#161616] bg-[#0E1014] shadow-[5px_5px_0_0_#161616] overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
              Paste into your chatbot&apos;s standing instructions
            </div>
            <pre className="px-5 py-4 font-mono text-[12px] leading-[1.75] text-[#F3EEE1] whitespace-pre-wrap [overflow-wrap:anywhere]">
              {block.text}
            </pre>
          </div>
        </div>
      );
    case 'tests':
      return <BereanCheck />;
    case 'shelf':
      return <Shelf />;
    case 'deceptions':
      return (
        <div className="grid md:grid-cols-2 gap-4">
          {block.items.map((d) => (
            <div key={d.title} className="pop-card p-5 md:p-6 min-w-0 border-l-[6px] border-l-[#E0301E]">
              <h4 className="font-display text-lg font-black text-[#161616] leading-snug mb-2">{d.title}</h4>
              <p className="text-[#3a3733] text-sm font-body leading-6">{d.body}</p>
              <div className="mt-3 pt-3 border-t-2 border-dashed border-[#161616]/15">
                <span className="block text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#1F7A3F] mb-1">
                  How you catch it
                </span>
                <p className="text-[#161616] text-sm font-body font-medium leading-6">{d.catch}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case 'ledger':
      return (
        <div className="pop-card p-0 overflow-hidden grid md:grid-cols-2">
          <div className="p-5 md:p-7 md:border-r-2 border-[#161616]">
            <h3 className="font-display text-xl font-black text-[#161616] flex items-center gap-2.5 mb-4">
              <span className="h-3 w-3 rounded-full bg-[#1F7A3F] border border-[#161616]" />
              Benefits
            </h3>
            <ol className="grid gap-2.5">
              {block.benefits.map((b, i) => (
                <li key={b.title} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 text-sm font-body leading-6 text-[#3a3733]">
                  <span className="font-mono text-[11px] text-[#1F7A3F] font-bold pt-1 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <strong className="text-[#161616] font-extrabold">{b.title}</strong> {b.body}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="p-5 md:p-7 border-t-2 md:border-t-0 border-[#161616]">
            <h3 className="font-display text-xl font-black text-[#161616] flex items-center gap-2.5 mb-4">
              <span className="h-3 w-3 rounded-full bg-[#E0301E] border border-[#161616]" />
              Warnings
            </h3>
            <ol className="grid gap-2.5">
              {block.warnings.map((w, i) => (
                <li key={w.title} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 text-sm font-body leading-6 text-[#3a3733]">
                  <span className="font-mono text-[11px] text-[#E0301E] font-bold pt-1 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <strong className="text-[#161616] font-extrabold">{w.title}</strong> {w.body}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      );
    case 'rule':
      return (
        <ol className="pop-card p-0 overflow-hidden divide-y-2 divide-[#161616]/10">
          {block.items.map((r, i) => (
            <li key={r.title} className="p-4 md:p-5 grid grid-cols-[3rem_minmax(0,1fr)] gap-4 items-baseline">
              <span className="font-display font-black text-lg text-[#E0301E]">{ROMAN[i]}</span>
              <div>
                <h4 className="font-display text-base md:text-lg font-black text-[#161616] leading-snug">{r.title}</h4>
                <p className="text-[#3a3733] text-sm font-body leading-6 mt-0.5">{r.body}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    case 'prayer':
      return (
        <div className="rounded-2xl border-2 border-[#161616] bg-[#080C16] text-[#FBF6EA] p-7 md:p-9 max-w-2xl shadow-[6px_6px_0_0_#F5B700]">
          <span className="block text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#F5B700] mb-4">
            {block.eyebrow}
          </span>
          {block.lines.map((l) => (
            <p key={l} className="font-serif italic text-lg leading-relaxed mb-3">
              {l}
            </p>
          ))}
          <p className="font-display font-black text-lg mt-4">{block.close}</p>
        </div>
      );
    case 'glossary':
      return (
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          {block.items.map((g) => (
            <div key={g.term} className="border-l-2 border-[#F5B700] pl-4">
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] font-bold text-[#161616] mb-1">{g.term}</dt>
              <dd className="text-[#3a3733] text-[13.5px] font-body leading-7">{g.def}</dd>
            </div>
          ))}
        </dl>
      );
    case 'sources':
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          {block.groups.map((g) => (
            <div key={g.eyebrow} className="pop-card p-5 min-w-0">
              <span className="block text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#E0301E] mb-3">
                {g.eyebrow}
              </span>
              <ul className="divide-y divide-dashed divide-[#161616]/15">
                {g.items.map((s) => (
                  <li key={s.domain} className="py-2 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-sm">
                    <span className="font-body text-[#161616]">{s.name}</span>
                    <a
                      href={`https://${s.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-[#1E50C8] [overflow-wrap:anywhere]"
                    >
                      {s.domain}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case 'links':
      return (
        <ul className="grid gap-3 max-w-2xl">
          {block.items.map((l) => (
            <li key={l.href} className="text-sm font-body leading-6 text-[#3a3733]">
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#161616] font-bold underline underline-offset-2 decoration-[#F5B700] decoration-2 [overflow-wrap:anywhere]"
              >
                {l.text}
              </a>{' '}
              {l.note}
            </li>
          ))}
        </ul>
      );
    case 'reading':
      return (
        <ul className="grid gap-2.5 max-w-2xl">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-[#F5B700] border border-[#161616]" />
              <span className="text-[15px] font-body leading-7 text-[#3a3733]">{item}</span>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
