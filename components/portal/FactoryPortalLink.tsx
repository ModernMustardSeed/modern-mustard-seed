'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * The door to a client's Client Factory, shown in the portal only when they
 * actually have one.
 *
 * It renders nothing at all for every other client, and it fails silently: a
 * portal that cannot reach the Factory API should still open. The counts come
 * from the same tenant-scoped endpoint the dashboard uses, so nothing here can
 * show one customer another's numbers.
 */

type Summary = {
  factory: { id: string; name: string; status: string; mode: string } | null;
  agent: { name: string; role: string } | null;
  summary: { funnel: { stages: { key: string; label: string; count: number }[] }; pipelineCents: number } | null;
  hot: unknown[];
};

export default function FactoryPortalLink() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/portal/factory')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j?.factory) setData(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!data?.factory) return null;

  const stages = data.summary?.funnel.stages ?? [];
  const meetings = stages.find((s) => s.key === 'meeting')?.count ?? 0;
  const engaged = stages.find((s) => s.key === 'engaged')?.count ?? 0;
  const hot = data.hot?.length ?? 0;

  return (
    <Link
      href="/portal/factory"
      className="block mb-8 rounded-2xl border-2 border-[#161616] bg-[#F5B700]/25 shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] transition-shadow p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#E0301E]">Client Factory</span>
          <h3 className="font-sans text-xl font-bold tracking-tight text-[#161616] mt-1">{data.factory.name}</h3>
          <p className="text-sm text-[#161616]/65">
            {data.factory.status === 'live' ? 'Running' : data.factory.status === 'paused' ? 'Paused' : `In ${data.factory.status}`}
            {data.factory.mode === 'test' ? ', in test mode' : ''}
            {data.agent ? `. ${data.agent.name} is on it.` : '.'}
          </p>
        </div>
        <div className="flex gap-6">
          <Figure label="Engaged" value={engaged} />
          <Figure label="Hot now" value={hot} />
          <Figure label="Meetings" value={meetings} />
        </div>
      </div>
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="font-sans text-2xl font-bold tabular-nums text-[#161616]">{value.toLocaleString()}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50">{label}</div>
    </div>
  );
}
