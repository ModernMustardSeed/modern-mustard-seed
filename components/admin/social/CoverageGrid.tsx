'use client';

import {
  CELL_META,
  COVERAGE_PLATFORMS,
  isRequired,
  longDate,
  needsAction,
  platformHealth,
  type Cell,
  type CoverageDay,
  type SocialPost,
} from '@/lib/social-calendar';
import { Cover, FOCUS, MONO, SHORT_LABEL } from './ui';

/**
 * THE COVERAGE GRID. Days down, platforms across. Every cell answers one
 * question: is something going out on this platform this day? Green is
 * queued on the platform, amber is content waiting to be queued, red is
 * empty. The header row reads each platform's next fourteen days.
 *
 * Filters never hide a cell (a hidden cell would read as covered); they dim
 * the cells that do not match. Needs action dims everything green and the
 * bonus columns.
 */
export default function CoverageGrid({
  days,
  healthDays,
  today,
  matches,
  needsActionOnly,
  onOpen,
}: {
  days: CoverageDay[];
  /** The next fourteen days, for the health row, whatever the grid shows. */
  healthDays: CoverageDay[];
  today: string;
  /** True when a post passes the active filters. */
  matches: (p: SocialPost) => boolean;
  needsActionOnly: boolean;
  onOpen: (cell: Cell) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[3px] border border-[#141210] bg-white">
      <table className="w-full min-w-[720px] border-collapse text-[#141210]">
        <caption className="sr-only">
          Posts by day and platform. Green is queued on the platform, amber is planned, red is empty.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${MONO} sticky left-0 top-0 z-20 w-[92px] border-b border-r border-[#141210] bg-[#fcfaf3] px-2 py-2 text-left text-[10px] text-[#4a4339]`}>
              Day
            </th>
            {COVERAGE_PLATFORMS.map((p) => (
              <th
                key={p}
                scope="col"
                className={`border-b border-[#141210] px-1 py-2 text-center align-bottom ${isRequired(p) ? 'bg-[#fcfaf3]' : 'bg-[#efe9da]'}`}
              >
                <span className="block text-[12px] font-bold leading-tight tracking-[-0.02em] text-[#141210]">{SHORT_LABEL[p]}</span>
                {!isRequired(p) && <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-[#4a4339]">Bonus</span>}
              </th>
            ))}
          </tr>
          <tr>
            <th scope="row" className={`${MONO} sticky left-0 z-20 border-b-2 border-r border-[#141210] bg-[#fcfaf3] px-2 py-2 text-left text-[9px] leading-tight text-[#4a4339]`}>
              Next 14 days
            </th>
            {COVERAGE_PLATFORMS.map((p) => {
              const h = platformHealth(healthDays, p);
              const total = h.green + h.amber + h.red || 1;
              return (
                <td key={p} className={`border-b-2 border-[#141210] px-1.5 py-2 ${isRequired(p) ? 'bg-[#fcfaf3]' : 'bg-[#efe9da]'}`}>
                  <div
                    className="flex h-1.5 w-full overflow-hidden rounded-full border border-[#141210]/30"
                    role="img"
                    aria-label={`${SHORT_LABEL[p]}: ${h.green} days queued, ${h.amber} planned, ${h.red} empty in the next 14 days`}
                  >
                    <span style={{ width: `${(h.green / total) * 100}%`, background: CELL_META.green.ring }} />
                    <span style={{ width: `${(h.amber / total) * 100}%`, background: CELL_META.amber.ring }} />
                    <span style={{ width: `${(h.red / total) * 100}%`, background: CELL_META.red.ring }} />
                  </div>
                  <p aria-hidden="true" className="mt-1 flex justify-center gap-1.5 font-mono text-[10px] font-bold tabular-nums">
                    <span style={{ color: CELL_META.green.fg }}>{h.green}</span>
                    <span style={{ color: CELL_META.amber.fg }}>{h.amber}</span>
                    <span style={{ color: CELL_META.red.fg }}>{h.red}</span>
                  </p>
                </td>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const ld = longDate(d.date);
            const isToday = d.date === today;
            return (
              <tr key={d.date} className={isToday ? 'outline outline-2 -outline-offset-2 outline-[#141210]' : undefined}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 border-b border-r border-[#141210] px-2 py-1 text-left ${isToday ? 'bg-[#f5b700]' : 'bg-[#fcfaf3]'}`}
                >
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#141210]">
                    {isToday ? 'Today' : ld.weekday.slice(0, 3)}
                  </span>
                  <span className="block text-[15px] font-bold leading-none tracking-[-0.03em] text-[#141210]">
                    {ld.month.slice(0, 3)} {ld.day}
                  </span>
                </th>
                {COVERAGE_PLATFORMS.map((p) => {
                  const cell = d.cells[p];
                  const dim = needsActionOnly ? !needsAction(cell, today) : cell.posts.length > 0 && !cell.posts.some(matches);
                  return (
                    <td key={p} className={`border-b border-[#141210]/25 p-1 ${isRequired(p) ? '' : 'bg-[#f7f3e8]'}`}>
                      <CellView cell={cell} dim={dim} onOpen={onOpen} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CellView({ cell, dim, onOpen }: { cell: Cell; dim: boolean; onOpen: (cell: Cell) => void }) {
  const m = CELL_META[cell.state];
  const lead = cell.posts[0];
  const d = longDate(cell.date);
  const label = `${SHORT_LABEL[cell.platform]}, ${d.weekday} ${d.month} ${d.day}: ${m.label}${
    cell.posts.length > 1 ? `, ${cell.posts.length} posts` : ''
  }${lead?.title ? `. ${lead.title}` : ''}`;
  const base = `relative mx-auto flex h-[64px] w-full min-w-[56px] max-w-[84px] items-center justify-center overflow-hidden rounded-[3px] border-[3px] transition-opacity ${
    dim ? 'opacity-25' : ''
  }`;
  const style = { background: m.bg, borderColor: m.ring };

  if (!lead) {
    return (
      <div role="img" aria-label={label} className={base} style={style}>
        <span aria-hidden="true" className="font-mono text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: m.fg }}>
          Empty
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(cell)}
      aria-label={label}
      title={lead.title ?? undefined}
      className={`${base} hover:shadow-[3px_3px_0_0_#141210] ${FOCUS}`}
      style={style}
    >
      {lead.cover_url ? (
        <Cover src={lead.cover_url} width={84} height={64} className="h-full w-full" />
      ) : (
        <span aria-hidden="true" className="px-1 text-center text-[10px] font-bold leading-tight" style={{ color: m.fg }}>
          {lead.kind ?? 'Post'}
        </span>
      )}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 py-px text-center font-mono text-[8px] font-bold uppercase leading-[11px] tracking-[0.1em]"
        style={{ background: m.ring, color: cell.state === 'amber' ? '#141210' : '#ffffff' }}
      >
        {cell.state === 'green' ? 'Queued' : cell.state === 'amber' ? 'Planned' : 'Missed'}
      </span>
      {cell.posts.length > 1 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full border border-[#141210] bg-[#141210] px-1 font-mono text-[9px] font-bold text-[#fcfaf3]"
        >
          {cell.posts.length}
        </span>
      )}
    </button>
  );
}
