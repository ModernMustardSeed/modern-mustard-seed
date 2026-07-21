import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/jsonld';
import { products, bundles, isComingSoon } from '@/data/products';
import { programs } from '@/data/programs';

export const metadata: Metadata = buildMetadata({
  title: 'The Store. Playbooks and courses for builders and operators',
  description:
    'Production-tested playbooks and courses from Modern Mustard Seed. AI strategy, Claude Code, Shopify builds, brand systems, AI sales, and GEO. From $47. Instant delivery, growing library.',
  path: '/store',
});

const CATEGORY_BLURBS: Record<string, string> = {
  'Business Foundations':
    'Strategy, sales, and operations. Build the business that uses AI as infrastructure.',
  'Build with Claude':
    'Hands-on technical playbooks. Ship real software with Claude Code as your dev partner.',
};

export default function StorePage() {
  const featured = bundles.find((b) => b.slug === 'complete-library');
  const grouped = products.reduce<Record<string, typeof products>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: 'Store', url: '/store' },
    ]),
    collectionPageJsonLd({
      url: `${SITE.url}/store`,
      name: 'The Modern Mustard Seed Playbook Store',
      description:
        'Production-tested workbooks and playbooks from Modern Mustard Seed. AI strategy, build systems, brand, sales, GEO, and AI commerce.',
      itemListElement: products.map((p) => ({
        url: `${SITE.url}/store/${p.slug}`,
        name: p.name,
      })),
    }),
  ];

  return (
    <main className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-24">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
      <div className="relative">
        <JsonLd data={jsonLd} />

        <header className="max-w-5xl mx-auto px-6 md:px-8 pt-12 md:pt-20 pb-12 text-center">
          <span className="text-[10px] uppercase tracking-[0.45em] text-[#E0301E] font-mono font-bold mb-7 block">
            The Store
          </span>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight leading-[1.02] mb-7">
            The same systems behind our{' '}
            <span className="text-[#F5B700] italic" style={{ WebkitTextStroke: '2px #161616' }}>
              client work
            </span>
          </h1>
          <p className="font-display italic font-bold text-2xl md:text-3xl text-[#161616] leading-snug mb-5">
            Playbooks and courses. From $47
          </p>
          <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto mb-2">
            Production-tested workbooks and courses built from 40+ shipped AI products. AI strategy. Claude Code. Shopify builds. Brand systems. AI sales. GEO and AI commerce. A growing library, with new drops added as we ship.
          </p>
          <p className="text-[#161616]/45 text-xs font-mono uppercase tracking-[0.25em]">
            Authored by Sarah Scarano. Built by Modern Mustard Seed
          </p>
        </header>

        {/* MUSTARD LIFE: the whole catalog as a magazine comic */}
        <section className="max-w-5xl mx-auto px-6 md:px-8 mb-8">
          <Link
            href="/comic"
            className="group flex items-center gap-5 md:gap-7 bg-white border-2 border-[#161616] p-5 md:p-6 transition-transform hover:-translate-y-1"
            style={{ boxShadow: '6px 6px 0 0 #161616' }}
          >
            <span className="relative block w-20 md:w-24 flex-shrink-0 overflow-hidden rounded-md border-2 border-[#161616] rotate-[-3deg] shadow-[3px_3px_0_0_#F5B700] transition-transform group-hover:rotate-0">
              <span className="relative block aspect-[3/4]">
                <Image
                  src="/comic/cover.webp"
                  alt="Mustard Life magazine cover: the Mustard family yachting at golden hour"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </span>
            </span>
            <span className="min-w-0">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
                New Issue · Free to Read
              </span>
              <span className="block font-display italic text-2xl md:text-3xl font-black text-[#161616] tracking-tight leading-tight mt-1">
                Mustard Life: the whole catalog, as a comic.
              </span>
              <span className="block text-[#3a3733] font-body text-sm mt-1 leading-snug">
                The family yachts while the AI staff work. Every product, every price, printed in ink.
              </span>
            </span>
            <span aria-hidden className="ml-auto hidden md:inline-flex items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] group-hover:gap-3 transition-all flex-shrink-0">
              Read It →
            </span>
          </Link>
        </section>

        {/* MUSTARD LAUNCH: the launch-coach flagship */}
        <section className="max-w-5xl mx-auto px-6 md:px-8 mb-8">
          <Link
            href="/mustard-launch"
            className="block bg-[#080C16] border-2 border-[#161616] p-8 md:p-10 transition-transform hover:-translate-y-1 group relative overflow-hidden"
            style={{ boxShadow: '6px 6px 0 0 #F5B700' }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }}
              aria-hidden
            />
            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">
                  [ CLEARED FOR IGNITION ] · New · Free Blueprint
                </span>
                <h2 className="font-display italic text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.02] mt-3">
                  Launch for real. This week.
                </h2>
                <p className="text-white/70 font-body text-sm md:text-base mt-3 leading-relaxed max-w-xl">
                  Your AI launch coach. Type your idea and Mr. Mustard builds your whole launch (brand,
                  offer, money, presence, first customers) and counts you down to open. Get your personalized
                  Blueprint free on the page.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] group-hover:gap-3 transition-all justify-self-start md:justify-self-end">
                Ignite my launch →
              </span>
            </div>
          </Link>
        </section>

        {/* MUSTARD MODE: the coach-led flagship */}
        <section className="max-w-5xl mx-auto px-6 md:px-8 mb-16">
          <Link
            href="/mustard-mode"
            className="block bg-[#080C16] border-2 border-[#161616] p-8 md:p-10 transition-transform hover:-translate-y-1 group relative overflow-hidden"
            style={{ boxShadow: '6px 6px 0 0 #F5B700' }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }}
              aria-hidden
            />
            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">
                  [ MUSTARD MODE: ON ] · New · From $197
                </span>
                <h2 className="font-display italic text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.02] mt-3">
                  One seed. 100x the output.
                </h2>
                <p className="text-white/70 font-body text-sm md:text-base mt-3 leading-relaxed max-w-xl">
                  Your own AI coach. Mr. Mustard trains you through four tracks (Code, Design, Cowork,
                  Ideate) with a live coach, 28 missions, and the exact prompts. Play your first coaching
                  session free on the page.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] group-hover:gap-3 transition-all justify-self-start md:justify-self-end">
                Insert coin →
              </span>
            </div>
          </Link>
        </section>

        {/* Flagship programs: the two $497 front doors */}
        <section className="max-w-5xl mx-auto px-6 md:px-8 mb-16">
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">The flagship programs</span>
            <p className="text-[#3a3733] font-body">Spec it, then build it. Two front doors at $497, or get both in the Zero to One Bundle.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {['idea-to-spec', 'the-terminal'].map((slug) => {
              const p = programs.find((x) => x.slug === slug)!;
              return (
                <Link
                  key={slug}
                  href={`/${slug}`}
                  className="block rounded-2xl border-2 border-[#161616] bg-white p-7 transition-transform hover:-translate-y-1 group"
                  style={{ boxShadow: `inset 6px 0 0 0 ${p.accent}, 5px 5px 0 0 #161616` }}
                >
                  <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">{p.name} . ${p.priceUsd}</span>
                  <h3 className="font-display text-2xl font-black text-[#161616] mt-3 leading-tight">{p.tagline}</h3>
                  <p className="text-[#3a3733] font-body text-sm mt-3 leading-relaxed">{p.promise}</p>
                  <span className="inline-flex items-center gap-2 mt-5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] group-hover:gap-3 transition-all">
                    Explore <span aria-hidden>&rarr;</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {featured && (
          <section className="max-w-5xl mx-auto px-6 md:px-8 mb-20">
            <Link
              href={`/store/${featured.slug}`}
              className="block pop-card-yellow p-8 md:p-12 transition-transform duration-300 hover:-translate-y-1 group"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.45em] text-[#161616] font-mono font-bold mb-4 block">
                    The Complete Library. Save $115
                  </span>
                  <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05] mb-4">
                    {featured.name}
                  </h2>
                  <p className="text-[#161616]/80 text-base md:text-lg font-body font-medium leading-relaxed mb-3">
                    {featured.pitch}
                  </p>
                  <p className="text-[#161616]/55 text-xs font-mono uppercase tracking-[0.25em]">
                    Every playbook · 240+ pages · ${featured.priceUsd}
                  </p>
                </div>
                <div className="md:text-right">
                  <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] border-2 border-[#161616] transition-all">
                    Get the Library →
                  </span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="max-w-6xl mx-auto px-6 md:px-8 mb-20">
            <div className="mb-10">
              <h2 className="font-display text-2xl md:text-4xl font-black text-[#161616] tracking-tight mb-3">
                {category}
              </h2>
              <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed max-w-2xl">
                {CATEGORY_BLURBS[category]}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((p) => {
                const soon = !!p.comingSoon;
                return (
                  <Link
                    key={p.slug}
                    href={`/store/${p.slug}`}
                    className="group relative bg-white border-2 border-[#161616] rounded-2xl p-7 md:p-8 transition-transform duration-300 hover:-translate-y-1 flex flex-col overflow-hidden"
                    style={{ boxShadow: `inset 6px 0 0 0 ${p.accentColor}, 5px 5px 0 0 #161616` }}
                  >
                    <div className="flex items-center justify-between mb-4 relative">
                      <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
                        {p.category}
                      </span>
                      {soon && (
                        <span className="text-[8px] uppercase tracking-[0.3em] text-[#161616]/55 font-mono font-bold px-2 py-1 rounded-full border-2 border-[#161616]/20 bg-[#FBF6EA]">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-xl md:text-2xl text-[#161616] font-black tracking-tight leading-snug mb-3 relative">
                      {p.name}
                    </h3>
                    <p className="text-[#3a3733] text-sm font-body leading-relaxed mb-5 flex-1 relative">
                      {p.pitch}
                    </p>
                    <div className="flex items-baseline justify-between relative">
                      <span className="font-display text-2xl text-[#161616] font-black tracking-tight">
                        ${p.priceUsd}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[#161616]/45 font-mono">
                        {p.pages} pages
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <section className="max-w-6xl mx-auto px-6 md:px-8 mb-20">
          <div className="mb-10">
            <h2 className="font-display text-2xl md:text-4xl font-black text-[#161616] tracking-tight mb-3">
              Bundles
            </h2>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed max-w-2xl">
              Buy by topic and save. Same playbooks, lower per-page price.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {bundles.map((b) => {
              const soon = isComingSoon(b.slug);
              return (
                <Link
                  key={b.slug}
                  href={`/store/${b.slug}`}
                  className="group pop-card p-7 md:p-8 transition-transform duration-300 hover:-translate-y-1 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
                      Bundle · Save ${b.savings}
                    </span>
                    {soon && (
                      <span className="text-[8px] uppercase tracking-[0.3em] text-[#161616]/55 font-mono font-bold px-2 py-1 rounded-full border-2 border-[#161616]/20 bg-[#FBF6EA]">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl md:text-2xl text-[#161616] font-black tracking-tight leading-snug mb-3">
                    {b.name}
                  </h3>
                  <p className="text-[#3a3733] text-sm font-body leading-relaxed mb-5 flex-1">
                    {b.pitch}
                  </p>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-2xl text-[#161616] font-black tracking-tight">
                      ${b.priceUsd}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#161616]/45 font-mono line-through">
                      ${b.individualTotal}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 md:px-8 pb-24 text-center">
          <div className="pop-card-yellow p-8 md:p-12">
            <span className="text-[10px] uppercase tracking-[0.45em] text-[#161616] font-mono font-bold mb-5 block">
              Ready to build it for you?
            </span>
            <h2 className="font-display text-2xl md:text-4xl font-black text-[#161616] tracking-tight mb-4">
              Skip the workbook
            </h2>
            <p className="text-[#161616]/80 text-base font-body font-medium leading-relaxed mb-7 max-w-xl mx-auto">
              If you would rather have us ship the system than build it yourself, the playbooks are credited toward any Seed Site or Full-Service Business Build. Just mention it on the discovery call.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/work-with-us"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all text-center"
              >
                See engagements
              </Link>
              <Link
                href="/book"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-center"
              >
                Book a free call
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
