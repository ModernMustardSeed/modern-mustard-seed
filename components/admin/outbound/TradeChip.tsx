'use client';

import { useState } from 'react';
import { TRADE_PRESETS } from '@/data/demo-os-trades';
import type { OsTradeKey } from '@/data/demo-os-trades';

/**
 * THE GUESS, MADE VISIBLE AND CORRECTABLE.
 *
 * A suite is built on one detected trade, and that single answer decides the
 * voice agent's service menu, the command center's entire sample dataset, the
 * hub calculator's average ticket, and a line in the site brief naming who the
 * customers are. It was detected from a keyword in the owner's own words and
 * then frozen, invisible, with no way to correct it.
 *
 * On 2026-08-03 "two businesses under one roof" filed a chocolatier as a ROOFING
 * company: its agent offered emergency tarping and its calculator priced the
 * average job at $12,400 for a shop selling $30 gift boxes. A sweep found four
 * more live suites on the wrong trade, one of them a restaurant filed as a
 * wedding venue.
 *
 * Correcting is cheap and safe by construction: no tokens, no rebuild, and the
 * shareable links never change. The website is deliberately NOT rebuilt, since
 * that is a real artifact costing half an hour.
 */
export default function TradeChip({
  leadId,
  trade,
  onChanged,
}: {
  leadId: string;
  trade: string | null;
  onChanged?: (trade: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(trade);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!current) return null;
  const label = current in TRADE_PRESETS ? TRADE_PRESETS[current as OsTradeKey].label : current;

  async function set(next: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/outbound/leads/${leadId}/trade`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trade: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not change the trade.');
      setCurrent(json.trade);
      onChanged?.(json.trade);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        title="The trade this suite was built on. Click to correct it: rebuilds the voice agent and command center, keeps every link."
        className="text-[9px] uppercase tracking-[0.12em] font-oswald font-bold px-1.5 py-0.5 rounded-md border border-[#1a1815]/25 bg-[#1a1815]/[0.04] text-[#1a1815]/70 hover:border-[#b58a2a] hover:text-[#7a5c1a] transition-colors disabled:opacity-50"
      >
        {busy ? '…' : label}
      </button>

      {open && (
        <>
          {/* Click-away. A dropdown that traps you is worse than no dropdown. */}
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute top-full left-0 mt-1 z-50 w-56 max-h-72 overflow-y-auto rounded-lg border-2 border-[#1a1815] bg-[#fdfaf3] shadow-[4px_4px_0_0_#1a1815] py-1">
            <p className="px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] font-oswald font-bold text-[#1a1815]/45">
              Built on
            </p>
            <button
              type="button"
              onClick={() => set('auto')}
              className="w-full text-left px-3 py-1.5 text-[12px] font-sans text-[#7a5c1a] hover:bg-[#b58a2a]/12 font-semibold"
            >
              Re-detect from their words
            </button>
            <div className="my-1 border-t border-[#1a1815]/10" />
            {Object.entries(TRADE_PRESETS)
              .map(([key, preset]) => ({ key, label: preset.label }))
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => set(o.key)}
                  className={`w-full text-left px-3 py-1.5 text-[12px] font-sans hover:bg-[#b58a2a]/12 ${
                    o.key === current ? 'text-[#1a1815] font-semibold' : 'text-[#1a1815]/70'
                  }`}
                >
                  {o.key === current ? '● ' : ''}
                  {o.label}
                </button>
              ))}
            {err && <p className="px-3 py-2 text-[11px] font-sans text-[#a03123]">{err}</p>}
          </div>
        </>
      )}
    </span>
  );
}
