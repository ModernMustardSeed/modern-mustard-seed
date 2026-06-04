import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { listContent } from '@/lib/content';

export const metadata = buildMetadata({
  title: 'The Work',
  description:
    'Real products, real receipts. Every build is a shipped product with a defined problem, scope, stack, and outcome.',
  path: '/work',
});

export default function WorkIndex() {
  const studies = listContent('work');

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Work', url: '/work' },
        ])}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
              The Work
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6">
              Real Products{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Real Receipts
              </span>
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto">
              Each case study is a teardown. The problem, the build, the stack, the outcome. What it was. How we built it. What it does now.
            </p>
          </div>

          {studies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
              {studies.map((s) => (
                <Link
                  key={s.slug}
                  href={`/work/${s.slug}`}
                  className="group pop-card p-8 hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="flex items-center gap-3 mb-5">
                    {s.tag && (
                      <span className="text-[8px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-1">
                        {s.tag}
                      </span>
                    )}
                    {s.client && (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/40 font-mono">
                        {s.client}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-2xl font-black text-[#161616] tracking-tight mb-3 leading-snug">
                    {s.title}
                  </h2>
                  <p className="text-[#3a3733] text-sm font-body leading-7 mb-5">
                    {s.description}
                  </p>
                  {s.metrics && (
                    <div className="grid grid-cols-3 gap-3 pt-5 border-t-2 border-[#161616]/10">
                      {s.metrics.slice(0, 3).map((m) => (
                        <div key={m.label}>
                          <div className="font-display text-lg font-black text-[#E0301E]">{m.value}</div>
                          <div className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/40 font-mono mt-1">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#161616]/40 font-body italic mb-12">
              New case studies shipping shortly.
            </p>
          )}

          <div className="text-center pop-card-yellow p-10 max-w-3xl mx-auto">
            <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-4">
              Want this for your venture?
            </h3>
            <p className="text-[#161616]/75 text-base font-body font-medium mb-6 max-w-lg mx-auto">
              Now booking new builds. Drop your idea and Sarah will review it personally.
            </p>
            <Link
              href="/build-queue"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.35)] hover:-translate-y-0.5 transition-all"
            >
              Join the Build Queue
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
