import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { alternativesPages } from '@/data/alternatives-pages';
import { bestPages } from '@/data/best-pages';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: 'Alternatives: Smith.ai, Ruby, Goodcall, GoHighLevel, Wix and Squarespace Compared',
  description:
    'Thinking of switching? Honest alternatives to Smith.ai, Ruby, Goodcall, GoHighLevel, Wix and Squarespace, with prices checked live and a plain answer on when to stay put.',
  path: '/alternatives',
});

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE.url}/alternatives#collection`,
  url: `${SITE.url}/alternatives`,
  name: 'Alternatives for small businesses',
  isPartOf: { '@id': `${SITE.url}/#website` },
  hasPart: alternativesPages.map((p) => ({
    '@type': 'Article',
    headline: p.h1,
    url: `${SITE.url}/alternatives/${p.slug}`,
    description: p.metaDescription,
    dateModified: p.checked,
  })),
};

export default function AlternativesHub() {
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Alternatives', url: '/alternatives' },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
        <PopPageHero
          eyebrow={<span className={pop.pill}>Alternatives</span>}
          title={<>Thinking of <em>switching?</em></>}
          art={{ src: '/art/riviera/road', alt: 'Painting: the family in a Tiffany-blue convertible on a sunny road above the sea', caption: 'Every option, fairly' }}
          sticker="Switch?"
        >
          <p>
            Each page says why people look elsewhere, using only what the company itself publishes, lists the real alternatives
            with us among them, and says plainly when staying put is the right call.
          </p>
          <div className={pop.actions}>
            <Link href="/compare" className={pop.cta}>Comparisons</Link>
            <Link href="/best" className={pop.ctaAlt}>Buyer&apos;s Guides</Link>
          </div>
        </PopPageHero>

        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {alternativesPages.map((p) => (
              <Link key={p.slug} href={`/alternatives/${p.slug}`} className="pop-card p-7 hover:-translate-y-1 transition-transform duration-300">
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] block mb-2">{p.picks.length} alternatives</span>
                <h2 className="font-display text-xl md:text-2xl font-black text-[#0b3b44] tracking-tight mb-3">{p.h1}</h2>
                <p className="text-[#3a3733] text-sm font-body leading-7">{p.metaDescription}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-8 pb-24">
          <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-6 text-center">Buyer&apos;s guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bestPages.map((b) => (
              <Link key={b.slug} href={`/best/${b.slug}`} className="pop-card-yellow p-5 hover:-translate-y-1 transition-transform duration-300">
                <span className="font-display text-base font-black text-[#0b3b44] leading-snug">{b.h1}</span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </>
  );
}
