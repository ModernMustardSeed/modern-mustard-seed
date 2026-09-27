import Link from '@/components/AttributionLink';
import EditorialByline from '@/components/EditorialByline';
import { AI_RESOURCE_SLUGS } from '@/data/ai-resources';
import { listContent } from '@/lib/content';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, blogPostingJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { getAllSlugs, getContent } from '@/lib/content';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getAllSlugs('blog').filter((slug) => !getContent('blog', slug)?.meta.draft).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getContent('blog', slug);
  if (!post || post.meta.draft) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: post.meta.title,
    description: post.meta.description,
    path: `/blog/${slug}`,
    article: { published: post.meta.date, modified: post.meta.dateModified },
  });
}

export default async function BlogPost({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getContent('blog', slug);
  if (!post || post.meta.draft) notFound();

  const related = listContent('blog').filter((p) => p.slug !== slug && AI_RESOURCE_SLUGS.some((key) => key === p.slug)).slice(0, 3);

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
      <article className="relative min-h-screen bg-[#f1ede4] text-[#0d0d0d] pb-20 overflow-x-clip">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <PopPageHero
          eyebrow={
            <>
              <Link href="/blog" className={pop.back}>
                &larr; All posts
              </Link>
              {post.meta.tag && <span className={pop.pill}>{post.meta.tag}</span>}
            </>
          }
          title={post.meta.title}
          mascot={{ bubble: 'Pull up a chair!' }}
        >
          <p className={pop.note}>
            <span className="font-mono">
              {new Date(post.meta.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>{' '}
            · <span className="font-mono">{post.meta.readingTime}</span>
          </p>
          <p>
            {post.meta.description}
          </p>
          <EditorialByline author={post.meta.author} date={post.meta.date} modified={post.meta.dateModified} />
        </PopPageHero>
        <div className="relative max-w-3xl mx-auto px-6 md:px-8 pt-6 md:pt-10">

          <div className="mdx-prose mdx-prose-pop">
            <MDXRemote
              source={post.body}
              components={{ a: ({ href = '', children }) => href.startsWith('/')
                ? <Link href={href}>{children}</Link>
                : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          <section className="mt-14 pop-card-yellow p-7">
            <h2 className="font-display text-2xl font-bold">Put the field notes to work.</h2>
            <p className="mt-4 leading-relaxed"><Link href="/agentic-websites" className="underline font-bold">Explore our agentic websites</Link>, <Link href="/work" className="underline font-bold">see the work</Link>, or <Link href="/book" className="underline font-bold">talk with Sarah</Link> about your business.</p>
            <ul className="mt-5 space-y-3">{related.map((p) => <li key={p.slug}><Link href={`/blog/${p.slug}`} className="underline font-bold">{p.title}</Link></li>)}</ul>
            <Link href="/resources" className="mt-5 inline-block underline font-bold">All Answer Engine Field Notes</Link>
          </section>

          {/* Visible FAQ, rendered from the same frontmatter that feeds the
              FAQPage schema, so markup and page content never drift apart. */}
          {post.meta.faq && post.meta.faq.length > 0 && (
            <section className="mt-14 pt-10 border-t-2 border-[#0d0d0d]/10">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#d0241b] font-mono font-bold block mb-6">
                Questions, answered
              </span>
              <div className="space-y-5">
                {post.meta.faq.map((f) => (
                  <div key={f.q} className="bg-white border-2 border-[#0d0d0d] rounded-2xl shadow-[4px_4px_0_0_#0d0d0d] p-6">
                    <h2 className="font-sans text-lg font-bold text-[#0d0d0d] mb-2">{f.q}</h2>
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
