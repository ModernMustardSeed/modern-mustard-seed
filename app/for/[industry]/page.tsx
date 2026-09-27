import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  serviceJsonLd,
} from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { industries, industryBySlug } from '@/data/industries';
import { bookingUrl } from '@/data/socials';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

type Params = Promise<{ industry: string }>;

export function generateStaticParams() {
  return industries.map((i) => ({ industry: i.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { industry } = await params;
  const i = industryBySlug[industry];
  if (!i) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: i.metaTitle,
    description: i.metaDescription,
    path: `/for/${industry}`,
  });
}

const IND_ALT = 'Graffiti couture painting: Mr. Mustard waves from a mustard-yellow classic convertible cruising down a mountain-town main street of shops, under a railroad trestle painted in bright graffiti';

export default async function IndustryPage({ params }: { params: Params }) {
  const { industry } = await params;
  const i = industryBySlug[industry];
  if (!i) notFound();

  const pageUrl = `${SITE.url}/for/${i.slug}`;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: i.metaTitle,
    description: i.metaDescription,
    inLanguage: 'en-US',
    isPartOf: { '@id': `${SITE.url}/#website` },
    about: { '@id': `${SITE.url}/#organization` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: `${SITE.url}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'h2', '.industry-lede'],
    },
  };

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd,
          serviceJsonLd({ name: `Agentic Build Services for ${i.name}`, description: i.metaDescription }),
          faqJsonLd(i.faqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Industries', url: '/for' },
            { name: i.name, url: `/for/${i.slug}` },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#f1ede4] text-[#0d0d0d] overflow-x-clip">

        <PopPageHero
          eyebrow={
            <>
              <Link href="/for" className={pop.back}>
                ← All Industries
              </Link>
              <span className={pop.pill}>{i.eyebrow}</span>
            </>
          }
          title={i.h1}
          art={{ src: '/art/pages/industries', alt: IND_ALT, caption: 'Built for the work you do' }}
          sticker="Open!"
        >
          <p className="industry-lede">
            {i.lede}
          </p>
          <div className={pop.actions}>
            <Link href={i.build.href} className={pop.cta}>
              {i.build.label}
            </Link>
            <Link href="/audit" className={pop.ctaAlt}>
              Run the Bottleneck Breaker
            </Link>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={pop.ctaAlt}>
              Book a Discovery Call
            </a>
          </div>
        </PopPageHero>

        {/* Builds */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 py-12">
          <div className="relative text-center max-w-3xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#c8201a] font-mono font-bold mb-5 block">
              What gets built
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#0d0d0d] tracking-tight leading-[1.1]">
              {i.buildsHeadline}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {i.builds.map((b) => (
              <article
                key={b.title}
                className="pop-card p-7 hover:-translate-y-1 transition-transform duration-300"
              >
                <h3 className="font-display text-lg md:text-xl font-black text-[#0d0d0d] tracking-tight mb-3">
                  {b.title}
                </h3>
                <p className="text-[#3a3733] text-sm font-body leading-7 mb-4">
                  {b.body}
                </p>
                {b.caseStudySlug && (
                  <Link
                    href={`/work/${b.caseStudySlug}`}
                    className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#c8201a] hover:text-[#d0241b] transition-colors"
                  >
                    See the case study
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Featured Receipt: the ink band */}
        <section className="relative mt-16 bg-[#0d0d0d] text-[#f1ede4] border-y-2 border-[#0d0d0d] overflow-hidden">
          <div className="pointer-events-none absolute inset-0 halftone-ink" aria-hidden="true" />
          <div className="relative max-w-5xl mx-auto px-6 md:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#ffd400] font-mono font-bold mb-5 block">
              Real receipts
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#f1ede4] tracking-tight leading-[1.1]">
              {i.receipt.headline}
            </h2>
          </div>

          <div className="relative pop-card-cream p-8 md:p-12 text-[#0d0d0d] shadow-[6px_6px_0_0_#ffd400] border-[#f1ede4]">
            <div className="relative">
              <div className="mb-6 pb-6 border-b-2 border-[#0d0d0d]/10">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#c8201a] font-mono font-bold block mb-2">
                  Featured case study
                </span>
                <h3 className="font-display text-2xl md:text-3xl font-black text-[#0d0d0d] tracking-tight">
                  {i.receipt.caseStudyTitle}
                </h3>
              </div>

              <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed mb-8">
                {i.receipt.body}
              </p>

              {i.receipt.metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {i.receipt.metrics.map((m) => (
                    <div key={m.label} className="p-4 rounded-xl border-2 border-[#0d0d0d] bg-[#ffd400] shadow-[3px_3px_0_0_#0d0d0d]">
                      <span className="text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#0d0d0d]/75 block mb-2">
                        {m.label}
                      </span>
                      <span className="font-display text-xl md:text-2xl font-black text-[#0d0d0d] tracking-tight">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href={`/work/${i.receipt.caseStudySlug}`}
                className="inline-flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#f1ede4] bg-[#0d0d0d] rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_#ffd400] hover:-translate-y-0.5 transition-all"
              >
                Read the full case study
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 pt-20 pb-16">
          <div className="pop-card-yellow p-8 md:p-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#0d0d0d] font-mono font-bold mb-5 block">
              What this costs
            </span>
            <h2 className="font-display text-2xl md:text-4xl font-black text-[#0d0d0d] tracking-tight mb-3">
              {i.pricing.typicalRange}
            </h2>
            <p className="text-[#0d0d0d]/85 text-base font-body leading-7">
              {i.pricing.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/work-with-us"
                className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_#0d0d0d] hover:-translate-y-0.5 transition-all text-center text-[#0d0d0d] bg-white"
              >
                See all engagements
              </Link>
              <Link
                href="/audit"
                className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#f1ede4] bg-[#0d0d0d] rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_#f1ede4] hover:-translate-y-0.5 transition-all text-center"
              >
                Bottleneck Breaker
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#c8201a] font-mono font-bold mb-4 block">
              FAQ
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#0d0d0d] tracking-tight leading-[1.1]">
              Common <span className="italic text-[#c8201a]">questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {i.faqs.map((item) => (
              <details
                key={item.q}
                className="pop-card p-6 group cursor-pointer"
              >
                <summary className="flex justify-between items-start gap-4 list-none">
                  <h3 className="font-display text-base md:text-lg font-black text-[#0d0d0d] tracking-tight">
                    {item.q}
                  </h3>
                  <span className="text-[#d0241b] text-2xl font-black flex-shrink-0 transition-transform group-open:rotate-45 leading-none">
                    +
                  </span>
                </summary>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mt-4">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 pt-12 pb-24 text-center">
          <div className="pop-card-cream halftone-bg p-10 md:p-14">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#0d0d0d] tracking-tight leading-[1.1] mb-5">
              {i.cta.headline}
            </h2>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed mb-8 max-w-2xl mx-auto">
              {i.cta.body}
            </p>
            <p className="text-[#0d0d0d]/60 text-sm font-body leading-relaxed mb-7 max-w-xl mx-auto">
              {i.build.blurb}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
              <Link
                href={i.build.href}
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_#0d0d0d] hover:-translate-y-0.5 transition-all text-center text-[#0d0d0d] bg-[#ffd400]"
              >
                {i.build.label}
              </Link>
              <Link
                href="/audit"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_#0d0d0d] hover:-translate-y-0.5 transition-all text-center text-[#0d0d0d] bg-white"
              >
                Run the Bottleneck Breaker
              </Link>
              <Link
                href="/book"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_#ffd400] hover:-translate-y-0.5 transition-all text-center text-[#f1ede4] bg-[#0d0d0d]"
              >
                Begin an Engagement
              </Link>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
