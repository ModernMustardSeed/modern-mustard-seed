'use client';

/**
 * THE LAUNCH DECK. The gated MUSTARD LAUNCH app. Three panes:
 *   Deck  the mission map (checkable, tied to their Blueprint) + Launch Day countdown
 *   Kit   their generated Launch Kit (names, positioning, offer, 30/60/90, copy)
 *   Coach Mr. Mustard live (Launch Room only; the Kit tier sees the upgrade)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LAUNCH_PHASES } from '@/data/mustard-launch';
import type { LaunchTier, Blueprint, LaunchKit } from '@/lib/mustard-launch';

type Tab = 'deck' | 'kit' | 'coach';
type Msg = { role: 'user' | 'assistant'; content: string };

export default function LaunchDeck({
  tier,
  email,
  savedIdea,
  savedOneLiner,
  savedBlueprint,
  initialDone,
  initialLaunchDate,
  hasKit,
}: {
  tier: LaunchTier;
  email: string;
  savedIdea: string | null;
  savedOneLiner: string | null;
  savedBlueprint: Blueprint | null;
  initialDone: Record<string, boolean>;
  initialLaunchDate: string | null;
  hasKit: boolean;
}) {
  const [tab, setTab] = useState<Tab>('deck');
  const [done, setDone] = useState<Record<string, boolean>>(initialDone || {});
  const [launchDate, setLaunchDate] = useState<string>(initialLaunchDate || '');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Missions come from the founder's Blueprint when present, else the phase blurb.
  const phaseMissions = LAUNCH_PHASES.map((p) => {
    const bp = savedBlueprint?.phases.find((x) => x.phaseId === p.id);
    const missions = bp && bp.missions.length ? bp.missions.map((m) => m.title) : [p.title];
    return { phase: p, missions };
  });
  const allKeys = phaseMissions.flatMap((pm) => pm.missions.map((_, i) => `${pm.phase.id}:${i}`));
  const doneCount = allKeys.filter((k) => done[k]).length;
  const pct = allKeys.length ? Math.round((doneCount / allKeys.length) * 100) : 0;

  const persist = useCallback((nextDone: Record<string, boolean>, nextDate: string) => {
    try {
      localStorage.setItem(`mustard_launch_${email}`, JSON.stringify({ done: nextDone, launchDate: nextDate }));
    } catch {
      /* ignore */
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/mustard-launch/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: nextDone, launchDate: nextDate || null }),
      }).catch(() => {});
    }, 600);
  }, [email]);

  function toggle(key: string) {
    setDone((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persist(next, launchDate);
      return next;
    });
  }
  function setDate(v: string) {
    setLaunchDate(v);
    persist(done, v);
  }

  const daysToLaunch = launchDate ? Math.ceil((new Date(launchDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      {/* Top HUD bar */}
      <header className="sticky top-0 z-20 bg-[#080C16] text-[#FBF6EA] border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-grid place-items-center w-8 h-8 rounded-[50%_50%_50%_6px] bg-[#F5B700] border-2 border-[#161616] -rotate-6 text-[#161616] text-xs font-bold shrink-0">▲</span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.16em] text-[#F5B700] uppercase">Launch Deck</p>
              <p className="font-sans text-sm truncate">{savedOneLiner || savedIdea || 'Your launch'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="font-mono text-[10px] text-[#FBF6EA]/60 uppercase tracking-wider">Launch progress</p>
              <p className="font-mono font-bold text-[#7CFF9B] text-sm">{pct}% · {doneCount}/{allKeys.length}</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider bg-[#F5B700] text-[#161616] border border-[#161616] rounded px-2 py-1">
              {tier === 'room' ? 'Room' : 'Kit'}
            </span>
          </div>
        </div>
        {/* tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1">
          {(['deck', 'kit', 'coach'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-xs uppercase tracking-[0.12em] px-4 py-2.5 border-t-2 border-x-2 rounded-t-md -mb-[2px] transition-colors ${
                tab === t ? 'bg-[#FBF6EA] text-[#161616] border-[#161616]' : 'bg-transparent text-[#FBF6EA]/60 border-transparent hover:text-[#FBF6EA]'
              }`}
            >
              {t === 'deck' ? 'Mission Deck' : t === 'kit' ? 'Launch Kit' : 'Coach'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'deck' && (
          <div>
            {/* Launch Day */}
            <div className="pop-card p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#E0301E] uppercase">Target Launch Day</p>
                <h2 className="font-display font-extrabold text-2xl text-[#161616] mt-1">
                  {daysToLaunch === null ? 'Set your launch date' : daysToLaunch > 0 ? `T minus ${daysToLaunch} days` : daysToLaunch === 0 ? 'Launch Day is today. Go.' : 'You are past your date. Reset it and push.'}
                </h2>
              </div>
              <input
                type="date"
                value={launchDate}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border-2 border-[#161616] bg-white px-4 py-2.5 font-mono text-sm shadow-[3px_3px_0_0_#161616]"
              />
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-3 w-full rounded-full border-2 border-[#161616] bg-white overflow-hidden">
                <div className="h-full bg-[#F5B700] transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Mission map */}
            <div className="space-y-4">
              {phaseMissions.map(({ phase, missions }) => {
                const phaseKeys = missions.map((_, i) => `${phase.id}:${i}`);
                const phaseDone = phaseKeys.filter((k) => done[k]).length;
                const complete = phaseDone === phaseKeys.length;
                return (
                  <div key={phase.id} className={`pop-card p-5 ${complete ? 'bg-[#F5B700]/10' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-xs font-bold bg-[#161616] text-[#F5B700] border border-[#161616] rounded px-2 py-0.5">{phase.code}</span>
                      <span className="font-mono text-[10px] tracking-[0.12em] text-[#E0301E] uppercase font-bold">{phase.system}</span>
                      <span className="ml-auto font-mono text-[11px] text-[#161616]/50">{phaseDone}/{phaseKeys.length}{complete ? ' · GO ✓' : ''}</span>
                    </div>
                    <h3 className="font-display font-bold text-xl text-[#161616]">{phase.title}</h3>
                    <ul className="mt-3 space-y-2">
                      {missions.map((m, i) => {
                        const key = `${phase.id}:${i}`;
                        return (
                          <li key={key}>
                            <button onClick={() => toggle(key)} className="flex items-start gap-3 text-left w-full group">
                              <span className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 border-[#161616] grid place-items-center text-xs font-bold transition-colors ${done[key] ? 'bg-[#F5B700] text-[#161616]' : 'bg-white text-transparent group-hover:bg-[#F5B700]/20'}`}>
                                ✓
                              </span>
                              <span className={`font-sans text-[15px] ${done[key] ? 'text-[#161616]/45 line-through' : 'text-[#161616]/85'}`}>{m}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'kit' && <KitPane tier={tier} hasKit={hasKit} savedIdea={savedIdea} />}
        {tab === 'coach' && <CoachPane tier={tier} savedIdea={savedIdea} />}
      </main>
    </div>
  );
}

// ── Kit pane ────────────────────────────────────────────────────────────────

function KitPane({ tier, hasKit, savedIdea }: { tier: LaunchTier; hasKit: boolean; savedIdea: string | null }) {
  const [kit, setKit] = useState<LaunchKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hasKit) { setLoaded(true); return; }
    fetch('/api/mustard-launch/kit')
      .then((r) => r.json())
      .then((d) => setKit(d.kit ?? null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [hasKit]);

  async function generate(regenerate = false) {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/mustard-launch/kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.kit) {
        setErr(data?.message || 'Mr. Mustard could not assemble the Kit. Try again in a moment.');
        return;
      }
      setKit(data.kit);
    } catch {
      setErr('Network hiccup. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) return <p className="font-mono text-sm text-[#161616]/60">Loading your Kit…</p>;

  if (!kit) {
    return (
      <div className="pop-card p-8 text-center max-w-xl mx-auto">
        <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#E0301E] uppercase">Your Launch Kit</p>
        <h2 className="font-display font-extrabold text-3xl text-[#161616] mt-2">Generate your whole launch package</h2>
        <p className="font-sans text-[#161616]/70 mt-3">
          {savedIdea ? `Mr. Mustard will build it from your idea: "${savedIdea.slice(0, 80)}${savedIdea.length > 80 ? '…' : ''}".` : 'Run a free Blueprint first so Mr. Mustard knows what you are launching, or he will ask.'}
        </p>
        <button
          onClick={() => generate(false)}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] px-6 py-3 font-sans font-bold text-[#161616] shadow-[4px_4px_0_0_#161616] transition-transform hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616] disabled:opacity-60"
        >
          {loading ? 'Assembling your Kit…' : '▲ Generate my Launch Kit'}
        </button>
        {err && <p className="mt-3 font-mono text-xs text-[#E0301E]">{err}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-extrabold text-2xl text-[#161616]">Your Launch Kit</h2>
        {tier === 'room' && (
          <button onClick={() => generate(true)} disabled={loading} className="font-mono text-xs text-[#1E50C8] underline underline-offset-4 disabled:opacity-50">
            {loading ? 'regenerating…' : 'regenerate'}
          </button>
        )}
      </div>

      {kit.names.length > 0 && (
        <KitCard title="Name directions">
          <div className="grid sm:grid-cols-3 gap-3">
            {kit.names.map((n, i) => (
              <div key={i} className="rounded-lg border-2 border-[#161616] bg-white p-3">
                <p className="font-display font-bold text-lg">{n.name}</p>
                <p className="font-sans text-xs text-[#161616]/65 mt-1">{n.rationale}</p>
              </div>
            ))}
          </div>
        </KitCard>
      )}

      {(kit.positioning || kit.oneLiner) && (
        <KitCard title="Positioning">
          {kit.oneLiner && <p className="font-serif italic text-xl text-[#161616]">“{kit.oneLiner}”</p>}
          {kit.positioning && <p className="font-sans text-[#161616]/80 mt-2">{kit.positioning}</p>}
        </KitCard>
      )}

      {kit.offer?.name && (
        <KitCard title="Your first offer">
          <p className="font-display font-bold text-lg">{kit.offer.name} <span className="font-mono text-sm text-[#E0301E]">{kit.offer.price}</span></p>
          <ul className="mt-2 space-y-1">
            {kit.offer.whatYouGet.map((w, i) => (
              <li key={i} className="flex gap-2 font-sans text-[15px] text-[#161616]/80"><span className="text-[#F5B700]">✦</span>{w}</li>
            ))}
          </ul>
          {kit.offer.rationale && <p className="font-sans text-sm text-[#161616]/60 mt-2">{kit.offer.rationale}</p>}
        </KitCard>
      )}

      {kit.plan.length > 0 && (
        <KitCard title="Your 30 / 60 / 90 plan">
          <div className="grid sm:grid-cols-3 gap-3">
            {kit.plan.map((p, i) => (
              <div key={i} className="rounded-lg border-2 border-[#161616] bg-white p-3">
                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#1E50C8] uppercase">{p.window}</p>
                <p className="font-sans font-bold text-sm mt-1">{p.focus}</p>
                <ul className="mt-2 space-y-1">
                  {p.moves.map((m, j) => (
                    <li key={j} className="font-sans text-[13px] text-[#161616]/75">• {m}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </KitCard>
      )}

      {kit.copy && (
        <KitCard title="Copy, ready to paste">
          <CopyBlock label="Business bio" text={kit.copy.bio} />
          <CopyBlock label="Launch announcement" text={kit.copy.announcement} />
          <CopyBlock label="First email" text={kit.copy.firstEmail} />
          <CopyBlock label="Elevator pitch" text={kit.copy.elevatorPitch} />
        </KitCard>
      )}
    </div>
  );
}

function KitCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pop-card p-5">
      <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#E0301E] uppercase mb-3">{title}</p>
      {children}
    </div>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <div className="mt-3 first:mt-0">
      <div className="flex items-center justify-between">
        <p className="font-sans font-bold text-sm text-[#161616]">{label}</p>
        <button
          onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="font-mono text-[10px] uppercase tracking-wider text-[#1E50C8] hover:underline"
        >
          {copied ? 'copied ✓' : 'copy'}
        </button>
      </div>
      <p className="font-sans text-[14px] text-[#161616]/80 mt-1 whitespace-pre-wrap rounded-lg border border-[#161616]/15 bg-white/60 p-3">{text}</p>
    </div>
  );
}

// ── Coach pane ──────────────────────────────────────────────────────────────

function CoachPane({ tier, savedIdea }: { tier: LaunchTier; savedIdea: string | null }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: savedIdea ? `You are launching ${savedIdea.slice(0, 90)}. Tell me where you are stuck, or say "what's next" and I will give you the single next move.` : 'Tell me what you are launching and I will get you moving. What is the business?' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (tier !== 'room') {
    return (
      <div className="pop-card p-8 text-center max-w-xl mx-auto">
        <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#E0301E] uppercase">The live coach</p>
        <h2 className="font-display font-extrabold text-3xl text-[#161616] mt-2">Mr. Mustard, live, in the Launch Room</h2>
        <p className="font-sans text-[#161616]/70 mt-3">
          The live coach is part of the Launch Room. Open the Room and Mr. Mustard works your launch with you, mission by mission, regenerating assets as it takes shape.
        </p>
        <Link
          href="/mustard-launch#ladder"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] px-6 py-3 font-sans font-bold text-[#161616] shadow-[4px_4px_0_0_#161616] transition-transform hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616]"
        >
          Open the Launch Room
        </Link>
      </div>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/mustard-launch/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: 'I hit a snag reaching mission control. Say that again in a moment.' }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Network hiccup. Try that again.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pop-card p-0 overflow-hidden flex flex-col h-[70vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 font-sans text-[15px] ${m.role === 'user' ? 'bg-[#161616] text-[#FBF6EA]' : 'bg-[#F5B700]/15 border border-[#161616]/15 text-[#161616]'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && <p className="font-mono text-xs text-[#161616]/50">Mr. Mustard is thinking…</p>}
      </div>
      <form onSubmit={send} className="border-t-2 border-[#161616] p-3 flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach anything, or say what's next…"
          className="flex-1 rounded-lg border-2 border-[#161616] px-3.5 py-2.5 font-sans text-sm focus:outline-none"
        />
        <button type="submit" disabled={sending} className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-5 py-2.5 font-sans font-bold text-[#161616] shadow-[3px_3px_0_0_#161616] disabled:opacity-60">
          Send
        </button>
      </form>
    </div>
  );
}
