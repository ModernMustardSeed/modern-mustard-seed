'use client';

import { useState } from 'react';
import type { Player as PlayerSpec } from '@/lib/bootcamp/sessions';
import Player from './Player';

/**
 * Every session this person has a seat in, in order, with what they can do
 * about each one right now: add it to the calendar, walk into it, watch the
 * replay, read the transcript. A replay opens in place, one at a time, and
 * its player is only mounted when opened, so a cohort room with twenty-one
 * sessions never loads twenty-one videos.
 */

export type ScheduleStatus = 'upcoming' | 'live' | 'replay' | 'processing' | 'closed';

export type ScheduleItem = {
  key: string;
  label: string;
  title: string;
  when: string;
  status: ScheduleStatus;
  cal: string;
  replay: PlayerSpec | null;
  transcriptUrl: string | null;
  group: string;
};

const CHIP: Record<ScheduleStatus, { text: string; cls: string }> = {
  upcoming: { text: 'Upcoming', cls: 'bg-white border-[#141210]/40 text-[#141210]' },
  live: { text: 'Live now', cls: 'bg-[#c2261a] border-[#141210] text-[#fcfaf3]' },
  replay: { text: 'Replay', cls: 'bg-[#f5b700] border-[#141210] text-[#141210]' },
  processing: { text: 'Replay tonight', cls: 'bg-[#e8ecd0] border-[#0f4c47] text-[#141210]' },
  closed: { text: 'Replay ended', cls: 'bg-[#141210]/5 border-[#141210]/30 text-[#141210]/60' },
};

const action =
  'inline-flex items-center justify-center rounded-full border-2 border-[#141210] px-4 py-2 font-sans text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all hover:-translate-y-0.5';

export default function Schedule({ items }: { items: ScheduleItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <div key={g}>
          {groups.length > 1 && <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#0f4c47] mb-4">{g}</h3>}
          <ol className="space-y-3">
            {items
              .filter((i) => i.group === g)
              .map((i) => {
                const chip = CHIP[i.status];
                const isOpen = open === i.key && i.replay;
                return (
                  <li key={i.key} className="rounded-[4px] border-2 border-[#141210] bg-white p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                      <div className="sm:w-28 shrink-0">
                        <p className="font-display text-lg font-black leading-none">{i.label}</p>
                        <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${chip.cls}`}>{chip.text}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-[15px] font-semibold text-[#141210] leading-snug">{i.title}</p>
                        <p className="font-body text-[13px] text-[#141210]/60 mt-0.5">{i.when}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {i.status === 'upcoming' && (
                          <a href={i.cal} className={`${action} bg-white text-[#141210]`}>Add to calendar</a>
                        )}
                        {i.status === 'live' && (
                          <a href="#stage" className={`${action} bg-[#c2261a] text-[#fcfaf3]`}>Go to the stream</a>
                        )}
                        {i.status === 'replay' && i.replay && (
                          <button type="button" onClick={() => setOpen(isOpen ? null : i.key)} aria-expanded={Boolean(isOpen)} className={`${action} bg-[#f5b700] text-[#141210]`}>
                            {isOpen ? 'Close' : 'Watch'}
                          </button>
                        )}
                        {i.transcriptUrl && (i.status === 'replay' || i.status === 'processing') && (
                          <a href={i.transcriptUrl} target="_blank" rel="noopener noreferrer" className={`${action} bg-white text-[#141210]`}>
                            Transcript
                          </a>
                        )}
                      </div>
                    </div>
                    {isOpen && i.replay && (
                      <div className="mt-5">
                        <Player player={i.replay} title={`${i.label} replay: ${i.title}`} />
                      </div>
                    )}
                  </li>
                );
              })}
          </ol>
        </div>
      ))}
    </div>
  );
}
