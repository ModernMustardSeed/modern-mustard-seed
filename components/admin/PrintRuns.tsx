'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from './AdminHeader';

/**
 * PRINTED AUDITS. The door drop runs, ready to hand to a shop.
 *
 * These were living in a chat window: three regions, six files each, a press
 * file and a letter file that look identical in a list and are not
 * interchangeable, and a route sheet that is for Sarah rather than the printer.
 * The cost of that was a morning spent asking which file was the right one.
 *
 * So the page is opinionated. One run is one card, the card names the ONE file
 * to print and the ONE file to carry, and everything else is folded away under
 * "other files" because every other file is a special case. The press file in
 * particular is behind a toggle rather than a link, because handing it to a
 * counter that cannot trim is the specific mistake this page exists to stop.
 *
 * It lists the bucket rather than a table, so a rebuild from the laptop shows
 * up on the next load with no deploy. Nothing here is a copy of the run; the
 * run is the record.
 */

type File = { name: string; url: string; size: number | null; blurb: string | null };
type Meta = {
  pages?: number;
  towns?: Record<string, number>;
  built_at?: string;
  partner?: string | null;
  phone?: string;
};
type Run = {
  label: string;
  region: string;
  meta: Meta | null;
  updated_at: string | null;
  files: File[];
};

const PRINT_FILE = 'flyers-letter.pdf';
const CARRY_FILE = 'route-by-town.pdf';
const PRESS_FILE = 'flyers-press.pdf';

const TITLE: Record<string, string> = {
  montana: 'Flathead Valley',
  kalispell: 'Kalispell only',
  florida: 'Tallahassee',
};

const NOTE: Record<string, string> = {
  montana: 'The whole valley. Kalispell sits inside this one, so print this or Kalispell, never both.',
  kalispell: 'A shorter first day. These are all inside the Flathead Valley run.',
  florida: "Easton's run. His code is on every sheet and the Florida line is the number.",
};

const mb = (n: number | null) => (n == null ? '' : `${(n / 1048576).toFixed(1)} MB`);

const day = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const card = 'rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616]';
const mono = 'font-mono text-[10px] font-bold uppercase tracking-[0.18em]';
const inp =
  'bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700] w-full';

function Copy({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(url).then(
          () => { setDone(true); setTimeout(() => setDone(false), 1600); },
          () => { /* Clipboard blocked. The link is on screen either way. */ },
        );
      }}
      className={`${mono} shrink-0 rounded-md border-2 border-[#161616]/25 px-2 py-1 hover:border-[#161616]`}
    >
      {done ? 'Copied' : 'Copy link'}
    </button>
  );
}

function SendBox({ run }: { run: Run }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [bleed, setBleed] = useState(false);
  const [state, setState] = useState<{ busy: boolean; msg: string; bad: boolean }>({
    busy: false, msg: '', bad: false,
  });

  const send = async () => {
    setState({ busy: true, msg: '', bad: false });
    try {
      const res = await fetch('/api/admin/print-runs/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: run.label, region: run.region, to, note, bleed }),
      });
      const body = await res.json();
      if (!res.ok) { setState({ busy: false, msg: body.error ?? 'Send failed.', bad: true }); return; }
      setState({ busy: false, msg: `Sent to ${body.to}. ${body.pages} pages.`, bad: false });
      setTo('');
      setNote('');
    } catch {
      setState({ busy: false, msg: 'Send failed.', bad: true });
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-block bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-4 py-2 font-sans text-sm font-bold uppercase tracking-[0.08em] shadow-[3px_3px_0_0_#161616]"
      >
        Send to a print shop
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[#161616]/20 p-4 bg-[#FBF6EA]">
      <div className={`${mono} text-[#161616]/55 mb-2`}>Send to a print shop</div>
      <input
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="orders@theprintshop.com"
        className={inp}
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Anything to add. The spec is already in the message."
        className={`${inp} mt-2 resize-y`}
      />
      <label className="flex items-start gap-2 mt-3 cursor-pointer">
        <input type="checkbox" checked={bleed} onChange={(e) => setBleed(e.target.checked)} className="mt-1" />
        <span className="text-[13px] leading-snug text-[#161616]/75">
          This shop trims to bleed. Send the oversized press file instead.
          <span className="block text-[#161616]/50">
            Leave this off for a copy counter. They cannot trim, and the oversized file comes back shrunk with a
            white border.
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button
          type="button"
          onClick={send}
          disabled={state.busy || !to.trim()}
          className="bg-[#161616] text-[#FBF6EA] rounded-xl px-4 py-2 font-sans text-sm font-bold uppercase tracking-[0.08em] disabled:opacity-40"
        >
          {state.busy ? 'Sending' : 'Send'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setState({ busy: false, msg: '', bad: false }); }}
          className="font-sans text-sm font-bold text-[#161616]/55 hover:text-[#161616]"
        >
          Cancel
        </button>
        {state.msg ? (
          <span className={`text-[13px] font-bold ${state.bad ? 'text-[#C4160B]' : 'text-[#1E7A3C]'}`}>
            {state.msg}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function RunCard({ run }: { run: Run }) {
  const [more, setMore] = useState(false);
  const byName = (n: string) => run.files.find((f) => f.name === n);
  const print = byName(PRINT_FILE);
  const carry = byName(CARRY_FILE);
  const rest = run.files.filter((f) => f.name !== PRINT_FILE && f.name !== CARRY_FILE);
  const towns = Object.entries(run.meta?.towns ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <section className={`${card} p-6 sm:p-7`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <span className={`${mono} text-[#C4160B]`}>
            {TITLE[run.region] ?? run.region}
            {run.meta?.partner ? ` · ${run.meta.partner}` : ''}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-black mt-1 leading-tight">
            {run.meta?.pages ? `${run.meta.pages} flyers` : run.region}
          </h2>
        </div>
        <span className={`${mono} text-[#161616]/45`}>Built {day(run.meta?.built_at ?? run.updated_at)}</span>
      </div>

      {NOTE[run.region] ? (
        <p className="font-body text-[14px] leading-relaxed text-[#161616]/70 mt-2 max-w-2xl">
          {NOTE[run.region]}
        </p>
      ) : null}

      {towns.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {towns.map(([t, n]) => (
            <span
              key={t}
              className="font-mono text-[10px] font-bold rounded-md border-2 border-[#161616]/15 px-2 py-0.5"
            >
              {t} {n}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2.5 mt-5">
        {print ? (
          <div className="rounded-xl border-2 border-[#F5B700] bg-[#F5B700]/10 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${mono} text-[#161616]/60`}>Print this</span>
              <span className="flex-1" />
              <a
                href={print.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-sm font-bold underline decoration-2 underline-offset-4"
              >
                {print.name}
              </a>
              <span className={`${mono} text-[#161616]/40`}>{mb(print.size)}</span>
              <Copy url={print.url} />
            </div>
            <p className="font-body text-[13px] leading-snug text-[#161616]/65 mt-1.5">
              Single sided colour, one copy of each page, 100 percent, keep the page order.
            </p>
          </div>
        ) : null}

        {carry ? (
          <div className="rounded-xl border-2 border-[#161616]/20 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${mono} text-[#161616]/60`}>Carry this</span>
              <span className="flex-1" />
              <a
                href={carry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-sm font-bold underline decoration-2 underline-offset-4"
              >
                {carry.name}
              </a>
              <span className={`${mono} text-[#161616]/40`}>{mb(carry.size)}</span>
              <Copy url={carry.url} />
            </div>
            <p className="font-body text-[13px] leading-snug text-[#161616]/65 mt-1.5">
              {carry.blurb ?? 'The route.'} The flyer stack prints in this same order.
            </p>
          </div>
        ) : null}
      </div>

      {rest.length ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className={`${mono} text-[#161616]/50 hover:text-[#161616]`}
          >
            {more ? 'Hide' : `Other files (${rest.length})`}
          </button>
          {more ? (
            <ul className="grid gap-2 mt-3">
              {rest.map((f) => (
                <li key={f.name} className="rounded-lg border-2 border-[#161616]/12 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] font-bold underline decoration-2 underline-offset-4"
                    >
                      {f.name}
                    </a>
                    <span className={`${mono} text-[#161616]/40`}>{mb(f.size)}</span>
                    <span className="flex-1" />
                    <Copy url={f.url} />
                  </div>
                  {f.blurb ? (
                    <p
                      className={`font-body text-[12.5px] leading-snug mt-1 ${
                        f.name === PRESS_FILE ? 'text-[#C4160B]' : 'text-[#161616]/60'
                      }`}
                    >
                      {f.blurb}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <SendBox run={run} />
      </div>
    </section>
  );
}

export default function PrintRuns() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/print-runs', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) { setErr(body.error ?? 'Could not read the print bucket.'); setRuns([]); return; }
      setRuns(body.runs as Run[]);
    } catch {
      setErr('Could not read the print bucket.');
      setRuns([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="print-runs" title="Printed Audits" onRefresh={load} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <span className={`${mono} text-[#C4160B]`}>Printed Audits</span>
        <h1 className="font-display text-3xl sm:text-4xl font-black mt-1 leading-tight">
          The door drop, ready to print.
        </h1>
        <p className="font-body text-[15px] leading-relaxed text-[#161616]/70 mt-3 max-w-2xl">
          One page per business: their name, their street address, their three scores, the three things to fix
          first, and a code that opens their own report. Every sheet prints in the order the route is walked, so
          the sheet on top is the next door. Send a run to a shop, or download it and run it yourself.
        </p>

        {runs === null ? (
          <p className="font-body text-[15px] text-[#161616]/50 mt-8">Reading the print bucket.</p>
        ) : err ? (
          <p className="font-body text-[15px] text-[#C4160B] mt-8">{err}</p>
        ) : runs.length === 0 ? (
          <p className="font-body text-[15px] text-[#161616]/60 mt-8">
            Nothing published yet. Build a run, then{' '}
            <code className="font-mono text-[13px]">node scripts/door-drop/publish.mjs</code>.
          </p>
        ) : (
          <div className="grid gap-6 mt-8">
            {runs.map((r) => <RunCard key={`${r.label}/${r.region}`} run={r} />)}
          </div>
        )}
      </main>
    </div>
  );
}
