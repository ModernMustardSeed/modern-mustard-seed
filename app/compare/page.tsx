import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { comparePages } from '@/data/compare-pages';
import { bestPages } from '@/data/best-pages';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: 'Compare Your Options: Freelancer, Agency, DIY, Platform or Studio',
  description:
    'Honest side-by-side comparisons for small businesses choosing how to get a website, an AI receptionist or a custom app built. Competitor prices checked live, and when the other option wins.',
  path: '/compare',
});

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE.url}/compare#collection`,
  url: `${SITE.url}/compare`,
  name: 'Comparisons for small businesses',
  isPartOf: { '@id': `${SITE.url}/#website` },
  hasPart: comparePages.map((p) => ({
    '@type': 'Article',
    headline: p.h1,
    url: `${SITE.url}/compare/${p.slug}`,
    description: p.metaDescription,
    dateModified: p.checked,
  })),
};

export default function CompareHub() {
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Compare', url: '/compare' },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
        <PopPageHero
          eyebrow={<span className={pop.pill}>Compare</span>}
          title={<>Compare your <em>options</em></>}
          art={{ src: '/art/riviera/industries', alt: 'Painting: a sunny seaside promenade of little shops with Tiffany-blue and coral awnings', caption: 'Every option, fairly' }}
          sticker="Fair"
        >
          <p>
            Freelancer or studio. Wix or custom. An answering service or an AI receptionist. Each comparison says plainly when the other
            option is the better choice, and every competitor fact links to its source.
          </p>
          <div className={pop.actions}>
            <Link href="/best" className={pop.cta}>Buyer&apos;s Guides</Link>
            <Link href="/inquire" className={pop.ctaAlt}>Begin an Engagement</Link>
          </div>
        </PopPageHero>

        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {comparePages.map((p) => (
              <Link key={p.slug} href={`/compare/${p.slug}`} className="pop-card p-7 hover:-translate-y-1 transition-transform duration-300">
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] block mb-2">{p.eyebrow}</span>
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
