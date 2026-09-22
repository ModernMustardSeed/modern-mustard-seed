'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * The signature moment on /partners: makes the commission ladder tangible.
 * The levers are the real products at the real commission rates, passed in
 * from the server so the page and the calculator can never disagree. Builds
 * and playbooks use a stated blended average and say so on the card.
 */

type Props = {
  pct: number;
  months: number;
  talkingWebsiteCents: number;
  voiceCents: number;
  buildPct: number;
  productPct: number;
};

const BUILD_BLEND = 6000; // a typical custom build, stated on the card
const PRODUCT_BLEND = 90; // a typical playbook or bundle order, stated on the card

function useCountUp(target: number, ms = 500) {
  const [n, setN] = useState(target);
  const from = useRef(target);
  const start = useRef(0);
  useEffect(() => {
    const startVal = from.current;
    const delta = target - startVal;
    if (delta === 0) return;
    let raf = 0;
    const tick = (t: number) => {
      if (!start.current) start.current = t;
      const p = Math.min((t - start.current) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(startVal + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        from.current = target;
        start.current = 0;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const cents = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

function Stepper({ label, hint, value, onChange, accent }: { label: string; hint: string; value: number; onChange: (n: number) => void; accent: string }) {
  return (
    <div className="bg-[#FBF6EA] border-2 border-[#161616] rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="font-sans font-bold text-[#161616] text-sm leading-tight">{label}</div>
          <div className="text-[#161616]/55 font-body text-xs mt-1 leading-snug">{hint}</div>
        </div>
        <span className="shrink-0 w-2.5 h-2.5 rounded-full mt-1" style={{ background: accent }} aria-hidden />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`Fewer ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-11 h-11 shrink-0 grid place-items-center bg-white border-2 border-[#161616] rounded-full text-xl font-bold text-[#161616] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 active:translate-y-0 transition-all"
        >
          −
        </button>
        <div className="font-display text-4xl font-semibold text-[#161616] tabular-nums w-16 text-center">{value}</div>
        <button
          type="button"
          aria-label={`More ${label}`}
          onClick={() => onChange(Math.min(99, value + 1))}
          className="w-11 h-11 shrink-0 grid place-items-center bg-[#F5B700] border-2 border-[#161616] rounded-full text-xl font-bold text-[#161616] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 active:translate-y-0 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function PartnerEarningsCalculator({ pct, months, talkingWebsiteCents, voiceCents, buildPct, productPct }: Props) {
  const [sites, setSites] = useState(3);
  const [voices, setVoices] = useState(1);
  const [builds, setBuilds] = useState(0);
  const [products, setProducts] = useState(2);

  const twCut = talkingWebsiteCents / 100;
  const voiceCut = voiceCents / 100;
  const buildCut = (BUILD_BLEND * buildPct) / 100;
  const productCut = (PRODUCT_BLEND * productPct) / 100;

  const recurringMonthly = sites * twCut + voices * voiceCut;
  const monthly = recurringMonthly + builds * buildCut + products * productCut;
  const recurringYear = recurringMonthly * months;
  const shownMonthly = useCountUp(monthly);
  const shownRecurring = useCountUp(recurringYear);

  return (
    <div className="bg-white border-2 border-[#161616] rounded-3xl shadow-[8px_8px_0_0_#161616] overflow-hidden">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        {/* Levers */}
        <div className="p-6 sm:p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-[#161616]">
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold block mb-2">Run your numbers</span>
          <h3 className="font-display text-2xl font-semibold text-[#161616] mb-5">What could a month look like?</h3>
          <div className="space-y-3">
            <Stepper label="Talking Websites kept" hint={`${cents(talkingWebsiteCents)} a month each, for ${months} months`} value={sites} onChange={setSites} accent="#F5B700" />
            <Stepper label="Voice Agents kept" hint={`${cents(voiceCents)} a month each, for ${months} months`} value={voices} onChange={setVoices} accent="#1E50C8" />
            <Stepper label="Builds you send our way" hint={`${buildPct}% of the project. A ${money(BUILD_BLEND)} build pays ${money(buildCut)}`} value={builds} onChange={setBuilds} accent="#E0301E" />
            <Stepper label="Playbooks you sell" hint={`${productPct}% of every sale, paid the moment they buy. About ${money(productCut)} each`} value={products} onChange={setProducts} accent="#161616" />
          </div>
        </div>

        {/* Payout */}
        <div className="p-6 sm:p-8 bg-[#161616] flex flex-col justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#F5B700 1.4px, transparent 1.4px)', backgroundSize: '14px 14px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#F5B700] font-mono font-bold block mb-3">You earn</span>
            <div className="font-display text-6xl sm:text-7xl font-bold text-[#FBF6EA] leading-none tabular-nums">
              {money(shownMonthly)}
              <span className="font-sans text-lg font-medium text-[#FBF6EA]/50 tracking-tight">/mo</span>
            </div>
            <div className="mt-5 flex items-start gap-3 bg-[#F5B700] border-2 border-[#161616] rounded-xl p-4">
              <span className="text-lg leading-none" aria-hidden>↻</span>
              <p className="font-body text-sm text-[#161616] leading-snug">
                <span className="font-bold">{money(shownRecurring)} of that is locked in for the year</span> from the sites and voice agents alone. {pct}% of every monthly invoice keeps paying while you go find the next one.
              </p>
            </div>
            <p className="text-[#FBF6EA]/45 font-body text-[11px] mt-4 leading-relaxed">
              Sites and voice agents are the real rates on the real prices. Builds and playbooks use the blended averages stated on the levers. Your link, your real numbers, no cap on any of it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
