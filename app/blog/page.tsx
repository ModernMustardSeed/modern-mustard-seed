import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
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
      <StaticBackground />

      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
              Insights
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6">
              Thinking Out <span className="text-gradient-mustard">Loud</span>
            </h1>
            <p className="text-white/55 text-lg font-body font-light leading-relaxed max-w-2xl mx-auto">
              Real plays from the frontlines of building AI products solo. Tools, tactics, and the occasional war story.
            </p>
          </div>

          {posts.length === 0 ? (
            <p className="text-center text-white/40 font-body italic">
              First posts shipping shortly. Subscribe below to be notified.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group glass-card p-8 hover:border-mustard-500/20 transition-all duration-500"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {post.tag && (
                      <span className="skill-pill text-mustard-400/70 border-mustard-500/20 text-[8px]">
                        {post.tag}
                      </span>
                    )}
                    <span className="text-[10px] text-white/25 font-mono">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] text-white/25 font-mono">
                      {post.readingTime}
                    </span>
                  </div>
                  <h2 className="font-sans text-xl md:text-2xl font-bold text-white/90 group-hover:text-white tracking-wide mb-3 leading-snug transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-white/45 text-sm md:text-base font-body font-light leading-7">
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
