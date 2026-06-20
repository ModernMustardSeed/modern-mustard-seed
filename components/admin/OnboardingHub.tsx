'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  MODULES,
  ONBOARDING_INTRO,
  FIRST_WEEK,
  GLOSSARY,
  TOTAL_MINUTES,
  type GuideBlock,
} from '@/data/onboarding';

/**
 * The new-hire Onboarding Hub. An interactive, on-brand handbook inside the
 * admin. Modules to read and mark done, a first-week checklist, a plain-English
 * glossary, and a printable PDF. Progress saves per user in localStorage.
 */
export default function OnboardingHub({ name }: { name?: string }) {
  const firstName = (name || '').split(' ')[0];
  const storageKey = `mms_onboarding_${(name || 'me').toLowerCase().replace(/\s+/g, '-')}`;

  const [doneModules, setDoneModules] = useState<Record<string, boolean>>({});
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string>(MODULES[0]?.id ?? '');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        setDoneModules(s.modules ?? {});
        setDoneTasks(s.tasks ?? {});
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const save = (modules: Record<string, boolean>, tasks: Record<string, boolean>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ modules, tasks }));
    } catch {
      /* ignore */
    }
  };

  const toggleModule = (id: string) => {
    setDoneModules((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      save(next, doneTasks);
      return next;
    });
  };
  const toggleTask = (id: string) => {
    setDoneTasks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      save(doneModules, next);
      return next;
    });
  };

  const doneCount = MODULES.filter((m) => doneModules[m.id]).length;
  const pct = Math.round((doneCount / MODULES.length) * 100);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="onboarding" title="Onboarding" />

      <main className="max-w-4xl mx-auto px-6 pt-8 pb-20">
        {/* Intro */}
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-7 md:p-9 mb-6">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">
            Sales & marketing partner guide
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-3">
            {firstName ? `Welcome, ${firstName}.` : ONBOARDING_INTRO.title}
          </h1>
          <p className="text-[#3A3733] font-body leading-relaxed max-w-2xl">{ONBOARDING_INTRO.body}</p>

          <div className="mt-6 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/55">
                  {doneCount} / {MODULES.length} modules done
                </span>
                <span className="text-[10px] font-mono text-[#161616]/45">about {TOTAL_MINUTES} min total</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#161616]/10 border border-[#161616]/15 overflow-hidden">
                <div className="h-full bg-[#F5B700] transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <a
              href="/api/admin/onboarding/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Download the handbook (PDF)
            </a>
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-3">
          {MODULES.map((mod, i) => {
            const isOpen = open === mod.id;
            const isDone = !!doneModules[mod.id];
            return (
              <div key={mod.id} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? '' : mod.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#FFFDF6] transition-colors"
                >
                  <span className="text-2xl shrink-0" aria-hidden>{mod.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold">{mod.eyebrow}</span>
                      <span className="text-[9px] font-mono text-[#161616]/40">{mod.minutes} min</span>
                    </span>
                    <span className={`block font-display text-lg md:text-xl font-bold tracking-tight ${isDone ? 'text-[#161616]/45' : 'text-[#161616]'}`}>
                      {i + 1}. {mod.title}
                    </span>
                    <span className="block text-[13px] text-[#3A3733] font-body mt-0.5">{mod.summary}</span>
                  </span>
                  <span className={`text-[#161616] text-xl leading-none transition-transform shrink-0 ${isOpen ? 'rotate-45' : ''}`} aria-hidden>+</span>
                </button>

                {isOpen && (
                  <div className="px-5 md:px-6 pb-6 pt-1 border-t border-[#161616]/10">
                    <div className="space-y-5 mt-4">
                      {mod.blocks.map((block, bi) => (
                        <Block key={bi} block={block} />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold transition-all ${
                        isDone
                          ? 'bg-emerald-500 text-white border-[#161616] shadow-[2px_2px_0_0_#161616]'
                          : 'bg-white text-[#161616] border-[#161616] hover:bg-[#FFF8E6]'
                      }`}
                    >
                      {isDone ? '✓ Done' : 'Mark this module done'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* First week checklist */}
        <div className="bg-[#F5B700] border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-7 md:p-8 mt-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616] font-mono font-bold block mb-2">
            Your first week
          </span>
          <h2 className="font-display text-2xl font-black text-[#161616] tracking-tight mb-5">
            Tick these off as you go
          </h2>
          <ul className="space-y-2.5">
            {FIRST_WEEK.map((task) => {
              const checked = !!doneTasks[task.id];
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    aria-pressed={checked}
                    className="w-full flex items-start gap-3 text-left bg-white/70 hover:bg-white border-2 border-[#161616] rounded-xl px-4 py-3 transition-colors"
                  >
                    <span className={`mt-0.5 w-5 h-5 rounded-md border-2 border-[#161616] flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-500' : 'bg-white'}`}>
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-sans font-bold text-[15px] ${checked ? 'text-[#161616]/45 line-through' : 'text-[#161616]'}`}>{task.label}</span>
                      <span className="block text-[13px] text-[#161616]/70 font-body mt-0.5">{task.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Glossary */}
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-7 md:p-8 mt-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-2">
            Plain-English glossary
          </span>
          <h2 className="font-display text-2xl font-black text-[#161616] tracking-tight mb-5">
            Words you will hear
          </h2>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt className="font-sans font-bold text-[#161616] text-sm">{g.term}</dt>
                <dd className="text-[13px] text-[#3A3733] font-body leading-5 mt-0.5">{g.def}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-center text-[#161616]/45 font-body text-sm mt-8">
          Stuck on anything? Ask Sarah. Nobody expects you to know it all in week one.{' '}
          <Link href="/admin" className="text-[#1E50C8] font-semibold hover:text-[#161616]">
            Back to the command center
          </Link>
        </p>
      </main>
    </div>
  );
}

function Block({ block }: { block: GuideBlock }) {
  return (
    <div>
      {block.heading && (
        <h3 className="font-sans font-bold text-[#161616] text-[15px] tracking-tight mb-1.5">{block.heading}</h3>
      )}
      {block.body && <p className="text-[#3A3733] font-body text-sm leading-relaxed">{block.body}</p>}
      {block.bullets && (
        <ul className="mt-2 space-y-1.5">
          {block.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-[#3A3733] font-body leading-relaxed">
              <span className="text-[#F5B700] font-bold shrink-0 mt-0.5" aria-hidden>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
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
