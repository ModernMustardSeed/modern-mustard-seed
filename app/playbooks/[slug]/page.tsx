import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import StaticBackground from '@/components/StaticBackground';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd, howToJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { getAllSlugs, getContent } from '@/lib/content';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getAllSlugs('playbooks').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const pb = getContent('playbooks', slug);
  if (!pb) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: pb.meta.title,
    description: pb.meta.description,
    path: `/playbooks/${slug}`,
  });
}

export default async function PlaybookPage({ params }: { params: Params }) {
  const { slug } = await params;
  const pb = getContent('playbooks', slug);
  if (!pb) notFound();

  return (
    <>
      <JsonLd
        data={[
          howToJsonLd({
            title: pb.meta.title,
            description: pb.meta.description,
            slug,
            date: pb.meta.date,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Playbooks', url: '/playbooks' },
            { name: pb.meta.title, url: `/playbooks/${slug}` },
          ]),
        ]}
      />
      <StaticBackground />

      <article className="relative pt-36 md:pt-44 pb-20">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <Link
            href="/playbooks"
            className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold hover:text-mustard-400 transition-colors"
          >
            &larr; All playbooks
          </Link>

          <header className="mt-8 mb-12 pb-12 border-b border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {pb.meta.tag && (
                <span className="skill-pill text-mustard-400/80 border-mustard-500/30 text-[9px]">
                  {pb.meta.tag}
                </span>
              )}
              <span className="text-[10px] text-white/30 font-mono">{pb.meta.readingTime}</span>
            </div>
            <h1 className="font-sans text-4xl md:text-6xl font-semibold text-white tracking-tight leading-[1.05] mb-6">
              {pb.meta.title}
            </h1>
            <p className="text-white/55 text-lg font-body font-light leading-relaxed">
              {pb.meta.description}
            </p>
          </header>

          <div className="mdx-prose">
            <MDXRemote
              source={pb.body}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>
        </div>
      </article>

      <div className="px-6 md:px-8 pb-28">
        <NewsletterSignup
          headline="Get the next playbook in your inbox."
          subhead="One email per drop. No fluff. Subscribers get PDFs of every playbook."
        />
      </div>
    </>
  );
}
