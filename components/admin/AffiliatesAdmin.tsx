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
  const [failedEmails, setFailedEmails] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

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

    // Live delivery health from Resend (best effort, never blocks the page).
    try {
      const hr = await fetch('/api/admin/email-health');
      const hj = await hr.json();
      const map: Record<string, string> = {};
      for (const f of hj.failures ?? []) {
        for (const to of f.to ?? []) map[String(to).toLowerCase()] = f.last_event;
      }
      setFailedEmails(map);
    } catch { /* ignore */ }
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

  const resendWelcome = async (id: string) => {
    setBusy(id);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/affiliates/${id}/resend-welcome`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      setMsg(res.ok ? 'Welcome email resent.' : `Could not resend: ${json.error ?? res.status}`);
      await load();
    } catch { setMsg('Could not resend (network error).'); }
    finally { setBusy(null); }
  };

  const editEmail = async (id: string, current: string) => {
    const next = window.prompt('New email for this partner', current);
    if (!next || next.trim().toLowerCase() === current.toLowerCase()) return;
    setBusy(id);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-email', email: next.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      setMsg(res.ok ? 'Email updated. Use Resend welcome to send their login link.' : `Could not update: ${json.error ?? res.status}`);
      await load();
    } catch { setMsg('Could not update (network error).'); }
    finally { setBusy(null); }
  };

  const emailFailed = (email: string) => failedEmails[email.toLowerCase()];

  const pending = rows.filter((r) => r.status === 'pending');
  const approved = rows.filter((r) => r.status === 'approved');
  const failingPartners = rows.filter((r) => emailFailed(r.email));

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="partners" title="Partners" onRefresh={load} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <div className="bg-white border-2 border-[#E0301E] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 mb-6"><p className="text-[#E0301E] text-sm font-body">{error}</p></div>}

        {msg && <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4 mb-6"><p className="text-[#161616] text-sm font-body">{msg}</p></div>}

        {failingPartners.length > 0 && (
          <div className="bg-white border-2 border-[#E0301E] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 mb-8">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">Delivery alerts</h2>
            <p className="text-[#3A3733] font-body text-sm mb-4">These partners did not receive their last email. Fix the address if it is wrong, then resend their welcome with login link.</p>
            <div className="space-y-3">
              {failingPartners.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-4 flex-wrap border-t border-[#161616]/10 pt-3 first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-[#161616] font-body font-medium">
                      {r.name ?? r.email} <span className="text-[#161616]/60 text-sm">. {r.email}</span>
                      <span className="ml-2 inline-block bg-[#F6E2DC] text-[#9A2D14] text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded align-middle">{emailFailed(r.email)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => editEmail(r.id, r.email)} disabled={busy === r.id} className="px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#161616] border border-[#161616]/25 rounded-lg hover:bg-[#FBF6EA] disabled:opacity-50 whitespace-nowrap">
                      Edit email
                    </button>
                    {r.status === 'approved' && (
                      <button onClick={() => resendWelcome(r.id)} disabled={busy === r.id} className="px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-white bg-[#161616] rounded-lg hover:bg-[#3A3733] disabled:opacity-50 whitespace-nowrap">
                        {busy === r.id ? '...' : 'Resend welcome'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Partners', value: String(totals.partners) },
              { label: 'Pending apps', value: String(totals.pending) },
              { label: 'Owed (payable)', value: money(totals.payableCents) },
              { label: 'Commissions total', value: money(totals.salesCents) },
            ].map((s) => (
              <div key={s.label} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4">
                <div className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono">{s.label}</div>
                <div className="font-sans text-2xl font-semibold text-[#161616] mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-center text-[#161616]/60 py-12 font-body italic">Loading...</p>
        ) : (
          <>
            {/* Pending applications */}
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-4">Pending applications</h2>
            {pending.length === 0 ? (
              <p className="text-[#161616]/60 font-body text-sm italic mb-10">No applications waiting.</p>
            ) : (
              <div className="space-y-3 mb-10">
                {pending.map((r) => (
                  <div key={r.id} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[#161616] font-body font-medium">{r.name ?? r.email} <span className="text-[#161616]/60 text-sm">. {r.email}</span></p>
                        {r.promote_where && <p className="text-[#3A3733] font-body text-sm mt-1"><span className="text-[#161616]/45">Promotes:</span> {r.promote_where}</p>}
                        {r.audience && <p className="text-[#3A3733] font-body text-sm"><span className="text-[#161616]/45">Audience:</span> {r.audience}</p>}
                        {r.why && <p className="text-[#161616]/60 font-body text-sm mt-1 italic">{r.why}</p>}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => act(r.id, 'approve')} disabled={busy === r.id} className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-[#161616]/20 rounded-lg disabled:opacity-50">
                          {busy === r.id ? '...' : 'Approve'}
                        </button>
                        <button onClick={() => act(r.id, 'reject')} disabled={busy === r.id} className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-[#161616]/55 hover:text-[#161616]">
                          Reject
                        </button>
                        <button onClick={() => editEmail(r.id, r.email)} disabled={busy === r.id} className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-[#161616]/45 hover:text-[#161616] disabled:opacity-50">
                          Edit email
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active partners */}
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-4">Active partners</h2>
            {approved.length === 0 ? (
              <p className="text-[#161616]/60 font-body text-sm italic">No active partners yet.</p>
            ) : (
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#161616]/15">
                      {['Partner', 'Code', 'Clicks', 'Sales', 'Pending', 'Payable', 'Paid', ''].map((h, i) => (
                        <th key={i} className="text-left text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-medium px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {approved.map((r) => (
                      <tr key={r.id} className="border-b border-[#161616]/10">
                        <td className="px-4 py-3.5">
                          <p className="text-[#161616] font-body">{r.name ?? r.email}{emailFailed(r.email) && <span className="ml-2 inline-block bg-[#F6E2DC] text-[#9A2D14] text-[9px] uppercase tracking-[0.15em] font-bold px-1.5 py-0.5 rounded align-middle">{emailFailed(r.email)}</span>}</p>
                          <p className="text-[#161616]/60 text-xs">{r.email}</p>
                        </td>
                        <td className="px-4 py-3.5"><span className="font-mono text-[#E0301E] text-xs">{r.code}</span></td>
                        <td className="px-4 py-3.5 text-[#3A3733] font-mono text-xs">{r.clicks}</td>
                        <td className="px-4 py-3.5 text-[#3A3733] font-mono text-xs">{r.sales}</td>
                        <td className="px-4 py-3.5 text-[#161616]/60 font-mono text-xs">{money(r.pendingCents)}</td>
                        <td className="px-4 py-3.5 text-emerald-700 font-mono text-xs font-semibold">{money(r.payableCents)}</td>
                        <td className="px-4 py-3.5 text-[#161616]/60 font-mono text-xs">{money(r.paidCents)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            {r.payableCents > 0 && (
                              <button onClick={() => payout(r.id)} disabled={busy === r.id} className="text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50 whitespace-nowrap">
                                {busy === r.id ? '...' : 'Mark paid'}
                              </button>
                            )}
                            <button onClick={() => resendWelcome(r.id)} disabled={busy === r.id} className="text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#161616]/70 hover:text-[#161616] disabled:opacity-50 whitespace-nowrap">
                              Resend welcome
                            </button>
                            <button onClick={() => editEmail(r.id, r.email)} disabled={busy === r.id} className="text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#161616]/50 hover:text-[#161616] disabled:opacity-50 whitespace-nowrap">
                              Edit email
                            </button>
                          </div>
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
