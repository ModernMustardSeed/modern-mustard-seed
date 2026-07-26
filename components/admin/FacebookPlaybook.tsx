'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { FB_PLAYBOOK } from '@/data/facebook-playbook';

/**
 * Main Street AI: the Facebook organic playbook, in-app so Sarah never has to
 * track the standalone artifact link. Renders entirely from
 * data/facebook-playbook.ts, which is generated from the source markdown +
 * JSON by social-drafts/blotato/facebook/build-artifact.mjs. To change copy,
 * edit the source files and re-run that script; never hand-edit here.
 *
 * Five tabs: Start Here (Page vs Group, finding members), the 24 Reels (with a
 * fullscreen teleprompter for shooting), the 30 scheduled posts, the group
 * setup blocks, and the mechanical growth checklist. Shot/habit checkboxes
 * persist in localStorage.
 */

const { startHere, reels, posts, group, tactics, postWindow } = FB_PLAYBOOK;

type SubTab = 'start' | 'reels' | 'posts' | 'group' | 'growth';
const TABS: { key: SubTab; label: string }[] = [
  { key: 'start', label: 'Start Here' },
  { key: 'reels', label: `Reels · ${reels.length}` },
  { key: 'posts', label: `Posts · ${posts.length}` },
  { key: 'group', label: 'The Group' },
  { key: 'growth', label: 'Growth' },
];

const CHECK_KEY = 'mms-fb-checks';

function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((s, i) => (i % 2 ? <strong key={i} className="font-extrabold">{s}</strong> : <span key={i}>{s}</span>))}</>;
}

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}
      className="text-[11px] uppercase tracking-[0.14em] font-sans font-bold text-[#161616] px-3.5 py-2 rounded-lg border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform active:translate-y-0"
    >
      {done ? 'Copied' : label}
    </button>
  );
}

const shotChip = (s: string) =>
  s === 'FACE' ? 'bg-[#F5B700] text-[#161616] border-[#161616]'
    : s === 'SCREEN' ? 'bg-[#1E50C8] text-white border-[#1E50C8]'
      : 'bg-white text-[#161616] border-[#161616]';

export default function FacebookPlaybook() {
  const [tab, setTab] = useState<SubTab>('start');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [prompter, setPrompter] = useState<number | null>(null); // reel index

  useEffect(() => {
    try { setChecks(JSON.parse(localStorage.getItem(CHECK_KEY) || '{}')); } catch { /* first run */ }
  }, []);

  const toggle = (id: string) => {
    setChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(CHECK_KEY, JSON.stringify(next)); } catch { /* storage full/blocked */ }
      return next;
    });
  };

  const shotCount = reels.filter((r) => checks[`R${r.n}`]).length;

  // Teleprompter keyboard nav.
  useEffect(() => {
    if (prompter === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPrompter(null);
      if (e.key === 'ArrowRight') setPrompter((p) => (p !== null && p < reels.length - 1 ? p + 1 : p));
      if (e.key === 'ArrowLeft') setPrompter((p) => (p !== null && p > 0 ? p - 1 : p));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [prompter]);

  const chip = (active: boolean) =>
    `whitespace-nowrap text-[11px] uppercase tracking-[0.14em] font-sans font-bold px-3.5 py-2 rounded-lg border-2 transition-transform ${
      active
        ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]'
        : 'border-[#161616]/15 bg-[#FBF6EA] text-[#161616]/65 hover:border-[#161616] hover:text-[#161616]'
    }`;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="facebook" title="Facebook" />

      {/* Sub-tab switcher. NOT sticky: AdminHeader already owns top-0, and a
          second sticky bar at the same offset paints over it on mobile (the
          AdsPlaybook campaign switcher hit this and dropped sticky too). */}
      <div className="bg-[#FBF6EA] border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5 md:px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={chip(tab === t.key)}>
              {t.label}
            </button>
          ))}
          {tab === 'reels' && (
            <span className="ml-auto shrink-0 text-[11px] uppercase tracking-[0.12em] font-mono font-bold text-[#8f6600] tabular-nums">
              {shotCount} / {reels.length} shot
            </span>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-5 md:px-6 py-8">
        {/* Masthead + blocker */}
        <header className="mb-7">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Main Street AI · Organic</span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold mt-1.5">The Facebook playbook</h2>
          <p className="text-[#161616]/70 mt-2 max-w-2xl font-sans">
            {reels.length} Reels, {posts.length} scheduled posts, and the group. Everything to shoot a batch and run the lane.
            Posts run {postWindow.start} through {postWindow.end}.
          </p>
          <div className="mt-4 bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4 max-w-2xl">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8f6600] font-mono font-bold block mb-1">Before anything schedules</span>
            <p className="text-sm text-[#161616]/80 font-sans">
              Blotato only holds your personal Facebook profile, not the MMS Page. Pull the Page ID from Meta Business Suite,
              reconnect Facebook with Page access, then set <code className="font-mono text-[#1E50C8]">FB_PAGE_ID</code>. Reels are posted by hand from the phone either way.
            </p>
          </div>
        </header>

        {/* START HERE */}
        {tab === 'start' && (
          <div className="space-y-5">
            <p className="text-sm text-[#161616]/65 font-sans max-w-2xl">
              Read this once. It answers the two questions everyone has: do I post to my Page or a new group (both, they do different jobs),
              and how do I get the first members.
            </p>
            {startHere.map((b) => (
              <section key={b.h} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 md:p-6">
                <h3 className="font-display text-xl md:text-2xl font-extrabold mb-3 text-balance">{b.h}</h3>
                {b.paras.map((p, i) => (
                  <p key={i} className="text-[#161616]/85 font-sans mb-3 last:mb-0 leading-relaxed"><Bold text={p} /></p>
                ))}
                {b.list && (
                  <ol className={`mt-3 space-y-3 ${b.list.type === 'ul' ? 'list-none' : ''}`}>
                    {b.list.items.map((it, i) => (
                      <li key={i} className="flex gap-3 items-start font-sans text-[#161616]/85 leading-relaxed">
                        <span
                          aria-hidden
                          className={`shrink-0 mt-0.5 ${b.list!.type === 'ol'
                            ? 'w-6 h-6 flex items-center justify-center font-mono text-[12px] font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616]'
                            : 'w-2.5 h-2.5 mt-2 bg-[#F5B700] border-2 border-[#161616]'}`}
                        >
                          {b.list!.type === 'ol' ? i + 1 : ''}
                        </span>
                        <span><Bold text={it} /></span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>
        )}

        {/* REELS */}
        {tab === 'reels' && (
          <div className="space-y-5">
            <p className="text-sm text-[#161616]/65 font-sans max-w-2xl">
              Shoot 8 at a time, about 90 minutes. One take each, do not review between takes. Post natively from the Facebook app
              so you get trending audio, and never put a link in the caption.
            </p>
            {reels.map((r, idx) => {
              const done = !!checks[`R${r.n}`];
              return (
                <article key={r.n} className={`bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 md:p-6 transition-opacity ${done ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-[#E0301E] font-mono font-bold">R{r.n} · {r.pillar}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2 py-0.5 border-2 ${shotChip(r.shot)}`}>{r.shot}</span>
                      <span className="text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2 py-0.5 border-2 border-[#161616]/25 text-[#161616]/60 tabular-nums">{r.length}</span>
                      {r.ask && <span className="text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2 py-0.5 border-2 border-[#E0301E] bg-[#E0301E] text-white">ASK {r.ask}</span>}
                    </div>
                  </div>
                  <h3 className="font-display text-2xl font-extrabold mt-2 mb-4 text-balance">{r.title}</h3>

                  <div className="bg-[#F5B700] border-2 border-[#161616] p-4 mb-4">
                    <span className="text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/70 block mb-1.5">Hook · first 1.5 seconds</span>
                    <p className="font-sans font-bold text-lg text-[#161616] leading-snug">{r.hook}</p>
                    {r.onScreenHook && (
                      <div className="mt-2.5 pt-2.5 border-t border-[#161616]/25 text-sm font-semibold text-[#161616]">
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-70 mr-1.5">on screen</span>{r.onScreenHook}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 font-sans text-[#161616]/90 leading-relaxed">
                    {r.script.map((p, i) => <p key={i}>{p}</p>)}
                  </div>

                  {r.beats.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#161616]/12">
                      <span className="text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-[#8f6600] block mb-2">On-screen text beats</span>
                      <ol className="flex flex-wrap gap-1.5">
                        {r.beats.map((b, i) => (
                          <li key={i} className="text-[13px] font-sans px-2.5 py-1 border-2 border-[#161616]/12 bg-[#FBF6EA] leading-snug">
                            <span className="font-mono text-[10px] text-[#8f6600] mr-1.5 font-bold">{i + 1}</span>{b}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-[#161616]/12">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-[#8f6600] block mb-2">
                      Caption <span className="text-[#E0301E] tracking-[0.1em]">no link in the caption</span>
                    </span>
                    <p className="text-[15px] font-sans text-[#161616]/70 mb-3.5">{r.caption}</p>
                    <div className="flex gap-2.5 items-center flex-wrap">
                      <CopyBtn text={r.caption} label="Copy caption" />
                      <button
                        type="button"
                        onClick={() => setPrompter(idx)}
                        className="text-[11px] uppercase tracking-[0.14em] font-sans font-bold text-[#161616] px-3.5 py-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform active:translate-y-0"
                      >
                        Teleprompter
                      </button>
                      <label className="ml-auto flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] font-mono font-bold cursor-pointer select-none">
                        <input type="checkbox" checked={done} onChange={() => toggle(`R${r.n}`)} className="w-[18px] h-[18px] accent-[#F5B700] cursor-pointer" />
                        Shot
                      </label>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* POSTS */}
        {tab === 'posts' && (
          <div className="space-y-5">
            <p className="text-sm text-[#161616]/65 font-sans max-w-2xl">
              Scheduled Monday, Thursday and Saturday at 8am Mountain, {postWindow.start} through {postWindow.end}. These fire through
              Blotato once the Page ID is set. Exactly one of the thirty carries an ask.
            </p>
            {posts.map((p) => (
              <article key={p.id} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 md:p-6">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[#E0301E] font-mono font-bold">{p.pillar}</span>
                  <time className="text-[11px] font-mono text-[#161616]/60 tabular-nums">{p.dateLabel}</time>
                </div>
                <h3 className="font-display text-xl font-extrabold mt-1.5 mb-3 text-balance">{p.headline}</h3>
                <div className="space-y-2.5 font-sans text-[#161616]/85 text-[15px] leading-relaxed">
                  {p.fb.map((t, i) => <p key={i}>{t}</p>)}
                </div>
                {p.firstComment && (
                  <div className="mt-4 p-3.5 border-2 border-dashed border-[#161616]/20 bg-[#FBF6EA]">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-[#8f6600] block mb-1.5">Paste as the first comment</span>
                    <p className="text-sm text-[#161616]/70 font-sans">{p.firstComment}</p>
                  </div>
                )}
                <div className="mt-4 flex gap-2.5 items-center">
                  <CopyBtn text={p.fb.join('\n\n')} label="Copy post" />
                  {p.cta && <span className="text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2 py-1 border-2 border-[#E0301E] bg-[#E0301E] text-white">The ask</span>}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* GROUP */}
        {tab === 'group' && (
          <div className="space-y-5">
            <p className="text-sm text-[#161616]/65 font-sans max-w-2xl">
              Facebook makes you create the group by hand. Paste each block below. Join question three asks for an email, which builds a list
              Facebook cannot take away from you.
            </p>
            {group.map((b) => (
              <section key={b.label} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 md:p-6">
                <span className="text-[10px] uppercase tracking-[0.22em] text-[#E0301E] font-mono font-bold block mb-3">{b.label}</span>
                <div className="space-y-2.5 font-sans text-[#161616]/85 leading-relaxed">
                  {b.lines.map((l, i) => <p key={i}>{l}</p>)}
                </div>
                <div className="mt-4"><CopyBtn text={b.lines.join('\n')} /></div>
              </section>
            ))}
          </div>
        )}

        {/* GROWTH */}
        {tab === 'growth' && (
          <div className="space-y-5">
            <p className="text-sm text-[#161616]/65 font-sans max-w-2xl">
              Mechanical, not creative. Most people skip these and wonder why nothing works. Tick them off as they become habit.
            </p>
            <section className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 md:p-6">
              <ol className="space-y-3.5">
                {tactics.map((t, i) => {
                  const done = !!checks[`T${i}`];
                  return (
                    <li key={i}>
                      <label className="flex gap-3 items-start cursor-pointer select-none">
                        <input type="checkbox" checked={done} onChange={() => toggle(`T${i}`)} className="w-5 h-5 mt-0.5 shrink-0 accent-[#F5B700] cursor-pointer" />
                        <span className={`font-sans text-[#161616]/85 leading-relaxed ${done ? 'line-through opacity-55' : ''}`}>
                          <strong className="font-extrabold">{t.head}.</strong> {t.body}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        )}
      </main>

      {/* Teleprompter overlay */}
      {prompter !== null && (
        <div role="dialog" aria-modal="true" aria-label="Teleprompter" className="fixed inset-0 z-50 bg-[#080C16] text-[#F3EFE4] flex flex-col px-5 py-5">
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#F3EFE4]/20 shrink-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#F5B700] font-bold">R{reels[prompter].n} · {reels[prompter].title}</span>
            <button type="button" onClick={() => setPrompter(null)} className="font-mono text-[11px] uppercase tracking-[0.1em] font-bold border-2 border-[#F5B700] text-[#F5B700] px-3.5 py-1.5">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto py-6">
            <div className="bg-[#F5B700] text-[#161616] p-4 mb-6 font-extrabold" style={{ fontSize: 'clamp(21px,5vw,30px)', lineHeight: 1.28 }}>{reels[prompter].hook}</div>
            {reels[prompter].script.map((p, i) => (
              <p key={i} className="mb-6 font-semibold" style={{ fontSize: 'clamp(21px,5vw,30px)', lineHeight: 1.5 }}>{p}</p>
            ))}
          </div>
          <div className="flex gap-2.5 pt-3.5 border-t border-[#F3EFE4]/20 shrink-0">
            <button type="button" disabled={prompter === 0} onClick={() => setPrompter((p) => (p !== null && p > 0 ? p - 1 : p))} className="flex-1 font-mono text-[11px] uppercase tracking-[0.1em] font-bold border-2 border-[#F3EFE4]/40 py-3 disabled:opacity-30">Previous</button>
            <button type="button" disabled={prompter === reels.length - 1} onClick={() => setPrompter((p) => (p !== null && p < reels.length - 1 ? p + 1 : p))} className="flex-1 font-mono text-[11px] uppercase tracking-[0.1em] font-bold border-2 border-[#F3EFE4]/40 py-3 disabled:opacity-30">Next reel</button>
          </div>
        </div>
      )}
    </div>
  );
}
