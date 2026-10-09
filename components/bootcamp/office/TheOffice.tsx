'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import {
  CHIEF,
  DAY3_AGENTS,
  OFFICE_AGENT_COUNT,
  OFFICE_DEPTS,
  OFFICE_PLAYBOOKS,
  OFFICE_PRESETS,
  OFFICE_SKILL_COUNT,
  deptOf,
  routeJob,
  type OfficeAgent,
  type Routed,
} from '@/data/bootcamp-office';
import { bootcampDays, bootcampTiers, usd } from '@/data/bootcamp';
import { btn } from '@/components/bootcamp/ui';
import s from './TheOffice.module.css';

/**
 * THE OFFICE. The crew that runs Modern Mustard Seed, every desk on one floor,
 * and a console where a visitor hands it a job. The chief of staff takes the
 * job, the desks that own it light up, a work order prints, and the card under
 * it names which of the two Day 3 agents that job points at.
 *
 * It renders a routed job at rest (the first preset), so the first frame, the
 * thumbnail and a no-JS reader all see the office working. Routing is local
 * keyword scoring (data/bootcamp-office.ts): no model call, nothing sent.
 */

type Props = {
  /** Where the buttons under the work order send people. */
  cta?: 'bootcamp' | 'masterclass';
};

const initialsOf = (title: string) =>
  title
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/**
 * A two-letter code on every desk, unique across the floor: the initials, or
 * when two desks share them (Fullstack and Frontend Engineer), the first two
 * letters of the first word.
 */
const CODES: Map<string, string> = (() => {
  const all = [CHIEF, ...OFFICE_DEPTS.flatMap((d) => d.agents)];
  const count = new Map<string, number>();
  for (const a of all) count.set(initialsOf(a.title), (count.get(initialsOf(a.title)) ?? 0) + 1);
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const a of all) {
    let c = initialsOf(a.title);
    if ((count.get(c) ?? 0) > 1) {
      const w = a.title.replace(/[^A-Za-z]/g, '');
      c = (w[0] + w[1]).toUpperCase();
      for (let i = 2; used.has(c) && i < w.length; i += 1) c = (w[0] + w[i]).toUpperCase();
    }
    used.add(c);
    out.set(a.id, c);
  }
  return out;
})();

/** A stable four-digit order number for a job, so the same job prints the same ticket. */
function orderNo(job: string): string {
  let h = 7;
  for (const ch of job.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 9000;
  return String(1000 + h);
}

const DISPATCH_MS = 750;

export default function TheOffice({ cta = 'bootcamp' }: Props) {
  const inputId = useId();
  const liveId = useId();
  const [job, setJob] = useState<string>(OFFICE_PRESETS[0]);
  const [draft, setDraft] = useState('');
  const [routed, setRouted] = useState<Routed>(() => routeJob(OFFICE_PRESETS[0]));
  const [phase, setPhase] = useState<'rest' | 'dispatching' | 'done'>('rest');
  const [run, setRun] = useState(0);
  const [selected, setSelected] = useState<OfficeAgent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticketRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const order = useMemo(() => new Map(routed.agents.map((a, i) => [a.id, i])), [routed]);
  const hotRooms = useMemo(() => new Set(routed.agents.map((a) => deptOf(a.id)?.key)), [routed]);
  const day3 = DAY3_AGENTS[routed.day3];
  const ga = bootcampTiers[0];

  function dispatch(text: string) {
    const clean = text.trim().slice(0, 140);
    if (!clean) return;
    if (timer.current) clearTimeout(timer.current);
    setJob(clean);
    setSelected(null);
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const land = () => {
      setRouted(routeJob(clean));
      setPhase('done');
      setRun((n) => n + 1);
      // On a phone the ticket sits under the floor; bring it into view.
      if (window.innerWidth < 1024) ticketRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    };
    if (reduce) return land();
    setPhase('dispatching');
    timer.current = setTimeout(land, DISPATCH_MS);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    dispatch(draft);
  }

  const dispatching = phase === 'dispatching';
  const lit = !dispatching;

  return (
    <section id="office" className={`${s.floor} scroll-mt-20 border-y-2 border-[#141210]`} aria-labelledby="office-heading">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        {/* Heading and the numbers */}
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-12 items-end">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#e8ecd0] font-bold mb-3">The office · you walk it live on Day 1</p>
            <h2 id="office-heading" className="font-display text-[34px] sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.02] text-balance">
              One builder at the desk. <span className="italic" style={{ color: '#f5b700' }}>{OFFICE_AGENT_COUNT} agents</span> on the floor.
            </h2>
            <p className="font-body text-[17px] text-[#fcfaf3]/80 leading-relaxed mt-5 max-w-2xl">
              This is the real crew that runs Modern Mustard Seed today. Every desk is a Claude agent with one job and a charter it cannot break. Hand them a job from your own week and watch who picks it up.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[
              [String(OFFICE_AGENT_COUNT), 'agents with charters'],
              [String(OFFICE_DEPTS.length), 'departments'],
              [String(OFFICE_SKILL_COUNT), 'skills they follow'],
              ['1', 'person who says yes'],
            ].map(([n, label]) => (
              <div key={label} className="rounded-[4px] border border-[#e8ecd0]/25 bg-[#141210]/70 px-4 py-3">
                <dt className="sr-only">{label}</dt>
                <dd className="m-0">
                  <span className="block font-display text-3xl md:text-4xl font-black text-[#f5b700] leading-none tabular-nums">{n}</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#fcfaf3]/65 mt-2">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-12 grid lg:grid-cols-[1.35fr_1fr] gap-8 items-start">
          {/* THE FLOOR */}
          <div className={`min-w-0 ${dispatching ? '' : s.dim}`}>
            <div className={`${s.chief} ${dispatching ? s.chiefPulse : ''} flex flex-wrap items-center gap-4 px-4 py-3 mb-3`}>
              <span className="grid place-items-center w-11 h-11 rounded-full bg-[#f5b700] text-[#141210] font-display font-black text-lg shrink-0" aria-hidden="true">S</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#f5b700] font-bold">The director · Sarah</p>
                <p className="font-body text-sm text-[#fcfaf3]/80 leading-snug">Decides what should exist. Says yes.</p>
              </div>
              <span aria-hidden="true" className="hidden sm:block font-mono text-[#f5b700]/60">→</span>
              <button
                type="button"
                onClick={() => setSelected(CHIEF)}
                aria-pressed={selected?.id === CHIEF.id}
                className="min-w-0 flex-1 text-left rounded-lg border border-[#f5b700]/40 px-3 py-2 hover:border-[#f5b700] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8ecd0]"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#f5b700] font-bold">{dispatching ? 'Routing the job' : 'Chief of Staff'}</p>
                <p className={`font-body text-sm text-[#fcfaf3]/80 leading-snug ${dispatching ? s.caret : ''}`}>{dispatching ? 'Reading it, picking desks' : 'Takes every job first'}</p>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {OFFICE_DEPTS.map((d) => (
                <div
                  key={d.key}
                  className={`${s.room} ${lit && hotRooms.has(d.key) ? s.hot : ''}`}
                  style={{ '--dept': d.color } as CSSProperties}
                >
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#fcfaf3]/75 font-bold pl-1.5 leading-tight min-h-[2.4em]">
                    {d.name} <span className="text-[#fcfaf3]/40">· {d.agents.length}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2 pl-1.5">
                    {d.agents.map((a, i) => {
                      const n = order.get(a.id);
                      const isLit = lit && n !== undefined;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={`${s.desk} ${isLit ? s.lit : ''}`}
                          style={{ '--d': `${(i * 0.37) % 4}s`, '--lag': `${(n ?? 0) * 0.12}s` } as CSSProperties}
                          aria-label={`${a.title}, ${d.name}${isLit ? `, assigned ${n! + 1}` : ''}`}
                          aria-pressed={selected?.id === a.id}
                          onClick={() => setSelected(a)}
                          title={a.title}
                          data-run={isLit ? run : undefined}
                        >
                          {CODES.get(a.id)}
                          {isLit && <span className={s.badge}>{n! + 1}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="rounded-[4px] border border-dashed border-[#e8ecd0]/30 p-3 grid place-items-center text-center">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#e8ecd0]/80 leading-relaxed">Your office<br />opens Day 3</p>
              </div>
            </div>

            <div className="mt-4 rounded-[4px] border border-[#e8ecd0]/25 bg-[#141210]/80 px-4 py-3 min-h-[72px]" aria-live="polite">
              {selected ? (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#e8ecd0] font-bold">
                    {selected.title} · {selected.id === CHIEF.id ? 'Strategy and Money' : deptOf(selected.id)?.name}
                  </p>
                  <p className="font-body text-[15px] text-[#fcfaf3]/90 leading-snug mt-1">{selected.does}</p>
                </>
              ) : (
                <p className="font-body text-[15px] text-[#fcfaf3]/60 leading-snug">Tap any desk to see its one job.</p>
              )}
            </div>
          </div>

          {/* THE CONSOLE AND THE WORK ORDER */}
          <div className="min-w-0 lg:sticky lg:top-24 grid gap-6">
            <form onSubmit={onSubmit} className="rounded-[4px] border-2 border-[#f5b700] bg-[#141210] p-5 shadow-[6px_6px_0_0_#f5b700]">
              <label htmlFor={inputId} className="block font-mono text-[10px] uppercase tracking-[0.28em] text-[#f5b700] font-bold mb-3">
                Hand the crew a job from your week
              </label>
              <div className="flex gap-2">
                <input
                  id={inputId}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={140}
                  placeholder="We miss calls after 5 PM"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-lg border-2 border-[#e8ecd0]/50 bg-[#0a0908] px-3.5 py-3 font-body text-[15px] text-[#fcfaf3] placeholder:text-[#fcfaf3]/35 outline-none focus:border-[#f5b700]"
                  aria-describedby={liveId}
                />
                <button type="submit" className={`${btn.gold} !px-5 shrink-0`} disabled={dispatching || !draft.trim()}>
                  Dispatch
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4" aria-label="Or pick a job">
                {OFFICE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setDraft(p);
                      dispatch(p);
                    }}
                    disabled={dispatching}
                    className={`rounded-full border px-3 py-1.5 font-body text-[13px] leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8ecd0] ${
                      job === p ? 'border-[#f5b700] bg-[#f5b700] text-[#141210] font-semibold' : 'border-[#e8ecd0]/35 text-[#fcfaf3]/85 hover:border-[#e8ecd0]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </form>

            <div ref={ticketRef} key={run} className={`${s.ticket} ${run > 0 ? s.print : ''} p-5 sm:p-6 scroll-mt-24`} id={liveId} aria-live="polite">
              <div className="flex items-baseline justify-between gap-3 border-b-2 border-dashed border-[#141210]/25 pb-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#0f4c47]">Work order {orderNo(job)}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#141210]/55">{dispatching ? 'Routing' : 'Routed by Chief of Staff'}</p>
              </div>
              <p className="font-display text-xl sm:text-2xl font-black leading-tight mt-4 text-balance">&ldquo;{job}&rdquo;</p>
              {dispatching ? (
                <p className={`font-mono text-xs text-[#141210]/60 mt-4 ${s.caret}`}>Picking desks</p>
              ) : (
                <ol className="mt-4 grid gap-3">
                  {routed.agents.map((a, i) => {
                    const d = deptOf(a.id);
                    return (
                      <li key={a.id} className={`${s.line} grid grid-cols-[22px_1fr] gap-3`} style={{ '--lag': `${0.15 + i * 0.12}s` } as CSSProperties}>
                        <span className="grid place-items-center w-[22px] h-[22px] rounded-full bg-[#ff6f59] text-white font-mono text-[11px] font-bold mt-0.5">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-body font-bold text-[15px] leading-tight">
                            {a.title} <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#141210]/50 font-bold">· {d?.name}</span>
                          </p>
                          <p className="font-body text-[14px] text-[#141210]/75 leading-snug mt-0.5">{a.does}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              {!dispatching && !routed.matched && (
                <p className="font-body text-[13px] text-[#141210]/60 mt-3">No desk owns that word yet, so it goes to the three that turn a fuzzy job into a plan.</p>
              )}

              <div className="mt-5 rounded-[4px] bg-[#141210] text-[#fcfaf3] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#e8ecd0] font-bold">On Day 3 you build yours</p>
                <p className="font-display text-lg font-black mt-1.5 text-[#f5b700]">{day3.name}</p>
                <p className="font-body text-[14px] text-[#fcfaf3]/85 leading-snug mt-1">{day3.does} For your business, working by the end of the session.</p>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                {cta === 'masterclass' ? (
                  <a href="#register" className={btn.dark}>Save my free seat</a>
                ) : (
                  <>
                    <Link href="/bootcamp/masterclass" className={btn.dark}>Watch them work, free</Link>
                    <a href="#tiers" className={btn.white}>Take a seat, {usd(ga.priceCents)}</a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* THE PLAYBOOKS */}
        <div className="mt-12 border-t border-[#e8ecd0]/20 pt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e8ecd0] font-bold">
            {OFFICE_SKILL_COUNT} skills: the playbooks every desk follows the same way every time
          </p>
          <ul className="flex flex-wrap gap-2 mt-4">
            {OFFICE_PLAYBOOKS.map((p) => (
              <li key={p} className="rounded-md border border-[#fcfaf3]/15 bg-[#fcfaf3]/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#fcfaf3]/75">
                {p}
              </li>
            ))}
          </ul>
          <p className="font-body text-sm text-[#fcfaf3]/55 mt-6 max-w-3xl">
            You see the org chart, the charters and the skills on screen on Day 1, {bootcampDays[0].dateLabel}, and you leave Day 3 with the first two desks of your own.
          </p>
        </div>
      </div>
    </section>
  );
}
