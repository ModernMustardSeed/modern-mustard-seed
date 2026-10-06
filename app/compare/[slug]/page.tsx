import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd, articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { comparePages, comparePageBySlug } from '@/data/compare-pages';
import { bookingUrl } from '@/data/socials';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import { formatChecked } from '@/lib/checked-date';

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return comparePages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const p = comparePageBySlug[slug];
  if (!p) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: p.metaTitle,
    description: p.metaDescription,
    path: `/compare/${p.slug}`,
    article: { published: p.published, modified: p.checked },
  });
}

const ART_ALT = 'Painting: Mr. Mustard strolls a sunny seaside promenade of little shops with Tiffany-blue and coral awnings, the family with gelato and the sea at the end of the street';

export default async function ComparePage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = comparePageBySlug[slug];
  if (!p) notFound();

  const path = `/compare/${p.slug}`;
  const others = comparePages.filter((o) => o.slug !== p.slug);

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
          faqJsonLd(p.faqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Compare', url: '/compare' },
            { name: p.h1, url: path },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
        <PopPageHero
          eyebrow={
            <>
              <Link href="/compare" className={pop.back}>
                ← All Comparisons
              </Link>
              <span className={pop.pill}>{p.eyebrow}</span>
            </>
          }
          title={p.h1}
          art={{ src: '/art/riviera/industries', alt: ART_ALT, caption: 'An honest side-by-side' }}
          sticker="Fair"
        >
          <p className="compare-answer">{p.answer}</p>
          <p className={pop.note}>Last checked {formatChecked(p.checked)}. Competitor facts are from their own pages, linked below.</p>
          {p.related && p.related.length > 0 && (
            <p className={pop.note}>
              Further reading:{' '}
              {p.related.map((r, i) => (
                <span key={r.href}>
                  {i > 0 ? ', ' : ''}
                  <Link href={r.href} className="underline underline-offset-2 font-semibold">
                    {r.label}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <div className={pop.actions}>
            <Link href="/inquire" className={pop.cta}>
              Begin an Engagement
            </Link>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={pop.ctaAlt}>
              Book a Discovery Call
            </a>
          </div>
        </PopPageHero>

        {/* Side by side */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 py-12" aria-labelledby="table-h">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">
              Side by side
            </span>
            <h2 id="table-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              {p.themLabel} vs {p.usLabel}
            </h2>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block pop-card overflow-hidden p-0">
            <table className="w-full text-left text-sm font-body">
              <thead className="bg-[#0b3b44] text-[#fbf5ea]">
                <tr>
                  <th scope="col" className="p-4 w-[20%] text-[10px] uppercase tracking-[0.25em] font-mono">Factor</th>
                  <th scope="col" className="p-4 w-[40%] text-[10px] uppercase tracking-[0.25em] font-mono">{p.themLabel}</th>
                  <th scope="col" className="p-4 w-[40%] text-[10px] uppercase tracking-[0.25em] font-mono text-[#f5b700]">{p.usLabel}</th>
                </tr>
              </thead>
              <tbody>
                {p.rows.map((r, idx) => (
                  <tr key={r.factor} className={idx % 2 ? 'bg-[#fbf5ea]' : 'bg-white'}>
                    <th scope="row" className="p-4 align-top font-display font-black text-[#0b3b44]">{r.factor}</th>
                    <td className="p-4 align-top text-[#3a3733] leading-6">{r.them}</td>
                    <td className="p-4 align-top text-[#3a3733] leading-6">{r.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: one card per factor */}
          <div className="md:hidden space-y-4">
            {p.rows.map((r) => (
              <div key={r.factor} className="pop-card p-5">
                <h3 className="font-display text-lg font-black text-[#0b3b44] mb-3">{r.factor}</h3>
                <p className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#0a7c78] mb-1">{p.themLabel}</p>
                <p className="text-sm text-[#3a3733] leading-6 mb-3">{r.them}</p>
                <p className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#0b3b44] mb-1">{p.usLabel}</p>
                <p className="text-sm text-[#3a3733] leading-6">{r.us}</p>
              </div>
            ))}
          </div>
        </section>

        {/* When each wins */}
        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="pop-card-cream p-7 md:p-9">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-4 block">
              The honest part
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-5">
              When {p.themShort} is the better choice
            </h2>
            <ul className="space-y-3 text-[#3a3733] text-sm md:text-base font-body leading-7 list-disc pl-5">
              {p.chooseThem.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
          <div className="pop-card-yellow p-7 md:p-9">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0b3b44] font-mono font-bold mb-4 block">
              Where we fit
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-5">
              When we are the better choice
            </h2>
            <ul className="space-y-3 text-[#0b3b44]/85 text-sm md:text-base font-body leading-7 list-disc pl-5">
              {p.chooseUs.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </section>

        {/* Use cases */}
        <section className="max-w-6xl mx-auto px-6 md:px-8 py-12" aria-labelledby="uses-h">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold mb-5 block">
              By situation
            </span>
            <h2 id="uses-h" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight leading-[1.1]">
              Which one fits <span className="italic text-[#0a7c78]">you</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {p.useCases.map((u) => (
              <div key={u.who} className="pop-card p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] mb-2">Pick: {u.pick}</p>
                <h3 className="font-display text-lg md:text-xl font-black text-[#0b3b44] tracking-tight mb-2">{u.who}</h3>
                <p className="text-[#3a3733] text-sm font-body leading-7">{u.why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-16">
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

        {/* Sources */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 pb-12">
          <div className="pop-card p-6 md:p-8">
            <h2 className="font-display text-xl font-black text-[#0b3b44] tracking-tight mb-3">Sources and method</h2>
            <p className="text-[#3a3733] text-sm font-body leading-7 mb-3">
              Modern Mustard Seed wrote this comparison and is one of the options in it. Every fact about another company was read from that
              company&apos;s own website on {formatChecked(p.checked)}. Prices change; check the source before you buy.
            </p>
            {p.sources.length > 0 && (
              <ul className="text-sm font-body leading-7 list-disc pl-5">
                {p.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#0a7c78] underline underline-offset-2">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* More comparisons */}
        <section className="max-w-6xl mx-auto px-6 md:px-8 pb-24">
          <h2 className="font-display text-2xl md:text-3xl font-black text-[#0b3b44] tracking-tight mb-6 text-center">More comparisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {others.map((o) => (
              <Link key={o.slug} href={`/compare/${o.slug}`} className="pop-card p-5 hover:-translate-y-1 transition-transform duration-300">
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0a7c78] block mb-2">{o.eyebrow}</span>
                <span className="font-display text-base font-black text-[#0b3b44] leading-snug">{o.h1}</span>
              </Link>
            ))}
            <Link href="/best" className="pop-card-yellow p-5 hover:-translate-y-1 transition-transform duration-300">
              <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#0b3b44] block mb-2">Buyer&apos;s guides</span>
              <span className="font-display text-base font-black text-[#0b3b44] leading-snug">The best options, sorted by who they fit</span>
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
