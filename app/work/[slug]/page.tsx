import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import StaticBackground from '@/components/StaticBackground';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
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
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Work', url: '/work' },
          { name: study.meta.title, url: `/work/${slug}` },
        ])}
      />
      <StaticBackground />

      <article className="relative pt-36 md:pt-44 pb-20">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <Link
            href="/work"
            className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold hover:text-mustard-400 transition-colors"
          >
            &larr; All work
          </Link>

          <header className="mt-8 mb-12 pb-12 border-b border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {study.meta.tag && (
                <span className="skill-pill text-mustard-400/80 border-mustard-500/30 text-[9px]">
                  {study.meta.tag}
                </span>
              )}
              {study.meta.client && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono">
                  Client: {study.meta.client}
                </span>
              )}
            </div>
            <h1 className="font-sans text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.05] mb-6">
              {study.meta.title}
            </h1>
            <p className="text-white/55 text-lg font-body font-light leading-relaxed mb-8">
              {study.meta.description}
            </p>

            {study.meta.metrics && study.meta.metrics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {study.meta.metrics.map((m) => (
                  <div key={m.label} className="glass-card p-5 text-center">
                    <div className="font-sans text-2xl md:text-3xl font-extrabold text-gradient-mustard tracking-tight">
                      {m.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono font-bold mt-2">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {study.meta.stack && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold mr-2 self-center">
                  Stack
                </span>
                {study.meta.stack.map((s) => (
                  <span key={s} className="skill-pill border-white/[0.08] text-white/50 text-[9px]">
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
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full px-5 py-2.5 hover:bg-mustard-500/10 transition-all"
              >
                View Live
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>
            )}
          </header>

          <div className="mdx-prose">
            <MDXRemote
              source={study.body}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          <div className="mt-16 glass-card p-10 text-center">
            <h3 className="font-sans text-2xl font-extrabold text-white tracking-tight mb-3">
              Want this kind of build for your next venture?
            </h3>
            <p className="text-white/55 text-base font-body font-light mb-6 max-w-md mx-auto">
              Four builds a quarter. Waitlist only.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/build-queue"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(200,164,21,0.2)] transition-all"
              >
                Join the Build Queue
              </Link>
              <Link
                href="/audit"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 transition-all"
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
