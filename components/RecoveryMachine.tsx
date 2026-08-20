'use client';

/**
 * THE DESK CALCULATOR, POCKET SIZED.
 *
 * The pop-art Revenue Recovery machine from the homepage journey (MI 19),
 * shrunk to sit inside other pages: the demo suite and /mustard both run this
 * exact component so the look and the arithmetic can never drift apart
 * (Sarah, 2026-08-20: "make the calculator look like a real pop art calc like
 * we have on the landing page, but a little smaller").
 *
 * Phone-only math on purpose: missed calls x 4.33 weeks x close rate x ticket,
 * the same sum MissedMoney and MissedCallCalculator quote, so no two pages can
 * disagree about the same inputs. No lead capture in here, ever: hosts add
 * their own ask around it.
 *
 * The keypad is decoration that works. Every value is also a real labeled
 * number input, so keyboard and screen reader users never touch the keys.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const WEEKS_PER_MONTH = 4.33;

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n)),
  );

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useCountUp(value: number, dur = 480) {
  const [shown, setShown] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    ref.current = shown;
  }, [shown]);
  useEffect(() => {
    if (reduced()) {
      setShown(value);
      return;
    }
    const from = ref.current;
    if (from === value) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setShown(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return shown;
}

function PopKey({
  children,
  onClick,
  label,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`select-none rounded-lg border-2 border-[#161616] font-mono font-bold leading-none shadow-[0_4px_0_0_#161616] transition-[transform,box-shadow] duration-75 hover:-translate-y-[1px] hover:shadow-[0_5px_0_0_#161616] active:translate-y-[3px] active:shadow-[0_1px_0_0_#161616] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      {children}
    </button>
  );
}

type Key = 'missed' | 'close' | 'ticket';

export type RecoveryValues = { missed: number; close: number; ticket: number; leak: number };

export default function RecoveryMachine({
  missedPreset,
  closePreset,
  ticketPreset,
  ticketLabel = 'Average Job Value',
  noticedLine,
  onChange,
}: {
  /** Research-informed starting values; sensible defaults otherwise. */
  missedPreset?: number | null;
  closePreset?: number | null;
  ticketPreset?: number | null;
  /** The trade word for the money slot ("average install", "average booking"). */
  ticketLabel?: string;
  /** A factual, pre-sanitized line about this exact business, shown as the
   *  machine's paper label. Hosts pass it; the machine never invents one. */
  noticedLine?: string | null;
  onChange?: (v: RecoveryValues) => void;
}) {
  const FIELDS: { key: Key; label: string; hint: string; max: number; prefix?: string; suffix?: string }[] = [
    { key: 'missed', label: 'Calls You Miss A Week', hint: 'Rings out, voicemail, after hours', max: 200 },
    { key: 'close', label: 'Would Have Hired You', hint: 'Of the people you actually talk to', max: 100, suffix: '%' },
    { key: 'ticket', label: ticketLabel, hint: 'What one is worth to you', max: 500000, prefix: '$' },
  ];
  const [vals, setVals] = useState<Record<Key, number>>({
    missed: missedPreset ?? 7,
    close: closePreset ?? 45,
    ticket: ticketPreset ?? 500,
  });
  const [active, setActive] = useState<Key>('missed');
  const [flash, setFlash] = useState(false);
  const inputs = useRef<Partial<Record<Key, HTMLInputElement | null>>>({});

  const set = useCallback(
    (key: Key, raw: number) => {
      const field = FIELDS.find((f) => f.key === key)!;
      const clamped = Math.max(0, Math.min(field.max, Math.round(raw) || 0));
      setVals((v) => (v[key] === clamped ? v : { ...v, [key]: clamped }));
    },
    // FIELDS is stable per render tick; ticketLabel is its only moving part.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticketLabel],
  );

  const leak = useMemo(
    () => Math.round(vals.missed * WEEKS_PER_MONTH * (vals.close / 100) * vals.ticket),
    [vals],
  );
  useEffect(() => {
    onChange?.({ ...vals, leak });
  }, [vals, leak, onChange]);

  const shown = useCountUp(leak);
  const annualShown = useCountUp(leak * 12);

  const digit = (d: string) => {
    const cur = vals[active];
    const next = Number(`${cur === 0 ? '' : cur}${d}`);
    set(active, Number.isFinite(next) ? next : cur);
    inputs.current[active]?.focus();
  };
  const clearKey = () => {
    set(active, 0);
    inputs.current[active]?.focus();
  };
  const backspace = () => {
    const s = String(vals[active]);
    set(active, s.length <= 1 ? 0 : Number(s.slice(0, -1)));
    inputs.current[active]?.focus();
  };
  const nextField = () => {
    const i = FIELDS.findIndex((f) => f.key === active);
    const nxt = FIELDS[(i + 1) % FIELDS.length].key;
    setActive(nxt);
    inputs.current[nxt]?.focus();
  };
  const equals = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 420);
  };

  return (
    <div
      className="mx-auto w-full max-w-xl rounded-[18px] border-[3px] border-[#161616] bg-[#F5B700] p-3 shadow-[8px_8px_0_0_#161616] sm:p-4"
      style={{ transform: 'rotate(-0.5deg)' }}
    >
      {/* Brand plate */}
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#161616]">
            Modern Mustard Seed
          </span>
          <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#161616]/60">
            Model RR-1 · Revenue Recovery
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md border-2 border-[#161616] bg-[#080C16] px-1.5 py-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-3 w-2.5 rounded-[2px] bg-[#1E50C8]/70" />
          ))}
        </div>
      </div>

      {/* The paper label: what the research noticed about this exact business. */}
      {noticedLine && (
        <div className="mb-2.5 rounded-lg border-2 border-dashed border-[#161616]/50 bg-[#FFFDF6] px-3 py-2" style={{ transform: 'rotate(0.4deg)' }}>
          <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#C4160B]">
            What We Noticed Before We Built This
          </span>
          <span className="mt-0.5 block font-body text-[12.5px] leading-snug text-[#161616]/85">{noticedLine}</span>
        </div>
      )}

      {/* LCD. Background rides inline so the equals flash can't race a class. */}
      <div
        className="relative overflow-hidden rounded-lg border-2 border-[#161616] p-3 transition-[background-color,filter] duration-150 motion-reduce:transition-none sm:p-4"
        style={{
          backgroundColor: flash ? '#17301F' : '#080C16',
          filter: flash ? 'brightness(1.25)' : 'none',
          boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.75)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0 1px, transparent 1px 3px)',
          }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#F5B700]/70">
            Leaking Every Month
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#E0301E]">
            <span className="block h-1.5 w-1.5 rounded-full bg-[#E0301E]" aria-hidden />
            Live
          </span>
        </div>
        <div className="relative mt-2 text-right">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none font-mono font-bold tabular-nums text-[#F5B700] opacity-[0.045]"
            style={{ fontSize: 'clamp(26px,4.4vw,42px)', lineHeight: 1 }}
          >
            $88,888
          </span>
          <span
            className="relative block font-mono font-bold tabular-nums text-[#FFDD55]"
            style={{ fontSize: 'clamp(26px,4.4vw,42px)', lineHeight: 1, textShadow: '0 0 18px rgba(245,183,0,0.45)' }}
          >
            {usd(shown)}
          </span>
          <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#F5B700]/70">
            {usd(annualShown)} A Year
          </span>
        </div>
      </div>

      {/* Slots and keypad */}
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.1fr_1fr]">
        <div className="rounded-lg border-2 border-[#161616] bg-[#FFFDF6] p-2.5">
          <div className="flex flex-col gap-1.5">
            {FIELDS.map((f) => {
              const on = active === f.key;
              return (
                <label
                  key={f.key}
                  htmlFor={`rm-${f.key}`}
                  className={`block cursor-text rounded-md border-2 px-2.5 py-1.5 transition-colors ${
                    on ? 'border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616]' : 'border-[#161616]/25 bg-white hover:border-[#161616]/60'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#161616]">{f.label}</span>
                      <span className="block truncate text-[10px] text-[#161616]/55">{f.hint}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline font-mono text-sm font-bold tabular-nums text-[#161616]">
                      {f.prefix}
                      <input
                        id={`rm-${f.key}`}
                        ref={(el) => {
                          inputs.current[f.key] = el;
                        }}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={f.max}
                        value={String(vals[f.key])}
                        onFocus={() => setActive(f.key)}
                        onChange={(e) => set(f.key, Number(e.target.value))}
                        className="w-[5ch] bg-transparent text-right font-mono text-base font-bold tabular-nums text-[#161616] outline-none focus:underline focus:decoration-[#C4160B] focus:decoration-2 focus:underline-offset-4 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        style={{ MozAppearance: 'textfield' }}
                      />
                      {f.suffix}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#161616]/45">Type here, or use the keys</p>
        </div>

        <div className="grid grid-cols-4 gap-1.5 self-start">
          {['7', '8', '9'].map((d) => (
            <PopKey key={d} label={`Digit ${d}`} onClick={() => digit(d)} className="bg-white py-2.5 text-base text-[#161616]">
              {d}
            </PopKey>
          ))}
          <PopKey label="Clear this field" onClick={clearKey} className="bg-[#E0301E] py-2.5 text-xs text-[#FBF6EA]">
            C
          </PopKey>
          {['4', '5', '6'].map((d) => (
            <PopKey key={d} label={`Digit ${d}`} onClick={() => digit(d)} className="bg-white py-2.5 text-base text-[#161616]">
              {d}
            </PopKey>
          ))}
          <PopKey label="Delete last digit" onClick={backspace} className="bg-[#1E50C8] py-2.5 text-sm text-[#FBF6EA]">
            <span aria-hidden>⌫</span>
          </PopKey>
          {['1', '2', '3'].map((d) => (
            <PopKey key={d} label={`Digit ${d}`} onClick={() => digit(d)} className="bg-white py-2.5 text-base text-[#161616]">
              {d}
            </PopKey>
          ))}
          <PopKey label="Next field" onClick={nextField} className="bg-[#1E50C8] py-2.5 text-[8px] uppercase tracking-[0.08em] text-[#FBF6EA]">
            Next
          </PopKey>
          <PopKey label="Digit 0" onClick={() => digit('0')} className="col-span-2 bg-white py-2.5 text-base text-[#161616]">
            0
          </PopKey>
          <PopKey label="Double zero" onClick={() => digit('00')} className="bg-white py-2.5 text-base text-[#161616]">
            00
          </PopKey>
          <PopKey label="Total it up" onClick={equals} className="bg-[#161616] py-2.5 text-lg text-[#F5B700]">
            =
          </PopKey>
        </div>
      </div>
    </div>
  );
}
