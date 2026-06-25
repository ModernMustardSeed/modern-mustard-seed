'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
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
  const [failedEmails, setFailedEmails] = useState<Record<string, { event: string; id?: string }>>({});
  const [msg, setMsg] = useState('');
  const [add, setAdd] = useState({ name: '', email: '', sendWelcome: true });
  const [adding, setAdding] = useState(false);
  const [buildFor, setBuildFor] = useState<string | null>(null);
  const [bform, setBform] = useState({ fee: '', client: '', payable: false, notify: true });

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
      const map: Record<string, { event: string; id?: string }> = {};
      for (const f of hj.failures ?? []) {
        for (const to of f.to ?? []) map[String(to).toLowerCase()] = { event: f.last_event, id: f.id };
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

  const addPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: add.name.trim(), email: add.email.trim(), sendWelcome: add.sendWelcome }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(
          json.alreadyPartner
            ? `${add.email} is already a partner (code ${json.code}).`
            : `Partner added. Code ${json.code}.${json.emailSent ? ' Welcome email with login link sent.' : add.sendWelcome ? ' Welcome email could not be sent, use Resend welcome.' : ' No welcome email sent.'}`
        );
        setAdd({ name: '', email: '', sendWelcome: true });
        await load();
      } else {
        setMsg(`Could not add: ${json.error ?? res.status}`);
      }
    } catch {
      setMsg('Could not add (network error).');
    } finally {
      setAdding(false);
    }
  };

  const openBuild = (id: string) => {
    setBuildFor((cur) => (cur === id ? null : id));
    setBform({ fee: '', client: '', payable: false, notify: true });
  };

  const logBuild = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const fee = parseFloat(bform.fee);
    if (!fee || fee <= 0) { setMsg('Enter the build fee in dollars.'); return; }
    setBusy(id);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/affiliates/${id}/build-commission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildFeeUsd: fee, clientLabel: bform.client.trim(), markPayable: bform.payable, notify: bform.notify }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`Logged a ${money(json.commissionCents)} build commission (${json.status})${json.emailSent ? ', partner notified' : ''}.`);
        setBuildFor(null);
        setBform({ fee: '', client: '', payable: false, notify: true });
        await load();
      } else {
        setMsg(`Could not log: ${json.error ?? res.status}`);
      }
    } catch {
      setMsg('Could not log (network error).');
    } finally {
      setBusy(null);
    }
  };

  const emailFailed = (email: string) => failedEmails[email.toLowerCase()]?.event;
  const failedId = (email: string) => failedEmails[email.toLowerCase()]?.id;

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
            <p className="text-[#3A3733] font-body text-sm mb-1">These partners did not receive their last email.</p>
            <p className="text-[#161616]/60 font-body text-xs mb-4 leading-relaxed">
              <strong className="text-[#161616]">Suppressed</strong> means Resend is blocking this exact address because it bounced or was marked spam before, and resending alone will keep getting blocked. Click <em>Remove from suppression</em> to open it in Resend and click &ldquo;Remove from suppression list,&rdquo; then resend. <strong className="text-[#161616]">Bounced</strong> usually means a typo: fix the address, then resend.
            </p>
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
                    {emailFailed(r.email) === 'suppressed' && failedId(r.email) && (
                      <a href={`https://resend.com/emails/${failedId(r.email)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-white bg-[#E0301E] rounded-lg hover:bg-[#b9261a] whitespace-nowrap">
                        Remove from suppression →
                      </a>
                    )}
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

        {/* Add a partner directly (no application needed) */}
        <form onSubmit={addPartner} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-1">Add a partner</h2>
          <p className="text-[#3A3733] font-body text-sm mb-4">Create a partner yourself, already approved. We generate their code, grant free access, and email their login link.</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[180px]">
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Name</span>
              <input value={add.name} onChange={(e) => setAdd((a) => ({ ...a, name: e.target.value }))} required placeholder="Jane Builder" className="w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
            </label>
            <label className="flex-1 min-w-[200px]">
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Email</span>
              <input value={add.email} onChange={(e) => setAdd((a) => ({ ...a, email: e.target.value }))} required type="email" placeholder="jane@example.com" className="w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
            </label>
            <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={add.sendWelcome} onChange={(e) => setAdd((a) => ({ ...a, sendWelcome: e.target.checked }))} className="w-4 h-4 accent-[#F5B700]" />
              <span className="text-[#3A3733] font-body text-sm">Email login link</span>
            </label>
            <button type="submit" disabled={adding} className="px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 whitespace-nowrap">
              {adding ? 'Adding...' : 'Add partner'}
            </button>
          </div>
        </form>

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
                      <Fragment key={r.id}>
                      <tr className="border-b border-[#161616]/10">
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
                            <button onClick={() => openBuild(r.id)} className={`text-[10px] uppercase tracking-[0.15em] font-sans font-bold disabled:opacity-50 whitespace-nowrap ${buildFor === r.id ? 'text-[#161616]' : 'text-[#1E50C8] hover:text-[#161616]'}`}>
                              {buildFor === r.id ? 'Close' : 'Log build $'}
                            </button>
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
                      {buildFor === r.id && (
                        <tr className="border-b border-[#161616]/10 bg-[#FFF8E6]">
                          <td colSpan={8} className="px-4 py-4">
                            <form onSubmit={(e) => logBuild(e, r.id)} className="flex flex-wrap items-end gap-3">
                              <label className="min-w-[140px]">
                                <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Build fee ($)</span>
                                <input value={bform.fee} onChange={(e) => setBform((b) => ({ ...b, fee: e.target.value }))} inputMode="decimal" placeholder="5000" className="w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
                              </label>
                              <label className="flex-1 min-w-[160px]">
                                <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Client / project (optional)</span>
                                <input value={bform.client} onChange={(e) => setBform((b) => ({ ...b, client: e.target.value }))} placeholder="Acme Co website" className="w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
                              </label>
                              <div className="pb-2 text-sm font-body text-[#161616] whitespace-nowrap">
                                <span className="text-[#161616]/50 text-xs uppercase tracking-[0.15em] font-mono mr-2">Commission (50%)</span>
                                <span className="font-mono font-bold text-emerald-700">{bform.fee && parseFloat(bform.fee) > 0 ? `$${Math.round(parseFloat(bform.fee) * 0.5).toLocaleString('en-US')}` : '$0'}</span>
                              </div>
                              <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
                                <input type="checkbox" checked={bform.payable} onChange={(e) => setBform((b) => ({ ...b, payable: e.target.checked }))} className="w-4 h-4 accent-[#F5B700]" />
                                <span className="text-[#3A3733] font-body text-sm whitespace-nowrap">Payable now</span>
                              </label>
                              <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
                                <input type="checkbox" checked={bform.notify} onChange={(e) => setBform((b) => ({ ...b, notify: e.target.checked }))} className="w-4 h-4 accent-[#F5B700]" />
                                <span className="text-[#3A3733] font-body text-sm whitespace-nowrap">Email partner</span>
                              </label>
                              <button type="submit" disabled={busy === r.id} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 whitespace-nowrap">
                                {busy === r.id ? 'Logging...' : 'Log commission'}
                              </button>
                            </form>
                            <p className="text-[#161616]/45 font-body text-xs mt-2">Records 50% of the build fee as this partner&apos;s commission. Left as pending it becomes payable after the {''}14-day window; check &quot;Payable now&quot; for a build that is already settled.</p>
                          </td>
                        </tr>
                      )}
                      </Fragment>
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
