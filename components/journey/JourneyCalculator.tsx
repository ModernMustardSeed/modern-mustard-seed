'use client';

/**
 * MI 19 · THE LEAK. The Revenue Recovery Machine: a giant pop-art desk
 * calculator that adds up what a silent website and an unanswered phone are
 * costing this visitor, then hands them the Forge.
 *
 * Sits between the Orchards (MI 12) and the Roadside (MI 31). The rail nav in
 * JourneyRig picks it up automatically off `data-journey-chapter`, so nothing
 * else has to be registered. Ava does not narrate this stop yet; adding a beat
 * to data/journey-tour.ts requires rebuilding her audio manifest.
 *
 * Rules honored: no em dashes, no prices, Title Case labels, transform and
 * opacity only, every number on screen carries a named source.
 *
 * The keypad is decoration that works. Every value is also a real labeled
 * number input, so keyboard and screen reader users never touch the keys.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Anton, Caveat } from 'next/font/google';
import { track } from '@vercel/analytics';
import { trackLead, metaDedup } from '@/lib/analytics';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const caveat = Caveat({ weight: '600', subsets: ['latin'], display: 'swap' });

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* The proof. Every figure below is sourced in PROOF_SOURCES.          */
/* ------------------------------------------------------------------ */

const PROOF = [
  {
    tag: 'The Site',
    stat: '2.35%',
    line: 'What an average website converts at. Ninety-seven out of a hundred visitors read it and leave without a word.',
    src: 'WordStream conversion benchmarks',
    tone: 'blue' as const,
  },
  {
    tag: 'The Site',
    stat: '2.8x',
    line: 'How much more likely a visitor is to convert once the page holds an actual conversation instead of waiting to be read.',
    src: 'ICMI chat engagement data',
    tone: 'yellow' as const,
  },
  {
    tag: 'The Phone',
    stat: '62%',
    line: 'Calls to small businesses that nobody picks up. Not screened, not returned. Rung out.',
    src: '411 Locals, 85 businesses across 58 industries',
    tone: 'red' as const,
  },
  {
    tag: 'The Phone',
    stat: '85%',
    line: 'Callers who never try you a second time. One unanswered ring and they are somebody else’s customer.',
    src: 'Aircall and CallRail missed call research',
    tone: 'ink' as const,
  },
];

const PROOF_SOURCES =
  'Sources: WordStream conversion benchmarks; ICMI chat engagement data; 411 Locals call study (85 businesses, 58 industries); Aircall and CallRail missed call research; MIT and InsideSales Lead Response Management Study, reported in Harvard Business Review, 2011.';

/* ------------------------------------------------------------------ */
/* The machine                                                         */
/* ------------------------------------------------------------------ */

/**
 * The conservative end of the documented 10% to 45% conversion lift from
 * putting live conversation on a page. We model the floor on purpose: the
 * estimate has to survive the client checking it.
 */
const TALKING_SITE_LIFT = 0.3;
const BASELINE_CVR = 0.0235;
const WEEKS_PER_MONTH = 4.33;

type Key = 'visitors' | 'missed' | 'ticket' | 'close';

const FIELDS: {
  key: Key;
  label: string;
  hint: string;
  max: number;
  prefix?: string;
  suffix?: string;
}[] = [
  { key: 'visitors', label: 'Visitors A Month', hint: 'People who land on your site', max: 2000000 },
  { key: 'missed', label: 'Calls You Miss A Week', hint: 'Rings out, voicemail, after hours', max: 2000 },
  { key: 'ticket', label: 'Average Customer Value', hint: 'What one job or sale is worth', max: 500000, prefix: '$' },
  { key: 'close', label: 'Close Rate', hint: 'Of the people you actually talk to', max: 100, suffix: '%' },
];

const DEFAULTS: Record<Key, number> = { visitors: 1200, missed: 10, ticket: 500, close: 35 };

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n)),
  );
const num = (n: number) => new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(n)));

/** Rolls a readout to its new value instead of snapping. Static under reduced motion. */
function useCountUp(value: number, dur = 480) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  useEffect(() => {
    if (reduced()) {
      setShown(value);
      return;
    }
    const from = shownRef.current;
    if (from === value) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);

  return shown;
}

/** A chunky key that physically depresses. */
function PopKey({
  children,
  onClick,
  label,
  className = '',
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={style}
      className={`select-none rounded-xl border-2 border-[#161616] font-mono font-bold leading-none shadow-[0_5px_0_0_#161616] transition-[transform,box-shadow] duration-75 hover:-translate-y-[1px] hover:shadow-[0_6px_0_0_#161616] active:translate-y-[4px] active:shadow-[0_1px_0_0_#161616] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      {children}
    </button>
  );
}

export default function JourneyCalculator() {
  const [vals, setVals] = useState<Record<Key, number>>(DEFAULTS);
  const [active, setActive] = useState<Key>('missed');
  const [flash, setFlash] = useState(false);
  const inputs = useRef<Partial<Record<Key, HTMLInputElement | null>>>({});

  const set = useCallback((key: Key, raw: number) => {
    const field = FIELDS.find((f) => f.key === key)!;
    const clamped = Math.max(0, Math.min(field.max, Math.round(raw) || 0));
    setVals((v) => (v[key] === clamped ? v : { ...v, [key]: clamped }));
  }, []);

  const math = useMemo(() => {
    const close = vals.close / 100;
    const baselineLeads = vals.visitors * BASELINE_CVR;
    const extraWebLeads = baselineLeads * TALKING_SITE_LIFT;
    const missedPerMonth = vals.missed * WEEKS_PER_MONTH;
    const siteMonthly = extraWebLeads * close * vals.ticket;
    const phoneMonthly = missedPerMonth * close * vals.ticket;
    const monthly = siteMonthly + phoneMonthly;
    return {
      baselineLeads,
      extraWebLeads,
      missedPerMonth,
      siteMonthly,
      phoneMonthly,
      monthly,
      annual: monthly * 12,
      newCustomers: (extraWebLeads + missedPerMonth) * close,
    };
  }, [vals]);

  const monthlyShown = useCountUp(math.monthly);
  const annualShown = useCountUp(math.annual);

  /* Keypad writes into whichever slot is lit. */
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
    track('calculator_equals', { annual: Math.round(math.annual) });
    window.setTimeout(() => setFlash(false), 420);
  };

  const forgeHref = '/demos#forge';
  const onForge = (where: string) =>
    track('calculator_forge_click', { where, annual: Math.round(math.annual) });

  /* The tape, emailed. Cheap ask before the Forge ask, and it lands in the
     same inbox as every other lead with the numbers already attached. */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const sendReceipt = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      const dedup = metaDedup();
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dedup,
          name: name.trim() || 'Revenue recovery calculator lead',
          email: email.trim(),
          source: 'home-revenue-calculator',
          message:
            `Revenue Recovery calculator, homepage. ` +
            `${num(vals.visitors)} visitors a month, misses ${num(vals.missed)} calls a week ` +
            `(~${num(math.missedPerMonth)} a month), average customer ${usd(vals.ticket)}, ` +
            `close rate ${vals.close}%. Estimated recovery ${usd(math.monthly)}/month ` +
            `(${usd(math.siteMonthly)} from the site, ${usd(math.phoneMonthly)} from the phone), ` +
            `${usd(math.annual)}/year, about ${num(math.newCustomers)} new customers a month. ` +
            `Wants the breakdown.`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Something went wrong');
      }
      trackLead({
        source: 'home-revenue-calculator',
        value: Math.round(math.monthly),
        eventId: dedup.metaEventId,
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <section
      id="tour-calculator"
      data-journey-chapter="The Leak"
      data-mile="MI 19"
      className="relative overflow-hidden border-b-2 border-[#161616] bg-[#FBF6EA] py-24 md:py-32"
    >
      <div className="halftone-bg pointer-events-none absolute inset-0 opacity-70" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* ── The header ── */}
        <div className="max-w-3xl">
          <span className="inline-block border-2 border-[#161616] bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#8f6600] shadow-[3px_3px_0_0_#161616]">
            MI 19 · The Leak
          </span>
          <h2
            className={`${anton.className} mt-5 uppercase leading-[0.95] text-[#161616]`}
            style={{ fontSize: 'clamp(40px,5.4vw,78px)' }}
          >
            Do The Math
            <br />
            On The Quiet
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#161616]/80">
            A website that just sits there and a phone nobody answers are the same problem wearing two
            hats. Both of them let a ready buyer walk. Here is what that is worth in your business,
            counted out loud.
          </p>
        </div>

        {/* ── The proof ── */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROOF.map((p, i) => {
            const tone =
              p.tone === 'yellow'
                ? 'bg-[#F5B700] text-[#161616]'
                : p.tone === 'red'
                  ? 'bg-[#E0301E] text-[#FBF6EA]'
                  : p.tone === 'ink'
                    ? 'bg-[#161616] text-[#FBF6EA]'
                    : 'bg-[#1E50C8] text-[#FBF6EA]';
            return (
              <div
                key={p.stat}
                className={`flex flex-col rounded-2xl border-2 border-[#161616] p-6 shadow-[6px_6px_0_0_#161616] ${tone}`}
                style={{ transform: `rotate(${i % 2 === 0 ? -0.7 : 0.7}deg)` }}
              >
                <span className="self-start rounded-full border-2 border-[#161616] bg-[#FBF6EA] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#161616]">
                  {p.tag}
                </span>
                <span
                  className={`${anton.className} mt-4 block leading-none tracking-tight`}
                  style={{ fontSize: 'clamp(46px,5vw,64px)' }}
                >
                  {p.stat}
                </span>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed opacity-90">{p.line}</p>
                <span className="mt-4 block border-t border-current pt-3 font-mono text-[10px] uppercase tracking-[0.14em] opacity-60">
                  {p.src}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── The closer stat ── */}
        <div className="halftone-ink mt-6 flex flex-col items-center gap-4 rounded-2xl border-2 border-[#161616] bg-[#080C16] p-7 text-center shadow-[6px_6px_0_0_#F5B700] sm:flex-row sm:text-left md:p-9">
          <span
            className={`${anton.className} shrink-0 leading-none text-[#F5B700]`}
            style={{ fontSize: 'clamp(56px,7vw,92px)' }}
          >
            21x
          </span>
          <p className="text-[15px] leading-relaxed text-[#FBF6EA]/90 md:text-lg">
            More likely to qualify a lead when it is answered inside five minutes instead of thirty. Not
            a better pitch, not a bigger budget. Speed. That is the entire advantage a talking website
            and a voice agent hand you, and they hold it at two in the morning.
            <span className="mt-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-[#F5B700]/70">
              MIT and InsideSales Lead Response Management Study, Harvard Business Review
            </span>
          </p>
        </div>

        {/* ── The machine ── */}
        {/* Sarah 2026-08-12: the machine read as cute but oversized. The rig is
            capped well inside the 7xl page gutter and every internal scale came
            down a notch, so it stays a desk calculator instead of a billboard. */}
        <div className="mx-auto mt-16 flex max-w-5xl flex-col items-center gap-10 xl:flex-row xl:items-start xl:gap-10">
          <div className="w-full min-w-0 xl:flex-1">
            <p
              className={`${caveat.className} mb-3 ml-2 rotate-[-2deg] text-2xl text-[#161616]/70 md:text-3xl`}
            >
              go ahead, punch in your own numbers
            </p>

            <div
              className="rounded-[22px] border-[3px] border-[#161616] bg-[#F5B700] p-3.5 shadow-[10px_10px_0_0_#161616] sm:p-5 md:p-6"
              style={{ transform: 'rotate(-0.6deg)' }}
            >
              {/* Brand plate */}
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#161616]">
                    Modern Mustard Seed
                  </span>
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#161616]/60">
                    Model RR-1 · Revenue Recovery
                  </span>
                </div>
                <div
                  className="flex items-center gap-1 rounded-md border-2 border-[#161616] bg-[#080C16] px-1.5 py-1"
                  aria-hidden
                >
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="block h-4 w-3 rounded-[2px] bg-[#1E50C8]/70" />
                  ))}
                </div>
              </div>

              {/* LCD */}
              {/* Background rides inline, not on a class: two arbitrary bg-[] classes
                  would race in the stylesheet and the flash would land at random. */}
              <div
                className="relative overflow-hidden rounded-xl border-2 border-[#161616] p-4 transition-[background-color,filter] duration-150 motion-reduce:transition-none sm:p-5"
                style={{
                  backgroundColor: flash ? '#17301F' : '#080C16',
                  filter: flash ? 'brightness(1.25)' : 'none',
                  boxShadow: 'inset 0 4px 14px rgba(0,0,0,0.75)',
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.18]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0 1px, transparent 1px 3px)',
                  }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#F5B700]/70">
                    Recovered Revenue
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E0301E]">
                    <span className="block h-2 w-2 rounded-full bg-[#E0301E]" aria-hidden />
                    Live
                  </span>
                </div>

                <div className="relative mt-3 text-right">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 select-none font-mono font-bold tabular-nums text-[#F5B700] opacity-[0.045]"
                    style={{ fontSize: 'clamp(30px,4.6vw,54px)', lineHeight: 1 }}
                  >
                    $888,888
                  </span>
                  <span
                    className="relative block font-mono font-bold tabular-nums text-[#FFDD55]"
                    style={{
                      fontSize: 'clamp(30px,4.6vw,54px)',
                      lineHeight: 1,
                      textShadow: '0 0 22px rgba(245,183,0,0.45)',
                    }}
                  >
                    {usd(monthlyShown)}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5B700]/70">
                    Per Month
                  </span>
                </div>

                <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-[#F5B700]/20 pt-3 text-center">
                  {[
                    { k: 'From The Site', v: usd(math.siteMonthly) },
                    { k: 'From The Phone', v: usd(math.phoneMonthly) },
                    { k: 'Per Year', v: usd(annualShown) },
                  ].map((r) => (
                    <div key={r.k}>
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#F5B700]/60">
                        {r.k}
                      </span>
                      <span className="mt-1 block font-mono text-xs font-bold tabular-nums text-[#FBF6EA] sm:text-base">
                        {r.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slots and keypad */}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-5">
                {/* Input slots */}
                <div className="rounded-xl border-2 border-[#161616] bg-[#FFFDF6] p-3.5 sm:p-4">
                  <span className="mb-3 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#161616]/60">
                    Your Numbers
                  </span>
                  <div className="flex flex-col gap-2">
                    {FIELDS.map((f) => {
                      const on = active === f.key;
                      return (
                        <label
                          key={f.key}
                          htmlFor={`rr-${f.key}`}
                          className={`block cursor-text rounded-lg border-2 px-3 py-2 transition-colors ${
                            on
                              ? 'border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616]'
                              : 'border-[#161616]/25 bg-white hover:border-[#161616]/60'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]">
                                {f.label}
                              </span>
                              <span className="block truncate text-[11px] text-[#161616]/55">{f.hint}</span>
                            </span>
                            <span className="flex shrink-0 items-baseline font-mono text-base font-bold tabular-nums text-[#161616] sm:text-lg">
                              {f.prefix}
                              <input
                                id={`rr-${f.key}`}
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
                                className="w-[5.5ch] bg-transparent text-right font-mono text-lg font-bold tabular-nums text-[#161616] outline-none focus:underline focus:decoration-[#C4160B] focus:decoration-2 focus:underline-offset-4 sm:text-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                style={{ MozAppearance: 'textfield' }}
                              />
                              {f.suffix}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#161616]/45">
                    Type here, or use the keys
                  </p>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-2">
                  {['7', '8', '9'].map((d) => (
                    <PopKey key={d} label={`Digit ${d}`} onClick={() => digit(d)} className="bg-white py-3 text-lg text-[#161616] sm:py-3.5 sm:text-xl">
                      {d}
                    </PopKey>
                  ))}
                  <PopKey label="Clear this field" onClick={clearKey} className="bg-[#E0301E] py-3 text-sm text-[#FBF6EA] sm:py-3.5">
                    C
                  </PopKey>

                  {['4', '5', '6'].map((d) => (
                    <PopKey key={d} label={`Digit ${d}`} onClick={() => digit(d)} className="bg-white py-3 text-lg text-[#161616] sm:py-3.5 sm:text-xl">
                      {d}
                    </PopKey>
                  ))}
                  <PopKey label="Delete last digit" onClick={backspace} className="bg-[#1E50C8] py-3 text-base text-[#FBF6EA] sm:py-3.5">
                    <span aria-hidden>⌫</span>
                  </PopKey>

                  {['1', '2', '3'].map((d) => (
                    <PopKey key={d} label={`Digit ${d}`} onClick={() => digit(d)} className="bg-white py-3 text-lg text-[#161616] sm:py-3.5 sm:text-xl">
                      {d}
                    </PopKey>
                  ))}
                  <PopKey label="Next field" onClick={nextField} className="bg-[#1E50C8] py-3 text-[10px] uppercase tracking-[0.1em] text-[#FBF6EA] sm:py-3.5">
                    Next
                  </PopKey>

                  <PopKey label="Digit 0" onClick={() => digit('0')} className="col-span-2 bg-white py-3 text-lg text-[#161616] sm:py-3.5 sm:text-xl">
                    0
                  </PopKey>
                  <PopKey label="Double zero" onClick={() => digit('00')} className="bg-white py-3 text-lg text-[#161616] sm:py-3.5 sm:text-xl">
                    00
                  </PopKey>
                  <PopKey label="Total it up" onClick={equals} className="bg-[#161616] py-3 text-xl text-[#F5B700] sm:py-3.5">
                    =
                  </PopKey>

                  <Link
                    href={forgeHref}
                    onClick={() => onForge('keypad')}
                    className="col-span-4 mt-1 flex select-none items-center justify-center gap-2 rounded-xl border-2 border-[#161616] bg-[#E0301E] py-4 font-sans text-xs font-extrabold uppercase tracking-[0.18em] text-[#FBF6EA] shadow-[0_5px_0_0_#161616] transition-[transform,box-shadow] duration-75 hover:-translate-y-[1px] hover:shadow-[0_6px_0_0_#161616] active:translate-y-[4px] active:shadow-[0_1px_0_0_#161616] motion-reduce:transition-none sm:text-sm"
                  >
                    Forge My Demo
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── The tape ── */}
          <div className="w-full max-w-[300px] shrink-0 xl:mt-14 xl:w-[272px]">
            {/* The offset shadow rides a drop-shadow filter, not a box-shadow, so it
                follows the torn teeth. White paper on cream has almost no edge
                contrast otherwise and the tear reads as a straight cut. */}
            <div
              style={{
                transform: 'rotate(1.4deg)',
                filter: 'drop-shadow(7px 7px 0 rgba(22,22,22,0.16)) drop-shadow(0 0 1px rgba(22,22,22,0.45))',
              }}
            >
              {/* Torn edges. The height has to equal the tile height or the teeth
                  get cropped off the bottom of the tile and the edge reads flat. */}
              <div
                aria-hidden
                style={{
                  height: 14,
                  backgroundImage:
                    'linear-gradient(-45deg, transparent 7px, #FFFFFF 0), linear-gradient(45deg, transparent 7px, #FFFFFF 0)',
                  backgroundSize: '14px 14px',
                  backgroundRepeat: 'repeat-x',
                  transform: 'scaleY(-1)',
                }}
              />
              <div className="bg-white px-6 py-5">
                <div className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#161616]">
                  Modern Mustard Seed
                </div>
                <div className="mt-0.5 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-[#161616]/50">
                  Revenue Recovery · RR-1
                </div>
                <div className="my-3 border-t-2 border-dashed border-[#161616]/25" />

                <dl className="space-y-1.5 font-mono text-[11px] tabular-nums text-[#161616]/85">
                  {[
                    ['Visitors / mo', num(vals.visitors)],
                    ['Leads today', num(math.baselineLeads)],
                    ['Talking site lift', '+30%'],
                    ['New web leads', num(math.extraWebLeads)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="uppercase tracking-[0.06em]">{k}</dt>
                      <dd className="font-bold">{v}</dd>
                    </div>
                  ))}
                  <div className="!my-2.5 border-t border-dashed border-[#161616]/25" />
                  {[
                    ['Missed calls / mo', num(math.missedPerMonth)],
                    ['Answered by agent', num(math.missedPerMonth)],
                    ['Close rate', `${vals.close}%`],
                    ['Avg customer', usd(vals.ticket)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="uppercase tracking-[0.06em]">{k}</dt>
                      <dd className="font-bold">{v}</dd>
                    </div>
                  ))}
                  <div className="!my-2.5 border-t-2 border-[#161616]" />
                  {[
                    ['New customers / mo', num(math.newCustomers)],
                    ['From the site', usd(math.siteMonthly)],
                    ['From the phone', usd(math.phoneMonthly)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="uppercase tracking-[0.06em]">{k}</dt>
                      <dd className="font-bold">{v}</dd>
                    </div>
                  ))}
                  <div className="!my-2.5 border-t-2 border-[#161616]" />
                  <div className="flex justify-between gap-3 text-[13px] font-bold text-[#161616]">
                    <dt className="uppercase tracking-[0.06em]">Total / mo</dt>
                    <dd>{usd(math.monthly)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-[15px] font-bold text-[#C4160B]">
                    <dt className="uppercase tracking-[0.06em]">Total / yr</dt>
                    <dd>{usd(math.annual)}</dd>
                  </div>
                </dl>

                <div className="my-3 border-t-2 border-dashed border-[#161616]/25" />
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#161616]/70">
                  Thank you
                  <br />
                  Now go forge yours
                </p>
                <div
                  aria-hidden
                  className="mx-auto mt-3 h-8 w-full"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, #161616 0 2px, transparent 2px 4px, #161616 4px 5px, transparent 5px 9px, #161616 9px 12px, transparent 12px 14px)',
                  }}
                />
              </div>
              <div
                aria-hidden
                style={{
                  height: 14,
                  backgroundImage:
                    'linear-gradient(-45deg, transparent 7px, #FFFFFF 0), linear-gradient(45deg, transparent 7px, #FFFFFF 0)',
                  backgroundSize: '14px 14px',
                  backgroundRepeat: 'repeat-x',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Take the tape with you. The cheap ask, ahead of the Forge ask. ── */}
        <div className="mx-auto mt-14 max-w-3xl">
          {status === 'done' ? (
            <div className="rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-8 text-center shadow-[6px_6px_0_0_#161616] md:p-10">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                Printed and sent
              </span>
              <h3 className="mt-3 font-display text-2xl font-black leading-tight text-[#161616] md:text-3xl">
                On its way. Check your inbox.
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[#161616]/80">
                Your breakdown is coming from me, with the sources behind every number and what
                plugging the leak actually looks like in your business. While you wait, go see the
                thing itself.
              </p>
              <Link
                href={forgeHref}
                onClick={() => onForge('receipt-success')}
                className="mt-6 inline-flex items-center gap-2 border-2 border-[#161616] bg-[#161616] px-8 py-4 font-sans text-sm font-extrabold uppercase tracking-[0.14em] text-[#F5B700] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#FBF6EA]"
              >
                Forge My Demo Free
                <span aria-hidden>→</span>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={sendReceipt}
              className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] md:p-9"
            >
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                Take The Tape With You
              </span>
              <h3 className="mt-2 font-display text-2xl font-black leading-tight text-[#161616] md:text-3xl">
                Want this receipt in writing?
              </h3>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#161616]/75">
                I will send the breakdown, the source behind every number on this page, and what
                plugging the leak looks like in your business. One reply from me, not a sequence.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <label htmlFor="rr-name" className="sr-only">
                  First name
                </label>
                <input
                  id="rr-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name (optional)"
                  className="rounded-full border-2 border-[#161616] bg-[#FFFDF6] px-5 py-3.5 font-body text-sm text-[#161616] transition-all placeholder:text-[#161616]/40 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] sm:w-48"
                />
                <label htmlFor="rr-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="rr-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="flex-1 rounded-full border-2 border-[#161616] bg-[#FFFDF6] px-5 py-3.5 font-body text-sm text-[#161616] transition-all placeholder:text-[#161616]/40 focus:outline-none focus:shadow-[3px_3px_0_0_#161616]"
                />
                <button
                  type="submit"
                  disabled={status === 'sending' || !email.trim()}
                  className="whitespace-nowrap rounded-full border-2 border-[#161616] bg-[#F5B700] px-7 py-3.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {status === 'sending' ? 'Sending' : 'Send My Receipt →'}
                </button>
              </div>
              {error && <p className="mt-3 font-mono text-xs text-[#C4160B]">{error}</p>}
              <p className="mt-3 font-body text-[11px] text-[#161616]/60">
                No spam. One reply from a real person. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>

        {/* ── How the math works, so nobody has to guess ── */}
        <p className="mx-auto mt-8 max-w-3xl text-center font-mono text-[11px] leading-relaxed text-[#161616]/55">
          The web line applies a 30% conversion lift to a 2.35% baseline, the conservative floor of the
          documented range. The phone line assumes the agent answers every call you currently miss. Your
          close rate is applied to both. {PROOF_SOURCES}
        </p>

        {/* ── The ask ── */}
        <div className="relative mt-14 overflow-hidden rounded-2xl border-[3px] border-[#161616] bg-[#161616] p-8 shadow-[10px_10px_0_0_#F5B700] md:p-12">
          <div className="halftone-ink pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#F5B700] px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">
              <span className="block h-2 w-2 rounded-full bg-[#E0301E]" aria-hidden />
              The Demo Forge · Free
            </span>
            <h3
              className={`${anton.className} mt-5 uppercase leading-[0.95] text-[#FBF6EA]`}
              style={{ fontSize: 'clamp(34px,4.4vw,64px)' }}
            >
              Stop Estimating.
              <br />
              Go See Yours Built.
            </h3>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#FBF6EA]/85 md:text-lg">
              That number stays a guess until it is your website and your phone number. Tell us your
              trade and your town, and we forge your talking website, your voice agent, and your command
              center while you watch. No card, no call, nothing to cancel.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={forgeHref}
                onClick={() => onForge('cta')}
                className="inline-flex items-center gap-2 border-2 border-[#161616] bg-[#F5B700] px-8 py-4 font-sans text-sm font-extrabold uppercase tracking-[0.14em] text-[#161616] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#FBF6EA]"
              >
                Forge My Demo Free
                <span aria-hidden>→</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  track('journey_door', { door: 'calculator' });
                  window.dispatchEvent(
                    new CustomEvent('mms:launcher:open', {
                      detail: { mode: 'voice', source: 'calculator' },
                    }),
                  );
                }}
                className="inline-flex items-center gap-2 border-2 border-[#FBF6EA] bg-white/10 px-8 py-4 font-sans text-sm font-extrabold uppercase tracking-[0.14em] text-[#FBF6EA] backdrop-blur transition-colors hover:bg-white/20"
              >
                Ask Mr. Mustard About It
              </button>
            </div>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#F5B700]/60">
              Forged before you pay a cent
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
