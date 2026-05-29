import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/jsonld';
import { products, bundles, isComingSoon } from '@/data/products';

export const metadata: Metadata = buildMetadata({
  title: 'The Playbook Store. Workbooks for builders and operators',
  description:
    'Seven production-tested playbooks from Modern Mustard Seed. AI strategy, Claude Code, Shopify builds, brand systems, AI sales, and GEO. From $47. Instant PDF delivery.',
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
    <main className="min-h-screen bg-midnight-900 text-cream-50 pt-24">
      <JsonLd data={jsonLd} />

      <header className="max-w-5xl mx-auto px-6 md:px-8 pt-12 md:pt-20 pb-12 text-center">
        <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-7 block">
          The Playbook Store
        </span>
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-medium text-cream-50 tracking-tight leading-[1.02] mb-7">
          The same systems we ship to{' '}
          <span className="text-gradient-brass italic">$225/hour</span> clients
        </h1>
        <p className="font-display italic text-2xl md:text-3xl text-cream-100/95 font-light leading-snug mb-5">
          Seven playbooks. From $47
        </p>
        <p className="text-cream-100/70 text-base md:text-lg font-body font-light leading-relaxed max-w-2xl mx-auto mb-2">
          Production-tested workbooks built from 40+ shipped AI products. AI strategy. Claude Code. Shopify builds. Brand systems. AI sales. GEO and AI commerce. Instant PDF download after purchase.
        </p>
        <p className="text-cream-100/45 text-xs font-mono uppercase tracking-[0.25em]">
          Authored by Sarah Scarano. Built by Modern Mustard Seed
        </p>
      </header>

      {featured && (
        <section className="max-w-5xl mx-auto px-6 md:px-8 mb-20">
          <Link
            href={`/store/${featured.slug}`}
            className="block glass-card p-8 md:p-12 border-gold-light/30 bg-gradient-to-br from-gold-light/[0.04] via-transparent to-brass/[0.04] hover:border-gold-light/50 transition-all duration-500 group"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <span className="text-[9px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-bold mb-4 block">
                  The Complete Library. Save $115
                </span>
                <h2 className="font-display text-3xl md:text-5xl font-medium text-cream-50 tracking-tight leading-[1.05] mb-4">
                  {featured.name}
                </h2>
                <p className="text-cream-100/80 text-base md:text-lg font-body font-light leading-relaxed mb-3">
                  {featured.pitch}
                </p>
                <p className="text-cream-100/45 text-xs font-mono uppercase tracking-[0.25em]">
                  7 playbooks · 240+ pages · ${featured.priceUsd}
                </p>
              </div>
              <div className="md:text-right">
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass campfire-glow group-hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] transition-all">
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
            <h2 className="font-display text-2xl md:text-4xl font-medium text-cream-50 tracking-tight mb-3">
              {category}
            </h2>
            <p className="text-cream-100/65 text-sm md:text-base font-body font-light leading-relaxed max-w-2xl">
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
                  className="group relative glass-card p-7 md:p-8 hover:border-gold-light/30 transition-all duration-500 flex flex-col overflow-hidden"
                  style={{
                    boxShadow: `inset 4px 0 0 0 ${p.accentColor}`,
                  }}
                >
                  <div
                    className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-[0.06] blur-3xl pointer-events-none group-hover:opacity-[0.12] transition-opacity duration-700"
                    style={{ backgroundColor: p.accentColor }}
                  />
                  <div className="flex items-center justify-between mb-4 relative">
                    <span className="text-[9px] uppercase tracking-[0.3em] text-gold-light/70 font-mono font-bold">
                      {p.category}
                    </span>
                    {soon && (
                      <span className="text-[8px] uppercase tracking-[0.3em] text-cream-100/55 font-mono font-bold px-2 py-1 rounded-full border border-cream-100/15 bg-midnight-700/50">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl md:text-2xl text-cream-50 font-medium tracking-tight leading-snug mb-3 relative">
                    {p.name}
                  </h3>
                  <p className="text-cream-100/65 text-sm font-body font-light leading-relaxed mb-5 flex-1 relative">
                    {p.pitch}
                  </p>
                  <div className="flex items-baseline justify-between relative">
                    <span className="font-display text-2xl text-cream-50 font-medium tracking-tight">
                      ${p.priceUsd}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-cream-100/45 font-mono">
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
          <h2 className="font-display text-2xl md:text-4xl font-medium text-cream-50 tracking-tight mb-3">
            Bundles
          </h2>
          <p className="text-cream-100/65 text-sm md:text-base font-body font-light leading-relaxed max-w-2xl">
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
                className="group glass-card p-7 md:p-8 hover:border-gold-light/30 transition-all duration-500 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-gold-light/70 font-mono font-bold">
                    Bundle · Save ${b.savings}
                  </span>
                  {soon && (
                    <span className="text-[8px] uppercase tracking-[0.3em] text-cream-100/55 font-mono font-bold px-2 py-1 rounded-full border border-cream-100/15 bg-midnight-700/50">
                      Coming soon
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl md:text-2xl text-cream-50 font-medium tracking-tight leading-snug mb-3">
                  {b.name}
                </h3>
                <p className="text-cream-100/65 text-sm font-body font-light leading-relaxed mb-5 flex-1">
                  {b.pitch}
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl text-cream-50 font-medium tracking-tight">
                    ${b.priceUsd}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-cream-100/45 font-mono line-through">
                    ${b.individualTotal}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 md:px-8 pb-24 text-center">
        <div className="glass-card p-8 md:p-12 border-gold-light/20">
          <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-5 block">
            Ready to build it for you?
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-medium text-cream-50 tracking-tight mb-4">
            Skip the workbook
          </h2>
          <p className="text-cream-100/75 text-base font-body font-light leading-relaxed mb-7 max-w-xl mx-auto">
            If you would rather have us ship the system than build it yourself, the playbooks are credited toward any Seed Site or Full-Service Business Build. Just mention it on the discovery call.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/work-with-us"
              className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] transition-all text-center"
            >
              See engagements
            </Link>
            <Link
              href="/build-queue"
              className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-100 border border-cream-100/30 rounded-full bg-midnight-700/30 backdrop-blur-sm hover:bg-midnight-700/55 hover:border-cream-100/55 transition-all text-center"
            >
              Apply to build queue
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
