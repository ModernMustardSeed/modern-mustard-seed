import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
import GlacialLake from '@/components/GlacialLake';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { industries } from '@/data/industries';

export const metadata = buildMetadata({
  title: 'Industries We Build For',
  description:
    'Custom AI tools, apps, and sites for real estate investors, real estate agents, service businesses, DTC and apparel brands, solopreneurs, and consultants. Shipped in 30 days.',
  path: '/for',
});

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE.url}/for#collection`,
  url: `${SITE.url}/for`,
  name: 'Industries Modern Mustard Seed Builds For',
  description:
    'Specialty AI tools, apps, and sites for six core industries. Each industry page documents what we build, real receipts, pricing, and a free AI Audit funnel.',
  isPartOf: { '@id': `${SITE.url}/#website` },
  hasPart: industries.map((i) => ({
    '@type': 'WebPage',
    name: i.metaTitle,
    url: `${SITE.url}/for/${i.slug}`,
    description: i.metaDescription,
  })),
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
      <StaticBackground />

      <div className="relative pt-36 md:pt-44 pb-24">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <header className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-6 block">
              Industries
            </span>
            <h1 className="font-sans text-4xl md:text-6xl font-semibold text-white tracking-tight leading-[1.1] mb-6">
              Built for the work you{' '}
              <span className="text-gradient-mustard">actually do</span>.
            </h1>
            <p className="text-white/65 text-base md:text-lg font-body font-light leading-relaxed max-w-2xl mx-auto">
              Generic AI agencies pitch generic builds. We document exactly what gets built per industry, the case studies that anchor it, and what it costs.
            </p>
          </header>

          {/* Glacial lake feature illustration */}
          <div className="mb-20 rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <GlacialLake variant="dawn" className="aspect-[16/9] md:aspect-[2.4/1]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
            {industries.map((i) => (
              <Link
                key={i.slug}
                href={`/for/${i.slug}`}
                className="glass-card p-8 md:p-10 hover:border-mustard-500/30 transition-all duration-500 group"
              >
                <span className="text-[10px] uppercase tracking-[0.35em] text-mustard-500/70 font-mono font-medium mb-4 block">
                  {i.eyebrow}
                </span>
                <h2 className="font-sans text-xl md:text-2xl font-semibold text-white tracking-tight mb-4 group-hover:text-mustard-100 transition-colors">
                  {i.name}
                </h2>
                <p className="text-white/55 text-sm md:text-base font-body font-light leading-7 mb-5">
                  {i.lede.split('. ').slice(0, 2).join('. ')}.
                </p>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-mustard-400 group-hover:text-mustard-300 transition-colors">
                  Read the playbook
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/audit"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full shadow-[0_0_30px_rgba(255,179,71,0.25)] hover:shadow-[0_0_40px_rgba(255,179,71,0.45)] transition-all"
            >
              Not sure which fits? Run the Free AI Audit.
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
