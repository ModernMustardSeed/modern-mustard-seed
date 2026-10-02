'use client';

import { useMemo, useState } from 'react';
import type { WlDemoLine } from '@/components/white-label/WhiteLabelDemo';
import { inkFor, usd } from '@/components/white-label/brand';

/** The agency's own math. Only rendered behind a signed key. */
export default function MarginPanel({ agency, lines, color }: { agency: string; lines: WlDemoLine[]; color: string }) {
  const monthly = lines.filter((l) => l.wholesale && l.wholesale.monthly > 0);
  const [rows, setRows] = useState(() =>
    Object.fromEntries(monthly.map((l, i) => [l.slug, { clients: i === 0 ? 5 : i === 2 ? 3 : 0, price: l.retail.monthly, setup: l.retail.setup }])),
  );

  const totals = useMemo(() => {
    let cost = 0;
    let revenue = 0;
    let setupMargin = 0;
    for (const l of monthly) {
      const r = rows[l.slug];
      if (!r) continue;
      cost += r.clients * l.wholesale!.monthly;
      revenue += r.clients * r.price;
      setupMargin += r.clients * (r.setup - l.wholesale!.setup);
    }
    return { cost, revenue, margin: revenue - cost, setupMargin };
  }, [rows, monthly]);

  const set = (slug: string, k: 'clients' | 'price' | 'setup', v: number) =>
    setRows((r) => ({ ...r, [slug]: { ...r[slug], [k]: Math.max(0, Math.min(k === 'clients' ? 500 : 100000, Math.round(v) || 0)) } }));

  const cell = 'w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums';

  return (
    <section className="border-t-4 bg-neutral-950 text-white" style={{ borderColor: color }}>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/55">For {agency} only · not shown to clients</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Your margin, at your prices.</h2>
        <p className="mt-3 max-w-2xl text-white/70">Wholesale is what you pay us. Set your own price and client count; the math is yours.</p>
        <div className="mt-8 overflow-x-auto rounded-2xl bg-white text-neutral-900">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                <th className="p-3">Service</th>
                <th className="p-3 text-right">Wholesale / mo</th>
                <th className="p-3 text-right">Your price / mo</th>
                <th className="p-3 text-right">Your setup fee</th>
                <th className="p-3 text-right">Clients</th>
                <th className="p-3 text-right">Your margin / mo</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((l) => {
                const r = rows[l.slug];
                return (
                  <tr key={l.slug} className="border-b border-neutral-100">
                    <td className="p-3 font-semibold">{l.name}</td>
                    <td className="p-3 text-right tabular-nums">{usd(l.wholesale!.monthly)}</td>
                    <td className="p-3"><input aria-label={`${l.name} monthly price`} type="number" className={cell} value={r.price} onChange={(e) => set(l.slug, 'price', +e.target.value)} /></td>
                    <td className="p-3"><input aria-label={`${l.name} setup fee`} type="number" className={cell} value={r.setup} onChange={(e) => set(l.slug, 'setup', +e.target.value)} /></td>
                    <td className="p-3"><input aria-label={`${l.name} clients`} type="number" className={cell} value={r.clients} onChange={(e) => set(l.slug, 'clients', +e.target.value)} /></td>
                    <td className="p-3 text-right font-bold tabular-nums">{usd(r.clients * (r.price - l.wholesale!.monthly))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            ['You bill clients', `${usd(totals.revenue)}/mo`],
            ['You pay us', `${usd(totals.cost)}/mo`],
            ['You keep', `${usd(totals.margin)}/mo`],
            ['First year, with setups', usd(totals.margin * 12 + totals.setupMargin)],
          ].map(([k, v], i) => (
            <div key={k} className="rounded-2xl p-5" style={i === 2 ? { background: color, color: inkFor(color) } : { background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">{k}</p>
              <p className="mt-2 text-2xl font-black tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
