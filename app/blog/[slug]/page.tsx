import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import StaticBackground from '@/components/StaticBackground';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
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
        ]}
      />
      <StaticBackground />

      <article className="relative pt-36 md:pt-44 pb-20">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <Link
            href="/blog"
            className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold hover:text-mustard-400 transition-colors"
          >
            &larr; All posts
          </Link>

          <header className="mt-8 mb-12 pb-12 border-b border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {post.meta.tag && (
                <span className="skill-pill text-mustard-400/80 border-mustard-500/30 text-[9px]">
                  {post.meta.tag}
                </span>
              )}
              <span className="text-[10px] text-white/30 font-mono">
                {new Date(post.meta.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-[10px] text-white/30 font-mono">{post.meta.readingTime}</span>
            </div>
            <h1 className="font-sans text-4xl md:text-6xl font-semibold text-white tracking-tight leading-[1.05] mb-6">
              {post.meta.title}
            </h1>
            <p className="text-white/55 text-lg font-body font-light leading-relaxed">
              {post.meta.description}
            </p>
          </header>

          <div className="mdx-prose">
            <MDXRemote
              source={post.body}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>
        </div>
      </article>

      <div className="px-6 md:px-8 pb-28">
        <NewsletterSignup />
      </div>
    </>
  );
}
