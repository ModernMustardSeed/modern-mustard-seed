'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import CallDetail, { CallPills, cleanSummary, endedLabel, fmtDuration, fmtPhone, fmtWhen, whoLabel, type CallView } from '@/components/calls/CallDetail';

/**
 * YOUR CALLS.
 *
 * Every call the client's own voice agent has taken, newest first, with the
 * summary on the row and the full conversation and recording one click away.
 * Scoped by the signed-in email on the server; nothing here takes an id.
 */

type Api = {
  ok: boolean;
  rows: CallView[];
  agents: { name: string | null; business: string | null }[];
  reason?: string;
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border-2 border-[#161616] bg-white p-3.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold leading-none">{value}</p>
    </div>
  );
}

export default function ClientCalls() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<Api | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('call'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/calls', { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/portal/login');
        return;
      }
      setData((await res.json()) as Api);
    } catch {
      setData({ ok: false, rows: [], agents: [], reason: 'error' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.callerName, r.callerNumber, r.summary, r.transcript].filter(Boolean).some((v) => (v as string).toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const monthAgo = Date.now() - 30 * 86400_000;
    const month = rows.filter((r) => r.startedAt && Date.parse(r.startedAt) >= monthAgo);
    return {
      month: month.length,
      booked: month.filter((r) => r.booked).length,
      handed: month.filter((r) => r.transferred).length,
      minutes: Math.round(month.reduce((s, r) => s + (r.durationSec ?? 0), 0) / 60),
    };
  }, [rows]);

  const open = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);
  const setOpen = (id: string | null) => {
    setOpenId(id);
    router.replace(id ? `/portal/calls?call=${encodeURIComponent(id)}` : '/portal/calls', { scroll: false });
  };

  const agentName = data?.agents?.[0]?.name ?? 'your agent';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <main className="mx-auto max-w-[80rem] px-5 py-10 sm:px-8">
        <Link href="/portal" className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#161616]/60 hover:text-[#161616]">
          &larr; Your portal
        </Link>
        <div className="mt-3 mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">Your calls</p>
            <h1 className="mt-1.5 font-display text-3xl font-extrabold leading-tight sm:text-4xl">Every call, what was said, and what happened.</h1>
            <p className="mt-2 max-w-2xl text-[15px] text-[#161616]/70">
              {agentName} answers, and every conversation lands here with a summary, the full transcript, and the recording.
            </p>
          </div>
          <button
            onClick={load}
            className="rounded-lg border-2 border-[#161616] bg-white px-3.5 py-2 text-[13px] font-bold shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
          >
            Refresh
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-3xl">
          <Stat label="Calls, last 30 days" value={stats.month} />
          <Stat label="Booked" value={stats.booked} />
          <Stat label="Handed to you" value={stats.handed} />
          <Stat label="Minutes answered" value={stats.minutes} />
        </div>

        <div className="mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, number, or anything that was said..."
            className="w-full max-w-xl rounded-xl border-2 border-[#161616] bg-white px-4 py-3 text-sm placeholder:text-[#161616]/40 shadow-[3px_3px_0_0_#161616] focus:outline-none focus:-translate-y-0.5 transition-transform"
          />
        </div>

        {loading && !data && <p className="text-sm text-[#161616]/50">Opening your calls...</p>}

        {!loading && data && !data.ok && (
          <div className="rounded-2xl border-2 border-[#E0301E] bg-white p-6 shadow-[4px_4px_0_0_#161616] max-w-2xl">
            <p className="text-sm text-[#E0301E]">Your calls could not be loaded right now. Try Refresh in a moment.</p>
          </div>
        )}

        {!loading && data?.ok && rows.length === 0 && (
          <div className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[4px_4px_0_0_#161616] max-w-2xl">
            <h2 className="font-display text-[19px] font-bold">No calls yet</h2>
            <p className="mt-1 text-[14px] text-[#161616]/65">
              The first call {agentName} takes will appear here within a minute of it ending.
            </p>
          </div>
        )}

        {data?.ok && rows.length > 0 && filtered.length === 0 && <p className="text-sm text-[#161616]/50">No calls match.</p>}

        {filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setOpen(r.id)}
                  className="w-full text-left rounded-2xl border-2 border-[#161616] bg-white px-5 py-4 shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="font-display text-lg font-bold leading-tight">{whoLabel(r)}</h2>
                        {r.callerName && r.callerNumber && <span className="font-mono text-xs text-[#161616]/60">{fmtPhone(r.callerNumber)}</span>}
                      </div>
                      <p className="mt-0.5 text-sm text-[#161616]/65">
                        {fmtWhen(r.startedAt)}
                        {r.durationSec != null && <> &middot; {fmtDuration(r.durationSec)}</>}
                        {r.endedReason && <> &middot; {endedLabel(r.endedReason, r.transferred)}</>}
                      </p>
                      {r.summary && <p className="mt-2 text-[13px] leading-relaxed text-[#161616]/80 line-clamp-2">{cleanSummary(r.summary)}</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                      <CallPills c={r} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {open && <CallDetail call={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
