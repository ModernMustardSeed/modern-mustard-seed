'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import Modal from '@/components/ui/Modal';
import { daysLeft, fmtMoney, formatPhone } from '@/lib/outbound';
import type { OutboundLead, Pilot } from '@/lib/outbound';
import { OutboundNav, NicheChip, ToastHost, useToasts, useCountUp, api, card, btnPrimary, btnSeed, btnGhost, btnDanger, inputCls, labelCls, eyebrow } from '@/components/admin/outbound/ui';

/** Set-price assumption used in the MRR projection when no price is entered yet. */
const DEFAULT_MONTHLY = 497;
const PILOT_DAYS = 30;

/** Projected monthly value of one pilot if it converts today. */
function projectedMonthly(p: Pilot): number {
  if (p.pricing_model === 'rev_share') {
    const elapsed = Math.max(1, (Date.now() - new Date(p.started_at).getTime()) / 86400000);
    const monthlyRate = (Number(p.revenue_recovered) / elapsed) * 30;
    const share = (Number(p.rev_share_pct ?? 15) / 100) * monthlyRate;
    return Math.max(Number(p.monthly_floor ?? 0), share);
  }
  return Number(p.convert_price ?? 0) || DEFAULT_MONTHLY;
}

export default function OutboundPilots() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [leads, setLeads] = useState<OutboundLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toasts, push } = useToasts();

  const [startOpen, setStartOpen] = useState(false);
  const [convertFor, setConvertFor] = useState<Pilot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, l] = await Promise.all([
        api<{ pilots: Pilot[] }>('/api/admin/outbound/pilots'),
        api<{ leads: OutboundLead[] }>('/api/admin/outbound/leads'),
      ]);
      setPilots(p.pilots);
      setLeads(l.leads);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load pilots.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const running = useMemo(() => pilots.filter((p) => p.status === 'running'), [pilots]);
  const finished = useMemo(() => pilots.filter((p) => p.status !== 'running'), [pilots]);
  const totalRecovered = useMemo(() => pilots.reduce((s, p) => s + Number(p.revenue_recovered), 0), [pilots]);
  const projectedMrr = useMemo(() => running.reduce((s, p) => s + projectedMonthly(p), 0), [running]);
  const shownRecovered = useCountUp(totalRecovered, 900);
  const shownMrr = useCountUp(projectedMrr, 900);

  const patchPilot = async (id: string, patch: Record<string, unknown>, note?: string) => {
    const before = pilots;
    setPilots((ps) => ps.map((p) => (p.id === id ? ({ ...p, ...patch } as Pilot) : p)));
    try {
      const { pilot } = await api<{ pilot: Pilot }>(`/api/admin/outbound/pilots/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setPilots((ps) => ps.map((p) => (p.id === id ? pilot : p)));
      if (note) push(note);
    } catch (e) {
      setPilots(before);
      push(e instanceof Error ? e.message : 'Update failed.', 'error');
    }
  };

  const markLost = (p: Pilot) => {
    if (!window.confirm(`Mark the ${p.lead?.business_name ?? ''} pilot lost?`)) return;
    void patchPilot(p.id, { status: 'lost' }, 'Pilot marked lost.');
  };

  const eligibleLeads = useMemo(() => {
    const inPilot = new Set(pilots.filter((p) => p.status === 'running').map((p) => p.lead_id));
    return leads.filter((l) => !inPilot.has(l.id) && !['pilot_live', 'won', 'lost', 'dnc'].includes(l.status));
  }, [leads, pilots]);

  return (
    <div className="min-h-screen bg-[#f7f3e9]">
      <AdminHeader active="outbound" title="Outbound · Pilots" onRefresh={() => void load()} />
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        <OutboundNav
          active="pilots"
          right={<button onClick={() => setStartOpen(true)} className={btnPrimary}>Start a pilot</button>}
        />

        {error && (
          <div className={`${card} p-5 mb-6 border-[#a03123] shadow-[5px_5px_0_0_#a03123]`}>
            <p className="font-sans text-sm text-[#a03123] font-medium">{error}</p>
          </div>
        )}

        {/* Totals band */}
        <section className="bg-[#1a1815] border-2 border-[#1a1815] rounded-2xl shadow-[6px_6px_0_0_#b58a2a] p-6 mb-8 grid sm:grid-cols-3 gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.26em] font-oswald font-semibold text-[#b58a2a]">Running pilots</span>
            <p className="font-oswald font-bold text-5xl text-[#f7f3e9] leading-tight">{running.length}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.26em] font-oswald font-semibold text-[#b58a2a]">Revenue recovered (all pilots)</span>
            <p className="font-oswald font-bold text-5xl text-[#f7f3e9] leading-tight tabular-nums">{fmtMoney(shownRecovered)}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.26em] font-oswald font-semibold text-[#b58a2a]">Projected MRR if all convert</span>
            <p className="font-oswald font-bold text-5xl text-[#3f5d34] leading-tight tabular-nums" style={{ color: '#8fb37f' }}>{fmtMoney(shownMrr)}</p>
            <p className="font-sans text-[11px] text-[#f7f3e9]/40 mt-1">Assumes {fmtMoney(DEFAULT_MONTHLY)}/mo where no set price is entered yet.</p>
          </div>
        </section>

        {loading && <div className={`${card} p-10 text-center font-oswald uppercase text-[#1a1815]/40`}>Loading pilots...</div>}

        {!loading && running.length === 0 && (
          <div className={`${card} p-10 text-center mb-8`}>
            <p className="font-oswald uppercase text-xl text-[#1a1815]/50">No pilots running</p>
            <p className="font-sans text-sm text-[#1a1815]/55 mt-1.5 max-w-md mx-auto">
              Book demos in the <Link href="/admin/outbound" className="text-[#b58a2a] font-semibold">cockpit</Link>, then start the 30-day free pilot here. The pilot is the close.
            </p>
          </div>
        )}

        {/* Running pilot cards */}
        <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
          {running.map((p) => {
            const left = daysLeft(p.ends_at);
            const elapsedPct = Math.min(100, Math.round(((PILOT_DAYS - left) / PILOT_DAYS) * 100));
            const endingSoon = left <= 3;
            return (
              <div key={p.id} className={`${card} p-5 flex flex-col ${endingSoon ? 'border-[#b58a2a] shadow-[5px_5px_0_0_#b58a2a]' : ''}`}>
                {endingSoon && (
                  <span className="self-start mb-2 px-2.5 py-1 rounded-lg bg-[#b58a2a] text-[#1a1815] border-2 border-[#1a1815] text-[10px] uppercase tracking-[0.16em] font-oswald font-bold">
                    Convert window open
                  </span>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-oswald font-semibold uppercase text-xl text-[#1a1815] leading-tight truncate">{p.lead?.business_name ?? 'Unknown'}</h3>
                    <p className="font-sans text-xs text-[#1a1815]/55 mt-0.5">
                      {p.lead?.contact_name ? `${p.lead.contact_name} · ` : ''}{p.lead ? formatPhone(p.lead.phone) : ''}{p.lead?.city ? ` · ${p.lead.city}` : ''}
                    </p>
                    {p.lead && <div className="mt-1.5"><NicheChip niche={p.lead.niche} /></div>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-oswald font-bold text-4xl leading-none ${endingSoon ? 'text-[#b58a2a]' : 'text-[#1a1815]'}`}>{left}</p>
                    <p className="text-[9px] uppercase tracking-[0.18em] font-oswald text-[#1a1815]/45">days left</p>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-[#1a1815]/10 overflow-hidden mt-4">
                  <div className="h-full bg-[#3f5d34] transition-all duration-700" style={{ width: `${elapsedPct}%` }} />
                </div>
                <p className="font-sans text-[11px] text-[#1a1815]/45 mt-1">
                  Ends {new Date(p.ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/Denver' })} · {p.pricing_model === 'rev_share' ? `Rev share ${Number(p.rev_share_pct ?? 15)}%` : 'Converts to set price'}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className={labelCls}>Calls caught</label>
                    <input
                      inputMode="numeric"
                      defaultValue={p.calls_caught}
                      onBlur={(e) => {
                        const v = Number(e.target.value.replace(/[^\d]/g, '')) || 0;
                        if (v !== p.calls_caught) void patchPilot(p.id, { calls_caught: v }, 'Calls caught updated.');
                      }}
                      className={`${inputCls} !font-oswald !text-lg tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Revenue recovered $</label>
                    <input
                      inputMode="decimal"
                      defaultValue={Number(p.revenue_recovered) || ''}
                      onBlur={(e) => {
                        const v = Number(e.target.value.replace(/[^\d.]/g, '')) || 0;
                        if (v !== Number(p.revenue_recovered)) void patchPilot(p.id, { revenue_recovered: v }, 'Recovered revenue updated.');
                      }}
                      className={`${inputCls} !font-oswald !text-lg tabular-nums`}
                    />
                  </div>
                </div>

                {p.notes && <p className="font-sans text-xs text-[#1a1815]/55 mt-3 line-clamp-2">{p.notes}</p>}

                <div className="flex items-center gap-2 mt-4 pt-4 border-t-2 border-[#1a1815]/[0.08]">
                  <button onClick={() => setConvertFor(p)} className={`${btnPrimary} flex-1 !py-2.5`}>Convert</button>
                  <button onClick={() => markLost(p)} className={`${btnDanger} !py-2.5`}>Lost</button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Finished pilots */}
        {finished.length > 0 && (
          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-4 border-b-2 border-[#1a1815]/10">
              <span className={eyebrow}>History</span>
              <h3 className="font-oswald font-semibold uppercase text-xl text-[#1a1815]">Finished pilots</h3>
            </div>
            <ul className="divide-y divide-[#1a1815]/[0.08]">
              {finished.map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg border-2 text-[10px] uppercase tracking-[0.16em] font-oswald font-bold ${p.status === 'won' ? 'bg-[#3f5d34] text-[#f7f3e9] border-[#1a1815]' : 'bg-transparent text-[#1a1815]/40 border-[#1a1815]/20'}`}>
                    {p.status}
                  </span>
                  <span className="font-sans font-semibold text-sm text-[#1a1815] truncate flex-1">{p.lead?.business_name ?? 'Unknown'}</span>
                  <span className="font-sans text-xs text-[#1a1815]/55">recovered {fmtMoney(Number(p.revenue_recovered))}</span>
                  {p.status === 'won' && (
                    <span className="font-oswald text-sm text-[#3f5d34] font-semibold">
                      {p.pricing_model === 'rev_share' ? `${Number(p.rev_share_pct ?? 15)}% rev share` : `${fmtMoney(Number(p.convert_price ?? 0))}/mo`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <StartPilotModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        leads={eligibleLeads}
        onStarted={(p) => {
          setPilots((ps) => [p, ...ps]);
          setStartOpen(false);
          push(`Pilot started for ${p.lead?.business_name ?? 'the lead'}. 30 days on the clock.`);
        }}
        onError={(m) => push(m, 'error')}
      />

      <ConvertModal
        pilot={convertFor}
        onClose={() => setConvertFor(null)}
        onConvert={(patch) => {
          if (!convertFor) return;
          void patchPilot(convertFor.id, { ...patch, status: 'won' }, 'Converted. New recurring revenue. 🌱');
          setConvertFor(null);
        }}
      />

      <ToastHost toasts={toasts} />
    </div>
  );
}

function StartPilotModal({
  open,
  onClose,
  leads,
  onStarted,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  leads: OutboundLead[];
  onStarted: (p: Pilot) => void;
  onError: (m: string) => void;
}) {
  const [leadId, setLeadId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!leadId) return;
    setBusy(true);
    try {
      const { pilot } = await api<{ pilot: Pilot }>('/api/admin/outbound/pilots', { method: 'POST', body: JSON.stringify({ lead_id: leadId, notes: notes || null }) });
      onStarted(pilot);
      setLeadId('');
      setNotes('');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not start the pilot.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="The hook" title="Start a 30-day free pilot" subtitle="Free for 30 days, then we look at the receipts together." size="sm">
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Business</label>
          <select className={inputCls} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">Pick a lead</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.business_name}{l.city ? ` (${l.city})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} min-h-[64px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Demo went great, wants the after-hours catch first." />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button onClick={() => void start()} disabled={busy || !leadId} className={btnSeed}>{busy ? 'Starting...' : 'Start the clock'}</button>
      </div>
    </Modal>
  );
}

function ConvertModal({ pilot, onClose, onConvert }: { pilot: Pilot | null; onClose: () => void; onConvert: (patch: Record<string, unknown>) => void }) {
  const [model, setModel] = useState<'convert_to_setprice' | 'rev_share'>('convert_to_setprice');
  const [price, setPrice] = useState(String(DEFAULT_MONTHLY));
  const [pct, setPct] = useState('15');
  const [floor, setFloor] = useState('197');

  useEffect(() => {
    if (pilot) {
      setModel(pilot.pricing_model);
      setPrice(String(Number(pilot.convert_price ?? 0) || DEFAULT_MONTHLY));
      setPct(String(Number(pilot.rev_share_pct ?? 15)));
      setFloor(String(Number(pilot.monthly_floor ?? 0) || 197));
    }
  }, [pilot]);

  const radio = (v: 'convert_to_setprice' | 'rev_share', title: string, desc: string) => (
    <button
      onClick={() => setModel(v)}
      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${model === v ? 'border-[#1a1815] bg-[#b58a2a]/10 shadow-[3px_3px_0_0_#1a1815]' : 'border-[#1a1815]/20 hover:border-[#1a1815]/50'}`}
    >
      <span className="font-oswald font-semibold uppercase tracking-[0.08em] text-sm text-[#1a1815]">{title}</span>
      <span className="block font-sans text-xs text-[#1a1815]/60 mt-0.5">{desc}</span>
    </button>
  );

  return (
    <Modal open={pilot != null} onClose={onClose} eyebrow="Month of receipts" title={`Convert ${pilot?.lead?.business_name ?? ''}`} subtitle="It proved itself. Pick how they pay." size="sm" headerTone="dark">
      <div className="space-y-2.5">
        {radio('convert_to_setprice', 'Set monthly price', 'Our default. Flat, predictable, simple to say yes to.')}
        {radio('rev_share', 'Rev share (fallback)', 'Capped at 15% of booked recovered revenue, with a monthly floor.')}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {model === 'convert_to_setprice' ? (
          <div className="col-span-2">
            <label className={labelCls}>Monthly price $</label>
            <input inputMode="decimal" className={`${inputCls} !font-oswald !text-lg`} value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
        ) : (
          <>
            <div>
              <label className={labelCls}>Rev share % (max 15)</label>
              <input inputMode="numeric" className={`${inputCls} !font-oswald !text-lg`} value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ''))} />
            </div>
            <div>
              <label className={labelCls}>Monthly floor $</label>
              <input inputMode="decimal" className={`${inputCls} !font-oswald !text-lg`} value={floor} onChange={(e) => setFloor(e.target.value.replace(/[^\d.]/g, ''))} />
            </div>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button
          onClick={() => {
            if (model === 'convert_to_setprice') {
              onConvert({ pricing_model: model, convert_price: Number(price) || DEFAULT_MONTHLY });
            } else {
              onConvert({ pricing_model: model, rev_share_pct: Math.min(15, Number(pct) || 15), monthly_floor: Number(floor) || 0 });
            }
          }}
          className={btnSeed}
        >
          Mark won
        </button>
      </div>
    </Modal>
  );
}
