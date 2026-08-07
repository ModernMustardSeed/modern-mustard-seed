import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import RoadmapDocument from '@/components/RoadmapDocument';
import { bumpViews, getRoadmapBySlug } from '@/lib/roadmap-store';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

/**
 * A roadmap's permanent home.
 *
 * Server-rendered in full so the document is crawlable, quotable by AI search,
 * and readable with JavaScript off. Featured roadmaps (ours, the worked
 * examples) are indexable; a visitor's own roadmap is noindex, because their
 * business analysis is theirs, not SEO inventory.
 */

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getRoadmapBySlug(slug);
  if (!row) return buildMetadata({ title: 'Roadmap not found', noindex: true });

  return buildMetadata({
    title: `Scaling Roadmap: ${row.business_name ?? row.host}`,
    description:
      row.headline ??
      `A personalized scaling roadmap for ${row.host}: the constraint capping growth, the offer to sell instead, and twelve months in four phases.`,
    path: `/scaling-roadmap/r/${row.slug}`,
    noindex: !row.featured,
  });
}

export default async function RoadmapSharePage({ params }: Props) {
  const { slug } = await params;
  const row = await getRoadmapBySlug(slug);
  if (!row) notFound();

  // Best effort, never blocking, never a reason to fail a render.
  void bumpViews(row.id);

  return (
    <>
      {row.featured && (
        <JsonLd
          data={[
            breadcrumbJsonLd([
              { name: 'Home', url: '/' },
              { name: 'Scaling Roadmap', url: '/scaling-roadmap' },
              { name: row.business_name ?? row.host, url: `/scaling-roadmap/r/${row.slug}` },
            ]),
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              '@id': `${SITE.url}/scaling-roadmap/r/${row.slug}#article`,
              headline: `Scaling Roadmap: ${row.business_name ?? row.host}`,
              description: row.headline ?? '',
              datePublished: row.created_at,
              dateModified: row.updated_at,
              author: { '@id': `${SITE.url}/#sarah` },
              publisher: { '@id': `${SITE.url}/#organization` },
              mainEntityOfPage: `${SITE.url}/scaling-roadmap/r/${row.slug}`,
              inLanguage: 'en-US',
            },
          ]}
        />
      )}

      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-32 md:pt-40 pb-24">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          <RoadmapDocument
            report={row.report}
            host={row.host}
            url={row.url}
            generatedAt={row.created_at}
          />

          {/* Run your own */}
          <section className="mt-16 pop-card-yellow p-8 md:p-12 text-center">
            <span className="block text-[10px] uppercase tracking-[0.45em] text-[#161616] font-mono font-bold mb-5">
              Your turn
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-4">
              Run one for{' '}
              <span className="text-white" style={{ WebkitTextStroke: '2px #161616' }}>
                your business
              </span>
            </h2>
            <p className="text-[#161616]/80 text-base md:text-lg font-body font-medium leading-relaxed mb-7 max-w-2xl mx-auto">
              Free, ninety seconds, no signup. Drop your website and get the same document written
              against your business.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/scaling-roadmap"
                className="px-7 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-xl border-2 border-[#161616] hover:-translate-y-0.5 transition-all"
              >
                Build my roadmap
              </Link>
              <Link
                href="/book"
                className="px-7 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-xl border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a free call
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
