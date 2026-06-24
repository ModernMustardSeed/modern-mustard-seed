'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from './AdminHeader';

/**
 * Voice caller memory, surfaced for triage. Read-only view of who the voice
 * agents (Mr. Mustard et al.) have talked to: name, business, what they needed,
 * whether they booked, and the last call summary. Powered by /api/admin/callers
 * (table voice_caller_memory). Shows an activation hint until migration 028 runs.
 */

type Caller = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  business: string | null;
  pain_summary: string | null;
  last_summary: string | null;
  booked: boolean | null;
  call_count: number | null;
  first_called_at: string | null;
  last_called_at: string | null;
};

type ApiResult = { ok: boolean; rows: Caller[]; reason?: string };

const INK = '#161616';

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border-2 border-[#161616] rounded-xl px-5 py-4 shadow-[3px_3px_0_0_#161616]">
      <div className="font-sans text-3xl font-bold text-[#161616] leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#161616]/55 font-sans font-semibold">
        {label}
      </div>
    </div>
  );
}

export default function CallersPanel() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/callers', { cache: 'no-store' });
      const json = (await res.json()) as ApiResult;
      setData(json);
    } catch {
      setData({ ok: false, rows: [], reason: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((c) =>
      [c.name, c.business, c.phone, c.email, c.pain_summary, c.last_summary]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const totalCalls = rows.reduce((sum, c) => sum + (c.call_count ?? 0), 0);
    const booked = rows.filter((c) => c.booked).length;
    return { callers: rows.length, totalCalls, booked };
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="callers" title="Callers" onRefresh={load} />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        <div className="mb-6">
          <h2 className="font-sans text-2xl font-bold tracking-tight">Voice caller memory</h2>
          <p className="mt-1 text-sm text-[#161616]/60 max-w-2xl">
            Everyone Mr. Mustard has spoken with, what they needed, and whether they booked. He uses
            this to recognize returning callers and pick up the thread.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 max-w-xl">
          <Stat label="Callers" value={stats.callers} />
          <Stat label="Conversations" value={stats.totalCalls} />
          <Stat label="Booked" value={stats.booked} />
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, business, phone, email, or what they said..."
            className="w-full max-w-xl bg-white border-2 border-[#161616] rounded-xl px-4 py-3 font-sans text-sm text-[#161616] placeholder:text-[#161616]/40 shadow-[3px_3px_0_0_#161616] focus:outline-none focus:-translate-y-0.5 transition-transform"
          />
        </div>

        {/* States */}
        {loading && <p className="text-sm text-[#161616]/50 font-sans">Loading callers...</p>}

        {!loading && data && !data.ok && data.reason === 'table-missing' && (
          <div className="bg-white border-2 border-[#E0301E] rounded-xl p-6 shadow-[3px_3px_0_0_#161616] max-w-2xl">
            <h3 className="font-sans text-lg font-bold text-[#161616]">Caller memory is not switched on yet</h3>
            <p className="mt-2 text-sm text-[#161616]/70">
              Run migration <code className="font-mono text-[#E0301E]">028_voice_caller_memory.sql</code> once in the
              Supabase SQL Editor to create the table. Until then Mr. Mustard treats everyone as new (nothing
              breaks), and this page lights up the moment it exists.
            </p>
          </div>
        )}

        {!loading && data && !data.ok && data.reason === 'no-supabase' && (
          <p className="text-sm text-[#161616]/60 font-sans">Database is not configured in this environment.</p>
        )}

        {!loading && data && !data.ok && data.reason === 'error' && (
          <p className="text-sm text-[#E0301E] font-sans">Could not load caller memory. Try Refresh.</p>
        )}

        {!loading && data?.ok && rows.length === 0 && (
          <div className="bg-white border-2 border-[#161616] rounded-xl p-6 shadow-[3px_3px_0_0_#161616] max-w-2xl">
            <h3 className="font-sans text-lg font-bold">No caller memory yet</h3>
            <p className="mt-2 text-sm text-[#161616]/70">
              This fills in automatically as Mr. Mustard takes calls. Phone callers are remembered by their
              number, web callers by the email they give.
            </p>
          </div>
        )}

        {!loading && data?.ok && rows.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-[#161616]/50 font-sans">No callers match &ldquo;{q}&rdquo;.</p>
        )}

        {/* Caller cards */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((c) => (
              <article
                key={c.id}
                className="bg-white border-2 border-[#161616] rounded-xl p-5 shadow-[3px_3px_0_0_#161616]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-sans text-lg font-bold text-[#161616] truncate">
                      {c.name || 'Unknown caller'}
                    </h3>
                    {c.business && (
                      <p className="text-sm text-[#161616]/60 truncate">{c.business}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {c.booked ? (
                      <span className="text-[10px] uppercase tracking-[0.15em] font-sans font-bold px-2.5 py-1 rounded-md bg-[#F5B700] text-[#161616] border-2 border-[#161616]">
                        Booked
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.15em] font-sans font-bold px-2.5 py-1 rounded-md bg-[#161616]/5 text-[#161616]/55 border-2 border-[#161616]/15">
                        Lead
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[#161616]/45 font-sans font-semibold">
                      {c.call_count ?? 0} {c.call_count === 1 ? 'call' : 'calls'}
                    </span>
                  </div>
                </div>

                {(c.phone || c.email) && (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[#161616]/70">
                    {c.phone && <span>{c.phone}</span>}
                    {c.email && <span className="truncate">{c.email}</span>}
                  </div>
                )}

                {c.pain_summary && (
                  <p className="mt-3 text-sm text-[#161616]/85 leading-relaxed">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#161616]/45 font-sans font-bold block mb-0.5">
                      What they need
                    </span>
                    {c.pain_summary}
                  </p>
                )}

                {c.last_summary && (
                  <div className="mt-3 bg-[#FFFDF6] border border-[#E7DECC] rounded-lg p-3">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#161616]/45 font-sans font-bold block mb-1">
                      Last call
                    </span>
                    <p className="text-[13px] text-[#161616]/75 leading-relaxed line-clamp-4">{c.last_summary}</p>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-[#161616]/10 flex items-center justify-between text-[11px] text-[#161616]/45 font-sans">
                  <span title={fmtDate(c.last_called_at)}>Last spoke {relativeTime(c.last_called_at)}</span>
                  {c.first_called_at && <span>since {fmtDate(c.first_called_at)}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
