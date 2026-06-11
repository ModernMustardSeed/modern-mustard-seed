'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  VERTICALS,
  checklistForVertical,
  itemIdsForVertical,
  type VerticalId,
} from '@/data/launch-checklist';

/**
 * In-portal Launch Checklist. The client picks their industry and works through
 * every step to get open, online, and bringing in customers, with how-tos,
 * official links, and a "have us do it" CTA on each. Progress saves to their
 * account when the table exists and to localStorage either way, so it never
 * loses their place.
 */

type State = Record<string, boolean>;

const isVerticalId = (v: string | null | undefined): v is VerticalId =>
  !!v && VERTICALS.some((x) => x.id === v);

export default function LaunchChecklist({
  email,
  defaultIndustry,
}: {
  email: string;
  defaultIndustry?: string;
}) {
  const storageKey = `mms_launch_checklist_${email}`;
  const [vertical, setVertical] = useState<VerticalId>(
    isVerticalId(defaultIndustry) ? defaultIndustry : 'general',
  );
  const [state, setState] = useState<State>({});
  const [openPhase, setOpenPhase] = useState<string>('official');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load: localStorage first (instant), then merge the saved server copy.
  useEffect(() => {
    let local: { vertical?: string; state?: State } = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) local = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    if (isVerticalId(local.vertical)) setVertical(local.vertical);
    if (local.state) setState(local.state);

    (async () => {
      try {
        const res = await fetch('/api/portal/checklist');
        if (res.ok) {
          const data = (await res.json()) as { industry: string | null; state: State };
          if (isVerticalId(data.industry)) setVertical(data.industry);
          if (data.state && Object.keys(data.state).length) {
            setState((prev) => ({ ...prev, ...data.state }));
          }
        }
      } catch {
        /* offline / not migrated: localStorage already loaded */
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist (debounced) to localStorage + server whenever state/vertical change.
  const persist = useCallback(
    (nextVertical: VerticalId, nextState: State) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ vertical: nextVertical, state: nextState }));
      } catch {
        /* ignore quota */
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch('/api/portal/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ industry: nextVertical, state: nextState }),
        }).catch(() => {
          /* keep working from localStorage */
        });
      }, 700);
    },
    [storageKey],
  );

  const toggle = (id: string) => {
    setState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      persist(vertical, next);
      return next;
    });
  };

  const pickVertical = (id: VerticalId) => {
    setVertical(id);
    persist(id, state);
  };

  const phases = checklistForVertical(vertical);
  const ids = itemIdsForVertical(vertical);
  const doneCount = ids.filter((id) => state[id]).length;
  const pct = ids.length ? Math.round((doneCount / ids.length) * 100) : 0;

  return (
    <section className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 md:p-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-2">
            Get fully set up
          </span>
          <h3 className="font-display text-2xl font-bold text-[#161616] tracking-tight">Launch Checklist</h3>
          <p className="text-[#3A3733] font-body text-sm mt-1.5 max-w-md">
            Everything to get your business open, online, and bringing in customers. Tailored to your field, with how-tos and links. Check things off as you go.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-3xl font-bold text-[#161616] leading-none">{pct}%</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono mt-1">
            {doneCount} / {ids.length} done
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2.5 rounded-full bg-[#161616]/10 border border-[#161616]/15 overflow-hidden">
        <div
          className="h-full bg-[#F5B700] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Industry selector */}
      <div className="mt-5">
        <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono font-bold block mb-2">
          Your field
        </span>
        <div className="flex flex-wrap gap-2">
          {VERTICALS.map((v) => {
            const active = v.id === vertical;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => pickVertical(v.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-sans font-bold transition-all ${
                  active
                    ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]'
                    : 'bg-white text-[#161616]/70 border-[#161616]/25 hover:border-[#161616] hover:text-[#161616]'
                }`}
              >
                <span aria-hidden>{v.emoji}</span>
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phases */}
      <div className="mt-6 space-y-3">
        {phases.map((phase) => {
          const phaseIds = phase.items.map((it) => it.id);
          const phaseDone = phaseIds.filter((id) => state[id]).length;
          const isOpen = openPhase === phase.id;
          return (
            <div key={phase.id} className="border-2 border-[#161616]/15 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenPhase(isOpen ? '' : phase.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#FFFDF6] hover:bg-[#FFF8E6] transition-colors text-left"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold shrink-0">
                    {phase.eyebrow}
                  </span>
                  <span className="font-display text-base md:text-lg font-bold text-[#161616] tracking-tight truncate">
                    {phase.title}
                  </span>
                </span>
                <span className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[10px] font-mono text-[#161616]/45">
                    {phaseDone}/{phaseIds.length}
                  </span>
                  <span
                    className={`text-[#161616] text-lg leading-none transition-transform ${isOpen ? 'rotate-45' : ''}`}
                    aria-hidden
                  >
                    +
                  </span>
                </span>
              </button>

              {isOpen && (
                <ul className="divide-y divide-[#161616]/8">
                  {phase.items.map((item) => {
                    const checked = !!state[item.id];
                    const isExp = !!expanded[item.id];
                    return (
                      <li key={item.id} className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`Mark "${item.title}" ${checked ? 'not done' : 'done'}`}
                            onClick={() => toggle(item.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 border-[#161616] flex items-center justify-center shrink-0 transition-colors ${
                              checked ? 'bg-emerald-500' : 'bg-white hover:bg-[#FFF8E6]'
                            }`}
                          >
                            {checked && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => setExpanded((e) => ({ ...e, [item.id]: !isExp }))}
                                aria-expanded={isExp}
                                className="text-left min-w-0"
                              >
                                <span
                                  className={`font-sans font-bold text-[15px] tracking-tight ${
                                    checked ? 'text-[#161616]/40 line-through' : 'text-[#161616]'
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpanded((e) => ({ ...e, [item.id]: !isExp }))}
                                aria-label={isExp ? 'Hide details' : 'Show how-to'}
                                className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#1E50C8] hover:text-[#161616] shrink-0 mt-0.5"
                              >
                                {isExp ? 'Hide' : 'How to'}
                              </button>
                            </div>

                            <p className="text-[#3A3733] font-body text-[13px] leading-5 mt-1">{item.why}</p>

                            {(item.time || item.cost) && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.time && (
                                  <span className="text-[10px] font-mono text-[#161616]/55 bg-[#161616]/[0.05] px-2 py-0.5 rounded-full">
                                    {item.time}
                                  </span>
                                )}
                                {item.cost && (
                                  <span className="text-[10px] font-mono text-[#161616]/55 bg-[#161616]/[0.05] px-2 py-0.5 rounded-full">
                                    {item.cost}
                                  </span>
                                )}
                              </div>
                            )}

                            {isExp && (
                              <div className="mt-3 space-y-3">
                                {item.steps?.length > 0 && (
                                  <ul className="space-y-1.5">
                                    {item.steps.map((s, i) => (
                                      <li key={i} className="flex gap-2 text-[13px] text-[#3A3733] font-body leading-5">
                                        <span className="text-[#F5B700] font-bold shrink-0" aria-hidden>
                                          •
                                        </span>
                                        <span>{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {item.note && (
                                  <div className="bg-[#FFF8E6] border border-[#161616]/15 rounded-lg px-3 py-2">
                                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-0.5">
                                      For your field
                                    </span>
                                    <p className="text-[13px] text-[#161616]/80 font-body leading-5">{item.note}</p>
                                  </div>
                                )}

                                {item.links && item.links.length > 0 && (
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                    {item.links.map((l) => (
                                      <a
                                        key={l.url}
                                        href={l.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[12px] font-sans font-semibold text-[#1E50C8] hover:text-[#161616] underline decoration-[#1E50C8]/30 underline-offset-2"
                                      >
                                        {l.label} ↗
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {item.mms && (
                                  <Link
                                    href={item.mms.href}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold"
                                  >
                                    {item.mms.label} →
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {!ready && <p className="sr-only">Loading your saved progress</p>}
    </section>
  );
}
