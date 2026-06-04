import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
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
            dateModified: pb.meta.dateModified,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Playbooks', url: '/playbooks' },
            { name: pb.meta.title, url: `/playbooks/${slug}` },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-20">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-8">
          <Link
            href="/playbooks"
            className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold hover:text-[#161616] transition-colors"
          >
            &larr; All playbooks
          </Link>

          <header className="mt-8 mb-12 pb-12 border-b-2 border-[#161616]/10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {pb.meta.tag && (
                <span className="text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-1">
                  {pb.meta.tag}
                </span>
              )}
              <span className="text-[10px] text-[#161616]/40 font-mono">{pb.meta.readingTime}</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.05] mb-6">
              {pb.meta.title}
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed">
              {pb.meta.description}
            </p>
          </header>

          <div className="mdx-prose mdx-prose-pop">
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
