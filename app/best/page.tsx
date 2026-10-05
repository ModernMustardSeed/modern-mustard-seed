import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { bestPages } from '@/data/best-pages';
import { comparePages } from '@/data/compare-pages';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: 'Buyer\'s Guides: The Best Options for Small Businesses, Sorted by Who They Fit',
  description:
    'Buyer\'s guides for small business owners: the best AI receptionists for contractors, the best ways to get a website in Montana, getting recommended by ChatGPT, and more. Prices checked live.',
  path: '/best',
});

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE.url}/best#collection`,
  url: `${SITE.url}/best`,
  name: 'Buyer\'s guides for small businesses',
  isPartOf: { '@id': `${SITE.url}/#website` },
  hasPart: bestPages.map((p) => ({
    '@type': 'Article',
    headline: p.h1,
    url: `${SITE.url}/best/${p.slug}`,
    description: p.metaDescription,
    dateModified: p.checked,
  })),
};

export default function BestHub() {
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Buyer\'s Guides', url: '/best' },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
        <PopPageHero
          eyebrow={<span className={pop.pill}>Buyer&apos;s guides</span>}
          title={<>The best options, sorted by <em>who they fit</em></>}
          art={{ src: '/art/riviera/road', alt: 'Painting: the family in a Tiffany-blue convertible on a sunny road above the sea', caption: 'Honest picks' }}
          sticker="Guide"
        >
          <p>
            No single winner, because a one-truck roofer and a forty-tech HVAC shop need different things. Each guide lists the real
            options, us included, gives every one the same space, and links each price to the company that publishes it.
          </p>
          <div className={pop.actions}>
            <Link href="/compare" className={pop.cta}>Comparisons</Link>
            <Link href="/inquire" className={pop.ctaAlt}>Begin an Engagement</Link>
          </div>
        </PopPageHero>

        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {bestPages.map((p) => (
              <Link key={p.slug} href={`/best/${p.slug}`} className="pop-card p-7 hover:-translate-y-1 transition-transform duration-300">
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] block mb-2">{p.picks.length} options</span>
                <h2 className="font-display text-xl md:text-2xl font-black text-[#0b3b44] tracking-tight mb-3">{p.h1}</h2>
                <p className="text-[#3a3733] text-sm font-body leading-7">{p.metaDescription}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-8 pb-24">
          <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-6 text-center">Head-to-head comparisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparePages.map((c) => (
              <Link key={c.slug} href={`/compare/${c.slug}`} className="pop-card-yellow p-5 hover:-translate-y-1 transition-transform duration-300">
                <span className="font-display text-base font-black text-[#0b3b44] leading-snug">{c.h1}</span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </>
  );
}
