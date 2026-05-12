import Link from 'next/link';
import { listContent } from '@/lib/content';

export default function BlogTeaser() {
  const posts = listContent('blog').slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section id="insights" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      <div className="flex justify-center mb-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          Insights
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-semibold text-white tracking-tight mb-6">
          Thinking Out <span className="text-gradient-mustard">Loud</span>
        </h2>
        <p className="text-white/50 text-base md:text-lg font-body font-light leading-relaxed">
          Lessons from the frontlines of building AI products, shipping fast, and businesses that move at the speed of faith.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group glass-card p-6 md:p-8 hover:border-mustard-500/20 transition-all duration-500 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              {post.tag && (
                <span className="skill-pill text-mustard-400/70 border-mustard-500/20 text-[8px]">
                  {post.tag}
                </span>
              )}
              <span className="text-[10px] text-white/25 font-mono">
                {new Date(post.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            <h3 className="font-sans text-base md:text-lg font-bold text-white/85 group-hover:text-white tracking-wide mb-3 leading-snug transition-colors">
              {post.title}
            </h3>

            <p className="text-white/40 text-sm font-body font-light leading-6 mb-4">
              {post.description}
            </p>

            <span className="text-[9px] uppercase tracking-[0.2em] text-mustard-500/40 font-mono font-bold group-hover:text-mustard-500/70 transition-colors">
              {post.readingTime}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex justify-center mt-12">
        <Link
          href="/blog"
          className="group inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white/40 hover:text-mustard-400 transition-colors"
        >
          Read All Posts
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
