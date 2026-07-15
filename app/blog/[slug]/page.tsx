import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, blogPostingJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { getAllSlugs, getContent } from '@/lib/content';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getAllSlugs('blog').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getContent('blog', slug);
  if (!post) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: post.meta.title,
    description: post.meta.description,
    path: `/blog/${slug}`,
  });
}

export default async function BlogPost({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getContent('blog', slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd
        data={[
          blogPostingJsonLd({
            title: post.meta.title,
            description: post.meta.description,
            slug,
            date: post.meta.date,
            dateModified: post.meta.dateModified,
            author: post.meta.author,
            wordCount: post.meta.wordCount,
            keywords: post.meta.tag ? [post.meta.tag] : undefined,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Blog', url: '/blog' },
            { name: post.meta.title, url: `/blog/${slug}` },
          ]),
          // Posts that carry FAQ frontmatter also answer as a FAQPage (GEO:
          // AI engines lift clean question-answer pairs far more readily).
          ...(post.meta.faq?.length ? [faqJsonLd(post.meta.faq)] : []),
        ]}
      />
      <article className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-20">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-8">
          <Link
            href="/blog"
            className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold hover:text-[#161616] transition-colors"
          >
            &larr; All posts
          </Link>

          <header className="mt-8 mb-12 pb-12 border-b-2 border-[#161616]/10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {post.meta.tag && (
                <span className="text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-1">
                  {post.meta.tag}
                </span>
              )}
              <span className="text-[10px] text-[#161616]/40 font-mono">
                {new Date(post.meta.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-[10px] text-[#161616]/40 font-mono">{post.meta.readingTime}</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.05] mb-6">
              {post.meta.title}
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed">
              {post.meta.description}
            </p>
          </header>

          <div className="mdx-prose mdx-prose-pop">
            <MDXRemote
              source={post.body}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          {/* Visible FAQ, rendered from the same frontmatter that feeds the
              FAQPage schema, so markup and page content never drift apart. */}
          {post.meta.faq && post.meta.faq.length > 0 && (
            <section className="mt-14 pt-10 border-t-2 border-[#161616]/10">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-6">
                Questions, answered
              </span>
              <div className="space-y-5">
                {post.meta.faq.map((f) => (
                  <div key={f.q} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                    <h2 className="font-sans text-lg font-bold text-[#161616] mb-2">{f.q}</h2>
                    <p className="text-[#3a3733] font-body leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>

      <div className="px-6 md:px-8 pb-28">
        <NewsletterSignup />
      </div>
    </>
  );
}
