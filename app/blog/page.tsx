import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { listContent } from '@/lib/content';

export const metadata = buildMetadata({
  title: 'Blog',
  description:
    'Playbooks, case studies, and lessons from shipping AI products solo. New posts most weeks.',
  path: '/blog',
});

export default function BlogIndex() {
  const posts = listContent('blog');

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Blog', url: '/blog' },
        ])}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
              Insights
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6">
              Thinking Out{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Loud
              </span>
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto">
              Real plays from the frontlines of building AI products solo. Tools, tactics, and the occasional war story.
            </p>
          </div>

          {posts.length === 0 ? (
            <p className="text-center text-[#161616]/40 font-body italic">
              First posts shipping shortly. Subscribe below to be notified.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group pop-card p-8 hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {post.tag && (
                      <span className="text-[8px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-1">
                        {post.tag}
                      </span>
                    )}
                    <span className="text-[10px] text-[#161616]/40 font-mono">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] text-[#161616]/40 font-mono">
                      {post.readingTime}
                    </span>
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-3 leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-20">
            <NewsletterSignup />
          </div>
        </div>
      </div>
    </>
  );
}
