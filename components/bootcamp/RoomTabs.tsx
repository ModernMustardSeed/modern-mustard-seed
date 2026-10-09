'use client';

import { useId, useState } from 'react';
import { tradeRooms } from '@/data/bootcamp';

/**
 * The four trade rooms as tabs. Every panel is in the DOM (hidden, not
 * removed) so the page reads whole without JavaScript and search engines see
 * all four. Arrow keys move between tabs the way a tablist should.
 */
export default function RoomTabs() {
  const [active, setActive] = useState(0);
  const base = useId();

  function onKey(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const n = tradeRooms.length;
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  }

  return (
    <div className="mt-10">
      <div role="tablist" aria-label="Trade rooms" className="flex flex-wrap gap-2.5">
        {tradeRooms.map((r, i) => {
          const on = i === active;
          return (
            <button
              key={r.slug}
              id={`${base}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={`${base}-panel-${i}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
              className={`rounded-full border-2 border-[#141210] px-5 py-2.5 font-sans text-xs font-extrabold uppercase tracking-[0.16em] transition-all ${
                on ? 'bg-[#141210] text-[#fcfaf3] shadow-[3px_3px_0_0_#f5b700]' : 'bg-white text-[#141210] hover:-translate-y-0.5'
              }`}
            >
              {r.name}
            </button>
          );
        })}
      </div>
      {tradeRooms.map((r, i) => (
        <div
          key={r.slug}
          id={`${base}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${i}`}
          hidden={i !== active}
          className="mt-6 grid md:grid-cols-[0.9fr_1.1fr] gap-6 rounded-[4px] border-2 border-[#141210] bg-white p-6 sm:p-8"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#0f4c47]">Room {i + 1} of {tradeRooms.length}</p>
            <h3 className="font-display text-2xl sm:text-3xl font-black mt-2">{r.name}</h3>
            <p className="font-body text-[15px] text-[#141210]/75 leading-relaxed mt-3">{r.who}</p>
          </div>
          <div className="rounded-[4px] bg-[#fcfaf3] border-2 border-[#141210]/15 p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#0f4c47]">Built on screen in this room</p>
            <p className="font-body text-[17px] leading-relaxed mt-3 text-[#141210]">{r.example}</p>
            <p className="font-body text-xs text-[#141210]/55 mt-4">Your own business, when you take a seat. The front row gets built first.</p>
          </div>
        </div>
      ))}
    </div>
  );
}
