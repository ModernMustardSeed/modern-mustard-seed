import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { listContent } from '@/lib/content';
import { projects } from '@/data/projects';

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
      <StaticBackground />

      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
              The Work
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
              Real Products. <span className="text-gradient-mustard">Real Receipts.</span>
            </h1>
            <p className="text-white/55 text-lg font-body font-light leading-relaxed max-w-2xl mx-auto">
              Each case study is a teardown. The problem, the build, the stack, the outcome. What it was. How we built it. What it does now.
            </p>
          </div>

          {studies.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
              {studies.map((s) => (
                <Link
                  key={s.slug}
                  href={`/work/${s.slug}`}
                  className="group glass-card p-8 hover:border-mustard-500/20 transition-all duration-500"
                >
                  <div className="flex items-center gap-3 mb-5">
                    {s.tag && (
                      <span className="skill-pill text-mustard-400/70 border-mustard-500/20 text-[8px]">
                        {s.tag}
                      </span>
                    )}
                    {s.client && (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono">
                        {s.client}
                      </span>
                    )}
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-white/90 group-hover:text-white tracking-wide mb-3 leading-snug transition-colors">
                    {s.title}
                  </h2>
                  <p className="text-white/45 text-sm font-body font-light leading-7 mb-5">
                    {s.description}
                  </p>
                  {s.metrics && (
                    <div className="grid grid-cols-3 gap-3 pt-5 border-t border-white/[0.05]">
                      {s.metrics.slice(0, 3).map((m) => (
                        <div key={m.label}>
                          <div className="font-sans text-lg font-bold text-gradient-mustard">{m.value}</div>
                          <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-mono mt-1">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          <div className="mb-12">
            <h2 className="font-sans text-2xl font-extrabold text-white tracking-tight mb-3 text-center">
              The Full Portfolio
            </h2>
            <p className="text-white/40 text-sm font-body font-light text-center mb-8 max-w-xl mx-auto">
              Live products. Public deployments. Click through.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p) => (
                <a
                  key={p.title}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-5 border border-white/[0.04] rounded-xl hover:border-mustard-500/20 transition-all"
                >
                  <h3 className="font-sans text-base font-bold text-white/90 group-hover:text-white mb-1">
                    {p.title}
                  </h3>
                  <p className="text-white/40 text-xs font-body font-light leading-relaxed mb-3">
                    {p.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span key={t} className="skill-pill border-white/[0.06] text-white/30 text-[8px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
