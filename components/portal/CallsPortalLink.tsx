'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * The doorway to a client's call log, on the portal home page.
 *
 * Renders NOTHING for a client with no voice agent assigned, for the same
 * reason the Front Office card does: a greyed-out product they did not buy
 * reads as broken, not as unpurchased.
 */

type Peek = { ok: boolean; rows: { startedAt: string | null; booked: boolean; transferred: boolean }[]; agents: { name: string | null }[] };

export default function CallsPortalLink() {
  const [data, setData] = useState<Peek | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await fetch('/api/portal/calls');
        if (!res.ok) return;
        const json = (await res.json()) as Peek;
        if (live) setData(json);
      } catch {
        /* the portal must render without it */
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!data?.ok || data.agents.length === 0) return null;
  const monthAgo = Date.now() - 30 * 86400_000;
  const month = data.rows.filter((r) => r.startedAt && Date.parse(r.startedAt) >= monthAgo);
  const agent = data.agents[0]?.name || 'Your voice agent';

  return (
    <Link
      href="/portal/calls"
      className="group mb-8 block rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#161616] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40"
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">Your calls</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold leading-tight">
            {month.length > 0 ? `${month.length} ${month.length === 1 ? 'call' : 'calls'} in the last 30 days` : 'Every call, on the record'}
          </p>
          <p className="mt-1 text-[14px] text-[#161616]/75">{agent} answers. Read every transcript and hear every recording here.</p>
        </div>
        {month.length > 0 && (
          <div className="flex shrink-0 gap-3">
            <Mini label="Booked" value={month.filter((r) => r.booked).length} />
            <Mini label="Handed to you" value={month.filter((r) => r.transferred).length} />
          </div>
        )}
      </div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2 text-center">
      <p className="font-display text-2xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#161616]/60">{label}</p>
    </div>
  );
}
