import Link from '@/components/AttributionLink';
import EditorialByline from '@/components/EditorialByline';
import CaseStudyEvidence from '@/components/CaseStudyEvidence';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { JsonLd, breadcrumbJsonLd, caseStudyJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { getAllSlugs, getContent } from '@/lib/content';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getAllSlugs('work').filter((slug) => !getContent('work', slug)?.meta.draft).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const study = getContent('work', slug);
  if (!study || study.meta.draft) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: study.meta.title,
    description: study.meta.description,
    path: `/work/${slug}`,
    article: { published: study.meta.date, modified: study.meta.dateModified },
  });
}

export default async function WorkDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const study = getContent('work', slug);
  if (!study || study.meta.draft) notFound();

  return (
    <>
      <JsonLd
        data={[
          caseStudyJsonLd({
            title: study.meta.title,
            description: study.meta.description,
            slug,
            date: study.meta.date,
            dateModified: study.meta.dateModified,
            client: study.meta.client,
            stack: study.meta.stack,
            wordCount: study.meta.wordCount,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Work', url: '/work' },
            { name: study.meta.title, url: `/work/${slug}` },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#f6efe0] text-[#14110c] pb-20 overflow-x-clip">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <PopPageHero
          eyebrow={
            <>
              <Link href="/work" className={pop.back}>
                &larr; All work
              </Link>
              {study.meta.tag && <span className={pop.pill}>{study.meta.tag}</span>}
            </>
          }
          title={study.meta.title}
          mascot={{ bubble: 'Case closed!' }}
        >
          {study.meta.client && (
            <p className={pop.note}>
              <span className="font-mono">Client: {study.meta.client}</span>
            </p>
          )}
          <p className="mb-8">
            {study.meta.description}
          </p>

            {study.meta.metrics && study.meta.metrics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {study.meta.metrics.map((m) => (
                  <div key={m.label} className="pop-card min-w-0 p-5 text-center">
                    <div className="font-display text-xl sm:text-2xl md:text-3xl font-black leading-tight text-[#8f1d22] tracking-tight break-words hyphens-auto">
                      {m.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#14110c]/45 font-mono font-bold mt-2 break-words">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {study.meta.stack && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#8f1d22] font-mono font-bold mr-2 self-center">
                  Stack
                </span>
                {study.meta.stack.map((s) => (
                  <span key={s} className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#14110c] bg-white border-2 border-[#14110c] rounded-full px-2.5 py-1">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {study.meta.liveUrl && (
              <a
                href={study.meta.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#14110c] bg-[#f5b700] border-2 border-[#14110c] rounded-full px-5 py-2.5 shadow-[3px_3px_0_0_#14110c] hover:-translate-y-0.5 transition-all"
              >
                View Live
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>
            )}
            <EditorialByline author={study.meta.author} date={study.meta.date} modified={study.meta.dateModified} />
        </PopPageHero>
        <div className="relative max-w-4xl mx-auto px-6 md:px-8 pt-6 md:pt-10">

          <CaseStudyEvidence evidence={study.meta.evidence} />
          <div className="mdx-prose mdx-prose-pop">
            <MDXRemote
              source={study.body}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          <div className="mt-16 pop-card-yellow p-10 text-center">
            <h3 className="font-display text-2xl font-black text-[#14110c] tracking-tight mb-3">
              Want this kind of build for your next venture?
            </h3>
            <p className="text-[#14110c]/75 text-base font-body font-medium mb-6 max-w-md mx-auto">
              Now booking new builds. Yours, fully.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/book"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#14110c] rounded-full border-2 border-[#14110c] shadow-[4px_4px_0_0_rgba(20,17,12,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Book a Free Call
              </Link>
              <Link
                href="/audit"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#14110c] bg-white rounded-full border-2 border-[#14110c] shadow-[4px_4px_0_0_#14110c] hover:-translate-y-0.5 transition-all"
              >
                Run the Bottleneck Breaker
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
