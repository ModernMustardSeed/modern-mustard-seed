'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminHeader from './AdminHeader';

type Row = {
  id: string;
  email: string;
  name: string | null;
  code: string | null;
  status: 'pending' | 'approved' | 'rejected';
  promote_where: string | null;
  audience: string | null;
  why: string | null;
  clicks: number;
  sales: number;
  pendingCents: number;
  payableCents: number;
  paidCents: number;
};
type Totals = { partners: number; pending: number; payableCents: number; salesCents: number };

const money = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

export default function AffiliatesAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/affiliates');
      const json = await res.json();
      if (res.ok) { setRows(json.affiliates); setTotals(json.totals); }
      else setError(json.error ?? 'Failed to load');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id);
    try {
      await fetch(`/api/admin/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally { setBusy(null); }
  };

  const payout = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/admin/affiliates/${id}/payout`, { method: 'POST' });
      await load();
    } finally { setBusy(null); }
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const approved = rows.filter((r) => r.status === 'approved');

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <AdminHeader active="partners" title="Partners" onRefresh={load} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <div className="glass-card p-5 mb-6 border-red-500/30"><p className="text-red-300 text-sm font-body">{error}</p></div>}

        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Partners', value: String(totals.partners) },
              { label: 'Pending apps', value: String(totals.pending) },
              { label: 'Owed (payable)', value: money(totals.payableCents) },
              { label: 'Commissions total', value: money(totals.salesCents) },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4">
                <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono">{s.label}</div>
                <div className="font-sans text-2xl font-semibold text-white mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-center text-white/40 py-12 font-body italic">Loading...</p>
        ) : (
          <>
            {/* Pending applications */}
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold mb-4">Pending applications</h2>
            {pending.length === 0 ? (
              <p className="text-white/35 font-body text-sm italic mb-10">No applications waiting.</p>
            ) : (
              <div className="space-y-3 mb-10">
                {pending.map((r) => (
                  <div key={r.id} className="glass-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white font-body font-medium">{r.name ?? r.email} <span className="text-white/40 text-sm">. {r.email}</span></p>
                        {r.promote_where && <p className="text-white/50 font-body text-sm mt-1"><span className="text-white/35">Promotes:</span> {r.promote_where}</p>}
                        {r.audience && <p className="text-white/50 font-body text-sm"><span className="text-white/35">Audience:</span> {r.audience}</p>}
                        {r.why && <p className="text-white/45 font-body text-sm mt-1 italic">{r.why}</p>}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => act(r.id, 'approve')} disabled={busy === r.id} className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-emerald-600/80 hover:bg-emerald-600 rounded-lg disabled:opacity-50">
                          {busy === r.id ? '...' : 'Approve'}
                        </button>
                        <button onClick={() => act(r.id, 'reject')} disabled={busy === r.id} className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-white/50 hover:text-white/80">
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active partners */}
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold mb-4">Active partners</h2>
            {approved.length === 0 ? (
              <p className="text-white/35 font-body text-sm italic">No active partners yet.</p>
            ) : (
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Partner', 'Code', 'Clicks', 'Sales', 'Pending', 'Payable', 'Paid', ''].map((h, i) => (
                        <th key={i} className="text-left text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono font-medium px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {approved.map((r) => (
                      <tr key={r.id} className="border-b border-white/[0.04]">
                        <td className="px-4 py-3.5"><p className="text-white/90 font-body">{r.name ?? r.email}</p><p className="text-white/40 text-xs">{r.email}</p></td>
                        <td className="px-4 py-3.5"><span className="font-mono text-mustard-300 text-xs">{r.code}</span></td>
                        <td className="px-4 py-3.5 text-white/70 font-mono text-xs">{r.clicks}</td>
                        <td className="px-4 py-3.5 text-white/70 font-mono text-xs">{r.sales}</td>
                        <td className="px-4 py-3.5 text-white/50 font-mono text-xs">{money(r.pendingCents)}</td>
                        <td className="px-4 py-3.5 text-emerald-300 font-mono text-xs font-semibold">{money(r.payableCents)}</td>
                        <td className="px-4 py-3.5 text-white/50 font-mono text-xs">{money(r.paidCents)}</td>
                        <td className="px-4 py-3.5 text-right">
                          {r.payableCents > 0 && (
                            <button onClick={() => payout(r.id)} disabled={busy === r.id} className="text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-emerald-300 hover:text-emerald-200 disabled:opacity-50 whitespace-nowrap">
                              {busy === r.id ? '...' : 'Mark paid'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
