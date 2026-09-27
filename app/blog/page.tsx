import Link from '@/components/AttributionLink';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { listContent } from '@/lib/content';
import PopPageHero from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: 'Blog',
  description:
    'Playbooks, case studies, and lessons from shipping agentic products solo. New posts most weeks.',
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
      <div className="relative min-h-screen bg-[#f1ede4] text-[#0d0d0d]">
        <PopPageHero
          eyebrow={<span>Insights</span>}
          title={<>Thinking Out{' '}<em>Loud</em></>}
          issue={{ no: 'No.7', lines: ['The journal', 'New posts most weeks'] }}
          art={{
            src: '/art/pages/blog',
            alt: 'Graffiti couture painting: Mr. Mustard sits cross-legged on the hood of a mustard-yellow classic convertible, typing on a vintage typewriter under a graffiti-painted bridge as blank pages drift by',
            caption: 'Hot off the typewriter',
          }}
          sticker="Idea!"
          mascot={{ bubble: 'Fresh off the press!' }}
        >
          <p>
            Real plays from the frontlines of building agentic products solo. Tools, tactics, and the occasional war story.
          </p>
        </PopPageHero>
      <div className="relative pt-16 md:pt-20 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          {posts.length === 0 ? (
            <p className="text-center text-[#0d0d0d]/40 font-body italic">
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
                      <span className="text-[8px] uppercase tracking-[0.18em] font-mono font-bold text-[#0d0d0d] bg-[#ffd400] border-2 border-[#0d0d0d] rounded-full px-2.5 py-1">
                        {post.tag}
                      </span>
                    )}
                    <span className="text-[10px] text-[#0d0d0d]/40 font-mono">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] text-[#0d0d0d]/40 font-mono">
                      {post.readingTime}
                    </span>
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-black text-[#0d0d0d] tracking-tight mb-3 leading-snug">
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
      </div>
    </>
  );
}
