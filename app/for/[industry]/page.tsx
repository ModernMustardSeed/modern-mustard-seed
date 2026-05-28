import Link from 'next/link';
import { notFound } from 'next/navigation';
import StaticBackground from '@/components/StaticBackground';
import AuroraField from '@/components/AuroraField';
import SnowDrift from '@/components/SnowDrift';
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  serviceJsonLd,
} from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { industries, industryBySlug } from '@/data/industries';
import { bookingUrl } from '@/data/socials';

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
          serviceJsonLd({ name: `AI Build Services for ${i.name}`, description: i.metaDescription }),
          faqJsonLd(i.faqs),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Industries', url: '/for' },
            { name: i.name, url: `/for/${i.slug}` },
          ]),
        ]}
      />
      <StaticBackground />

      <article className="relative pt-36 md:pt-44 pb-20">
        {/* Hero */}
        <header className="max-w-5xl mx-auto px-6 md:px-8 text-center mb-20">
          <Link
            href="/for"
            className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold hover:text-mustard-400 transition-colors inline-block mb-10"
          >
            ← All Industries
          </Link>

          <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-6 block">
            {i.eyebrow}
          </span>

          <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.1] mb-8">
            {i.h1}
          </h1>

          <p className="industry-lede text-white/70 text-base md:text-lg font-body font-light leading-relaxed max-w-3xl mx-auto mb-10">
            {i.lede}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/audit"
              className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full shadow-[0_0_30px_rgba(255,107,53,0.2)] hover:shadow-[0_0_40px_rgba(255,107,53,0.35)] transition-all"
            >
              Run the Free AI Audit
            </Link>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/40 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/60 transition-all"
            >
              Book a Discovery Call
            </a>
          </div>
        </header>

        {/* Builds (aurora-bathed) */}
        <section className="relative max-w-6xl mx-auto px-6 md:px-8 py-12">
          <AuroraField intensity="subtle" className="rounded-3xl" />
          <div className="relative text-center max-w-3xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-5 block">
              What gets built
            </span>
            <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight">
              {i.buildsHeadline}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {i.builds.map((b) => (
              <article
                key={b.title}
                className="glass-card p-7 hover:border-mustard-500/20 transition-all duration-500"
              >
                <h3 className="font-sans text-lg md:text-xl font-semibold text-white tracking-tight mb-3">
                  {b.title}
                </h3>
                <p className="text-white/60 text-sm font-body font-light leading-7 mb-4">
                  {b.body}
                </p>
                {b.caseStudySlug && (
                  <Link
                    href={`/work/${b.caseStudySlug}`}
                    className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-mustard-400 hover:text-mustard-300 transition-colors"
                  >
                    See the case study
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Featured Receipt */}
        <section className="max-w-5xl mx-auto px-6 md:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-5 block">
              Real receipts
            </span>
            <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight">
              {i.receipt.headline}
            </h2>
          </div>

          <div className="relative glass-card p-8 md:p-12 border-mustard-500/25 overflow-hidden">
            <SnowDrift density="subtle" />
            <div className="relative">
              <div className="mb-6 pb-6 border-b border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/70 font-mono font-bold block mb-2">
                  Featured case study
                </span>
                <h3 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight">
                  {i.receipt.caseStudyTitle}
                </h3>
              </div>

              <p className="text-white/65 text-base md:text-lg font-body font-light leading-relaxed mb-8">
                {i.receipt.body}
              </p>

              {i.receipt.metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {i.receipt.metrics.map((m) => (
                    <div key={m.label} className="p-4 rounded-xl border border-white/[0.06] bg-night-900/30">
                      <span className="text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-mustard-500/70 block mb-2">
                        {m.label}
                      </span>
                      <span className="font-sans text-xl md:text-2xl font-semibold text-white tracking-tight">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href={`/work/${i.receipt.caseStudySlug}`}
                className="inline-flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/40 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/60 transition-all"
              >
                Read the full case study
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-16">
          <div className="glass-card p-8 md:p-12 border-mustard-500/15">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-5 block">
              What this costs
            </span>
            <h2 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight mb-3">
              {i.pricing.typicalRange}
            </h2>
            <p className="text-white/65 text-base font-body font-light leading-7">
              {i.pricing.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/work-with-us"
                className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/40 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/60 transition-all"
              >
                See all engagements
              </Link>
              <Link
                href="/audit"
                className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(255,107,53,0.25)] transition-all"
              >
                Free AI Audit
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-4 block">
              FAQ
            </span>
            <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Common <span className="text-gradient-mustard">questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {i.faqs.map((item) => (
              <details
                key={item.q}
                className="glass-card p-6 group cursor-pointer hover:border-mustard-500/20 transition-all"
              >
                <summary className="flex justify-between items-start gap-4 list-none">
                  <h3 className="font-sans text-base md:text-lg font-semibold text-white/90 tracking-tight">
                    {item.q}
                  </h3>
                  <span className="text-mustard-400 text-2xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none">
                    +
                  </span>
                </summary>
                <p className="text-white/65 text-sm md:text-base font-body font-light leading-7 mt-4">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 py-12 text-center">
          <div className="glass-card p-10 md:p-14 border-mustard-500/20">
            <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight mb-5">
              {i.cta.headline}
            </h2>
            <p className="text-white/65 text-base md:text-lg font-body font-light leading-relaxed mb-8 max-w-2xl mx-auto">
              {i.cta.body}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/audit"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full shadow-[0_0_30px_rgba(255,107,53,0.25)] hover:shadow-[0_0_40px_rgba(255,107,53,0.45)] transition-all"
              >
                Run the Free AI Audit
              </Link>
              <Link
                href="/build-queue"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/40 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/60 transition-all"
              >
                Join the Build Queue
              </Link>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
