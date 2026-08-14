'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * The doorway to their Front Office, on the portal home page.
 *
 * Renders NOTHING for a client who does not have one, rather than a disabled
 * card or an upsell. A website-only customer opening their portal should not
 * see a greyed-out product they did not buy; that reads as something broken
 * rather than something not purchased.
 */

type Peek = {
  office: { business_name: string; status: string; agent_phone: string | null; forward_mode: string } | null;
  stats?: { callsThisMonth: number; booked: number; afterHours: number };
};

const MODE_LABELS: Record<string, string> = {
  all_calls: 'every call',
  after_hours: 'nights and weekends',
  overflow: 'overflow calls',
  voicemail_only: 'the calls that would have gone to voicemail',
};

export default function FrontOfficePortalLink() {
  const [data, setData] = useState<Peek | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await fetch('/api/portal/front-office');
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

  if (!data?.office) return null;
  const o = data.office;
  const s = data.stats;
  const live = o.status === 'live';

  return (
    <Link
      href="/portal/front-office"
      className="group mb-8 block rounded-2xl border-2 border-[#161616] bg-[#F5B700] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#161616] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40"
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">Your Front Office</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold leading-tight">
            {live ? `Answering ${MODE_LABELS[o.forward_mode] ?? 'your calls'}` : 'Being set up'}
          </p>
          <p className="mt-1 text-[14px] text-[#161616]/75">
            {live && o.agent_phone
              ? `Callers reach ${o.agent_phone}.`
              : 'We are wiring up your number. You will get an email the moment it is answering.'}
          </p>
        </div>

        {s && s.callsThisMonth > 0 && (
          <div className="flex shrink-0 gap-3">
            <Mini label="Calls" value={s.callsThisMonth} />
            <Mini label="Booked" value={s.booked} />
            <Mini label="After hours" value={s.afterHours} />
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
