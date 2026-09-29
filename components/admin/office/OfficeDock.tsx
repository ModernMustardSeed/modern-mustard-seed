'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AgentMark, HealthPill, SowerChat } from './parts';
import { useOffice } from './useOffice';

/**
 * Sower in the corner of every admin page. Closed, it is a pill that shows
 * whether the floor is working and how many things are waiting on Sarah.
 * Open, it is the same conversation the full office at /admin/office carries,
 * with anything held for her yes right there in the thread.
 *
 * Owner only: the layout mounts this for the owner and Mr. Mustard's help
 * bubble for the team, so the corner never holds two launchers.
 */
export default function OfficeDock() {
  const pathname = usePathname() || '';
  const onFloor = pathname.startsWith('/admin/office');
  const [open, setOpen] = useState(false);
  const api = useOffice({ intervalMs: open ? 2500 : 15_000, lite: true, enabled: !onFloor });
  const { state } = api;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      // Ctrl/Cmd + J opens Sower from anywhere in the admin.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (onFloor || pathname.startsWith('/admin/login') || api.forbidden) return null;

  const waiting = state?.approvals.length ?? 0;
  const working = (state?.missions ?? []).some((m) => m.tasks.some((t) => t.status === 'running')) || Boolean(state?.thinking);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Talk to Sower, your chief of staff"
          title="Talk to Sower (Ctrl+J)"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full border-2 border-[#161616] bg-[#161616] py-2 pl-2 pr-4 shadow-[3px_3px_0_0_#F5B700] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#F5B700]"
        >
          <AgentMark agent="sower" size={30} pulse={working} />
          <span className="text-left">
            <span className="block font-mono text-[8.5px] font-bold uppercase tracking-[0.28em] text-[#F5B700] leading-none">Yield</span>
            <span className="mt-0.5 block font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#FBF6EA] leading-none">Ask Sower</span>
          </span>
          {waiting > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[#FBF6EA] bg-[#E0301E] px-1 font-mono text-[10px] font-bold text-white">{waiting}</span>
          )}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Sower, chief of staff"
          className="fixed bottom-5 right-5 z-50 flex h-[min(680px,calc(100vh-2.5rem))] w-[min(430px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] text-[#161616] shadow-[6px_6px_0_0_#161616]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 bg-[#161616] px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <AgentMark agent="sower" size={32} pulse={working} />
              <div className="min-w-0">
                <p className="font-mono text-[9px] font-bold uppercase leading-none tracking-[0.3em] text-[#F5B700]">Yield, chief of staff</p>
                <p className="mt-1 font-sans text-[15px] font-bold leading-tight text-[#FBF6EA]">Sower</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <HealthPill state={state} compact />
              <Link
                href="/admin/office"
                onClick={() => setOpen(false)}
                className="rounded-lg border-2 border-[#F5B700] px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#F5B700] hover:bg-[#F5B700] hover:text-[#161616]"
              >
                Open office
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="px-1.5 text-2xl leading-none text-[#FBF6EA]/70 hover:text-[#FBF6EA]" aria-label="Close">
                ×
              </button>
            </div>
          </div>
          <SowerChat api={api} dense />
        </div>
      )}
    </>
  );
}
