'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from './AdminHeader';
import type { BuildLogData, Category } from '@/lib/build-log';

/**
 * The Build Log — a live operating record across every venture. Reads commit
 * history server-side (see lib/build-log.ts) so it is always current with no
 * publish step. Pick any date to see exactly what shipped that day, by project.
 * MMS pop-art cabin styling: cream canvas, ink, mustard fills, red eyebrows,
 * pop-blue, hard-offset sticker cards.
 */

const CAT: Record<Category, { label: string; fg: string; bg: string }> = {
  new:    { label: 'New',    fg: '#2E7D4F', bg: 'rgba(46,125,79,0.13)' },
  fix:    { label: 'Fix',    fg: '#1E50C8', bg: 'rgba(30,80,200,0.11)' },
  perf:   { label: 'Perf',   fg: '#B4501F', bg: 'rgba(255,107,53,0.16)' },
  polish: { label: 'Polish', fg: '#4F6272', bg: 'rgba(79,98,114,0.13)' },
  docs:   { label: 'Docs',   fg: '#2E6274', bg: 'rgba(59,107,138,0.13)' },
  access: { label: 'Access', fg: '#8F6600', bg: 'rgba(245,183,0,0.20)' },
  revert: { label: 'Revert', fg: '#C4160B', bg: 'rgba(224,48,30,0.13)' },
  note:   { label: 'Note',   fg: '#5A594F', bg: 'rgba(90,89,79,0.10)' },
};
const LEGEND: Category[] = ['new', 'fix', 'perf', 'polish', 'docs', 'access', 'revert'];

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MOS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function partsOf(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m: m - 1, d };
}
function todayStr() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value])) as Record<string, string>;
  return `${p.year}-${p.month}-${p.day}`;
}
function intensity(n: number) {
  if (n >= 25) return 0.6; if (n >= 15) return 0.42; if (n >= 7) return 0.26; if (n >= 1) return 0.12; return 0;
}

const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold';

export default function BuildLogConsole({ data }: { data: BuildLogData }) {
  const router = useRouter();
  const { byDate, entries, projectTotals, catTotals, minDate, maxDate, activeDays, featureCount, tokenPresent, reposFailed } = data;

  const today = useMemo(() => todayStr(), []);
  const initialSel = byDate[today] ? today : (maxDate || today);
  const [selected, setSelected] = useState(initialSel);
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const p = partsOf(initialSel);
    return { y: p.y, m: p.m };
  });

  const range = useMemo(() => {
    if (!minDate || !maxDate) return '—';
    const a = partsOf(minDate), b = partsOf(maxDate);
    const bLabel = MOS[b.m] === MOS[a.m] ? `${b.d}` : `${MOS[b.m]} ${b.d}`;
    return `${MOS[a.m]} ${a.d} – ${bLabel}`;
  }, [minDate, maxDate]);

  // velocity: last up to 14 active days
  const recent = useMemo(() => Object.keys(byDate).sort().slice(-14), [byDate]);
  const veloMax = Math.max(1, ...recent.map((d) => byDate[d].length));

  // calendar grid for the viewed month
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const dim = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const minMonth = minDate ? partsOf(minDate) : partsOf(today);
  const nowM = partsOf(today);
  const atMin = view.y < minMonth.y || (view.y === minMonth.y && view.m <= minMonth.m);
  const atMax = view.y > nowM.y || (view.y === nowM.y && view.m >= nowM.m);
  const stepMonth = (dir: number) => {
    setView((v) => {
      const m = v.m + dir;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  };

  const dayList = byDate[selected] || [];
  const groups = useMemo(() => {
    const g = new Map<string, typeof dayList>();
    for (const e of dayList) { if (!g.has(e.project)) g.set(e.project, []); g.get(e.project)!.push(e); }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [dayList]);
  const sp = partsOf(selected);

  const projMax = Math.max(1, ...projectTotals.map((p) => p[1]));

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="build-log" title="Build Log" onRefresh={() => router.refresh()} />

      <main className="max-w-6xl mx-auto px-5 md:px-6 py-8">
        {/* intro */}
        <div className="mb-6">
          <span className={EYEBROW}>Operating Record · {range}</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Everything we shipped, day by day</h2>
          <p className="text-[#161616]/70 mt-1.5 max-w-2xl">Live from commit history across every venture. Pick a date to see exactly what got built.</p>
        </div>

        {/* metric ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
          {[
            { n: entries.length, k: 'Commits' },
            { n: featureCount, k: 'Features Shipped' },
            { n: projectTotals.length, k: 'Ventures' },
            { n: activeDays, k: 'Active Days' },
          ].map((s) => (
            <div key={s.k} className={`${CARD} p-4`}>
              <div className="font-mono text-3xl font-bold tabular-nums leading-none">{s.n}</div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#161616]/55 mt-1.5 font-sans font-semibold">{s.k}</div>
            </div>
          ))}
          <div className={`${CARD} p-4 col-span-2 md:col-span-4 lg:col-span-1`}>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#161616]/55 font-sans font-semibold mb-2">Daily Velocity</div>
            <div className="flex items-end gap-1 h-10">
              {recent.map((d) => {
                const c = byDate[d].length;
                const p = partsOf(d);
                const peak = c === veloMax;
                return (
                  <div key={d} title={`${MOS[p.m]} ${p.d}: ${c}`}
                    className="flex-1 min-w-[4px] rounded-t"
                    style={{ height: `${Math.max(12, Math.round((c / veloMax) * 100))}%`, background: peak ? '#F5B700' : 'rgba(245,183,0,0.5)' }} />
                );
              })}
              {recent.length === 0 && <span className="text-[#161616]/40 text-xs font-mono">no data</span>}
            </div>
          </div>
        </div>

        {/* token hint */}
        {!tokenPresent && reposFailed.length > 0 && (
          <div className="mb-5 text-[12px] font-mono text-[#161616]/60 bg-[#FFF8E6] border-2 border-[#161616]/15 rounded-xl px-4 py-2.5">
            Showing {projectTotals.map((p) => p[0]).join(', ') || 'no repos'}. Add a read-only <b className="text-[#161616]">GITHUB_TOKEN</b> in Vercel to include {reposFailed.join(', ')}.
          </div>
        )}

        {/* calendar + detail */}
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
          {/* calendar */}
          <section className={`${CARD} p-4 lg:sticky lg:top-24`}>
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
                const list = byDate[key];
                const n = list ? list.length : 0;
                const isSel = key === selected;
                const isToday = key === today;
                if (n === 0) {
                  return (
                    <div key={key} className="aspect-square rounded-lg flex items-center justify-center font-mono text-[13px] text-[#161616]/35 tabular-nums"
                      style={isToday ? { boxShadow: 'inset 0 0 0 2px #1E50C8' } : undefined}>{d}</div>
                  );
                }
                return (
                  <button key={key} onClick={() => setSelected(key)} aria-label={`${MO[view.m]} ${d}, ${n} updates`}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 font-mono text-[13px] tabular-nums border-2 transition-transform hover:-translate-y-0.5"
                    style={
                      isSel
                        ? { background: '#F5B700', borderColor: '#161616', color: '#161616', boxShadow: '2px 2px 0 0 #161616' }
                        : { background: `rgba(245,183,0,${intensity(n)})`, borderColor: 'transparent', color: '#161616', ...(isToday ? { boxShadow: 'inset 0 0 0 2px #1E50C8' } : {}) }
                    }>
                    <span>{d}</span>
                    <span className="text-[9px] font-bold leading-none" style={{ color: isSel ? 'rgba(22,22,22,0.7)' : '#C4160B' }}>{n}</span>
                  </button>
                );
              })}
            </div>
            {/* legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-[#161616]/10">
              {LEGEND.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-[#161616]/60">
                  <span className="w-2 h-2 rounded-sm" style={{ background: CAT[k].fg }} />{CAT[k].label}
                </span>
              ))}
            </div>
          </section>

          {/* day detail */}
          <section className={`${CARD} p-6 min-h-[420px]`}>
            {dayList.length === 0 ? (
              <>
                <h3 className="font-display text-2xl font-bold">{WD[new Date(sp.y, sp.m, sp.d).getDay()]} · {MO[sp.m]} {sp.d}</h3>
                <p className="font-mono text-[13px] text-[#161616]/55 mt-1.5">No work logged this day.</p>
                <div className="text-center font-display text-lg text-[#161616]/40 mt-16">A quiet one.</div>
              </>
            ) : (
              <>
                <h3 className="font-display text-2xl md:text-[28px] font-bold leading-tight">{WD[new Date(sp.y, sp.m, sp.d).getDay()]} · {MO[sp.m]} {sp.d}</h3>
                <p className="font-mono text-[13px] text-[#161616]/60 mt-1.5">
                  <b className="text-[#C4160B]">{dayList.length}</b> update{dayList.length > 1 ? 's' : ''} across {groups.map((g) => g[0]).join(', ')}
                </p>
                <div className="mt-5 space-y-6">
                  {groups.map(([proj, items]) => (
                    <div key={proj}>
                      <div className="flex items-baseline gap-2.5 mb-2.5">
                        <span className="font-display text-base font-bold">{proj}</span>
                        <span className="font-mono text-[11px] text-[#161616]/55 bg-[#FBF6EA] border border-[#161616]/15 px-2 rounded-full">{items.length}</span>
                        <span className="flex-1 h-px bg-[#161616]/10" />
                      </div>
                      <div className="divide-y divide-[#161616]/8">
                        {items.map((e, idx) => (
                          <div key={idx} className="grid grid-cols-[46px_74px_1fr] gap-3 items-start py-2">
                            <span className="font-mono text-[11.5px] text-[#161616]/45 tabular-nums pt-0.5">{e.time}</span>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wide rounded-md text-center py-0.5 h-fit mt-0.5"
                              style={{ color: CAT[e.cat].fg, background: CAT[e.cat].bg }}>{e.catLabel}</span>
                            <span className="text-[13.5px] text-[#161616]/85 leading-snug">
                              {e.scope && <span className="font-mono text-[11px] text-[#161616]/45">{e.scope} </span>}
                              {e.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* by project rollup */}
        <section className={`${CARD} p-6 mt-4`}>
          <div className={`${EYEBROW} mb-4`}>By Project</div>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
            {projectTotals.map(([p, n]) => (
              <div key={p}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[13.5px] font-medium">{p}</span>
                  <span className="font-mono text-[12px] text-[#161616]/55 tabular-nums">{n}</span>
                </div>
                <div className="h-2 bg-[#FBF6EA] border border-[#161616]/10 rounded-full overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${Math.round((n / projMax) * 100)}%`, background: 'linear-gradient(90deg,#F5B700,#FFD23F)' }} />
                </div>
              </div>
            ))}
          </div>
          {catTotals.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 pt-4 border-t border-[#161616]/10">
              {catTotals.map(([k, n]) => (
                <span key={k} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#161616]/70">
                  <span className="w-2 h-2 rounded-sm" style={{ background: CAT[k].fg }} />
                  {CAT[k].label} <b className="text-[#161616]">{n}</b>
                </span>
              ))}
            </div>
          )}
        </section>

        <p className="text-center font-mono text-[11px] text-[#161616]/40 mt-6">
          Live from GitHub commit history · {entries.length} entries · updated on every load
        </p>
      </main>
    </div>
  );
}
