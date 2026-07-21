'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  celebrateOccasions,
  celebrateSamplePeople,
  type CelebrateOccasionId,
} from '@/data/celebrate';

type Person = { name: string; month: number; day: number; occasion: CelebrateOccasionId };

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const FLOAT_STYLES = [
  { bg: '#F5B700', ink: '#161616', sub: '#161616' },
  { bg: '#FFFFFF', ink: '#161616', sub: '#161616' },
  { bg: '#FBF6EA', ink: '#161616', sub: '#161616' },
  { bg: '#E0301E', ink: '#FFFFFF', sub: '#FFFFFF' },
];
const CONFETTI_COLORS = ['#F5B700', '#FFDD55', '#E0301E', '#1E50C8', '#FFFFFF'];
const MAX_PARTICLES = 150;

function occasionProp(id: CelebrateOccasionId): 'cake' | 'bouquet' | 'board' | 'card' {
  return celebrateOccasions.find((o) => o.id === id)?.prop ?? 'cake';
}

/** Tiny CSS "float cargo" art, one per occasion type. */
function FloatProp({ kind, dark }: { kind: 'cake' | 'bouquet' | 'board' | 'card'; dark: boolean }) {
  const ink = '#161616';
  if (kind === 'cake') {
    return (
      <div className="relative h-16 mb-2" aria-hidden>
        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-4/5 h-6 rounded-lg border-2 bg-white" style={{ borderColor: ink }} />
        <span className="absolute left-1/2 -translate-x-1/2 bottom-5 w-3/5 h-5 rounded-lg border-2" style={{ borderColor: ink, background: '#E0301E' }} />
        <span className="absolute left-1/2 -translate-x-1/2 bottom-9 w-2/5 h-4 rounded-lg border-2" style={{ borderColor: ink, background: '#1E50C8' }} />
        <span className="absolute left-1/2 -translate-x-1/2 bottom-[52px] w-1 h-3 rounded-sm" style={{ background: ink }} />
        <span className="absolute left-1/2 -translate-x-1/2 bottom-[63px] w-2 h-2 rounded-full border-2" style={{ borderColor: ink, background: '#FFDD55' }} />
      </div>
    );
  }
  if (kind === 'bouquet') {
    return (
      <div className="relative h-16 mb-2" aria-hidden>
        <span className="absolute left-[22%] top-1 w-5 h-5 rounded-full border-2" style={{ borderColor: ink, background: '#F5B700' }} />
        <span className="absolute left-[43%] top-0 w-5 h-5 rounded-full border-2" style={{ borderColor: ink, background: '#E0301E' }} />
        <span className="absolute left-[62%] top-2 w-5 h-5 rounded-full border-2" style={{ borderColor: ink, background: '#1E50C8' }} />
        <span className="absolute left-[33%] top-5 w-5 h-5 rounded-full border-2" style={{ borderColor: ink, background: '#FFDD55' }} />
        <span className="absolute left-[52%] top-6 w-5 h-5 rounded-full border-2 bg-white" style={{ borderColor: ink }} />
        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-5 h-6 rounded-b-lg border-2" style={{ borderColor: ink, background: '#8FA98F' }} />
      </div>
    );
  }
  if (kind === 'board') {
    return (
      <div className="relative h-16 mb-2" aria-hidden>
        <span className="absolute left-1/2 -translate-x-1/2 bottom-2 w-11/12 h-7 rounded-xl border-2" style={{ borderColor: ink, background: '#E8B04B' }} />
        <span className="absolute left-[24%] bottom-5 w-4 h-4 rounded-full border-2" style={{ borderColor: ink, background: '#E0301E' }} />
        <span className="absolute left-[44%] bottom-4 w-5 h-5 rounded-full border-2 bg-white" style={{ borderColor: ink }} />
        <span className="absolute left-[64%] bottom-5 w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: ink, background: '#1E50C8' }} />
      </div>
    );
  }
  return (
    <div className="relative h-16 mb-2" aria-hidden>
      <span
        className="absolute left-1/2 -translate-x-1/2 bottom-1 w-4/5 h-11 rounded-lg border-2 bg-white flex items-center justify-center font-serif italic text-sm"
        style={{ borderColor: ink, color: '#1E50C8' }}
      >
        For you!
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-9 w-4 h-4 rounded-full border-2" style={{ borderColor: ink, background: dark ? '#FFDD55' : '#F5B700' }} />
    </div>
  );
}

/**
 * Canvas confetti with real gravity that SETTLES and PILES at the bottom of
 * the section and stays for the whole visit. Hard caps per the perf contract:
 * 150 particles, DPR capped at 2, the rAF loop stops the moment the pile is
 * still, and prefers-reduced-motion renders the finished pile with no loop.
 */
function fireConfetti(canvas: HTMLCanvasElement, reduced: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: MAX_PARTICLES }, (_, i) => ({
    x: Math.random() * w,
    y: reduced ? h - Math.random() * 18 : -20 - Math.random() * h * 0.5,
    vx: (Math.random() - 0.5) * 1.6,
    vy: 1.5 + Math.random() * 2.5,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    settled: reduced,
  }));

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
  };

  if (reduced) {
    draw();
    return;
  }

  let live = parts.length;
  const tick = () => {
    for (const p of parts) {
      if (p.settled) continue;
      p.vy += 0.06;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y >= h - 6 - Math.random() * 14) {
        p.y = Math.min(p.y, h - 4);
        p.settled = true;
        live -= 1;
      }
      if (p.x < -20) p.x = w + 10;
      if (p.x > w + 20) p.x = -10;
    }
    draw();
    if (live > 0) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export default function ParadeBuilder() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState('');
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(1);
  const [occasion, setOccasion] = useState<CelebrateOccasionId>('birthday');
  const [rolled, setRolled] = useState(false);
  const [email, setEmail] = useState('');
  const [business, setBusiness] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paradeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rolled || !canvasRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fireConfetti(canvasRef.current, reduced);
    paradeRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }, [rolled]);

  const addPerson = () => {
    const trimmed = name.trim();
    if (!trimmed || people.length >= 12) return;
    setPeople((prev) => [...prev, { name: trimmed.slice(0, 40), month, day, occasion }]);
    setName('');
  };

  const paradeStrings = people.map(
    (p) =>
      `${p.name} · ${MONTHS[p.month]} ${String(p.day).padStart(2, '0')} · ${
        celebrateOccasions.find((o) => o.id === p.occasion)?.label ?? p.occasion
      }`
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/celebrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, business, people: paradeStrings, company: honeypot }),
      });
      if (!res.ok) throw new Error('bad status');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="relative">
      {/* ── Step 1: load your people ── */}
      <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 md:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">
          Step 1 &middot; Add the people you love
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_1fr_auto] gap-3 mt-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPerson())}
            placeholder="Their name"
            aria-label="Name"
            className="border-2 border-[#161616] rounded-full px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
          />
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Month"
            className="border-2 border-[#161616] rounded-full px-3 py-2.5 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            aria-label="Day"
            className="border-2 border-[#161616] rounded-full px-3 py-2.5 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value as CelebrateOccasionId)}
            aria-label="Occasion"
            className="border-2 border-[#161616] rounded-full px-3 py-2.5 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
          >
            {celebrateOccasions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={addPerson}
            disabled={!name.trim() || people.length >= 12}
            className="bg-[#1E50C8] text-white font-bold rounded-full px-6 py-2.5 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] disabled:opacity-40 hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#161616] transition"
          >
            Add
          </button>
        </div>

        {people.length > 0 ? (
          <ul className="flex flex-wrap gap-2 mt-4" aria-label="Your people">
            {people.map((p, i) => (
              <li key={`${p.name}-${i}`} className="font-mono text-[11px] font-bold bg-[#FFDD55] border-2 border-[#161616] rounded-lg px-2.5 py-1.5">
                {p.name} &middot; {MONTHS[p.month]} {String(p.day).padStart(2, '0')}
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => setPeople((prev) => prev.filter((_, j) => j !== i))}
                  className="ml-2 text-[#C4160B] font-bold"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-body text-sm text-[#161616]/70 mt-4">
            One lone float is waiting for your people.{' '}
            <button
              type="button"
              onClick={() => setPeople(celebrateSamplePeople.map((s) => ({ ...s })))}
              className="font-bold text-[#1E50C8] underline underline-offset-4"
            >
              Try a sample parade
            </button>
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setRolled(true)}
            disabled={people.length === 0}
            className="bg-[#F5B700] text-[#161616] font-bold text-base rounded-full px-8 py-3.5 border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] disabled:opacity-40 hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition"
          >
            Roll the parade
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/70">
            Free &middot; No card &middot; {people.length}/12 aboard
          </span>
        </div>
      </div>

      {/* ── Step 2: the parade ── */}
      {rolled && (
        <div ref={paradeRef} className="relative mt-6 bg-[#1E50C8] border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
          <div className="relative p-5 md:p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#FFDD55] font-bold">
              Your Year of Celebration
            </p>
            <div className="flex gap-4 overflow-x-auto snap-x pb-3 mt-4" role="list" aria-label="Your parade">
              {people.map((p, i) => {
                const style = FLOAT_STYLES[i % FLOAT_STYLES.length];
                const prop = occasionProp(p.occasion);
                return (
                  <div key={`${p.name}-${i}`} role="listitem" className="snap-center shrink-0 w-44">
                    <div
                      className="rounded-xl border-2 border-[#161616] p-3.5 min-h-[168px] flex flex-col justify-end shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]"
                      style={{ background: style.bg }}
                    >
                      <FloatProp kind={prop} dark={style.bg === '#E0301E'} />
                      <span className="font-mono text-[10px] font-bold tracking-[0.22em]" style={{ color: style.ink }}>
                        {MONTHS[p.month]} {String(p.day).padStart(2, '0')}
                      </span>
                      <span className="font-display font-black text-lg leading-tight" style={{ color: style.ink }}>
                        {p.name}
                      </span>
                      <span className="font-body text-[11px]" style={{ color: style.sub }}>
                        {celebrateOccasions.find((o) => o.id === p.occasion)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 -mt-2" aria-hidden>
                      <span className="w-5 h-5 rounded-full bg-[#161616] border-4 border-white" />
                      <span className="w-5 h-5 rounded-full bg-[#161616] border-4 border-white" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <span className="font-mono font-bold text-sm md:text-lg tracking-[0.12em] text-white">
                {people.length} {people.length === 1 ? 'PERSON' : 'PEOPLE'} &middot; 365 DAYS &middot; 0 MISSED
              </span>
              <span className="font-display font-black text-lg md:text-xl text-[#FFDD55]">
                Nobody you love goes uncelebrated.
              </span>
            </div>

            {/* ── Step 3: save it ── */}
            <div className="mt-6 bg-[#FBF6EA] border-2 border-[#161616] rounded-xl p-4 md:p-5">
              {status === 'done' ? (
                <div className="relative">
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">Dispatch Slip</p>
                  <p className="font-display font-black text-2xl mt-1">You are on the parade route.</p>
                  <p className="font-body text-sm text-[#161616]/70 mt-1 max-w-md">
                    Your parade is saved. We open routes city by city, and pilots in the Flathead Valley start now.{' '}
                    <Link href="/book" className="font-bold text-[#1E50C8] underline underline-offset-4">
                      Book a corporate pilot
                    </Link>{' '}
                    and your next 60 days of celebrations are handled.
                  </p>
                  <span
                    aria-hidden
                    className="absolute right-1 top-1 font-mono font-bold text-sm tracking-[0.3em] text-[#C4160B] border-[3px] border-[#C4160B] rounded px-2 py-1 rotate-[-8deg]"
                  >
                    SENT
                  </span>
                </div>
              ) : (
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    aria-label="Email"
                    className="border-2 border-[#161616] rounded-full px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
                  />
                  <input
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                    placeholder="Business or family name (optional)"
                    aria-label="Business or family name"
                    className="border-2 border-[#161616] rounded-full px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
                  />
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    name="company"
                    aria-hidden
                    className="hidden"
                  />
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="bg-[#E0301E] text-white font-bold rounded-full px-7 py-3 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] disabled:opacity-60 hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#161616] transition"
                  >
                    {status === 'sending' ? 'Saving…' : 'Save your parade'}
                  </button>
                  {status === 'error' && (
                    <p className="md:col-span-3 font-body text-sm text-[#C4160B]">
                      That did not go through. Give it one more try, or email sarah@modernmustardseed.com and we will add you by hand.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
