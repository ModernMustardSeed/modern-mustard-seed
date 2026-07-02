'use client';

/**
 * GLEANER - the revenue-recovery command deck.
 * Cream pop-art shell, dark midnight deck, one mustard lever. The worker
 * (scripts/gleaner-worker.mjs) drives runs; this deck pulls the lever and
 * watches the machine work through a live event feed.
 */

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

type Run = {
  id: string;
  vertical_slug: string;
  geo: string;
  status: string;
  stage_detail: string | null;
  config: { maxDemos?: number; maxProspects?: number };
  stats: { scored?: number; qualified?: number; demos?: number; drafts?: number; leakMonthly?: number };
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

type Ev = { id: number; level: string; source: string; message: string; created_at: string };

type Demo = {
  id: string;
  brand_name: string;
  vertical_slug: string | null;
  status: string;
  demo_url: string | null;
  phone: string | null;
  dashboard_url: string | null;
  notes: string | null;
  created_at: string;
};

type Vertical = {
  id: string;
  slug: string;
  name: string;
  status: string;
  demo_template: string | null;
  leak_summary: string | null;
  score: number | null;
  intelligence: { chains?: { name: string; locations?: number }[]; pricing?: { per_location_mo_usd?: number } };
};

type ProspectCard = {
  id: string;
  name: string;
  status: string;
  composite: number | null;
  revenue_leak_estimate: number | null;
  vertical: string | null;
  microsite_url: string | null;
};

type Overview = {
  runs: Run[];
  activeRun: Run | null;
  events: Ev[];
  verticals: Vertical[];
  demos: Demo[];
  board: { scored: ProspectCard[]; courting: ProspectCard[]; won: ProspectCard[] };
  metrics: { recoveredAnnual: number; leakOnGround: number; liveDemos: number; draftsWaiting: number; qualified: number };
};

const ACTIVE = ['queued', 'scouting', 'fielding', 'forging', 'courting'];
const GEARS = [
  { key: 'scouting', label: 'Scout' },
  { key: 'fielding', label: 'Field' },
  { key: 'forging', label: 'Forge' },
  { key: 'courting', label: 'Court' },
  { key: 'gated', label: 'Gate' },
] as const;

const HALFTONE = { backgroundImage: 'radial-gradient(rgba(245,183,0,0.22) 1.3px, transparent 1.3px)', backgroundSize: '14px 14px' };
const HALFTONE_DARK = { backgroundImage: 'radial-gradient(rgba(245,183,0,0.12) 1.3px, transparent 1.3px)', backgroundSize: '14px 14px' };

const card = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const eyebrow = 'text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold';
const btnPrimary = 'px-5 py-2 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] hover:bg-[#FFD23F] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-40 transition-all';
const btnGhost = 'px-4 py-2 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white hover:bg-[#161616]/5 border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] transition-all';

function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/* The odometer: each digit is a vertical 0-9 strip that rolls into place. */
function Odometer({ value }: { value: number }) {
  const chars = money(value).split('');
  return (
    <span className="inline-flex items-baseline overflow-hidden" aria-label={money(value)}>
      {chars.map((c, i) =>
        /\d/.test(c) ? (
          <span key={i} className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline">
            <span
              className="absolute left-0 top-0 flex flex-col transition-transform duration-700 ease-out"
              style={{ transform: `translateY(-${Number(c)}em)` }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <span key={d} className="h-[1em] leading-none">{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className="leading-none">{c}</span>
        ),
      )}
    </span>
  );
}

function levelColor(level: string) {
  if (level === 'ok') return 'text-emerald-400';
  if (level === 'warn') return 'text-amber-300';
  if (level === 'error') return 'text-[#FF7A6B]';
  if (level === 'gate') return 'text-[#FFDD55]';
  return 'text-[#9aa3b8]';
}

function sourceColor(source: string) {
  if (source === 'scout') return 'text-[#6E9BFF]';
  if (source === 'field') return 'text-[#8FA98F]';
  if (source === 'forge') return 'text-[#FFDD55]';
  if (source === 'court') return 'text-[#FF8550]';
  return 'text-[#9aa3b8]';
}

function demoChip(status: string) {
  if (status === 'ready' || status === 'live') return 'bg-emerald-100 text-emerald-800 border-emerald-800';
  if (status === 'forging') return 'bg-[#FFDD55] text-[#161616] border-[#161616]';
  if (status === 'failed') return 'bg-red-100 text-red-800 border-red-800';
  return 'bg-[#FBF6EA] text-[#161616] border-[#161616]';
}

export default function GleanerDeck() {
  const [data, setData] = useState<Overview | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [showLever, setShowLever] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [leverErr, setLeverErr] = useState<string | null>(null);
  const [form, setForm] = useState({ verticalSlug: 'auto', geo: '', maxDemos: 1, maxProspects: 25 });
  const termRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/gleaner');
    if (!r.ok) return;
    const j: Overview = await r.json();
    setData(j);
    setEvents(j.events || []);
    cursorRef.current = j.events?.length ? j.events[j.events.length - 1].id : 0;
    activeIdRef.current = j.activeRun?.id || null;
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live feed: poll the active run every 4s and append fresh events.
  useEffect(() => {
    if (!data?.activeRun) return;
    const runId = data.activeRun.id;
    const t = setInterval(async () => {
      const r = await fetch(`/api/admin/gleaner/runs/${runId}?after=${cursorRef.current}`);
      if (!r.ok) return;
      const j: { run: Run; events: Ev[] } = await r.json();
      if (j.events.length) {
        cursorRef.current = j.events[j.events.length - 1].id;
        setEvents((prev) => [...prev, ...j.events].slice(-400));
      }
      if (!ACTIVE.includes(j.run.status)) { clearInterval(t); load(); }
      else setData((prev) => (prev ? { ...prev, activeRun: j.run } : prev));
    }, 4000);
    return () => clearInterval(t);
  }, [data?.activeRun?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Terminal autoscroll.
  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);

  const pullLever = async () => {
    setPulling(true);
    setLeverErr(null);
    const r = await fetch('/api/admin/gleaner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setPulling(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setLeverErr(j.error || 'The lever jammed. Try again.');
      return;
    }
    setShowLever(false);
    await load();
  };

  const cancelRun = async () => {
    if (!data?.activeRun) return;
    await fetch(`/api/admin/gleaner/runs/${data.activeRun.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    load();
  };

  const run = data?.activeRun || null;
  const m = data?.metrics;
  const running = !!run;
  const gearIndex = run ? GEARS.findIndex((g) => g.key === run.status) : -1;
  const lastRun = data?.runs?.[0];
  const headline = running
    ? 'The machine is running.'
    : (m?.qualified || 0) > 0
      ? 'The field is full. Pull the lever.'
      : 'The field is quiet. Send the machine out.';
  const queuedStale = run?.status === 'queued' && events.length <= 1;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]" style={HALFTONE}>
      <AdminHeader active="gleaner" title="Gleaner" onRefresh={load} />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8 space-y-8">
        {/* ============ THE COMMAND DECK ============ */}
        <section
          className="relative overflow-hidden rounded-2xl border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] text-[#FBF6EA] animate-fade-in"
          style={{ background: 'linear-gradient(160deg,#080C16,#0F1422)' }}
        >
          <div className="absolute inset-0 pointer-events-none" style={HALFTONE_DARK} aria-hidden />
          <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-8 p-6 md:p-10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#F5B700]">
                Gleaner_ {run ? `· run ${run.id.slice(0, 8)} · ${run.vertical_slug}${run.geo ? ` / ${run.geo}` : ''}` : '· revenue-recovery engine'}
              </p>

              <div className="mt-5 font-mono font-bold text-[#FFDD55] text-4xl md:text-5xl tracking-wider" style={{ textShadow: '0 0 34px rgba(245,183,0,0.35)' }}>
                <span className="block text-[10px] tracking-[0.26em] text-[#8b93a7] font-medium mb-2">REVENUE RECOVERED · ANNUALIZED</span>
                <Odometer value={m?.recoveredAnnual || 0} />
              </div>

              <h1 className="font-display text-3xl md:text-[2.6rem] leading-tight font-bold mt-4 text-[#FBF6EA]">{headline}</h1>
              <p className="text-sm text-[#aab2c5] mt-2 max-w-xl">
                {run
                  ? run.stage_detail || 'Working.'
                  : `${m?.qualified || 0} qualified prospects scored. ${m?.liveDemos || 0} demos forged and answering their phones. ${m?.draftsWaiting || 0} drafts waiting on your yes.`}
              </p>

              {/* Five gears */}
              <div className="flex flex-wrap gap-2 mt-5">
                {GEARS.map((g, i) => {
                  const state = !run ? 'idle' : i < gearIndex || run.status === 'gated' ? 'done' : i === gearIndex ? 'active' : 'idle';
                  return (
                    <span
                      key={g.key}
                      className={`px-3 py-1 rounded-full border-2 text-[10px] uppercase tracking-[0.18em] font-mono font-bold transition-all ${
                        state === 'active'
                          ? 'bg-[#F5B700] text-[#161616] border-[#161616] animate-pulse'
                          : state === 'done'
                            ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
                            : 'bg-transparent text-[#8b93a7] border-[#2a3247]'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')} {g.label}
                    </span>
                  );
                })}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                {!running ? (
                  <button
                    onClick={() => setShowLever(true)}
                    className="group inline-flex items-center gap-3 bg-[#F5B700] text-[#161616] font-sans font-bold text-base px-8 py-4 rounded-full border-2 border-[#161616] transition-all hover:-translate-y-1 active:translate-y-1"
                    style={{ boxShadow: '4px 4px 0 0 #000, 0 0 44px rgba(245,183,0,0.35)' }}
                  >
                    <span className="w-3 h-3 rounded-full bg-[#E0301E] border-2 border-[#161616] group-hover:animate-ping" />
                    RUN THE HARVEST
                  </button>
                ) : (
                  <button onClick={cancelRun} className="px-5 py-2 rounded-lg text-[11px] uppercase tracking-[0.18em] font-mono font-bold text-[#FF7A6B] border-2 border-[#FF7A6B]/50 hover:bg-[#FF7A6B]/10 transition-colors">
                    Stop the machine
                  </button>
                )}
                {run?.status === 'queued' && queuedStale && (
                  <span className="text-[11px] font-mono text-[#8b93a7]">
                    waiting for the worker · start it with <span className="text-[#FFDD55]">node scripts/gleaner-worker.mjs</span>
                  </span>
                )}
              </div>
            </div>

            {/* Terminal feed */}
            <div className="rounded-xl border border-[#232b3d] bg-[#04060D] p-4 min-h-[280px] max-h-[360px] flex flex-col">
              <div className="flex gap-1.5 mb-3 shrink-0" aria-hidden>
                <i className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <i className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <i className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div ref={termRef} className="font-mono text-[11px] leading-[1.9] overflow-y-auto flex-1 pr-1">
                {events.length === 0 && (
                  <div className="text-[#8b93a7]">
                    <p><span className="text-[#FFDD55]">gleaner</span> idle. no run in motion.</p>
                    {lastRun && <p>last run: {lastRun.vertical_slug} · {lastRun.status} · {lastRun.stats?.qualified ?? 0} qualified · {lastRun.stats?.demos ?? 0} demo(s)</p>}
                    <p>pull the lever to send the machine into the field.</p>
                  </div>
                )}
                {events.map((e) => (
                  <p key={e.id} className="break-words">
                    <span className={sourceColor(e.source)}>{e.source}</span>{' '}
                    <span className={levelColor(e.level)}>{e.message}</span>
                  </p>
                ))}
                {running && <p className="text-[#FFDD55] animate-pulse">▮</p>}
              </div>
            </div>
          </div>

          <Image
            src="/brand/mascot.png"
            alt=""
            width={885}
            height={1180}
            className="absolute -right-2 -bottom-4 h-28 w-auto rotate-[-6deg] pointer-events-none select-none"
            style={{ filter: 'drop-shadow(3px 4px 0 rgba(0,0,0,0.35))' }}
          />
        </section>

        {/* ============ STAT TILES ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
          {[
            { label: 'Leaking on the ground', value: `${money(m?.leakOnGround || 0)}/mo`, tone: 'text-[#E0301E]', href: null },
            { label: 'Demos live + dialable', value: String(m?.liveDemos || 0), tone: 'text-[#161616]', href: null },
            { label: 'Qualified prospects', value: String(m?.qualified || 0), tone: 'text-[#161616]', href: null },
            { label: 'Drafts at your gate', value: String(m?.draftsWaiting || 0), tone: 'text-[#1E50C8]', href: '/admin/outreach' },
          ].map((t) => (
            <div key={t.label} className={`${card} p-4`}>
              <p className="text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/50">{t.label}</p>
              <p className={`font-mono font-bold text-2xl mt-1 ${t.tone}`}>{t.value}</p>
              {t.href && (
                <Link href={t.href} className="text-[10px] font-mono font-bold text-[#1E50C8] underline underline-offset-4">
                  review →
                </Link>
              )}
            </div>
          ))}
        </section>

        {/* ============ DEMOS GALLERY ============ */}
        <section className="animate-fade-in-up">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-2xl font-bold">The forge</h2>
            <p className={eyebrow}>demos that answer their own phones</p>
          </div>
          {data?.demos?.length ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.demos.map((d) => (
                <div key={d.id} className={`${card} p-5`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-sans font-bold text-base leading-snug">{d.brand_name}</h3>
                    <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded shrink-0 ${demoChip(d.status)}`}>
                      {d.status === 'ready' || d.status === 'live' ? '● live' : d.status === 'forging' ? '⚙ forging' : d.status}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[#161616]/50 mt-0.5">{d.vertical_slug || 'custom'}</p>
                  {d.phone && (
                    <a href={`tel:${d.phone}`} className="block font-mono font-bold text-lg text-[#161616] mt-3 hover:text-[#1E50C8]">
                      {d.phone}
                    </a>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3 text-[11px] font-mono font-bold">
                    {d.demo_url && (
                      <a href={d.demo_url} target="_blank" rel="noopener noreferrer" className="text-[#1E50C8] underline underline-offset-4">demo →</a>
                    )}
                    {d.dashboard_url && (
                      <a href={d.dashboard_url} target="_blank" rel="noopener noreferrer" className="text-[#1E50C8] underline underline-offset-4">dashboard →</a>
                    )}
                  </div>
                  {d.notes && <p className="text-xs text-[#161616]/60 mt-2 leading-relaxed">{d.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className={`${card} p-8 text-center`}>
              <p className="font-display text-xl font-bold">Nothing forged yet.</p>
              <p className="text-sm text-[#161616]/60 mt-1">The first lever pull sends headless Claude Code to build a callable demo on your Max plan.</p>
            </div>
          )}
        </section>

        {/* ============ PIPELINE BOARD ============ */}
        <section className="animate-fade-in-up">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-2xl font-bold">The field</h2>
            <Link href="/admin/outreach" className="text-[11px] font-mono font-bold text-[#1E50C8] underline underline-offset-4">full outreach console →</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {(
              [
                { key: 'scored', title: 'Scored + qualified', rows: data?.board?.scored || [] },
                { key: 'courting', title: 'Courting', rows: data?.board?.courting || [] },
                { key: 'won', title: 'Won', rows: data?.board?.won || [] },
              ] as const
            ).map((col) => (
              <div key={col.key} className="bg-[#FBF6EA] border-2 border-[#161616] rounded-xl p-3 shadow-[3px_3px_0_0_#161616]">
                <h4 className="text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/60 mb-2 px-1">{col.title} · {col.rows.length}</h4>
                <div className="space-y-2">
                  {col.rows.length === 0 && <p className="text-xs text-[#161616]/40 px-1 py-2 font-mono">empty</p>}
                  {col.rows.map((p) => (
                    <div key={p.id} className="bg-white border-2 border-[#161616] rounded-lg px-3 py-2 shadow-[2px_2px_0_0_#161616]">
                      <p className="text-xs font-bold leading-snug">{p.name}</p>
                      <p className="text-[10px] font-mono text-[#161616]/55">
                        {p.composite != null && <>score {p.composite} · </>}
                        {p.revenue_leak_estimate ? (
                          <span className={col.key === 'won' ? 'text-emerald-700 font-bold' : 'text-[#E0301E] font-bold'}>
                            {money(p.revenue_leak_estimate)}/mo
                          </span>
                        ) : (
                          <span>{p.vertical || ''}</span>
                        )}
                        {p.microsite_url && (
                          <>
                            {' '}·{' '}
                            <a href={p.microsite_url} target="_blank" rel="noopener noreferrer" className="text-[#1E50C8] underline underline-offset-2">demo</a>
                          </>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ VERTICAL INTELLIGENCE ============ */}
        <section className="animate-fade-in-up">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-2xl font-bold">Vertical intelligence</h2>
            <p className={eyebrow}>where the money leaks</p>
          </div>
          {!data?.verticals?.length && (
            <div className={`${card} p-8 text-center`}>
              <p className="font-display text-xl font-bold">No intelligence on file.</p>
              <p className="text-sm text-[#161616]/60 mt-1">Run the 033_gleaner migration, then the four proven verticals seed themselves and the scout adds more with every auto run.</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(data?.verticals || []).map((v) => (
              <div key={v.id} className={`${card} p-5 flex flex-col`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-sans font-bold text-sm leading-snug">{v.name}</h3>
                  {v.score != null && (
                    <span className="w-9 h-9 shrink-0 grid place-items-center rounded-lg bg-[#F5B700] border-2 border-[#161616] font-mono font-bold text-sm shadow-[2px_2px_0_0_#161616]">
                      {v.score}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#161616]/65 mt-2 leading-relaxed flex-1">{v.leak_summary || 'Awaiting scout intelligence.'}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] font-mono font-bold border rounded bg-[#FBF6EA] border-[#161616]">{v.demo_template || 'custom'}</span>
                  {v.intelligence?.chains?.length ? (
                    <span className="px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] font-mono font-bold border rounded bg-[#E7F0FF] text-[#1E50C8] border-[#1E50C8]">
                      {v.intelligence.chains.length} chains
                    </span>
                  ) : null}
                  <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] font-mono font-bold border rounded ${v.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-800' : 'bg-[#FBF6EA] border-[#161616]'}`}>
                    {v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ RUN HISTORY ============ */}
        <section className="animate-fade-in-up">
          <h2 className="font-display text-2xl font-bold mb-3">Run log</h2>
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#161616]">
                  {['When', 'Vertical', 'Geo', 'Status', 'Qualified', 'Demos', 'Drafts', 'Leak found'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[9px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.runs || []).length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center font-mono text-[#161616]/40">No runs yet. The lever is right up there.</td></tr>
                )}
                {(data?.runs || []).map((r) => (
                  <tr key={r.id} className="border-b border-[#161616]/10 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-[#161616]/60">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-2.5 font-bold">{r.vertical_slug}</td>
                    <td className="px-4 py-2.5 text-[#161616]/60">{r.geo || '·'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded ${
                        r.status === 'gated' ? 'bg-[#FFDD55] border-[#161616]'
                          : r.status === 'failed' ? 'bg-red-100 text-red-800 border-red-800'
                          : ACTIVE.includes(r.status) ? 'bg-[#E7F0FF] text-[#1E50C8] border-[#1E50C8]'
                          : 'bg-[#FBF6EA] border-[#161616]'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{r.stats?.qualified ?? '·'}</td>
                    <td className="px-4 py-2.5 font-mono">{r.stats?.demos ?? '·'}</td>
                    <td className="px-4 py-2.5 font-mono">{r.stats?.drafts ?? '·'}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-[#E0301E]">{r.stats?.leakMonthly ? `${money(r.stats.leakMonthly)}/mo` : '·'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-[11px] font-mono text-[#161616]/40 pb-6">
          Nothing sends, spends, or ships without your yes. The gates are load-bearing. · GLEANER_ a Modern Mustard Seed machine
        </p>
      </main>

      {/* ============ THE LEVER (config modal, overflow-safe) ============ */}
      {showLever && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161616]/60 backdrop-blur-sm" onClick={() => setShowLever(false)}>
          <div
            className="w-full max-w-md max-h-[90vh] flex flex-col bg-[#FBF6EA] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] animate-pop-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Run the harvest"
          >
            <div className="shrink-0 px-6 pt-5 pb-4 border-b-2 border-[#161616]" style={HALFTONE}>
              <p className={eyebrow}>One lever. One run.</p>
              <h3 className="font-display text-2xl font-bold mt-1">Send the machine out</h3>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/60">Vertical</span>
                <select
                  value={form.verticalSlug}
                  onChange={(e) => setForm({ ...form, verticalSlug: e.target.value })}
                  className="mt-1 w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                >
                  <option value="auto">Auto: scout the best new vertical</option>
                  {(data?.verticals || []).map((v) => (
                    <option key={v.slug} value={v.slug}>{v.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/60">Geography</span>
                <input
                  value={form.geo}
                  onChange={(e) => setForm({ ...form, geo: e.target.value })}
                  placeholder="Scottsdale, AZ"
                  className="mt-1 w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/60">Demos to forge</span>
                  <select
                    value={form.maxDemos}
                    onChange={(e) => setForm({ ...form, maxDemos: Number(e.target.value) })}
                    className="mt-1 w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                  >
                    {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/60">Prospects to audit</span>
                  <select
                    value={form.maxProspects}
                    onChange={(e) => setForm({ ...form, maxProspects: Number(e.target.value) })}
                    className="mt-1 w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                  >
                    {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <p className="text-[11px] text-[#161616]/55 leading-relaxed">
                The run scouts, sweeps the field, forges demos on your Max plan, drafts outreach, then parks at your gate. It never sends anything.
              </p>
              {leverErr && <p className="text-xs font-mono font-bold text-[#E0301E]">{leverErr}</p>}
            </div>
            <div className="shrink-0 px-6 py-4 border-t-2 border-[#161616] flex items-center justify-between gap-3">
              <button onClick={() => setShowLever(false)} className={btnGhost}>Not yet</button>
              <button onClick={pullLever} disabled={pulling} className={btnPrimary}>
                {pulling ? 'Pulling…' : 'Pull the lever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
