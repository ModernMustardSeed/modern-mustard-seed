'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEMO_PRODUCTS,
  DEMO_ORDER_KEYS,
  SITE_RUNGS,
  SITE_RUNG_KEYS,
  DEFAULT_SITE_RUNG,
  quoteDemoOrder,
  formatUsd,
  type DemoProductKey,
  type SiteRungKey,
} from '@/lib/demo-order';

/**
 * "Make it real": order straight from the demo. Toggle either piece, watch the
 * monthly total roll like the Recovery Calculator. Each is individually
 * purchasable, and taking both is The Talking Website, which costs less than
 * the two apart. The strip under the list names that saving, because it is a
 * true sentence they deserve to read before they pay.
 *
 * The website comes in three sizes (lib/demo-order.ts SITE_RUNGS). The size
 * picker sits under the website card and prices the site, and the bundle,
 * from the rung. The demo they toured is one page; the 5-page rung is what
 * that demo becomes, and the bigger rungs are the same site with every
 * service and every town on its own page.
 *
 * There is no third card and no waiver: the Business Command Center came off
 * this card on 2026-08-22 and is never suggested here (Sarah, 2026-08-25: "I am
 * not pushing command center anywhere"). It is sold on its own page and its own
 * pay link. Do not add it back to DEMO_ORDER_KEYS.
 *
 * Checkout happens right here (Stripe); booking is the quiet second path.
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

// Exhaustive on DemoProductKey on purpose: adding a product without giving it
// an icon should fail the build rather than render a blank square.
const PRODUCT_ICONS: Record<DemoProductKey, string> = {
  voice: '🎙',
  site: '🌐',
  os: '⚙',
  cornerstone: '🏗',
};

/** The house mustard, used until a lead's own brand color has been built. */
const MMS_THEME = { accent: '#F5B700', accentInk: '#161616' };

export default function MakeItRealCTA({
  hubId,
  business,
  built,
  theme = MMS_THEME,
}: {
  hubId: string;
  business: string;
  /** which demos were actually built; these start selected */
  built: DemoProductKey[];
  /** Derived from THIS lead's own built website; falls back to house mustard. */
  theme?: { accent: string; accentInk: string };
}) {
  const { accent, accentInk } = theme;
  const seed = DEMO_ORDER_KEYS.filter((k) => built.includes(k));
  const [picked, setPicked] = useState<DemoProductKey[]>(seed.length ? seed : ['voice']);
  const [rungKey, setRungKey] = useState<SiteRungKey>(DEFAULT_SITE_RUNG);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quote = useMemo(() => quoteDemoOrder(picked, rungKey), [picked, rungKey]);
  const monthlyShown = useCountUp(quote ? quote.monthlyCents / 100 : 0);
  const rung = SITE_RUNGS[rungKey];
  // Savings the bundle gives over the two pieces a la carte, at the size they
  // picked. There is no third piece and no waiver: the command center came off
  // this card entirely on 2026-08-22 and nothing here may suggest it.
  const savings = {
    setup: DEMO_PRODUCTS.voice.setupCents + rung.setupCents - rung.bundleSetupCents,
    monthly: DEMO_PRODUCTS.voice.monthlyCents + rung.monthlyCents - rung.bundleMonthlyCents,
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
        body: JSON.stringify({ hubId, products: picked, pages: rungKey }),
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
      <div className="bg-[#161616] border-2 border-[#161616] rounded-2xl p-6 sm:p-8" style={{ boxShadow: `6px 6px 0 0 ${accent}` }}>
        <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold" style={{ color: accent }}>Make it real</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#FBF6EA] mt-2">
          Keep it. Order right here, live within a week.
        </h2>
        <p className="font-body text-[14px] text-[#FBF6EA]/60 mt-2">
          Pick one, or take both together and they become one thing. We customize everything to {business} by hand
          and release it within 7 days.
        </p>

        <div className="mt-6 space-y-3">
          {DEMO_ORDER_KEYS.map((k) => {
            const p = DEMO_PRODUCTS[k];
            const on = picked.includes(k);
            // The website card prices at the size picked below it.
            const setup = k === 'site' ? rung.setupCents : p.setupCents;
            const monthly = k === 'site' ? rung.monthlyCents : p.monthlyCents;
            return (
              <div key={k}>
                <button
                  type="button"
                  onClick={() => toggle(k)}
                  aria-pressed={on}
                  className={`w-full text-left rounded-2xl border-2 p-4 flex items-start gap-4 transition-all ${
                    on ? 'bg-[#242424]' : 'border-[#FBF6EA]/20 bg-white/5 opacity-75 hover:opacity-100'
                  }`}
                  style={on ? { borderColor: accent } : undefined}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 h-6 w-6 shrink-0 rounded-md border-2 flex items-center justify-center font-bold text-[14px] ${
                      on ? '' : 'border-[#FBF6EA]/40 text-transparent'
                    }`}
                    style={on ? { background: accent, borderColor: accent, color: accentInk } : undefined}
                  >
                    ✓
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3 flex-wrap">
                      <span className="font-display text-lg font-bold text-[#FBF6EA]">
                        {PRODUCT_ICONS[k]} {p.name}
                        {k === 'site' ? <span className="font-mono text-[12px] font-bold text-[#FBF6EA]/60">, {rung.label}</span> : null}
                      </span>
                      <span className="font-mono text-[13px] font-bold whitespace-nowrap" style={{ color: accent }}>
                        {formatUsd(monthly)}/mo + {formatUsd(setup)} setup
                      </span>
                    </span>
                    <span className="block font-body text-[13px] text-[#FBF6EA]/65 mt-1">{k === 'site' ? rung.pitch : p.blurb}</span>
                    {p.finePrint ? (
                      <span className="block font-body text-[11.5px] text-[#FBF6EA]/45 mt-1">{p.finePrint}</span>
                    ) : null}
                  </span>
                </button>
                {k === 'site' && on ? (
                  <div className="mt-2 ml-0 sm:ml-10 rounded-xl border border-[#FBF6EA]/15 bg-white/5 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#FBF6EA]/55">How big a site</p>
                    <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Website size">
                      {SITE_RUNG_KEYS.map((rk) => {
                        const r = SITE_RUNGS[rk];
                        const sel = rk === rungKey;
                        return (
                          <button
                            key={rk}
                            type="button"
                            role="radio"
                            aria-checked={sel}
                            onClick={() => setRungKey(rk)}
                            className={`rounded-lg border-2 px-2 py-2 text-left transition-all ${sel ? '' : 'border-[#FBF6EA]/20 hover:border-[#FBF6EA]/50'}`}
                            style={sel ? { borderColor: accent, background: accent, color: accentInk } : { color: '#FBF6EA' }}
                          >
                            <span className="block font-display text-[15px] font-bold leading-tight">{r.label}</span>
                            <span className={`block font-mono text-[11px] mt-1 ${sel ? 'opacity-80' : 'opacity-60'}`}>
                              {formatUsd(r.setupCents)} + {formatUsd(r.monthlyCents)}/mo
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="font-body text-[12px] text-[#FBF6EA]/55 mt-2.5 leading-relaxed">{rung.plan}</p>
                    <p className="font-body text-[11.5px] text-[#FBF6EA]/45 mt-1.5 leading-relaxed">
                      Edits to every page are free, forever. A new page beyond your size is the next size up, not an edit.
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {quote?.isBundle ? (
          <p className="mt-4 rounded-xl border-2 px-4 py-2.5 font-sans text-[13px] font-bold" style={{ borderColor: accent, background: accent, color: accentInk }}>
            The Talking Website unlocked: your site answers its own phone, for {formatUsd(rung.bundleMonthlyCents)}/mo + {formatUsd(rung.bundleSetupCents)} setup
            (you save {formatUsd(savings.monthly)}/mo and {formatUsd(savings.setup)} on setup).
          </p>
        ) : null}

        {/* Neutral lifted ink. A translucent accent fill over ink can mix to mud
            on some brand colors, so the border carries the accent, not the fill. */}
        <div className="mt-6 rounded-2xl border-2 bg-[#1F1F1F] p-5 text-center" style={{ borderColor: accent }}>
          {quote ? (
            <>
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: accent }}>{quote.label}</p>
              <p className="font-display text-5xl font-bold text-[#FBF6EA] mt-1 tabular-nums">
                ${monthlyShown.toLocaleString()}<span className="text-xl">/mo</span>
              </p>
              <p className="font-body text-[13px] text-[#FBF6EA]/70 mt-1">
                plus a one-time {formatUsd(quote.setupCents)} setup on your first invoice
              </p>
              <button
                type="button"
                onClick={checkout}
                disabled={busy}
                className="mt-4 inline-block border-2 border-[#161616] rounded-xl px-8 py-4 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[4px_4px_0_0_#000000] hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
                style={{ background: accent, color: accentInk }}
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
              Pick a piece above. Take both together and they are built as one thing, for less than the two apart.
            </p>
          )}
        </div>

        <p className="font-body text-[13px] text-[#FBF6EA]/50 mt-5 text-center">
          Prefer to talk it through first?{' '}
          <a href="https://modernmustardseed.com/book" className="underline text-[#FBF6EA]/80 hover:text-[#FBF6EA]">
            Book 10 minutes with Sarah
          </a>{' '}
          or call{' '}
          <a href="tel:+14063121223" className="underline text-[#FBF6EA]/80 hover:text-[#FBF6EA]">
            (406) 312-1223
          </a>
          .
        </p>
      </div>
    </section>
  );
}
