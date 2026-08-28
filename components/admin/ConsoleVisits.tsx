'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Has he opened it yet.
 *
 * Sarah, 2026-08-28, minutes after sending Heath his console link: "has he
 * opened it?" The answer was a shrug, and a shrug is the wrong answer to the
 * only question that matters after a delivery email goes out.
 *
 * This is not email open tracking and deliberately so. An open pixel on a
 * Hotmail address is worthless, because Microsoft prefetches the images whether
 * or not a human looked, and we already learned that on the cold campaign where
 * the "clicks" turned out to be mail security gateways. What this shows is a
 * person who opened the product and moved through it.
 *
 * The screens he walked, in order, are the point. A count says he looked. The
 * order says whether he is sold: somebody who goes report, then ask, then jobs,
 * then money is reading it as a buyer.
 */

type Visit = {
  session: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
  screens: number;
  walked: string[];
  city: string | null;
  region: string | null;
  device: string | null;
  browser: string | null;
  isUs: boolean;
};

const SCREEN: Record<string, string> = {
  '/console': 'the 5am report',
  '/console/start': 'start here',
  '/console/ask': 'ask the Foreman',
  '/console/approvals': 'needs his OK',
  '/console/jobs': 'jobs',
  '/console/items': 'things to do',
  '/console/money': 'money',
  '/console/invoices': 'invoices',
  '/console/budget': 'budget',
  '/console/schedule': 'schedule',
  '/console/drawings': 'plans',
  '/console/directory': 'contacts',
  '/console/subs': 'subcontractors',
  '/console/documents': 'paperwork',
  '/console/compliance': 'insurance',
  '/console/contracts': 'contracts',
  '/console/knowledge': 'the file room',
  '/console/proposals': 'proposals',
  '/console/front-desk': 'inquiries',
  '/console/google': 'his Google listing',
  '/console/portfolio': 'all his jobs',
  '/console/crew': 'the crew',
  '/console/settings': 'settings',
  '/console/handbook': 'the handbook',
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

/** "nine minutes", or "one screen" when there is nothing to measure. */
function howLong(v: Visit): string {
  if (v.screens < 2) return 'opened one screen';
  if (v.seconds < 60) return `${v.seconds} seconds, ${v.screens} screens`;
  const mins = Math.round(v.seconds / 60);
  return `${mins} ${mins === 1 ? 'minute' : 'minutes'}, ${v.screens} screens`;
}

export default function ConsoleVisits({ clientEmail }: { clientEmail: string }) {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/admin/console-visits?email=${encodeURIComponent(clientEmail)}`,
      );
      const d = (await r.json()) as { visits?: Visit[]; reason?: string };
      setVisits(d.visits ?? []);
      setReason(d.reason ?? null);
    } catch {
      setVisits([]);
      setReason('could not check');
    }
  }, [clientEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  // No tenant, no panel. Most clients do not have a console and an empty box
  // saying so on every card is noise.
  if (visits === null || (visits.length === 0 && reason)) return null;

  const theirs = visits.filter((v) => !v.isUs);
  const last = theirs[0];

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-4">
        Has he opened it
      </span>

      {theirs.length === 0 ? (
        <p className="font-body text-[15px] leading-relaxed text-[#3a3733] mb-0">
          Nobody has opened his console yet. This counts people, not email
          opens: the beacon runs in a browser, so crawlers and mail scanners
          never appear here.
        </p>
      ) : (
        <>
          <p className="font-body text-[17px] leading-relaxed text-[#161616] mb-4">
            <strong>
              {last ? when(last.startedAt) : ''}
              {last?.city ? `, from ${last.city}${last.region ? ', ' + last.region : ''}` : ''}
            </strong>
            {last?.device && last.device !== 'unknown' ? (
              <span className="text-[#6e7c87]">
                {' '}
                on a {last.device === 'desk' ? 'computer' : last.device}
              </span>
            ) : null}
            . {theirs.length} {theirs.length === 1 ? 'visit' : 'visits'} in the last 30 days.
          </p>

          <ul className="list-none p-0 m-0 space-y-3">
            {theirs.slice(0, 8).map((v) => (
              <li
                key={v.session}
                className="border-b border-[#161616]/10 last:border-0 pb-3 last:pb-0"
              >
                <p className="m-0 font-mono text-[12px] text-[#161616]">
                  {when(v.startedAt)}
                  <span className="text-[#6e7c87]"> . {howLong(v)}</span>
                  {v.city ? <span className="text-[#6e7c87]"> . {v.city}</span> : null}
                </p>
                <p className="mt-1 mb-0 font-body text-[13.5px] leading-relaxed text-[#3a3733]">
                  {v.walked
                    .slice(0, 10)
                    .map((p) => SCREEN[p] ?? p.replace('/console/', ''))
                    .join(' → ')}
                  {v.walked.length > 10 ? ' ...' : ''}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 mb-0 font-body text-[12.5px] leading-relaxed text-[#6e7c87]">
        Recorded in the browser, so nothing that is not a person is counted. City
        only, never an IP address.
      </p>
    </div>
  );
}
