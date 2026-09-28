import type { PartnerGuide } from '@/lib/partner-guide';
import { withAuditSection } from '@/lib/presence-audit-links';

/**
 * Renders a partner's field guide. No hooks and no server-only imports, so the
 * same markup serves the partner's page (a server component) and the admin
 * panel under their row (a client component).
 *
 * Every guide renders with "The free audit to hand out" after its opening
 * section, carrying the partner's own audit link. It is added here rather than
 * stored, so every partner has it without a re-seed of app_state.
 */
export default function FieldGuide({ guide: stored, compact = false }: { guide: PartnerGuide; compact?: boolean }) {
  const guide = withAuditSection(stored);
  const updated = new Date(guide.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div className="text-[#0b3b44]">
      {!compact && (
        <header className="mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#0a7c78] font-mono font-bold block mb-2">Field guide</span>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.02] mb-3">{guide.title}</h1>
          {guide.subtitle && <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#0b3b44]/60">{guide.subtitle}</p>}
          <p className="font-body text-lg leading-relaxed mt-5 max-w-2xl">{guide.intro}</p>
        </header>
      )}
      {compact && <p className="font-body text-sm leading-relaxed mb-5 max-w-3xl">{guide.intro}</p>}

      <div className={compact ? 'grid gap-5' : 'grid gap-8'}>
        {guide.sections.map((s) => (
          <section key={s.heading} className={`bg-white border-2 border-[#0b3b44] rounded-2xl ${compact ? 'p-4 shadow-[3px_3px_0_0_#0b3b44]' : 'p-6 md:p-7 shadow-[5px_5px_0_0_#0b3b44]'}`}>
            <h2 className={`font-display font-semibold ${compact ? 'text-lg' : 'text-2xl'} mb-1`}>{s.heading}</h2>
            {s.blurb && <p className={`font-body text-[#0b3b44]/75 ${compact ? 'text-[13px]' : 'text-[15px]'} mb-4`}>{s.blurb}</p>}
            <ol className="grid gap-3.5 mt-3">
              {s.items.map((it) => (
                <li key={it.title} className="grid sm:grid-cols-[minmax(0,1fr)] border-t border-[#0b3b44]/10 pt-3.5 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className={`font-sans font-bold ${compact ? 'text-[14px]' : 'text-[16px]'}`}>
                      {it.url ? (
                        <a href={it.url} target="_blank" rel="noopener noreferrer" className="underline decoration-[#f5b700] decoration-2 underline-offset-2 hover:decoration-[#0b3b44]">{it.title}</a>
                      ) : it.title}
                    </h3>
                    {it.when && <span className="inline-block bg-[#f5b700] border border-[#0b3b44] rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] font-mono font-bold whitespace-nowrap">{it.when}</span>}
                    {it.where && <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-[#0b3b44]/55">{it.where}</span>}
                  </div>
                  <p className={`font-body text-[#0b3b44]/85 leading-relaxed mt-1 [overflow-wrap:anywhere] ${compact ? 'text-[13px]' : 'text-[15px]'}`}>{it.detail}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0b3b44]/45 mt-6">Updated {updated}</p>
    </div>
  );
}
