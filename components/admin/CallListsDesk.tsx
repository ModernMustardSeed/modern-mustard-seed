'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { api, card, eyebrow, inputCls, Stat, ToastHost, useToasts } from '@/components/admin/acquisition/ui';
import {
  CALL_GROUPS,
  CALL_OUTCOMES,
  GROUP_COPY,
  ON_A_YES,
  OPEN_OUTCOMES,
  OUTCOME_LABELS,
  telHref,
  type CallListRow,
  type CallOutcome,
} from '@/lib/call-lists';

const OUTCOME_STYLE: Record<CallOutcome, string> = {
  new: 'bg-white text-[#161616]/60 border-[#161616]/25',
  no_answer: 'bg-[#FFF3C4] text-[#161616] border-[#161616]/40',
  voicemail: 'bg-[#FFF3C4] text-[#161616] border-[#161616]/40',
  call_back: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  not_interested: 'bg-white text-[#161616]/55 border-[#161616]/25',
  yes: 'bg-[#3f5d34] text-white border-[#3f5d34]',
  wrong_number: 'bg-white text-[#E0301E] border-[#E0301E]',
};

const CALLERS = ['Sarah', 'Anthony'];
const CALLER_KEY = 'mms-call-lists-caller';

type Filter = 'open' | 'all' | 'done';

export default function CallListsDesk() {
  const [rows, setRows] = useState<CallListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [list, setList] = useState<string>('');
  const [filter, setFilter] = useState<Filter>('open');
  const [caller, setCaller] = useState('Sarah');
  const { toasts, push } = useToasts();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CALLER_KEY);
      if (saved && CALLERS.includes(saved)) setCaller(saved);
    } catch {}
  }, []);

  const pickCaller = (name: string) => {
    setCaller(name);
    try {
      window.localStorage.setItem(CALLER_KEY, name);
    } catch {}
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ rows: CallListRow[] }>('/api/admin/call-lists');
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the call lists.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lists = useMemo(() => {
    const seen = new Map<string, { slug: string; title: string; total: number; open: number }>();
    for (const r of rows) {
      const l = seen.get(r.list_slug) ?? { slug: r.list_slug, title: r.list_title, total: 0, open: 0 };
      l.total += 1;
      if (OPEN_OUTCOMES.includes(r.outcome)) l.open += 1;
      seen.set(r.list_slug, l);
    }
    return [...seen.values()];
  }, [rows]);

  const active = list || lists[0]?.slug || '';
  const inList = useMemo(() => rows.filter((r) => r.list_slug === active), [rows, active]);
  const shown = useMemo(
    () =>
      inList.filter((r) =>
        filter === 'all' ? true : filter === 'open' ? OPEN_OUTCOMES.includes(r.outcome) : !OPEN_OUTCOMES.includes(r.outcome),
      ),
    [inList, filter],
  );
  const count = (o: CallOutcome[]) => inList.filter((r) => o.includes(r.outcome)).length;

  const save = async (id: string, patch: Partial<CallListRow>, note?: string) => {
    try {
      const data = await api<{ row: CallListRow }>(`/api/admin/call-lists/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setRows((prev) => prev.map((r) => (r.id === id ? data.row : r)));
      if (note) push(note);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not save.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="call-lists" title="Call Lists" onRefresh={load} />
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-8 pb-32">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className={eyebrow}>Desk</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">Call Lists</h1>
            <p className="font-sans text-sm text-[#161616]/70 mt-1 max-w-2xl">
              Businesses that just opened, dated by their first Google review, strongest calls first. Tap a number to dial, then mark how it went. Everyone dialing sees the same list.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-[#161616]/70">Calling as</span>
            {CALLERS.map((name) => (
              <button key={name} onClick={() => pickCaller(name)} className={pill(caller === name)}>
                {name}
              </button>
            ))}
          </div>
        </div>

        {lists.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {lists.map((l) => (
              <button key={l.slug} onClick={() => setList(l.slug)} className={pill(active === l.slug)}>
                {l.title} · {l.open} to call
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="On this list" value={inList.length} />
          <Stat label="Not called" value={count(['new'])} tone={count(['new']) ? 'red' : 'ink'} />
          <Stat label="Call back" value={count(['call_back', 'no_answer', 'voicemail'])} />
          <Stat label="Yes" value={count(['yes'])} tone={count(['yes']) ? 'seed' : 'ink'} />
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setFilter('open')} className={pill(filter === 'open')}>To call {count(OPEN_OUTCOMES)}</button>
          <button onClick={() => setFilter('done')} className={pill(filter === 'done')}>Done {inList.length - count(OPEN_OUTCOMES)}</button>
          <button onClick={() => setFilter('all')} className={pill(filter === 'all')}>All {inList.length}</button>
        </div>

        {error && <div className="bg-white border-2 border-[#E0301E] rounded-2xl p-4 mb-5 font-sans text-sm">{error}</div>}
        {loading && !rows.length && <p className="font-sans text-sm text-[#161616]/70">Loading the call lists.</p>}
        {!loading && !error && !rows.length && (
          <div className={`${card} p-6 font-sans text-sm text-[#161616]/80`}>No call lists loaded yet. Run scripts/call-lists-seed.mjs to load one.</div>
        )}

        {CALL_GROUPS.map((g) => {
          const groupRows = shown.filter((r) => r.grp === g);
          if (!groupRows.length) return null;
          const copy = GROUP_COPY[g];
          return (
            <section key={g} className="mb-10">
              <div className="flex items-baseline gap-3 border-b-2 border-[#F5B700] pb-1.5 mb-2">
                <h2 className="font-display text-2xl font-bold">{copy.title}</h2>
                <span className="font-sans text-sm text-[#161616]/60">{groupRows.length}</span>
              </div>
              <p className="font-sans text-sm text-[#161616]/70 mb-3">{copy.sub}</p>
              <details className="bg-[#FFF3C4] border-l-4 border-[#F5B700] rounded-r-xl px-4 py-3 mb-4">
                <summary className="font-oswald uppercase tracking-[0.14em] text-[11px] font-semibold cursor-pointer">The opener</summary>
                <p className="font-sans text-sm mt-2 leading-relaxed">&ldquo;{copy.script}&rdquo;</p>
                <p className="font-sans text-xs mt-2 text-[#161616]/75">
                  <b>On a yes:</b> {ON_A_YES}
                </p>
              </details>
              <div className="grid gap-3">
                {groupRows.map((r) => (
                  <RowCard key={r.id} row={r} caller={caller} onSave={save} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <ToastHost toasts={toasts} />
    </div>
  );
}

function pill(on: boolean) {
  return `px-3 py-1 rounded-full border-2 text-[11px] font-oswald uppercase tracking-[0.12em] transition-colors ${on ? 'bg-[#161616] text-[#F5B700] border-[#161616]' : 'bg-white border-[#161616]/30 text-[#161616] hover:border-[#161616]'}`;
}

function RowCard({
  row: r,
  caller,
  onSave,
}: {
  row: CallListRow;
  caller: string;
  onSave: (id: string, patch: Partial<CallListRow>, note?: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(r.notes ?? '');
  useEffect(() => setNotes(r.notes ?? ''), [r.notes]);
  const calledAt = r.called_at
    ? new Date(r.called_at).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <article className={`${card} p-4 md:p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-xs text-[#161616]/50">{r.position}</span>
            <h3 className="font-sans text-lg font-bold leading-tight">{r.business_name}</h3>
          </div>
          <p className="font-sans text-sm text-[#161616]/70">
            {[r.category, r.town].filter(Boolean).join(' · ')}
            {r.opened ? ` · opened ${r.opened}` : ''}
          </p>
          {r.finding && <p className="font-sans text-sm mt-1">{r.finding}</p>}
          <div className="flex flex-wrap gap-3 mt-1 font-sans text-xs">
            {r.maps_url && (
              <a href={r.maps_url} target="_blank" rel="noopener noreferrer" className="underline text-[#161616]/70 hover:text-[#161616]">
                Google listing
              </a>
            )}
            {r.website && (
              <a href={r.website} target="_blank" rel="noopener noreferrer" className="underline text-[#161616]/70 hover:text-[#161616]">
                Their link
              </a>
            )}
          </div>
        </div>
        <a
          href={telHref(r.phone)}
          className="shrink-0 inline-flex items-center justify-center bg-[#161616] text-[#F5B700] border-2 border-[#161616] rounded-xl px-4 py-3 font-sans font-bold text-base shadow-[3px_3px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
        >
          {r.phone}
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {CALL_OUTCOMES.filter((o) => o !== 'new').map((o) => (
          <button
            key={o}
            onClick={() => onSave(r.id, { outcome: r.outcome === o ? 'new' : o, called_by: r.outcome === o ? null : caller }, r.outcome === o ? 'Cleared.' : `${r.business_name}: ${OUTCOME_LABELS[o]}.`)}
            className={`border-2 rounded-full px-2.5 py-1 text-[11px] font-oswald uppercase tracking-[0.1em] font-semibold transition-colors ${r.outcome === o ? OUTCOME_STYLE[o] : 'bg-white text-[#161616] border-[#161616]/25 hover:border-[#161616]'}`}
          >
            {OUTCOME_LABELS[o]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2">
        <input
          className={inputCls}
          placeholder="Notes: who answered, when to call back, what they want"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if ((r.notes ?? '') !== notes.trim()) onSave(r.id, { notes }, 'Notes saved.');
          }}
        />
        {calledAt && (
          <span className="shrink-0 font-sans text-xs text-[#161616]/60">
            {r.called_by ? `${r.called_by}, ` : ''}
            {calledAt}
          </span>
        )}
      </div>
    </article>
  );
}
