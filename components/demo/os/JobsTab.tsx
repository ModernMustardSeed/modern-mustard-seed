'use client';

import { SectionTitle, StatCard, useOs } from './os-kit';

/**
 * JOBS: the day's work as a living run sheet. Every job advances through
 * Scheduled -> On the way -> On site -> Done with one tap, and each advance
 * does the office work out loud (customer texted, invoice sent, review chase
 * queued). Signed quotes from the Quotes module land here on their own, which
 * is the closed loop the whole demo argues for.
 */

export type OsJobItem = {
  id: string;
  title: string;
  who: string;
  when: string;
  day: 'Today' | 'Scheduled';
  value: number;
  status: 0 | 1 | 2 | 3;
  fromQuote?: boolean;
};

export const JOB_STATUS: { label: string; action: string | null; tone: 'wait' | 'hot' | 'won' }[] = [
  { label: 'Scheduled', action: 'Head out', tone: 'wait' },
  { label: 'On the way', action: 'Arrive', tone: 'hot' },
  { label: 'On site', action: 'Wrap it up', tone: 'hot' },
  { label: 'Done', action: null, tone: 'won' },
];

export default function JobsTab({
  jobs,
  advance,
}: {
  jobs: OsJobItem[];
  advance: (id: string, at?: { x: number; y: number }) => void;
}) {
  const { preset, theme, TONE } = useOs();

  const today = jobs.filter((j) => j.day === 'Today');
  const scheduled = jobs.filter((j) => j.day === 'Scheduled');
  const onBoard = jobs.filter((j) => j.status < 3).reduce((s, j) => s + j.value, 0);
  const onSite = jobs.filter((j) => j.status === 2).length;
  const done = jobs.filter((j) => j.status === 3);

  const jobCard = (j: OsJobItem, i: number, rail: boolean) => {
    const st = JOB_STATUS[j.status];
    const [toneText, toneBg] = TONE[st.tone];
    return (
      <div key={j.id} className="relative flex gap-3 animate-[osIn_.45s_ease-out_both]" style={{ animationDelay: `${i * 70}ms` }}>
        {rail && (
          <div className="flex flex-col items-center shrink-0 w-12 pt-4">
            <span className="font-mono text-[11px] font-bold" style={{ color: theme.text }}>{j.when}</span>
            <span
              className="mt-1.5 w-2.5 h-2.5 rounded-full"
              style={{
                background: j.status === 3 ? TONE.won[0] : theme.accent,
                opacity: j.status === 0 ? 0.45 : 1,
                boxShadow: j.status === 1 || j.status === 2 ? `0 0 0 4px ${theme.accentSoft}` : undefined,
              }}
            />
            <span className="flex-1 w-px mt-1" style={{ background: theme.line }} />
          </div>
        )}
        <div
          className="flex-1 min-w-0 rounded-2xl border p-4 mb-2.5 transition-transform hover:-translate-y-0.5"
          style={{ background: theme.panel, borderColor: j.status === 2 ? theme.accent : theme.line }}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold" style={{ color: theme.text }}>{j.title}</p>
              <p className="text-[12px] mt-0.5" style={{ color: theme.dim }}>
                {j.who}{!rail ? ` · ${j.when}` : ''}{j.fromQuote ? ' · from a signed quote' : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-[14px] font-bold" style={{ color: theme.text }}>${j.value.toLocaleString()}</p>
              <span className="inline-block mt-1 text-[9.5px] font-bold uppercase tracking-[0.1em] rounded-full px-2 py-0.5" style={{ color: toneText, background: toneBg }}>
                {j.status === 3 ? 'Invoiced ✓' : st.label}
              </span>
            </div>
          </div>
          {st.action && (
            <div className="flex items-center gap-2 mt-3">
              {/* the four beads show where the job is without reading a word */}
              <div className="flex items-center gap-1" aria-hidden>
                {JOB_STATUS.map((s, si) => (
                  <span key={s.label} className="w-4 h-1 rounded-full" style={{ background: si <= j.status ? theme.accent : theme.panelSoft }} />
                ))}
              </div>
              <button
                onClick={(e) => advance(j.id, { x: e.clientX, y: e.clientY })}
                className="ml-auto rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5"
                style={{ background: theme.accent, color: theme.accentInk }}
              >
                {st.action} →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl">
      <SectionTitle
        title="Jobs"
        sub={`The day, in driving order. Every tap texts the customer for you; a finished ${preset.jobWord} invoices itself before the truck leaves.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="On the board" value={`$${onBoard.toLocaleString()}`} sub={`${jobs.length - done.length} ${preset.jobWord}s to run`} i={0} />
        <StatCard label="Today" value={String(today.length)} sub="confirmed and reminded" i={1} />
        <StatCard label="On site now" value={String(onSite)} sub={onSite > 0 ? 'clock running' : 'nobody on the clock'} i={2} pulse={onSite > 0} />
        <StatCard label="Done + invoiced" value={String(done.length)} sub={`$${done.reduce((s, j) => s + j.value, 0).toLocaleString()} invoiced today`} i={3} />
      </div>

      <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3" style={{ color: theme.accent }}>Today&apos;s run</p>
      <div>{today.map((j, i) => jobCard(j, i, true))}</div>

      {scheduled.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3 mt-5" style={{ color: theme.dim }}>On the schedule</p>
          <div>{scheduled.map((j, i) => jobCard(j, i, false))}</div>
        </>
      )}

      <p className="text-[12px] mt-2" style={{ color: theme.dim }}>
        Sample run sheet. In the real build this syncs with your calendar, texts every customer an ETA, and feeds Money on its own.
      </p>
    </div>
  );
}
