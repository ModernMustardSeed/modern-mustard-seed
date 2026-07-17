'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import { fireConfetti } from '@/lib/confetti';
import {
  PHASES,
  PROGRAM,
  RANKS,
  MODULES,
  OFFER_LADDER,
  FIELD_MISSIONS,
  GLOSSARY,
  CERT,
  TOTAL_MINUTES,
  TOTAL_MODULES,
  getRep,
  type GuideBlock,
  type GuideModule,
  type Phase,
} from '@/data/onboarding';

/**
 * THE RIGHT HAND PROGRAM. The MMS new-hire academy, in the admin.
 *
 * A real program, not a doc: six phases, each earns a rank. Personalized to the
 * signed-in rep (name, booking link, territory, the heart-signature moment). A signature
 * rank medallion levels up as phases complete, and finishing all six certifies the
 * rep as a Right Hand with a confetti moment. Progress saves per user in
 * localStorage. Pop-art cabin tokens throughout.
 */

type Props = { name?: string; email?: string; role?: string };


export default function OnboardingHub({ name, email }: Props) {
  const rep = getRep(email);
  const firstName = rep?.firstName || (name || '').split(' ')[0] || '';
  const storageKey = `mms_righthand_${(email || name || 'me').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const [doneModules, setDoneModules] = useState<Record<string, boolean>>({});
  const [doneMissions, setDoneMissions] = useState<Record<string, boolean>>({});
  const [openModule, setOpenModule] = useState<string>('');
  const [hydrated, setHydrated] = useState(false);
  const [flashRank, setFlashRank] = useState<string | null>(null);
  const prevPhases = useRef(0);

  // Load saved progress.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        setDoneModules(s.modules ?? {});
        setDoneMissions(s.missions ?? {});
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  const save = (modules: Record<string, boolean>, missions: Record<string, boolean>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ modules, missions }));
    } catch {
      /* ignore */
    }
  };

  const toggleModule = (id: string) => {
    setDoneModules((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      save(next, doneMissions);
      return next;
    });
  };
  const toggleMission = (id: string) => {
    setDoneMissions((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      save(doneModules, next);
      return next;
    });
  };

  // ── Progress math ──
  const doneCount = MODULES.filter((m) => doneModules[m.id]).length;
  const pct = Math.round((doneCount / TOTAL_MODULES) * 100);
  const phaseComplete = (p: Phase) => p.modules.every((m) => doneModules[m.id]);
  const completePhases = PHASES.filter(phaseComplete).length;
  const rank = RANKS[Math.min(completePhases, RANKS.length - 1)];
  const certified = completePhases >= PHASES.length;
  const missionsDone = FIELD_MISSIONS.filter((m) => doneMissions[m.id]).length;

  // ── Rank-up + certification moments (only after hydration, i.e. real actions) ──
  useEffect(() => {
    if (!hydrated) {
      prevPhases.current = completePhases;
      return;
    }
    if (completePhases > prevPhases.current) {
      const newRank = RANKS[Math.min(completePhases, RANKS.length - 1)];
      setFlashRank(newRank.name);
      const t = setTimeout(() => setFlashRank(null), 3200);
      if (completePhases >= PHASES.length) fireConfetti();
      prevPhases.current = completePhases;
      return () => clearTimeout(t);
    }
    prevPhases.current = completePhases;
  }, [completePhases, hydrated]);

  // Next unfinished module (for the resume button).
  const nextModule = useMemo(() => MODULES.find((m) => !doneModules[m.id]), [doneModules]);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="onboarding" title="Onboarding" />

      {/* Rank-up flash */}
      {flashRank && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="bg-[#161616] text-[#FFFDF6] border-2 border-[#F5B700] rounded-full px-6 py-2.5 shadow-[4px_4px_0_0_#F5B700] flex items-center gap-2.5 animate-[bounce_1s_ease-in-out]">
            <span className="text-xl" aria-hidden>⚡</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F5B700]">Rank up</span>
            <span className="font-display font-black text-lg">{flashRank}</span>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-5 md:px-6 pt-8 pb-24">
        {/* ═══════════ HERO ═══════════ */}
        <section className="relative bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#F5B700] overflow-hidden mb-8">
          <div className="absolute inset-0 halftone-bg opacity-[0.18]" aria-hidden />
          <div className="relative p-7 md:p-10 flex flex-col md:flex-row gap-8 md:items-center">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold mb-4">
                <span className="w-6 h-px bg-[#F5B700]" aria-hidden />
                {PROGRAM.eyebrow}
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.02] mb-1">
                {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
              </h1>
              <p className="font-display text-2xl md:text-3xl font-black text-[#F5B700] tracking-tight mb-4">
                {PROGRAM.promiseTitle}.
              </p>
              <p className="text-[#FBF6EA]/85 font-body leading-relaxed max-w-xl text-[15px]">
                {rep?.note || PROGRAM.personalLead}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {nextModule ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenModule(nextModule.id);
                      document.getElementById(`mod-${nextModule.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#F5B700] shadow-[3px_3px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
                  >
                    {doneCount === 0 ? 'Start the program →' : 'Resume where you left off →'}
                  </button>
                ) : (
                  <span className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#F5B700]">
                    ✓ Program complete
                  </span>
                )}
                <a
                  href="/api/admin/onboarding/pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#FBF6EA] bg-transparent rounded-full border-2 border-[#FBF6EA]/40 hover:border-[#FBF6EA] transition-all"
                >
                  Download the handbook (PDF)
                </a>
              </div>
            </div>

            {/* Signature: the rank medallion */}
            <div className="shrink-0 mx-auto md:mx-0">
              <RankMedallion level={certified ? RANKS.length - 1 : completePhases} pct={pct} certified={certified} />
            </div>
          </div>

          {/* Stat strip */}
          <div className="relative border-t-2 border-[#F5B700]/30 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#F5B700]/20">
            <Stat label="Current rank" value={rank.name} sub={rank.chip} />
            <Stat label="Modules cleared" value={`${doneCount}/${TOTAL_MODULES}`} sub={`${pct}% complete`} />
            <Stat label="Phases done" value={`${completePhases}/${PHASES.length}`} sub={`about ${TOTAL_MINUTES} min total`} />
            <Stat label="Field missions" value={`${missionsDone}/${FIELD_MISSIONS.length}`} sub="first ten days" />
          </div>
        </section>

        {/* ═══════════ RANK LADDER ═══════════ */}
        <section className="mb-9">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Your climb</span>
            <span className="flex-1 h-px bg-[#161616]/12" aria-hidden />
          </div>
          <div className="flex items-stretch gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {RANKS.map((r, i) => {
              const reached = completePhases >= r.level;
              const current = (certified ? RANKS.length - 1 : completePhases) === r.level;
              return (
                <div
                  key={r.level}
                  className={`flex-1 min-w-[104px] rounded-xl border-2 border-[#161616] px-3 py-2.5 transition-all ${
                    current
                      ? 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616] -translate-y-0.5'
                      : reached
                        ? 'bg-[#FFFDF6]'
                        : 'bg-[#161616]/[0.04] border-dashed opacity-70'
                  }`}
                  title={r.blurb}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] tracking-[0.15em] text-[#161616]/50">{String(r.level).padStart(2, '0')}</span>
                    {reached ? (
                      <span className="text-emerald-600 text-[11px]" aria-hidden>●</span>
                    ) : (
                      <span className="text-[#161616]/25 text-[11px]" aria-hidden>○</span>
                    )}
                  </div>
                  <div className={`font-sans font-extrabold text-[13px] leading-tight mt-0.5 ${reached ? 'text-[#161616]' : 'text-[#161616]/45'}`}>{r.name}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══════════ PHASES ═══════════ */}
        <div className="space-y-8">
          {PHASES.map((phase) => (
            <PhaseChapter
              key={phase.id}
              phase={phase}
              doneModules={doneModules}
              openModule={openModule}
              setOpenModule={setOpenModule}
              toggleModule={toggleModule}
              complete={phaseComplete(phase)}
              rep={rep}
            />
          ))}
        </div>

        {/* ═══════════ FIELD MISSIONS ═══════════ */}
        <section className="bg-[#F5B700] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 md:p-9 mt-10">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616] font-mono font-bold block mb-1.5">Your first ten days on the floor</span>
          <h2 className="font-display text-3xl font-black text-[#161616] tracking-tight mb-1">The mission log</h2>
          <p className="text-[#161616]/75 font-body text-[15px] mb-6 max-w-2xl">Reading is not the goal. Doing is. Tick these off as you actually do them, and by day ten you will have booked real business.</p>
          <ol className="space-y-2.5">
            {FIELD_MISSIONS.map((task, i) => {
              const checked = !!doneMissions[task.id];
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggleMission(task.id)}
                    aria-pressed={checked}
                    className="w-full flex items-start gap-3 text-left bg-white/75 hover:bg-white border-2 border-[#161616] rounded-xl px-4 py-3 transition-colors"
                  >
                    <span className={`mt-0.5 w-6 h-6 rounded-lg border-2 border-[#161616] flex items-center justify-center shrink-0 font-mono text-[10px] font-bold ${checked ? 'bg-emerald-500 text-white' : 'bg-white text-[#161616]/50'}`}>
                      {checked ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-bold">{task.day}</span>
                      </span>
                      <span className={`block font-sans font-bold text-[15px] ${checked ? 'text-[#161616]/45 line-through' : 'text-[#161616]'}`}>{task.label}</span>
                      <span className="block text-[13px] text-[#161616]/70 font-body mt-0.5 leading-snug">{task.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ═══════════ GLOSSARY ═══════════ */}
        <section className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 md:p-9 mt-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1.5">Plain-English glossary</span>
          <h2 className="font-display text-3xl font-black text-[#161616] tracking-tight mb-5">Every word you will hear</h2>
          <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="border-l-2 border-[#F5B700] pl-3">
                <dt className="font-sans font-bold text-[#161616] text-sm">{g.term}</dt>
                <dd className="text-[13px] text-[#3A3733] font-body leading-5 mt-0.5">{g.def}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ═══════════ CERTIFICATION ═══════════ */}
        <CertSeal certified={certified} completePhases={completePhases} total={PHASES.length} firstName={firstName} onCelebrate={fireConfetti} />

        <p className="text-center text-[#161616]/45 font-body text-sm mt-10">
          Stuck on anything? Use the yellow Ask Mr. Mustard button, or ask Sarah. Nobody expects you to know it all at once.{' '}
          <Link href="/admin" className="text-[#1E50C8] font-semibold hover:text-[#161616]">Back to the command center</Link>
        </p>
      </main>
    </div>
  );
}

// ── Hero stat cell ───────────────────────────────────────────────
function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[9px] uppercase tracking-[0.25em] font-mono text-[#F5B700]/80 font-bold">{label}</div>
      <div className="font-display font-black text-xl md:text-2xl text-[#FBF6EA] leading-tight mt-0.5">{value}</div>
      <div className="text-[10px] font-mono text-[#FBF6EA]/45 mt-0.5">{sub}</div>
    </div>
  );
}

// ── Signature: the rank medallion ────────────────────────────────
function RankMedallion({ level, pct, certified }: { level: number; pct: number; certified: boolean }) {
  const size = 168;
  const stroke = 9;
  const r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const rank = RANKS[Math.min(level, RANKS.length - 1)];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(251,246,234,0.15)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={certified ? '#F5B700' : '#F5B700'}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {certified ? (
          <>
            <span className="text-3xl leading-none mb-0.5" aria-hidden>🏅</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-[#F5B700]">Certified</span>
            <span className="font-display font-black text-[#FBF6EA] text-lg leading-tight">Right Hand</span>
          </>
        ) : (
          <>
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#F5B700]/90">{rank.chip}</span>
            <span className="font-display font-black text-[#FBF6EA] text-2xl leading-tight tracking-tight mt-0.5">{rank.name}</span>
            <span className="font-mono text-[10px] text-[#FBF6EA]/55 mt-1">{pct}%</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── A phase chapter ──────────────────────────────────────────────
function PhaseChapter({
  phase,
  doneModules,
  openModule,
  setOpenModule,
  toggleModule,
  complete,
  rep,
}: {
  phase: Phase;
  doneModules: Record<string, boolean>;
  openModule: string;
  setOpenModule: (id: string) => void;
  toggleModule: (id: string) => void;
  complete: boolean;
  rep: ReturnType<typeof getRep>;
}) {
  const done = phase.modules.filter((m) => doneModules[m.id]).length;
  const pct = Math.round((done / phase.modules.length) * 100);

  return (
    <section id={`phase-${phase.id}`}>
      {/* Chapter header */}
      <div className="flex items-start gap-4 mb-3">
        <div className={`shrink-0 w-14 h-14 rounded-2xl border-2 border-[#161616] flex items-center justify-center text-2xl ${complete ? 'bg-emerald-500 shadow-[3px_3px_0_0_#161616]' : 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]'}`}>
          {complete ? <span className="text-white text-2xl" aria-hidden>✓</span> : <span aria-hidden>{phase.emoji}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">Phase {String(phase.num).padStart(2, '0')} · {phase.codename}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#1E50C8] font-bold">Earns: {phase.rank}</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight leading-tight">{phase.name}</h2>
          <p className="text-[#3A3733] font-body text-sm mt-0.5">{phase.goal}</p>
          <div className="mt-2.5 flex items-center gap-3 max-w-md">
            <div className="flex-1 h-2 rounded-full bg-[#161616]/10 border border-[#161616]/15 overflow-hidden">
              <div className={`h-full transition-[width] duration-500 ${complete ? 'bg-emerald-500' : 'bg-[#F5B700]'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-[10px] text-[#161616]/50 shrink-0">{done}/{phase.modules.length}</span>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-2.5 ml-0 md:ml-[4.5rem]">
        {phase.modules.map((mod, i) => (
          <ModuleRow
            key={mod.id}
            mod={mod}
            index={i}
            isOpen={openModule === mod.id}
            isDone={!!doneModules[mod.id]}
            onToggleOpen={() => setOpenModule(openModule === mod.id ? '' : mod.id)}
            onToggleDone={() => toggleModule(mod.id)}
            rep={rep}
            showLadder={phase.id === 'arsenal' && mod.id === 'the-ladder'}
          />
        ))}
      </div>
    </section>
  );
}

// ── A module row (accordion) ─────────────────────────────────────
function ModuleRow({
  mod,
  index,
  isOpen,
  isDone,
  onToggleOpen,
  onToggleDone,
  rep,
  showLadder,
}: {
  mod: GuideModule;
  index: number;
  isOpen: boolean;
  isDone: boolean;
  onToggleOpen: () => void;
  onToggleDone: () => void;
  rep: ReturnType<typeof getRep>;
  showLadder: boolean;
}) {
  return (
    <div id={`mod-${mod.id}`} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden scroll-mt-24">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#FFFDF6] transition-colors"
      >
        <span className={`shrink-0 w-10 h-10 rounded-xl border-2 border-[#161616] flex items-center justify-center text-lg ${isDone ? 'bg-emerald-500' : 'bg-[#FBF6EA]'}`}>
          {isDone ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span aria-hidden>{mod.emoji}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold">{mod.eyebrow}</span>
            <span className="text-[9px] font-mono text-[#161616]/40">{mod.minutes} min</span>
          </span>
          <span className={`block font-display text-lg md:text-xl font-bold tracking-tight ${isDone ? 'text-[#161616]/45' : 'text-[#161616]'}`}>{mod.title}</span>
          <span className="block text-[13px] text-[#3A3733] font-body mt-0.5">{mod.summary}</span>
        </span>
        <span className={`text-[#161616] text-xl leading-none transition-transform shrink-0 ${isOpen ? 'rotate-45' : ''}`} aria-hidden>+</span>
      </button>

      {isOpen && (
        <div className="px-5 md:px-6 pb-6 pt-1 border-t border-[#161616]/10">
          <div className="space-y-5 mt-4">
            {mod.blocks.map((block, bi) => (
              <Block key={bi} block={block} rep={rep} />
            ))}
          </div>

          {showLadder && <OfferLadder />}

          {mod.mission && (
            <div className="mt-6 bg-[#161616] text-[#FBF6EA] rounded-2xl border-2 border-[#161616] p-5 shadow-[3px_3px_0_0_#F5B700]">
              <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-[#F5B700] font-bold flex items-center gap-2">
                <span aria-hidden>🎯</span> Your mission
              </span>
              <p className="font-sans font-bold text-[15px] mt-2 leading-snug">{mod.mission.do}</p>
              {mod.mission.why && <p className="text-[#FBF6EA]/70 font-body text-[13px] mt-1.5 leading-relaxed">{mod.mission.why}</p>}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleDone}
            className={`mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold transition-all ${
              isDone
                ? 'bg-emerald-500 text-white border-[#161616] shadow-[2px_2px_0_0_#161616]'
                : 'bg-white text-[#161616] border-[#161616] hover:bg-[#FFF8E6] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5'
            }`}
          >
            {isDone ? '✓ Module cleared' : 'Mark this module cleared'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── The offer ladder visual (Phase 2 signature panel) ────────────
function OfferLadder() {
  return (
    <div className="mt-6 bg-[#FFFDF6] rounded-2xl border-2 border-[#161616] p-5 md:p-6 shadow-[3px_3px_0_0_#161616]">
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">The whole business, one ladder</span>
      <p className="text-[13px] text-[#3A3733] font-body mt-1 mb-4">Bottom rung is where you fish. Top rung is the dream. Everything climbs.</p>
      <div className="space-y-2">
        {[...OFFER_LADDER].reverse().map((rung) => (
          <div key={rung.rung} className="flex items-stretch gap-3 group">
            <div className="shrink-0 w-9 flex flex-col items-center">
              <div className="w-9 h-9 rounded-lg bg-[#F5B700] border-2 border-[#161616] flex items-center justify-center font-display font-black text-[#161616] text-sm">{rung.rung}</div>
            </div>
            <div className="flex-1 min-w-0 bg-white rounded-xl border-2 border-[#161616] px-4 py-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#1E50C8] font-bold">{rung.band}</span>
                  <div className="font-sans font-extrabold text-[#161616] text-sm leading-tight">{rung.title}</div>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#E0301E] whitespace-nowrap">{rung.price}</span>
              </div>
              <p className="text-[12px] text-[#3A3733] font-body leading-snug mt-1">{rung.detail}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rung.examples.map((ex) => (
                  <span key={ex} className="text-[10px] font-mono text-[#161616]/65 bg-[#FBF6EA] border border-[#161616]/15 rounded-full px-2 py-0.5">{ex}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Certification seal ───────────────────────────────────────────
function CertSeal({
  certified,
  completePhases,
  total,
  firstName,
  onCelebrate,
}: {
  certified: boolean;
  completePhases: number;
  total: number;
  firstName: string;
  onCelebrate: () => void;
}) {
  if (!certified) {
    return (
      <section className="mt-10 bg-[#161616]/[0.03] border-2 border-dashed border-[#161616]/30 rounded-2xl p-8 text-center">
        <span className="text-4xl opacity-40" aria-hidden>🔒</span>
        <h2 className="font-display text-2xl font-black text-[#161616]/60 tracking-tight mt-2">Certification locked</h2>
        <p className="text-[#161616]/50 font-body text-sm mt-1 max-w-md mx-auto">
          Finish all {total} phases to be certified as a Right Hand of Modern Mustard Seed. You are {completePhases} of {total} of the way there.
        </p>
        <div className="mt-4 max-w-xs mx-auto h-2 rounded-full bg-[#161616]/10 overflow-hidden">
          <div className="h-full bg-[#F5B700] transition-all duration-500" style={{ width: `${Math.round((completePhases / total) * 100)}%` }} />
        </div>
      </section>
    );
  }
  return (
    <section className="mt-10 relative bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#F5B700] overflow-hidden">
      <div className="absolute inset-0 halftone-bg opacity-[0.15]" aria-hidden />
      <div className="relative p-9 md:p-12 text-center">
        <span className="text-5xl" aria-hidden>🏅</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-bold mt-3">{CERT.eyebrow}</span>
        <h2 className="font-display text-3xl md:text-4xl font-black tracking-tight mt-1">{firstName ? `${firstName}, you are a` : 'You are a'}</h2>
        <p className="font-display text-3xl md:text-4xl font-black text-[#F5B700] tracking-tight">{CERT.title}</p>
        <p className="text-[#FBF6EA]/80 font-body text-[15px] max-w-xl mx-auto mt-4 leading-relaxed">{CERT.body}</p>
        <p className="font-display italic text-[#F5B700] text-lg mt-4">{CERT.line}</p>
        <button
          type="button"
          onClick={onCelebrate}
          className="mt-6 px-6 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#F5B700] shadow-[3px_3px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
        >
          🎉 Celebrate again
        </button>
      </div>
    </section>
  );
}

// ── A content block ──────────────────────────────────────────────
function Block({ block, rep }: { block: GuideBlock; rep: ReturnType<typeof getRep> }) {
  // Personalize the territory line for the signed-in rep, if present.
  const personalize = (s: string) =>
    rep ? s.replace(/your territory/gi, `your ${rep.territory} territory`) : s;

  return (
    <div>
      {block.heading && <h3 className="font-sans font-bold text-[#161616] text-[15px] tracking-tight mb-1.5">{block.heading}</h3>}
      {block.body && <p className="text-[#3A3733] font-body text-sm leading-relaxed">{personalize(block.body)}</p>}
      {block.bullets && (
        <ul className="mt-2 space-y-1.5">
          {block.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-[#3A3733] font-body leading-relaxed">
              <span className="text-[#F5B700] font-bold shrink-0 mt-0.5" aria-hidden>▸</span>
              <span>{personalize(b)}</span>
            </li>
          ))}
        </ul>
      )}
      {block.callout && (
        <div className="mt-3 border-l-4 border-[#F5B700] bg-[#FFF8E6] rounded-r-xl px-4 py-3">
          <p className="text-[#161616] font-body text-sm leading-relaxed italic">{personalize(block.callout)}</p>
        </div>
      )}
      {block.links && block.links.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {block.links.map((l) =>
            l.external ? (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-sans font-semibold text-[#1E50C8] hover:text-[#161616] underline decoration-[#1E50C8]/30 underline-offset-2">
                {l.label} ↗
              </a>
            ) : (
              <Link key={l.url} href={l.url} className="text-[13px] font-sans font-semibold text-[#1E50C8] hover:text-[#161616] underline decoration-[#1E50C8]/30 underline-offset-2">
                {l.label} →
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
