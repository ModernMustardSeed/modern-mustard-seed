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
  const running = data.factory.status === 'live';

  return (
    <Link
      href="/portal/factory"
      className="group block mb-8 rounded-2xl border-2 border-[#161616] bg-[#F5B700] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#161616] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40"
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#8E1007]">Client Factory</span>
          <h3 className="font-display text-2xl font-semibold tracking-tight text-[#161616] mt-1.5 leading-tight">{data.factory.name}</h3>
          <p className="font-body text-[14px] text-[#161616] mt-1 leading-snug">
            {running ? 'Running' : data.factory.status === 'paused' ? 'Paused' : `In ${data.factory.status}`}
            {data.factory.mode === 'test' ? ', in test mode' : ''}
            {data.agent ? `. ${data.agent.name} is on it.` : '.'}
          </p>
        </div>

        <div className="flex gap-6 sm:gap-8 shrink-0">
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
    <div className="text-left sm:text-right">
      <div className="font-sans font-extrabold tabular-nums tracking-tight leading-none text-3xl text-[#161616]">{value.toLocaleString('en-US')}</div>
      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#161616] mt-1.5 opacity-80">{label}</div>
    </div>
  );
}
