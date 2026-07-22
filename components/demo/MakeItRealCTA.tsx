'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_PRODUCTS, DEMO_BUNDLE, DEMO_ORDER_KEYS, quoteDemoOrder, isCommandCenterFree, formatUsd, type DemoProductKey } from '@/lib/demo-order';

/**
 * "Make it real" — order straight from the demo. Toggle any pieces, watch the
 * monthly total roll like the Recovery Calculator. Each is individually
 * purchasable; the Business Command Center shows its own price, STRUCK THROUGH
 * with "Free" the moment the website or receptionist is added (it rides free
 * with either). Both paid pieces unlock the whole-system bundle. Checkout
 * happens right here (Stripe); booking stays as a quiet second path.
 */

function useCountUp(target: number, ms = 700): number {
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

const PRODUCT_ICONS: Record<DemoProductKey, string> = { voice: '🎙', site: '🌐', os: '⚙' };

export default function MakeItRealCTA({
  hubId,
  business,
  forged,
}: {
  hubId: string;
  business: string;
  /** which demos were actually forged; these start selected */
  forged: DemoProductKey[];
}) {
  const seed = DEMO_ORDER_KEYS.filter((k) => forged.includes(k));
  const [picked, setPicked] = useState<DemoProductKey[]>(seed.length ? seed : ['voice']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quote = useMemo(() => quoteDemoOrder(picked), [picked]);
  const monthlyShown = useCountUp(quote ? quote.monthlyCents / 100 : 0);
  const osFree = isCommandCenterFree(picked);
  // Savings the bundle gives over the two PAID pieces a la carte (command center
  // is free either way, so it never figures into the bundle discount).
  const savings = {
    setup: DEMO_PRODUCTS.voice.setupCents + DEMO_PRODUCTS.site.setupCents - DEMO_BUNDLE.setupCents,
    monthly: DEMO_PRODUCTS.voice.monthlyCents + DEMO_PRODUCTS.site.monthlyCents - DEMO_BUNDLE.monthlyCents,
  };

  const toggle = (k: DemoProductKey) =>
    setPicked((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  async function checkout() {
    if (!quote || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/demo-order/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubId, products: picked }),
      });
      const json = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !json.url) throw new Error(json.message || 'Checkout hiccuped. Try again in a minute.');
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout hiccuped. Try again in a minute.');
      setBusy(false);
    }
  }

  return (
    <section id="order" className="animate-[hubIn_.5s_ease-out_both]">
      <div className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#F5B700] p-6 sm:p-8">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">Make it real</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#FBF6EA] mt-2">
          Keep it. Order right here, live within a week.
        </h2>
        <p className="font-body text-[14px] text-[#FBF6EA]/60 mt-2">
          Pick any piece, or all of it. Add the website or receptionist and your command center is free. We customize
          everything to {business} by hand and release it within 7 days.
        </p>

        <div className="mt-6 space-y-3">
          {DEMO_ORDER_KEYS.map((k) => {
            const p = DEMO_PRODUCTS[k];
            const on = picked.includes(k);
            const waived = k === 'os' && osFree;
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                aria-pressed={on}
                className={`w-full text-left rounded-2xl border-2 p-4 flex items-start gap-4 transition-all ${
                  on
                    ? 'border-[#F5B700] bg-[#242424]'
                    : 'border-[#FBF6EA]/20 bg-white/5 opacity-75 hover:opacity-100'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 h-6 w-6 shrink-0 rounded-md border-2 flex items-center justify-center font-bold text-[14px] ${
                    on ? 'bg-[#F5B700] border-[#F5B700] text-[#161616]' : 'border-[#FBF6EA]/40 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="font-display text-lg font-bold text-[#FBF6EA]">
                      {PRODUCT_ICONS[k]} {p.name}
                    </span>
                    {waived ? (
                      <span className="font-mono text-[13px] font-bold whitespace-nowrap flex items-baseline gap-2">
                        <span className="line-through text-[#FBF6EA]/40">
                          {formatUsd(p.monthlyCents)}/mo + {formatUsd(p.setupCents)} setup
                        </span>
                        <span className="text-[#161616] bg-[#F5B700] rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.1em]">
                          Free
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono text-[13px] font-bold text-[#F5B700] whitespace-nowrap">
                        {formatUsd(p.monthlyCents)}/mo + {formatUsd(p.setupCents)} setup
                      </span>
                    )}
                  </span>
                  <span className="block font-body text-[13px] text-[#FBF6EA]/65 mt-1">{p.blurb}</span>
                  {p.finePrint ? (
                    <span className="block font-body text-[11.5px] text-[#FBF6EA]/45 mt-1">{p.finePrint}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {quote?.isBundle ? (
          <p className="mt-4 rounded-xl border-2 border-[#F5B700] bg-[#F5B700] px-4 py-2.5 font-sans text-[13px] font-bold text-[#161616]">
            Whole system unlocked: receptionist + website for {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo + {formatUsd(DEMO_BUNDLE.setupCents)} setup
            (you save {formatUsd(savings.monthly)}/mo and {formatUsd(savings.setup)} on setup), command center free.
          </p>
        ) : osFree ? (
          <p className="mt-4 rounded-xl border-2 border-[#F5B700] bg-[#1F1F1F] px-4 py-2.5 font-sans text-[13px] font-bold text-[#F5B700]">
            Command center free with your {picked.includes('site') ? 'website' : 'receptionist'}. That is {formatUsd(DEMO_PRODUCTS.os.monthlyCents)}/mo + {formatUsd(DEMO_PRODUCTS.os.setupCents)} setup, on the house.
          </p>
        ) : null}

        {/* Neutral lifted ink. A translucent mustard fill over ink reads brown. */}
        <div className="mt-6 rounded-2xl border-2 border-[#F5B700] bg-[#1F1F1F] p-5 text-center">
          {quote ? (
            <>
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold text-[#F5B700]">{quote.label}</p>
              <p className="font-display text-5xl font-bold text-[#FBF6EA] mt-1 tabular-nums">
                ${monthlyShown.toLocaleString()}<span className="text-xl">/mo</span>
              </p>
              <p className="font-body text-[13px] text-[#FBF6EA]/70 mt-1">
                plus a one-time {formatUsd(quote.setupCents)} setup on your first invoice{osFree ? ', command center free' : ''}
              </p>
              <button
                type="button"
                onClick={checkout}
                disabled={busy}
                className="mt-4 inline-block bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-8 py-4 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[4px_4px_0_0_#000000] hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {busy ? 'Opening secure checkout…' : `Make it real →`}
              </button>
              <p className="font-body text-[12px] text-[#FBF6EA]/55 mt-3">
                Month to month, cancel anytime. No trials (this demo was the trial). Released within 7 days.
              </p>
              {error ? <p className="font-body text-[13px] text-[#FF8550] mt-2">{error}</p> : null}
            </>
          ) : (
            <p className="font-body text-[14px] text-[#FBF6EA]/70">
              Pick a piece above. Add the website or receptionist and your command center is free.
            </p>
          )}
        </div>

        <p className="font-body text-[13px] text-[#FBF6EA]/50 mt-5 text-center">
          Prefer to talk it through first?{' '}
          <a href="https://modernmustardseed.com/book" className="underline text-[#FBF6EA]/80 hover:text-[#F5B700]">
            Book 10 minutes with Sarah
          </a>{' '}
          or call{' '}
          <a href="tel:+14063121223" className="underline text-[#FBF6EA]/80 hover:text-[#F5B700]">
            (406) 312-1223
          </a>
          .
        </p>
      </div>
    </section>
  );
}
