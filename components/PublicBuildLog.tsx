'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { BuildLogSnapshot, Category } from '@/lib/build-log';

/**
 * Public, aggregate-only view of the Build Log. Renders counts and totals from a
 * frozen snapshot. Never shows commit messages, so no client names or internal
 * detail is exposed. MMS pop-art cabin styling.
 */

const CAT_META: Record<Category, { label: string; fg: string }> = {
  new: { label: 'New', fg: '#2E7D4F' },
  fix: { label: 'Fix', fg: '#1E50C8' },
  perf: { label: 'Perf', fg: '#B4501F' },
  polish: { label: 'Polish', fg: '#4F6272' },
  docs: { label: 'Docs', fg: '#2E6274' },
  access: { label: 'Access', fg: '#8F6600' },
  revert: { label: 'Revert', fg: '#C4160B' },
  note: { label: 'Note', fg: '#5A594F' },
};

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MOS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function partsOf(s: string) { const [y, m, d] = s.split('-').map(Number); return { y, m: m - 1, d }; }
function intensity(n: number) { if (n >= 25) return 0.6; if (n >= 15) return 0.42; if (n >= 7) return 0.26; if (n >= 1) return 0.12; return 0; }

const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold';

export default function PublicBuildLog({ snap }: { snap: BuildLogSnapshot }) {
  const { totals, projectTotals, catTotals, dayCounts, minDate, maxDate, publishedAt } = snap;

  const [selected, setSelected] = useState(maxDate || '');
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const p = partsOf(maxDate || minDate || ymd(2026, 6, 15));
    return { y: p.y, m: p.m };
  });

  const range = useMemo(() => {
    if (!minDate || !maxDate) return '';
    const a = partsOf(minDate), b = partsOf(maxDate);
    const bLabel = MOS[b.m] === MOS[a.m] ? `${b.d}` : `${MOS[b.m]} ${b.d}`;
    return `${MOS[a.m]} ${a.d} – ${bLabel}, ${b.y}`;
  }, [minDate, maxDate]);

  const asOf = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      }).format(new Date(publishedAt));
    } catch { return ''; }
  }, [publishedAt]);

  const recent = useMemo(() => Object.keys(dayCounts).sort().slice(-14), [dayCounts]);
  const veloMax = Math.max(1, ...recent.map((d) => dayCounts[d].total));
  const projMax = Math.max(1, ...projectTotals.map((p) => p[1]));

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const dim = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const minMonth = minDate ? partsOf(minDate) : view;
  const maxMonth = maxDate ? partsOf(maxDate) : view;
  const atMin = view.y < minMonth.y || (view.y === minMonth.y && view.m <= minMonth.m);
  const atMax = view.y > maxMonth.y || (view.y === maxMonth.y && view.m >= maxMonth.m);
  const stepMonth = (dir: number) => setView((v) => {
    const m = v.m + dir;
    if (m < 0) return { y: v.y - 1, m: 11 };
    if (m > 11) return { y: v.y + 1, m: 0 };
    return { y: v.y, m };
  });

  const selDay = selected ? dayCounts[selected] : undefined;
  const sp = selected ? partsOf(selected) : null;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      {/* public header */}
      <header className="border-b-2 border-[#161616] bg-[#FBF6EA]">
        <div className="max-w-5xl mx-auto px-5 md:px-6 py-4 flex items-center justify-between gap-3">
          <a href="https://modernmustardseed.com" className="flex items-center gap-2.5" rel="noopener noreferrer">
            <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-9 w-auto" priority />
            <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold">Modern Mustard Seed</span>
          </a>
          <a href="https://modernmustardseed.com"
            className="text-[11px] uppercase tracking-[0.12em] font-sans font-semibold px-3 py-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
            rel="noopener noreferrer">
            modernmustardseed.com
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 md:px-6 py-10">
        <div className="mb-7">
          <span className={EYEBROW}>Build Log{range ? ` · ${range}` : ''}</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-1.5">What we&rsquo;re building</h1>
          <p className="text-[#161616]/70 mt-2 max-w-2xl text-lg">A live look at the pace and shape of the work across every venture, straight from our commit history.</p>
        </div>

        {/* ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { n: totals.commits, k: 'Commits' },
            { n: totals.features, k: 'Features Shipped' },
            { n: totals.ventures, k: 'Ventures' },
            { n: totals.activeDays, k: 'Active Days' },
          ].map((s) => (
            <div key={s.k} className={`${CARD} p-5`}>
              <div className="font-mono text-4xl font-bold tabular-nums leading-none">{s.n}</div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#161616]/55 mt-2 font-sans font-semibold">{s.k}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
          {/* calendar heatmap */}
          <section className={`${CARD} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-xl font-bold">{MO[view.m]} {view.y}</div>
              <div className="flex gap-1.5">
                <button onClick={() => stepMonth(-1)} disabled={atMin} aria-label="Previous month"
                  className="w-8 h-8 grid place-items-center rounded-lg border-2 border-[#161616] bg-[#FBF6EA] disabled:opacity-30 disabled:cursor-default hover:bg-[#F5B700] transition-colors font-mono">‹</button>
                <button onClick={() => stepMonth(1)} disabled={atMax} aria-label="Next month"
                  className="w-8 h-8 grid place-items-center rounded-lg border-2 border-[#161616] bg-[#FBF6EA] disabled:opacity-30 disabled:cursor-default hover:bg-[#F5B700] transition-colors font-mono">›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="text-center text-[10px] font-mono text-[#161616]/40 uppercase">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} className="aspect-square" />;
                const key = ymd(view.y, view.m, d);
                const dc = dayCounts[key];
                const n = dc ? dc.total : 0;
                const isSel = key === selected;
                if (n === 0) return <div key={key} className="aspect-square rounded-lg flex items-center justify-center font-mono text-[13px] text-[#161616]/35 tabular-nums">{d}</div>;
                return (
                  <button key={key} onClick={() => setSelected(key)} aria-label={`${MO[view.m]} ${d}, ${n} updates`}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 font-mono text-[13px] tabular-nums border-2 transition-transform hover:-translate-y-0.5"
                    style={isSel
                      ? { background: '#F5B700', borderColor: '#161616', color: '#161616', boxShadow: '2px 2px 0 0 #161616' }
                      : { background: `rgba(245,183,0,${intensity(n)})`, borderColor: 'transparent', color: '#161616' }}>
                    <span>{d}</span>
                    <span className="text-[9px] font-bold leading-none" style={{ color: isSel ? 'rgba(22,22,22,0.7)' : '#C4160B' }}>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#161616]/10 text-[10.5px] font-mono text-[#161616]/45">
              <span>Quiet</span>
              <span className="inline-flex gap-1">
                {[0.12, 0.26, 0.42, 0.6].map((o) => <i key={o} className="w-3.5 h-2.5 rounded-sm block" style={{ background: `rgba(245,183,0,${o})` }} />)}
              </span>
              <span>Heavy</span>
            </div>
          </section>

          {/* selected day, aggregate only */}
          <section className={`${CARD} p-6 min-h-[300px]`}>
            {selDay && sp ? (
              <>
                <h2 className="font-display text-2xl md:text-[28px] font-bold leading-tight">{WD[new Date(sp.y, sp.m, sp.d).getDay()]} · {MO[sp.m]} {sp.d}</h2>
                <p className="font-mono text-[13px] text-[#161616]/60 mt-1.5"><b className="text-[#C4160B]">{selDay.total}</b> update{selDay.total > 1 ? 's' : ''} across {selDay.byProject.length} venture{selDay.byProject.length > 1 ? 's' : ''}</p>
                <div className="mt-5 space-y-4">
                  {selDay.byProject.map(([proj, n]) => (
                    <div key={proj}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="font-display text-base font-bold">{proj}</span>
                        <span className="font-mono text-[12px] text-[#161616]/55 tabular-nums">{n} update{n > 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2.5 bg-[#FBF6EA] border border-[#161616]/10 rounded-full overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${Math.round((n / selDay.total) * 100)}%`, background: 'linear-gradient(90deg,#F5B700,#FFD23F)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center font-display text-lg text-[#161616]/40 mt-20">Pick a highlighted day to see the shape of the work.</div>
            )}
          </section>
        </div>

        {/* by venture */}
        <section className={`${CARD} p-6 mt-4`}>
          <div className={`${EYEBROW} mb-4`}>By Venture</div>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
            {projectTotals.map(([p, n]) => (
              <div key={p}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[13.5px] font-medium">{p}</span>
                  <span className="font-mono text-[12px] text-[#161616]/55 tabular-nums">{n}</span>
                </div>
                <div className="h-2.5 bg-[#FBF6EA] border border-[#161616]/10 rounded-full overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${Math.round((n / projMax) * 100)}%`, background: 'linear-gradient(90deg,#F5B700,#FFD23F)' }} />
                </div>
              </div>
            ))}
          </div>
          {catTotals.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 pt-4 border-t border-[#161616]/10">
              {catTotals.map(([k, n]) => (
                <span key={k} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#161616]/70">
                  <span className="w-2 h-2 rounded-sm" style={{ background: CAT_META[k].fg }} />
                  {CAT_META[k].label} <b className="text-[#161616]">{n}</b>
                </span>
              ))}
            </div>
          )}
        </section>

        <p className="text-center font-mono text-[11px] text-[#161616]/45 mt-8">
          Snapshot as of {asOf} Pacific · <a href="https://modernmustardseed.com" className="underline decoration-[#F5B700] decoration-2 underline-offset-2" rel="noopener noreferrer">modernmustardseed.com</a>
        </p>
      </main>
    </div>
  );
}
