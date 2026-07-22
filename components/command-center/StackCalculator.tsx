'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';

/**
 * The signature interactive moment for /command-center: the "replace your stack"
 * calculator. Toggle the tools a small business typically pays for, watch the
 * monthly total roll like an odometer, and see the command center undercut the
 * whole pile. Pop-art cabin styling, honest "typical cost" framing.
 */

type Tool = { key: string; label: string; sub: string; cost: number };

const TOOLS: Tool[] = [
  { key: 'crm', label: 'CRM / pipeline software', sub: 'Customers, leads, follow-up', cost: 49 },
  { key: 'calls', label: 'Call transcription + AI notes', sub: 'Every call written down', cost: 30 },
  { key: 'analytics', label: 'Website analytics (paid tier)', sub: 'Traffic, sources, top pages', cost: 19 },
  { key: 'reviews', label: 'Review management', sub: 'Chase and reply to Google reviews', cost: 40 },
  { key: 'invoicing', label: 'Invoicing + payment chasing', sub: 'Send invoices, chase the late ones', cost: 30 },
  { key: 'scheduling', label: 'Scheduling / booking tool', sub: 'The calendar the AI books into', cost: 20 },
  { key: 'reporting', label: 'Reporting dashboard', sub: 'The whole business on one screen', cost: 25 },
];

function useCountUp(target: number, ms = 650): number {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export default function StackCalculator() {
  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOOLS.map((t) => [t.key, true])),
  );
  const ccMonthly = Math.round(DEMO_PRODUCTS.os.monthlyCents / 100); // 197

  const { total, count } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const t of TOOLS) if (on[t.key]) { total += t.cost; count += 1; }
    return { total, count };
  }, [on]);

  const shownTotal = useCountUp(total);
  const savings = Math.max(0, total - ccMonthly);

  const toggle = (k: string) => setOn((s) => ({ ...s, [k]: !s[k] }));

  return (
    <div className="grid lg:grid-cols-5 gap-6 items-start">
      {/* The tool list */}
      <div className="lg:col-span-3 rounded-2xl border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] p-6 md:p-7">
        <span className="font-mono font-bold text-[10px] uppercase tracking-[0.28em] text-[#C4160B] block">
          What are you paying for right now?
        </span>
        <p className="font-body text-[14px] text-[#161616]/70 mt-2 mb-5 leading-relaxed">
          Tap the tools your business already pays a monthly for. The command center does all of it, on one board.
        </p>
        <div className="space-y-2.5">
          {TOOLS.map((t) => {
            const active = on[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggle(t.key)}
                aria-pressed={active}
                className={`w-full text-left rounded-xl border-2 p-3.5 flex items-center gap-3.5 transition-all ${
                  active ? 'border-[#161616] bg-[#FBF6EA]' : 'border-[#161616]/20 bg-white opacity-60 hover:opacity-100'
                }`}
              >
                <span
                  aria-hidden
                  className={`h-6 w-6 shrink-0 rounded-md border-2 flex items-center justify-center font-bold text-[13px] ${
                    active ? 'bg-[#F5B700] border-[#161616] text-[#161616]' : 'border-[#161616]/40 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-sans font-bold text-[14px] text-[#161616]">{t.label}</span>
                  <span className="block font-body text-[12px] text-[#161616]/70">{t.sub}</span>
                </span>
                <span className={`font-mono font-bold text-[13px] whitespace-nowrap ${active ? 'text-[#161616]' : 'text-[#161616]/40'}`}>
                  ${t.cost}/mo
                </span>
              </button>
            );
          })}
        </div>
        <p className="font-body text-[11px] text-[#161616]/70 mt-4 leading-relaxed">
          Typical small-business software prices. Your real bill is probably higher once you count the seats.
        </p>
      </div>

      {/* The payoff */}
      <div className="lg:col-span-2 lg:sticky lg:top-24">
        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-7 text-center">
          <span className="font-mono font-bold text-[10px] uppercase tracking-[0.24em] text-[#FBF6EA]/60 block">
            Your stack today, {count} {count === 1 ? 'tool' : 'tools'}
          </span>
          <p className="font-display font-extrabold text-[#FBF6EA] mt-1 leading-none tabular-nums" style={{ fontSize: 'clamp(2.75rem, 8vw, 3.75rem)' }}>
            ${shownTotal.toLocaleString()}<span className="text-2xl">/mo</span>
          </p>

          <div className="my-5 h-px w-full bg-[#FBF6EA]/15" />

          <span className="font-mono font-bold text-[10px] uppercase tracking-[0.24em] text-[#F5B700] block">
            One command center
          </span>
          <p className="font-display font-extrabold text-[#F5B700] mt-1 leading-none tabular-nums" style={{ fontSize: 'clamp(2.75rem, 8vw, 3.75rem)' }}>
            ${ccMonthly}<span className="text-2xl">/mo</span>
          </p>
          <p className="font-body text-[12.5px] text-[#FBF6EA]/70 mt-2 leading-relaxed">
            Every call transcribed, your website traffic, customers, reviews, invoices, and reports, wired together.
          </p>

          {savings > 0 ? (
            <p className="mt-4 rounded-xl border-2 border-[#F5B700] bg-[#F5B700] px-4 py-2.5 font-sans text-[14px] font-extrabold text-[#161616]">
              You would save {formatUsd(savings * 100)}/mo. And it is free with your website or receptionist.
            </p>
          ) : (
            <p className="mt-4 rounded-xl border-2 border-[#F5B700] bg-[#1F1F1F] px-4 py-2.5 font-sans text-[13px] font-bold text-[#F5B700]">
              Add the website or receptionist and the command center is free.
            </p>
          )}

          <Link
            href="/demos"
            onClick={() => track('command_center_calc_cta')}
            className="mt-5 block text-center rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-6 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#000000] hover:-translate-y-0.5 transition-all"
          >
            Build mine free →
          </Link>
        </div>
      </div>
    </div>
  );
}
