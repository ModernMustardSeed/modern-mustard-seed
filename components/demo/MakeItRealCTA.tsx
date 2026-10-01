'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DEMO_PRODUCTS,
  DEMO_ORDER_KEYS,
  SITE_RUNGS,
  SITE_RUNG_KEYS,
  DEFAULT_SITE_RUNG,
  type DemoProductKey,
  type SiteRungKey,
} from '@/lib/demo-order';

/** Choose the scope to discuss in your quote conversation. */


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
  const rung = SITE_RUNGS[rungKey];

  const toggle = (k: DemoProductKey) =>
    setPicked((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <section id="order" className="animate-[hubIn_.5s_ease-out_both]">
      <div className="bg-[#161616] border-2 border-[#161616] rounded-2xl p-6 sm:p-8" style={{ boxShadow: `6px 6px 0 0 ${accent}` }}>
        <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold" style={{ color: accent }}>Make it real</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#FBF6EA] mt-2">
          Make it yours. Let’s scope it together.
        </h2>
        <p className="font-body text-[14px] text-[#FBF6EA]/60 mt-2">
          Pick one, or take both together and they become one thing. We customize everything to {business} by hand
          with scope, price and timing agreed before work starts.
        </p>

        <div className="mt-6 space-y-3">
          {DEMO_ORDER_KEYS.map((k) => {
            const p = DEMO_PRODUCTS[k];
            const on = picked.includes(k);
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
                        Quoted for your business
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
                              Request a quote
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



        {/* Neutral lifted ink. A translucent accent fill over ink can mix to mud
            on some brand colors, so the border carries the accent, not the fill. */}
        <div className="mt-6 rounded-2xl border-2 bg-[#1F1F1F] p-5 text-center" style={{ borderColor: accent }}>
          <p className="font-display text-2xl font-bold text-[#FBF6EA]">Request a quote</p>
          <p className="font-body text-sm text-[#FBF6EA]/70 mt-2">We quote your selected scope in the conversation.</p>
          {picked.length > 0 ? (
            <Link
              href={`/inquire?${new URLSearchParams({ kind: 'demo', hub: hubId, business, products: picked.join(','), pages: rungKey }).toString()}`}
              className="mt-4 inline-block border-2 border-[#161616] rounded-xl px-8 py-4 font-sans font-bold uppercase tracking-[0.1em] text-sm hover:-translate-y-0.5 transition-transform"
              style={{ background: accent, color: accentInk }}
            >Discuss my setup →</Link>
          ) : <p className="mt-3 text-[#FBF6EA]/70">Pick a piece above to discuss your setup.</p>}
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
