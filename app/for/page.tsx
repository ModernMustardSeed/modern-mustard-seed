import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { industries } from '@/data/industries';

export const metadata = buildMetadata({
  title: 'Industries We Build For',
  description:
    'Custom agentic tools, apps, and sites for real estate investors, real estate agents, service businesses, DTC and apparel brands, solopreneurs, and consultants. Shipped in weeks, not months.',
  path: '/for',
});

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE.url}/for#collection`,
  url: `${SITE.url}/for`,
  name: 'Industries Modern Mustard Seed Builds For',
  description:
    'Specialty agentic tools, apps, and sites for six core industries. Each industry page documents what we build, the real receipts, and how an engagement in that trade is scoped.',
  isPartOf: { '@id': `${SITE.url}/#website` },
  hasPart: [
    ...industries.map((i) => ({
      '@type': 'WebPage',
      name: i.metaTitle,
      url: `${SITE.url}/for/${i.slug}`,
      description: i.metaDescription,
    })),
    {
      '@type': 'WebPage',
      name: 'Agentic Systems for Restaurants. Phone Ordering and Missed-Call Revenue.',
      url: `${SITE.url}/for/restaurants`,
      description:
        'voice agents for restaurants that take phone orders, book tables, and save the dinner rush from voicemail. Integrates with Toast, Square, and Clover.',
    },
  ],
};

export default function ForIndex() {
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Industries', url: '/for' },
          ]),
        ]}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] halftone-bg opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-6 md:px-8">
          <header className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#B92417] font-mono font-bold mb-6 block">
              Industries
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.05] mb-6">
              Built for the work you{' '}
              <span className="italic text-[#B92417]">actually do</span>
            </h1>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto">
              Generic automation agencies pitch generic builds. We document exactly what gets built per industry, the case studies that anchor it, and what it costs.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
            {industries.map((i) => (
              <Link
                key={i.slug}
                href={`/for/${i.slug}`}
                className="pop-card p-8 md:p-10 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#161616] transition-all duration-300 group"
              >
                <span className="text-[10px] uppercase tracking-[0.35em] text-[#B92417] font-mono font-bold mb-4 block">
                  {i.eyebrow}
                </span>
                <h2 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-4">
                  {i.name}
                </h2>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5">
                  {i.lede.split('. ').slice(0, 2).join('. ')}.
                </p>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#B92417] group-hover:text-[#E0301E] transition-colors">
                  Read the playbook
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}

            <Link
              href="/for/restaurants"
              className="pop-card p-8 md:p-10 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#161616] transition-all duration-300 group"
            >
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#B92417] font-mono font-bold mb-4 block">
                Agentic Systems for Restaurants
              </span>
              <h2 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-4">
                Restaurants
              </h2>
              <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5">
                A voice agent that takes phone orders, books tables, and saves the dinner rush from voicemail. Fires orders to Toast, Square, or Clover, plus a commission-free ordering page.
              </p>
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#B92417] group-hover:text-[#E0301E] transition-colors">
                Read the playbook
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/audit"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-center text-[#161616] bg-[#F5B700]"
            >
              Not sure which fits? Run the Bottleneck Breaker.
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
