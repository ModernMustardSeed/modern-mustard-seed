'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, btn, btnGold, card, emptyBox, errorBox, fmtDateTime, input, label, muted, td, th, TIER_LABEL, usdFromCents, type RegistrationRow } from './shared';

const TIERS = ['masterclass', 'ga', 'vip', 'platinum', 'operator'] as const;

export default function RegistrationsTab() {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [q, setQ] = useState('');
  const [typed, setTyped] = useState('');
  const [tier, setTier] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setQ(typed.trim()), 300);
    return () => window.clearTimeout(t);
  }, [typed]);

  const qs = useCallback(() => {
    const p = new URLSearchParams();
    if (tier) p.set('tier', tier);
    if (q) p.set('q', q);
    return p;
  }, [tier, q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ ok: true; rows: RegistrationRow[] }>(`/api/admin/bootcamp/registrations?${qs().toString()}`);
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load registrations.');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const csvHref = (() => {
    const p = qs();
    p.set('format', 'csv');
    return `/api/admin/bootcamp/registrations?${p.toString()}`;
  })();

  const paid = rows.reduce((a, r) => a + (r.amount_cents || 0), 0);

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[220px]">
          <span className={label}>Search name, email, business</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="jane@, Acme, roofing" className={input} />
        </label>
        <label className="block">
          <span className={label}>Tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className={`${input} w-44`}>
            <option value="">All tiers</option>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void load()} disabled={loading} className={btn}>
          {loading ? 'Loading' : 'Reload'}
        </button>
        <a href={csvHref} className={btnGold} download>
          Export CSV
        </a>
      </section>

      <p className={muted}>
        {rows.length.toLocaleString('en-US')} {rows.length === 1 ? 'registration' : 'registrations'}
        {paid ? `, ${usdFromCents(paid)} paid` : ''}
        {q || tier ? ' matching the filters' : ''}. The export carries the same filters.
      </p>

      {error && <div className={errorBox}>{error}</div>}

      {!error && !loading && rows.length === 0 && (
        <div className={emptyBox}>
          {q || tier ? 'Nobody matches. Clear the search or pick All tiers.' : 'No registrations yet. The first masterclass seat lands here the moment someone registers at /bootcamp/masterclass.'}
        </div>
      )}

      {rows.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-[#161616] text-[#FBF6EA] text-[10px] uppercase tracking-[0.15em] font-mono">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Business</th>
                <th className={th}>Trade</th>
                <th className={th}>Tier</th>
                <th className={th}>Paid</th>
                <th className={th}>Host</th>
                <th className={th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#161616]/10">
                  <td className={`${td} font-bold`}>
                    {r.name || ''}
                    {r.unsubscribed_at && <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.15em] text-[#E0301E]">muted reminders</span>}
                  </td>
                  <td className={`${td} font-mono text-xs`}>
                    <a href={`mailto:${r.email}`} className="underline">{r.email}</a>
                  </td>
                  <td className={td}>
                    {r.business || ''}
                    {r.website && (
                      <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer" className="block font-mono text-[11px] text-[#0b3b44] underline">
                        {r.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </td>
                  <td className={td}>{r.trade || ''}</td>
                  <td className={`${td} font-mono text-xs uppercase`}>{TIER_LABEL[r.tier] || r.tier}</td>
                  <td className={`${td} font-mono`}>{r.amount_cents ? usdFromCents(r.amount_cents) : ''}</td>
                  <td className={`${td} font-mono text-xs`}>{r.host_slug || r.source || ''}</td>
                  <td className={`${td} font-mono text-xs whitespace-nowrap`}>{fmtDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
