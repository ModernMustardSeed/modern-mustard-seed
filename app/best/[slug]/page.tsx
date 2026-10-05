import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd, articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { bestPages, bestPageBySlug } from '@/data/best-pages';
import { bookingUrl } from '@/data/socials';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import { formatChecked } from '@/lib/checked-date';

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return bestPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const p = bestPageBySlug[slug];
  if (!p) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: p.metaTitle,
    description: p.metaDescription,
    path: `/best/${p.slug}`,
    article: { published: p.published, modified: p.checked },
  });
}

const ART_ALT = 'Painting: Mr. Mustard on a sunny seaside road above the sea, the family in a Tiffany-blue convertible';

function anchor(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function BestPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = bestPageBySlug[slug];
  if (!p) notFound();

  const path = `/best/${p.slug}`;
  const url = `${SITE.url}${path}`;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${url}#list`,
    name: p.h1,
    numberOfItems: p.picks.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement: p.picks.map((pick, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: pick.name,
      description: `${pick.bestFor}. ${pick.what}`,
      url: pick.url ?? `${url}#${anchor(pick.name)}`,
    })),
  };

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: p.h1,
            description: p.metaDescription,
            path,
            datePublished: p.published,
            dateModified: p.checked,
          }),
          itemList,
          faqJsonLd(p.faqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Buyer\'s Guides', url: '/best' },
            { name: p.h1, url: path },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
        <PopPageHero
          eyebrow={
            <>
              <Link href="/best" className={pop.back}>
                ← All Buyer&apos;s Guides
              </Link>
              <span className={pop.pill}>{p.eyebrow}</span>
            </>
          }
          title={p.h1}
          art={{ src: '/art/riviera/road', alt: ART_ALT, caption: 'Sorted by who each one fits' }}
          sticker="Guide"
        >
          <p className="best-answer">{p.answer}</p>
          <p className={pop.note}>Last checked {formatChecked(p.checked)}.</p>
          <div className={pop.actions}>
            <a href="#picks" className={pop.cta}>
              See the picks
            </a>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={pop.ctaAlt}>
              Book a Discovery Call
            </a>
          </div>
        </PopPageHero>

        {/* At a glance */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 py-12" aria-labelledby="glance-h">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">At a glance</span>
            <h2 id="glance-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              Who each one is <span className="italic text-[#0a7c78]">best for</span>
            </h2>
          </div>
          <div className="pop-card p-0 overflow-hidden">
            <ul className="divide-y-2 divide-[#0b3b44]/10">
              {p.picks.map((pick) => (
                <li key={pick.name} className="p-4 md:p-5 flex flex-col md:flex-row md:items-baseline gap-1 md:gap-6">
                  <a href={`#${anchor(pick.name)}`} className="font-display font-black text-[#0b3b44] md:w-1/3 underline-offset-4 hover:underline">
                    {pick.name}
                  </a>
                  <span className="text-sm text-[#3a3733] font-body leading-6 md:w-2/3">{pick.bestFor}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The picks */}
        <section id="picks" className="max-w-5xl mx-auto px-6 md:px-8 py-8 space-y-6 scroll-mt-24">
          {p.picks.map((pick, i) => (
            <section
              key={pick.name}
              id={anchor(pick.name)}
              className={`${pick.isUs ? 'pop-card-yellow' : 'pop-card'} p-7 md:p-9 scroll-mt-24`}
              aria-labelledby={`${anchor(pick.name)}-h`}
            >
              <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] block mb-2">
                {String(i + 1).padStart(2, '0')} · {pick.bestFor}
              </span>
              <h2 id={`${anchor(pick.name)}-h`} className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-3">
                {pick.name}
                {pick.isUs && <span className="ml-3 align-middle text-[10px] uppercase tracking-[0.25em] font-mono text-[#0b3b44]/70">(that&apos;s us)</span>}
              </h2>
              <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5">{pick.what}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0b3b44] mb-2">Strengths</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-[#3a3733] font-body leading-6">
                    {pick.strengths.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0b3b44] mb-2">Watch for</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-[#3a3733] font-body leading-6">
                    {pick.watchFor.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              </div>
              <p className="text-sm font-body leading-6 text-[#0b3b44]">
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold mr-2">Price</span>
                {pick.price}
              </p>
              {pick.url && !pick.isUs && (
                <a href={pick.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm text-[#0a7c78] underline underline-offset-2">
                  Source: {pick.name} website
                </a>
              )}
              {pick.url && pick.isUs && (
                <Link href={pick.url.replace(SITE.url, '')} className="inline-block mt-3 text-sm text-[#0b3b44] underline underline-offset-2">
                  See what we build
                </Link>
              )}
            </section>
          ))}
        </section>

        {/* Method */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-12">
          <div className="pop-card-cream p-7 md:p-9">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-4 block">How we picked</span>
            <ul className="list-disc pl-5 space-y-2 text-[#3a3733] text-sm md:text-base font-body leading-7">
              {p.method.map((m) => <li key={m}>{m}</li>)}
            </ul>
            <p className="mt-4 text-sm text-[#0b3b44]/70 font-body">Last checked {formatChecked(p.checked)}. Prices change; check each source before you buy.</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-12">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-4 block">FAQ</span>
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              Common <span className="italic text-[#0a7c78]">questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {p.faqs.map((item) => (
              <details key={item.q} className="pop-card p-6 group cursor-pointer">
                <summary className="flex justify-between items-start gap-4 list-none">
                  <h3 className="font-display text-base md:text-lg font-black text-[#0b3b44] tracking-tight">{item.q}</h3>
                  <span className="text-[#0a7c78] text-2xl font-black flex-shrink-0 transition-transform group-open:rotate-45 leading-none">+</span>
                </summary>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mt-4">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Next */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 pt-4 pb-24 text-center">
          <div className="pop-card-cream halftone-bg p-10 md:p-14">
            <h2 className="font-display text-3xl md:text-4xl font-black text-[#0b3b44] tracking-tight leading-[1.1] mb-5">
              Want it built for you?
            </h2>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed mb-8 max-w-2xl mx-auto">
              Tell us what the business needs. We scope it in a free discovery call and agree a set package price before work starts.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
              <Link href="/inquire" className={pop.cta}>Begin an Engagement</Link>
              <Link href="/compare" className={pop.ctaAlt}>See the comparisons</Link>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
