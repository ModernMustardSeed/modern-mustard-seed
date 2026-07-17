'use client';

import { useRef, useState } from 'react';
import { priceBookFor } from '@/data/demo-os-pricebooks';
import type { OsPriceItem } from '@/data/demo-os-pricebooks';
import { resolveTradeKey } from '@/data/demo-os-trades';
import { BizMark, SectionTitle, StatCard, hash, interpolate, useCountUp, useOs } from './os-kit';

/**
 * QUOTES: the estimate/proposal generator. The owner assembles line items from
 * a trade-true price book (prices editable in place, the real build imports
 * their actual list), then previews a PAPER document wearing their logo and
 * brand color. Sending it plays the signature theater: sent, viewed, signed
 * with a drawn ink stroke, then the job files itself. The document is the wow.
 */

type Line = { id: string; name: string; unit: string; price: number; qty: number };

export type SignedQuote = { client: string; total: number; title: string };

const PAPER = '#faf7f1';
const PAPER_INK = '#211f1a';
const PAPER_DIM = 'rgba(33,31,26,0.6)';
const PAPER_LINE = 'rgba(33,31,26,0.14)';

/** A believable ink signature: one continuous cursive-ish stroke. */
const SIGN_PATH =
  'M6 36 C 12 10, 24 6, 27 20 C 29 30, 20 40, 30 34 C 42 26, 44 10, 54 14 C 62 17, 56 34, 68 28 C 76 24, 80 18, 90 22 C 98 25, 104 18, 114 22 C 122 25, 134 20, 148 24 C 158 27, 172 21, 186 25';

export default function QuotesTab({
  onSigned,
  goToJobs,
}: {
  onSigned: (q: SignedQuote, at?: { x: number; y: number }) => void;
  goToJobs: () => void;
}) {
  const { config, preset, theme, say, fireBurst } = useOs();
  // Resolved, never config.trade raw: legacy configs re-detect from the name.
  const book = priceBookFor(resolveTradeKey(config));

  const [lines, setLines] = useState<Line[]>(() =>
    book.items.map((it: OsPriceItem, i) => ({ id: `pb-${i}`, name: it.name, unit: it.unit, price: it.price, qty: it.popular ? 1 : 0 })),
  );
  const defaultClient = preset.customers.find((c) => c.stage <= 1)?.name ?? preset.customers[0]?.name ?? 'New customer';
  const [client, setClient] = useState(defaultClient);
  const [editing, setEditing] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [depositPct, setDepositPct] = useState(book.depositPct);
  const [docOpen, setDocOpen] = useState(false);
  const [signPhase, setSignPhase] = useState<null | 'sent' | 'viewed' | 'signed'>(null);
  const [acceptedBonus, setAcceptedBonus] = useState(0);
  const signTimers = useRef<number[]>([]);

  const active = lines.filter((l) => l.qty > 0);
  const total = active.reduce((s, l) => s + l.price * l.qty, 0);
  const deposit = Math.round((total * depositPct) / 100);
  const docTotal = useCountUp(docOpen ? total : 0, 900);

  // Sample desk stats, deterministic per business, plus anything signed live.
  const h = hash(config.business);
  const monthOut = 3 + (h % 4);
  const monthValue = monthOut * preset.avgTicket + (h % 900) + acceptedBonus;

  const docNumber = `${book.docWord.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}-${1000 + (h % 9000)}`;
  const jobTitle = active[0]?.name ?? `${preset.jobWord} work`;

  const setQty = (id: string, d: number) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.min(99, l.qty + d)) } : l)));
  const setPrice = (id: string, raw: string) => {
    const p = Math.max(0, Math.round(Number(raw.replace(/[^0-9.]/g, '')) || 0));
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, price: p } : l)));
  };
  const addCustom = () => {
    const name = customName.trim();
    const price = Math.max(0, Math.round(Number(customPrice.replace(/[^0-9.]/g, '')) || 0));
    if (!name || !price) return;
    setLines((ls) => [...ls, { id: `cu-${ls.length}`, name, unit: 'flat', price, qty: 1 }]);
    setCustomName('');
    setCustomPrice('');
    say('Line added. The real build remembers it for next time.');
  };
  const cycleDeposit = () => {
    const opts = Array.from(new Set([book.depositPct, 0, 25, 50]));
    setDepositPct((p) => opts[(opts.indexOf(p) + 1) % opts.length]);
  };

  const openDoc = () => {
    setSignPhase(null);
    setDocOpen(true);
  };
  const closeDoc = () => {
    signTimers.current.forEach((t) => window.clearTimeout(t));
    signTimers.current = [];
    setDocOpen(false);
    setSignPhase(null);
  };
  const sendForSignature = (at: { x: number; y: number }) => {
    if (signPhase) return;
    setSignPhase('sent');
    say(`${book.docWord} texted and emailed to ${client}.`);
    signTimers.current.push(
      window.setTimeout(() => setSignPhase('viewed'), 1500),
      window.setTimeout(() => {
        setSignPhase('signed');
        fireBurst(at.x, at.y);
        setAcceptedBonus((b) => b + total);
        onSigned({ client, total, title: jobTitle }, at);
      }, 3100),
    );
  };

  return (
    <div className="max-w-3xl">
      <SectionTitle
        title="The quote desk"
        sub={`Build the ${book.docWord.toLowerCase()} from your price book, send it wearing your brand, watch it get signed. The 9 PM quote scramble is over${config.ownerFirst ? `, ${config.ownerFirst}` : ''}.`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <StatCard label="Out this month" value={`$${monthValue.toLocaleString()}`} sub={`${monthOut} sent this month`} i={0} />
        <StatCard label="Awaiting signature" value={String(2 + (h % 2))} sub="auto-nudged every 3 days" i={1} pulse />
        <StatCard label="Signed rate" value={`${64 + (h % 18)}%`} sub="when sent same-day" i={2} />
      </div>

      {/* Builder */}
      <div className="rounded-2xl border overflow-hidden animate-[osIn_.5s_ease-out_.15s_both]" style={{ background: theme.panel, borderColor: theme.line }}>
        <div className="p-4 border-b flex flex-wrap items-center gap-2.5" style={{ borderColor: theme.line }}>
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.accent }}>New {book.docWord}</span>
          <span className="text-[13px]" style={{ color: theme.dim }}>for</span>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="flex-1 min-w-[150px] rounded-lg border px-3 py-1.5 text-[13px] font-semibold outline-none"
            style={{ background: theme.panelSoft, borderColor: theme.line, color: theme.text }}
            aria-label="Client name"
          />
        </div>

        <div className="divide-y" style={{ borderColor: theme.line }}>
          {lines.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-2.5" style={{ opacity: l.qty > 0 ? 1 : 0.62 }}>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setQty(l.id, -1)}
                  className="w-7 h-7 rounded-lg border font-bold text-[14px] leading-none"
                  style={{ borderColor: theme.line, color: theme.dim }}
                  aria-label={`Less ${l.name}`}
                >
                  −
                </button>
                <span className="w-7 text-center font-mono text-[13px] font-bold" style={{ color: l.qty > 0 ? theme.accent : theme.dim }}>{l.qty}</span>
                <button
                  onClick={() => setQty(l.id, 1)}
                  className="w-7 h-7 rounded-lg border font-bold text-[14px] leading-none"
                  style={{ borderColor: l.qty > 0 ? theme.accent : theme.line, color: l.qty > 0 ? theme.accent : theme.text }}
                  aria-label={`More ${l.name}`}
                >
                  +
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold truncate" style={{ color: theme.text }}>{l.name}</p>
                <p className="text-[11px]" style={{ color: theme.dim }}>{l.unit}</p>
              </div>
              {editing === l.id ? (
                <input
                  autoFocus
                  defaultValue={l.price}
                  onBlur={(e) => {
                    setPrice(l.id, e.target.value);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  className="w-20 rounded-lg border px-2 py-1 text-right font-mono text-[13px] outline-none"
                  style={{ background: theme.panelSoft, borderColor: theme.accent, color: theme.text }}
                  inputMode="numeric"
                  aria-label={`Price for ${l.name}`}
                />
              ) : (
                <button
                  onClick={() => setEditing(l.id)}
                  className="shrink-0 font-mono text-[13px] font-bold rounded-lg px-2 py-1 border border-transparent hover:border-current"
                  style={{ color: theme.text }}
                  title="Tap to edit this price"
                >
                  ${l.price.toLocaleString()}
                </button>
              )}
              <span className="hidden sm:block w-20 text-right font-mono text-[13px] font-bold shrink-0" style={{ color: l.qty > 0 ? theme.accent : theme.dim }}>
                {l.qty > 0 ? `$${(l.price * l.qty).toLocaleString()}` : '·'}
              </span>
            </div>
          ))}
        </div>

        {/* Custom line */}
        <div className="px-4 py-3 border-t flex flex-wrap items-center gap-2" style={{ borderColor: theme.line, background: theme.panelSoft }}>
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Add your own line item..."
            className="flex-1 min-w-[160px] rounded-lg border px-3 py-2 text-[13px] outline-none"
            style={{ background: theme.panel, borderColor: theme.line, color: theme.text }}
          />
          <input
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="$"
            inputMode="numeric"
            className="w-20 rounded-lg border px-3 py-2 text-[13px] font-mono text-right outline-none"
            style={{ background: theme.panel, borderColor: theme.line, color: theme.text }}
            aria-label="Custom line price"
          />
          <button
            onClick={addCustom}
            className="rounded-lg border px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.08em]"
            style={{ borderColor: theme.accent, color: theme.accent }}
          >
            Add
          </button>
        </div>

        {/* Total bar */}
        <div className="p-4 border-t flex flex-wrap items-center gap-3" style={{ borderColor: theme.line }}>
          <div className="min-w-0">
            <p className="font-mono text-2xl font-bold leading-none" style={{ color: theme.text }}>${total.toLocaleString()}</p>
            <button onClick={cycleDeposit} className="text-[11px] mt-1 underline decoration-dotted underline-offset-2" style={{ color: theme.dim }}>
              {depositPct > 0 ? `$${deposit.toLocaleString()} deposit (${depositPct}%) · tap to change` : 'No deposit · tap to change'}
            </button>
          </div>
          <button
            onClick={openDoc}
            disabled={total === 0 || !client.trim()}
            className="ml-auto rounded-xl px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: theme.accent, color: theme.accentInk }}
          >
            Preview the {book.docWord} →
          </button>
        </div>
      </div>

      <p className="text-[12px] mt-3 animate-[osIn_.4s_ease-out_.3s_both]" style={{ color: theme.dim }}>
        Sample price book for a {preset.label.toLowerCase()} business. Tap any price to make it yours; the real build imports your actual price list and remembers every custom line.
      </p>

      {/* ───────────────────────── the document ───────────────────────── */}
      {docOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-6" onClick={closeDoc}>
          <div className="absolute inset-0" style={{ background: 'rgba(4,6,12,0.72)' }} />
          <div
            className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-[osPaper_.55s_cubic-bezier(.2,.85,.3,1.05)_both]"
            style={{ background: PAPER }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* paper body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-7 sm:py-9">
              {/* letterhead */}
              <div className="flex items-start gap-4 animate-[osIn_.5s_ease-out_.1s_both]">
                <BizMark size={46} radius={12} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl sm:text-2xl font-bold leading-tight" style={{ color: PAPER_INK }}>{config.business}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: PAPER_DIM }}>
                    {[config.city, config.state].filter(Boolean).join(', ')}{config.phone ? ` · ${config.phone}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] font-bold" style={{ color: theme.accent }}>{book.docWord}</p>
                  <p className="font-mono text-[11px] mt-0.5" style={{ color: PAPER_DIM }}>{docNumber}</p>
                </div>
              </div>
              <div className="h-[3px] rounded-full mt-4 mb-5 animate-[osIn_.5s_ease-out_.2s_both]" style={{ background: theme.accent }} />

              <div className="animate-[osIn_.5s_ease-out_.28s_both]">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: PAPER_DIM }}>Prepared for</p>
                <p className="text-[16px] font-bold mt-0.5" style={{ color: PAPER_INK }}>{client}</p>
                <p className="text-[12.5px] leading-relaxed mt-2" style={{ color: PAPER_DIM }}>{interpolate(book.intro, config, preset.jobWord)}</p>
              </div>

              {/* lines */}
              <div className="mt-5 animate-[osIn_.5s_ease-out_.36s_both]">
                <div className="flex text-[9.5px] uppercase tracking-[0.2em] font-bold pb-2 border-b" style={{ color: PAPER_DIM, borderColor: PAPER_LINE }}>
                  <span className="flex-1">Item</span>
                  <span className="w-14 text-right hidden sm:block">Qty</span>
                  <span className="w-24 text-right">Amount</span>
                </div>
                {active.map((l, i) => (
                  <div
                    key={l.id}
                    className="flex items-baseline py-2.5 border-b animate-[osIn_.4s_ease-out_both]"
                    style={{ borderColor: PAPER_LINE, animationDelay: `${420 + i * 70}ms` }}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-[13.5px] font-semibold" style={{ color: PAPER_INK }}>{l.name}</p>
                      <p className="text-[11px]" style={{ color: PAPER_DIM }}>
                        {l.qty > 1 ? `${l.qty} × ` : ''}${l.price.toLocaleString()} {l.unit}
                      </p>
                    </div>
                    <span className="w-14 text-right font-mono text-[12px] hidden sm:block" style={{ color: PAPER_DIM }}>{l.qty}</span>
                    <span className="w-24 text-right font-mono text-[13.5px] font-bold" style={{ color: PAPER_INK }}>${(l.price * l.qty).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex items-center justify-end gap-6 pt-3">
                  <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: PAPER_DIM }}>Total</span>
                  <span className="font-mono text-2xl font-bold" style={{ color: PAPER_INK }}>${docTotal.toLocaleString()}</span>
                </div>
                {depositPct > 0 && (
                  <div className="flex items-center justify-end gap-3 mt-1.5">
                    <span
                      className="text-[11px] font-bold rounded-full px-3 py-1"
                      style={{ background: `${theme.accent}1f`, color: PAPER_INK }}
                    >
                      ${deposit.toLocaleString()} deposit ({depositPct}%) schedules the work
                    </span>
                  </div>
                )}
              </div>

              {/* terms */}
              <div className="mt-6 animate-[osIn_.5s_ease-out_.5s_both]">
                <p className="text-[9.5px] uppercase tracking-[0.22em] font-bold mb-1.5" style={{ color: PAPER_DIM }}>The fine print, kept short</p>
                {book.terms.map((t) => (
                  <p key={t} className="text-[11.5px] leading-relaxed" style={{ color: PAPER_DIM }}>· {t}</p>
                ))}
              </div>

              {/* signatures */}
              <div className="grid grid-cols-2 gap-6 mt-7 animate-[osIn_.5s_ease-out_.58s_both]">
                <div>
                  <div className="h-12 border-b flex items-end pb-1" style={{ borderColor: PAPER_INK }}>
                    <span className="font-display italic text-[15px]" style={{ color: PAPER_INK }}>{config.ownerFirst ?? config.business}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.18em] mt-1.5" style={{ color: PAPER_DIM }}>{config.business}</p>
                </div>
                <div>
                  <div className="h-12 border-b flex items-end relative" style={{ borderColor: PAPER_INK }}>
                    {signPhase === 'signed' && (
                      <svg viewBox="0 0 192 44" className="absolute bottom-0 left-0 h-11 w-full" aria-hidden>
                        <path
                          d={SIGN_PATH}
                          fill="none"
                          stroke="#1d3557"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          pathLength={1}
                          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: 'osSign 1.1s ease-in-out .15s forwards' }}
                        />
                      </svg>
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.18em] mt-1.5" style={{ color: PAPER_DIM }}>{client}</p>
                </div>
              </div>

              {signPhase === 'signed' && (
                <div className="flex justify-center mt-6">
                  <span
                    className="inline-block border-[3px] rounded-lg px-4 py-1.5 text-[15px] font-black uppercase tracking-[0.3em] animate-[osStamp_.45s_cubic-bezier(.2,1.6,.4,1)_both]"
                    style={{ borderColor: theme.accent, color: theme.accent, transform: 'rotate(-7deg)' }}
                  >
                    Signed
                  </span>
                </div>
              )}

              <p className="text-center text-[9.5px] uppercase tracking-[0.2em] mt-7" style={{ color: PAPER_DIM }}>
                Prepared in the {config.business} Command Center · Sample document
              </p>
            </div>

            {/* action bar */}
            <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 border-t" style={{ background: theme.ink, borderColor: theme.line }}>
              <span className="text-[11px] font-semibold hidden sm:block" style={{ color: theme.dim }}>
                {signPhase === null && 'Ready to go out.'}
                {signPhase === 'sent' && `Sent to ${client}...`}
                {signPhase === 'viewed' && `${client} is reading it now...`}
                {signPhase === 'signed' && `Signed. The ${preset.jobWord} filed itself.`}
              </span>
              <button
                onClick={() => say('Saved as a PDF. In the real build it also emails itself to the customer and your records folder.')}
                className="ml-auto rounded-xl border px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ borderColor: theme.line, color: theme.text }}
              >
                PDF
              </button>
              {signPhase !== 'signed' ? (
                <button
                  onClick={(e) => sendForSignature({ x: e.clientX, y: e.clientY })}
                  disabled={signPhase !== null}
                  className="rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] disabled:opacity-60"
                  style={{ background: theme.accent, color: theme.accentInk }}
                >
                  {signPhase === null ? 'Send for signature' : signPhase === 'sent' ? 'Delivered...' : 'Being read...'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    closeDoc();
                    goToJobs();
                  }}
                  className="rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ background: theme.accent, color: theme.accentInk }}
                >
                  See it on the Jobs board →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
