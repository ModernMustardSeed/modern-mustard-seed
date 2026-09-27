'use client';

/**
 * THE LAUNCH SEQUENCE. The signature moment and the free tool in one. A founder
 * types their idea, gives an email to save the mission, and a T-minus countdown
 * runs while the systems flip GO and the plan assembles. At T-0 the Blueprint is
 * revealed (with a seed-confetti burst) and a branded PDF is one tap away.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { LAUNCH_PHASES } from '@/data/mustard-launch';
import type { Blueprint } from '@/lib/mustard-launch';

type Phase = 'idle' | 'running' | 'revealed' | 'error';

const SYSTEMS = LAUNCH_PHASES.map((p) => ({ code: p.code, label: p.system, id: p.id }));

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export default function LaunchConsole() {
  const [idea, setIdea] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [phase, setPhase] = useState<Phase>('idle');
  const [tick, setTick] = useState(0); // 0..6 systems online
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState('');
  const [confetti, setConfetti] = useState(false);
  const resultRef = useRef<{ blueprint: Blueprint; runId: string } | null>(null);
  const reduced = usePrefersReducedMotion();

  const reveal = useCallback(() => {
    const r = resultRef.current;
    if (!r) return;
    setBlueprint(r.blueprint);
    setRunId(r.runId);
    setPhase('revealed');
    if (!reduced) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 1400);
    }
  }, [reduced]);

  // Drive the countdown once we are running. Advances one system every 680ms.
  useEffect(() => {
    if (phase !== 'running') return;
    if (tick >= SYSTEMS.length) {
      if (resultRef.current) reveal();
      return; // hold at IGNITION until the fetch lands
    }
    const t = setTimeout(() => setTick((n) => n + 1), reduced ? 120 : 680);
    return () => clearTimeout(t);
  }, [phase, tick, reduced, reveal]);

  async function ignite(e: React.FormEvent) {
    e.preventDefault();
    if (phase === 'running') return;
    const cleanIdea = idea.trim();
    if (cleanIdea.length < 3) {
      setErrMsg('Tell Mr. Mustard what you are launching first.');
      setPhase('error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrMsg('Add a real email so we can save your mission and send the Blueprint.');
      setPhase('error');
      return;
    }
    setErrMsg('');
    resultRef.current = null;
    setTick(0);
    setPhase('running');

    try {
      const res = await fetch('/api/mustard-launch/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: cleanIdea, email: email.trim(), website }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrMsg(
          data?.message ||
            (res.status === 402
              ? 'You have used your free Blueprints. Get the Launch Kit below to build your whole launch.'
              : 'Mission control hit a snag. Try again in a moment.')
        );
        setPhase('error');
        return;
      }
      const data = (await res.json()) as { runId: string; blueprint: Blueprint };
      resultRef.current = { blueprint: data.blueprint, runId: data.runId };
      // If the countdown already finished, reveal now; otherwise the effect will.
      setTick((n) => {
        if (n >= SYSTEMS.length) setTimeout(reveal, 0);
        return n;
      });
    } catch {
      setErrMsg('Network hiccup. Check your connection and ignite again.');
      setPhase('error');
    }
  }

  const running = phase === 'running';
  const igniting = running && tick >= SYSTEMS.length;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#0d0d0d] bg-[radial-gradient(120%_130%_at_78%_8%,#2A2A2A,#0d0d0d_60%)] text-[#f1ede4] shadow-[8px_8px_0_0_#0d0d0d]">
      {/* halftone starfield */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.20) 1.4px, transparent 1.5px)', backgroundSize: '15px 15px' }}
      />
      {confetti && <SeedConfetti />}

      <div className="relative z-[2] p-5 sm:p-7 lg:p-9">
        {/* top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#ffd400]/35 pb-3">
          <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.18em] text-[#ffd400] uppercase">
            ◉ Mustard Launch · Mission Control
          </span>
          <span className="hidden sm:block font-mono text-[10px] tracking-[0.16em] text-[#f1ede4]/60 uppercase truncate max-w-[46%]">
            {idea ? `MISSION: "${idea.slice(0, 40)}"` : 'MISSION: STANDBY'}
          </span>
        </div>

        {phase !== 'revealed' ? (
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 pt-6">
            {/* left: headline + form */}
            <div>
              <p className="font-mono text-[11px] tracking-[0.16em] text-[#ffd400] uppercase">Free · no card · no meeting</p>
              <h2 className="font-display font-extrabold leading-[0.9] text-4xl sm:text-5xl lg:text-6xl mt-2">
                Your launch,
                <br />
                <span className="italic text-[#ffd400]">on the pad.</span>
              </h2>

              {running ? (
                <div className="mt-5">
                  <p className="font-mono font-bold text-2xl sm:text-3xl text-[#FFDD55] tracking-wider">
                    {igniting ? 'T - 00 : 00 : 00 · IGNITION' : `T - 00 : 00 : 0${SYSTEMS.length - tick}`}
                  </p>
                  <p className="font-sans text-[#f1ede4]/80 mt-3 max-w-sm">
                    {igniting ? 'Cleared for launch. Assembling your Blueprint.' : 'Standby. Mr. Mustard is building your launch, phase by phase.'}
                  </p>
                  <div className="mt-4 h-1.5 w-full max-w-sm rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#ffd400] transition-all duration-500" style={{ width: `${Math.min(100, (tick / SYSTEMS.length) * 100)}%` }} />
                  </div>
                </div>
              ) : (
                <form onSubmit={ignite} className="mt-6 space-y-3 max-w-md">
                  <p className="font-sans text-[#f1ede4]/82 text-[15px]">
                    Tell Mr. Mustard what you are starting. He builds your whole launch: brand, offer, money, presence, first customers, and counts you down to open.
                  </p>
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    rows={2}
                    maxLength={400}
                    placeholder="What are you launching? (e.g. a hand-poured candle studio, a budgeting app, a bookkeeping service)"
                    className="w-full resize-none rounded-lg border border-[#ffd400]/40 bg-white/[0.06] px-3.5 py-3 font-mono text-sm text-[#f1ede4] placeholder:text-[#f1ede4]/40 focus:outline-none focus:border-[#ffd400]"
                  />
                  {/* honeypot */}
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="hidden"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      className="flex-1 rounded-lg border border-[#ffd400]/40 bg-white/[0.06] px-3.5 py-3 font-mono text-sm text-[#f1ede4] placeholder:text-[#f1ede4]/40 focus:outline-none focus:border-[#ffd400]"
                    />
                    <button
                      type="submit"
                      className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#0d0d0d] bg-[#ffd400] px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider text-[#0d0d0d] shadow-[4px_4px_0_0_#000] transition-transform hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
                    >
                      ▲ Ignite
                    </button>
                  </div>
                  {phase === 'error' && <p className="font-mono text-xs text-[#FF8550]">{errMsg}</p>}
                  <p className="font-mono text-[10px] text-[#f1ede4]/45">We save your mission and send the Blueprint PDF. No spam, unsubscribe anytime.</p>
                </form>
              )}
            </div>

            {/* right: telemetry */}
            <div className="rounded-xl border border-[#ffd400]/30 bg-black/30 p-4">
              <h4 className="font-mono text-[11px] tracking-[0.2em] text-[#ffd400] uppercase mb-3">◉ Systems check</h4>
              <ul>
                {SYSTEMS.map((s, i) => {
                  const online = running && i < tick;
                  const arming = running && i === tick;
                  return (
                    <li key={s.id} className="flex items-center justify-between font-mono text-[12px] py-[6px] border-b border-dotted border-white/10 last:border-0">
                      <span className="text-[#f1ede4]/85">
                        {String(i + 1).padStart(2, '0')} · {s.label}
                      </span>
                      <span className={online ? 'font-bold text-[#7CFF9B]' : arming ? 'font-bold text-[#FFDD55]' : 'text-[#f1ede4]/40'}>
                        {online ? 'GO ✓' : arming ? 'ARMING…' : 'STANDBY'}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 grid grid-cols-6 gap-1">
                {SYSTEMS.map((s, i) => (
                  <div
                    key={s.id}
                    className={`h-6 rounded-[5px] border transition-colors duration-300 ${
                      running && i < tick ? 'bg-[#ffd400] border-[#ffd400]' : 'border-[#ffd400]/40 bg-[#ffd400]/10'
                    }`}
                  />
                ))}
              </div>
              <p className="font-mono text-[10px] text-[#f1ede4]/55 mt-2">
                {running ? `Plan assembling · ${Math.min(tick, SYSTEMS.length)} of ${SYSTEMS.length} phases locked in` : `${SYSTEMS.length}-phase launch sequence`}
              </p>
            </div>
          </div>
        ) : (
          blueprint && <BlueprintReveal blueprint={blueprint} runId={runId} onReset={() => { setPhase('idle'); setTick(0); setBlueprint(null); }} />
        )}
      </div>
    </div>
  );
}

function BlueprintReveal({ blueprint, runId, onReset }: { blueprint: Blueprint; runId: string | null; onReset: () => void }) {
  return (
    <div className="pt-6 animate-[fadeUp_0.5s_ease]">
      <p className="font-mono text-[11px] tracking-[0.16em] text-[#7CFF9B] uppercase">✓ Cleared for launch · your Blueprint is live</p>
      <h2 className="font-display font-extrabold text-3xl sm:text-4xl mt-2 text-[#f1ede4]">{blueprint.businessName}</h2>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffd400] mt-1">{blueprint.category}</p>
      {blueprint.oneLiner && <p className="font-serif italic text-lg sm:text-xl text-[#f1ede4]/90 mt-3 max-w-2xl">{blueprint.oneLiner}</p>}

      {blueprint.signatureMove && (
        <div className="mt-4 rounded-lg border-2 border-[#ffd400] bg-[#ffd400]/10 p-4 max-w-2xl">
          <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#FFDD55] uppercase">★ Your signature first move</p>
          <p className="font-sans text-[#f1ede4] mt-1.5">{blueprint.signatureMove}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        {LAUNCH_PHASES.map((phase, i) => {
          const bpPhase = blueprint.phases.find((p) => p.phaseId === phase.id);
          if (!bpPhase || bpPhase.missions.length === 0) return null;
          return (
            <div
              key={phase.id}
              className="rounded-xl border border-[#ffd400]/25 bg-black/25 p-4 animate-[fadeUp_0.5s_ease] opacity-0"
              style={{ animationDelay: `${i * 90}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold bg-[#0d0d0d] text-[#ffd400] border border-[#ffd400]/40 rounded px-1.5 py-0.5">{phase.code}</span>
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#d0241b] uppercase font-bold">{phase.system}</span>
              </div>
              <ul className="mt-2.5 space-y-2">
                {bpPhase.missions.map((m, mi) => (
                  <li key={mi} className="flex gap-2">
                    <span className="text-[#ffd400] shrink-0">✦</span>
                    <span>
                      <span className="font-sans font-bold text-[#f1ede4] text-[13.5px]">{m.title}. </span>
                      <span className="font-sans text-[#f1ede4]/70 text-[13px]">{m.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-7">
        {runId && (
          <a
            href={`/api/mustard-launch/pdf?runId=${runId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0d0d0d] bg-[#ffd400] px-5 py-3 font-sans font-bold text-[#0d0d0d] shadow-[4px_4px_0_0_#000] transition-transform hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
          >
            ⬇ Download my Blueprint PDF
          </a>
        )}
        <a
          href="#ladder"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#ffd400] bg-transparent px-5 py-3 font-sans font-bold text-[#ffd400] transition-colors hover:bg-[#ffd400]/10"
        >
          Build the whole launch →
        </a>
        <button onClick={onReset} className="font-mono text-xs text-[#f1ede4]/50 underline underline-offset-4 hover:text-[#f1ede4]/80">
          run another
        </button>
      </div>
    </div>
  );
}

function SeedConfetti() {
  const pieces = Array.from({ length: 26 });
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {pieces.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 6) * 60;
        const dur = 900 + ((i * 53) % 700);
        const size = 6 + (i % 4) * 2;
        const color = i % 3 === 0 ? '#ff3b2f' : i % 3 === 1 ? '#ffd400' : '#FFDD55';
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-16px',
              width: size,
              height: size,
              background: color,
              borderRadius: i % 2 ? '50%' : '2px',
              animation: `seedFall ${dur}ms ${delay}ms cubic-bezier(.4,.2,.5,1) forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes seedFall { to { transform: translateY(560px) rotate(360deg); opacity: 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
