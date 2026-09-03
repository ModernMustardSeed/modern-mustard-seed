import type { PartnerGuide } from '@/lib/partner-guide';

/**
 * Renders a partner's field guide. No hooks and no server-only imports, so the
 * same markup serves the partner's page (a server component) and the admin
 * panel under their row (a client component).
 */
export default function FieldGuide({ guide, compact = false }: { guide: PartnerGuide; compact?: boolean }) {
  const updated = new Date(guide.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div className="text-[#161616]">
      {!compact && (
        <header className="mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">Field guide</span>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.02] mb-3">{guide.title}</h1>
          {guide.subtitle && <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/60">{guide.subtitle}</p>}
          <p className="font-body text-lg leading-relaxed mt-5 max-w-2xl">{guide.intro}</p>
        </header>
      )}
      {compact && <p className="font-body text-sm leading-relaxed mb-5 max-w-3xl">{guide.intro}</p>}

      <div className={compact ? 'grid gap-5' : 'grid gap-8'}>
        {guide.sections.map((s) => (
          <section key={s.heading} className={`bg-white border-2 border-[#161616] rounded-2xl ${compact ? 'p-4 shadow-[3px_3px_0_0_#161616]' : 'p-6 md:p-7 shadow-[5px_5px_0_0_#161616]'}`}>
            <h2 className={`font-display font-semibold ${compact ? 'text-lg' : 'text-2xl'} mb-1`}>{s.heading}</h2>
            {s.blurb && <p className={`font-body text-[#161616]/75 ${compact ? 'text-[13px]' : 'text-[15px]'} mb-4`}>{s.blurb}</p>}
            <ol className="grid gap-3.5 mt-3">
              {s.items.map((it) => (
                <li key={it.title} className="grid sm:grid-cols-[minmax(0,1fr)] border-t border-[#161616]/10 pt-3.5 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className={`font-sans font-bold ${compact ? 'text-[14px]' : 'text-[16px]'}`}>
                      {it.url ? (
                        <a href={it.url} target="_blank" rel="noopener noreferrer" className="underline decoration-[#F5B700] decoration-2 underline-offset-2 hover:decoration-[#161616]">{it.title}</a>
                      ) : it.title}
                    </h3>
                    {it.when && <span className="inline-block bg-[#F5B700] border border-[#161616] rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] font-mono font-bold whitespace-nowrap">{it.when}</span>}
                    {it.where && <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-[#161616]/55">{it.where}</span>}
                  </div>
                  <p className={`font-body text-[#161616]/85 leading-relaxed mt-1 ${compact ? 'text-[13px]' : 'text-[15px]'}`}>{it.detail}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/45 mt-6">Updated {updated}</p>
    </div>
  );
}
