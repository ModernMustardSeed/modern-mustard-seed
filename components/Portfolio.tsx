import Link from 'next/link';
import { projects } from '@/data/projects';

type Props = {
  limit?: number;
  showHeader?: boolean;
};

export default function Portfolio({ limit, showHeader = true }: Props) {
  const items = limit ? projects.slice(0, limit) : projects;

  return (
    <section id="portfolio" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      {showHeader && (
        <>
          <div className="flex justify-center mb-20">
            <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-end justify-between max-w-6xl mx-auto mb-16">
            <div>
              <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
                The Collection
              </span>
              <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Ideas Brought to <span className="text-gradient-mustard">Life</span>
              </h2>
            </div>
            <span className="hidden md:block text-[10px] uppercase tracking-[0.3em] text-white/20 font-mono font-bold mt-4 md:mt-0">
              {items.length} of 40+ Products
            </span>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {items.map((project, i) => {
          const inner = (
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${project.color} group-hover:opacity-80 transition-opacity duration-500`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute top-4 right-4">
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/15 font-mono">
                  No. {String(i + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="relative z-10 p-5 md:p-6">
                <h3 className="font-sans text-lg font-bold text-white group-hover:text-mustard-100 tracking-wide mb-1.5 transition-colors duration-500">
                  {project.title}
                </h3>
                <p className="text-white/40 text-xs font-body font-light leading-relaxed mb-4 group-hover:text-white/55 transition-colors duration-500">
                  {project.subtitle}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="skill-pill border-white/[0.08] text-white/30 text-[8px] group-hover:border-mustard-500/20 group-hover:text-mustard-400/60 transition-all duration-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-mustard-400 font-sans font-bold">
                    {project.caseStudySlug ? 'Read Case Study' : 'View Live'}
                  </span>
                  <svg className="w-3.5 h-3.5 text-mustard-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </div>
              </div>
            </>
          );

          const sharedClasses =
            'group relative flex flex-col justify-end aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.04] hover:border-mustard-500/20 transition-all duration-500';

          return project.caseStudySlug ? (
            <Link key={project.title} href={`/case-studies/${project.caseStudySlug}`} className={sharedClasses}>
              {inner}
            </Link>
          ) : (
            <a
              key={project.title}
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className={sharedClasses}
            >
              {inner}
            </a>
          );
        })}
      </div>

      {!limit && (
        <>
          <p className="text-center text-white/20 mt-12 text-sm font-body font-light italic max-w-2xl mx-auto">
            Plus: CXC Design Studio, Glacier Landing, Good Company, AI Deal Analyzer, PTG Deal Assistant, Wild Hope Ranch and Homes, Miracle Witness Network, D&amp;D Landscaping, Roar Coffee, and more.
          </p>

          <div className="flex justify-center mt-10">
            <Link
              href="/case-studies"
              className="group inline-flex items-center gap-3 border border-mustard-500/20 hover:border-mustard-500/40 px-8 py-4 rounded-full transition-all duration-500 hover:bg-mustard-500/5"
            >
              <span className="text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white/40 group-hover:text-mustard-400 transition-colors">
                Read the Case Studies
              </span>
              <svg className="w-4 h-4 text-mustard-400/40 group-hover:text-mustard-400 group-hover:translate-x-1 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
