import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { JsonLd, breadcrumbJsonLd, caseStudyJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { getAllSlugs, getContent } from '@/lib/content';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getAllSlugs('work').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const study = getContent('work', slug);
  if (!study) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: study.meta.title,
    description: study.meta.description,
    path: `/work/${slug}`,
  });
}

export default async function WorkDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const study = getContent('work', slug);
  if (!study) notFound();

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
      <article className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-20">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 md:px-8">
          <Link
            href="/work"
            className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold hover:text-[#161616] transition-colors"
          >
            &larr; All work
          </Link>

          <header className="mt-8 mb-12 pb-12 border-b-2 border-[#161616]/10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {study.meta.tag && (
                <span className="text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-1">
                  {study.meta.tag}
                </span>
              )}
              {study.meta.client && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/40 font-mono">
                  Client: {study.meta.client}
                </span>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.05] mb-6">
              {study.meta.title}
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed mb-8">
              {study.meta.description}
            </p>

            {study.meta.metrics && study.meta.metrics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {study.meta.metrics.map((m) => (
                  <div key={m.label} className="pop-card p-5 text-center">
                    <div className="font-display text-2xl md:text-3xl font-black text-[#E0301E] tracking-tight">
                      {m.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/45 font-mono font-bold mt-2">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {study.meta.stack && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mr-2 self-center">
                  Stack
                </span>
                {study.meta.stack.map((s) => (
                  <span key={s} className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full px-2.5 py-1">
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
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-5 py-2.5 shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                View Live
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>
            )}
          </header>

          <div className="mdx-prose mdx-prose-pop">
            <MDXRemote
              source={study.body}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          <div className="mt-16 pop-card-yellow p-10 text-center">
            <h3 className="font-display text-2xl font-black text-[#161616] tracking-tight mb-3">
              Want this kind of build for your next venture?
            </h3>
            <p className="text-[#161616]/75 text-base font-body font-medium mb-6 max-w-md mx-auto">
              Now booking new builds. Yours, fully.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/build-queue"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Join the Build Queue
              </Link>
              <Link
                href="/audit"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Run Free AI Audit
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
