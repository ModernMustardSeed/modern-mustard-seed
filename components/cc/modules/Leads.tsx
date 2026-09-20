'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@/components/cc/Workspace';
import { Badge, Button, Card, CardHead, Drawer, Empty, ErrorNote, Label, Skeleton, cx, dayLabel, inputCls, when } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * EVERY PERSON WHO REACHED OUT. A table that stays readable at 300 rows and a
 * drawer that holds the whole story: what they typed, what they answered, the
 * page they were on, the sign they scanned.
 *
 * "Called" is a human mark. Nothing in this app sets it but a person pressing
 * the button, which is why it is the only write on this screen.
 */

type Lead = {
  id: string;
  source: string | null;
  sources: string[] | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  town: string | null;
  project_type: string | null;
  land: string | null;
  message: string | null;
  page: string | null;
  referrer_name: string | null;
  answers: Array<{ q: string; a: string }> | null;
  priority: number | null;
  handled_at: string | null;
  created_at: string;
};

type Summary = {
  days: number;
  total: number;
  waiting: number;
  bySource: Array<{ key: string; count: number }>;
  byTown: Array<{ key: string; count: number }>;
  byPage: Array<{ key: string; count: number }>;
};

const FILTERS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'all', label: 'Everyone' },
  { key: 'called', label: 'Called' },
] as const;

export default function Leads({ session, refreshPulse }: { session: Session; refreshPulse: () => void }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('waiting');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Lead | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/portal/leads', { cache: 'no-store' });
      const j = (await r.json()) as { leads: Lead[]; summary: Summary | null };
      setLeads(j.leads ?? []);
      setSummary(j.summary);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mark = async (lead: Lead, handled: boolean) => {
    setBusy(lead.id);
    try {
      await fetch('/api/portal/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: lead.id, handled }) });
      const at = handled ? new Date().toISOString() : null;
      setLeads((prev) => (prev ? prev.map((l) => (l.id === lead.id ? { ...l, handled_at: at } : l)) : prev));
      setOpen((prev) => (prev && prev.id === lead.id ? { ...prev, handled_at: at } : prev));
      refreshPulse();
    } finally {
      setBusy(null);
    }
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (leads ?? [])
      .filter((l) => (filter === 'all' ? true : filter === 'waiting' ? !l.handled_at : Boolean(l.handled_at)))
      .filter((l) =>
        !term
          ? true
          : [l.name, l.email, l.phone, l.town, l.project_type, l.message, l.source].filter(Boolean).join(' ').toLowerCase().includes(term),
      );
  }, [leads, filter, q]);

  return (
    <div className="space-y-5">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="!p-4">
            <Label>Waiting on a call</Label>
            <p className="mt-1.5 text-[26px] font-semibold tabular-nums">{summary.waiting}</p>
          </Card>
          <Card className="!p-4">
            <Label>Last {summary.days} days</Label>
            <p className="mt-1.5 text-[26px] font-semibold tabular-nums">{summary.total}</p>
          </Card>
          <Card className="!p-4">
            <Label>Top door</Label>
            <p className="mt-1.5 text-[15px] font-semibold truncate">{summary.bySource[0]?.key ?? 'None yet'}</p>
            <p className="text-[12px] text-[var(--cc-muted)]">{summary.bySource[0] ? `${summary.bySource[0].count} of ${summary.total}` : 'No leads in this window'}</p>
          </Card>
          <Card className="!p-4">
            <Label>Top town</Label>
            <p className="mt-1.5 text-[15px] font-semibold truncate">{summary.byTown[0]?.key ?? 'None yet'}</p>
            <p className="text-[12px] text-[var(--cc-muted)]">{summary.byTown[0] ? `${summary.byTown[0].count} leads` : 'No towns given yet'}</p>
          </Card>
        </div>
      )}

      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[var(--cc-line)]">
          <div className="flex rounded-lg border border-[var(--cc-line)] p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cx('rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition', filter === f.key ? 'bg-[var(--cc-ink)] text-white' : 'text-[var(--cc-muted)] hover:text-[var(--cc-ink)]')}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input className={cx(inputCls, 'flex-1 min-w-[180px]')} placeholder="Search name, town, phone, what they wrote" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={load} kind="ghost">Refresh</Button>
        </div>

        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The lead list did not load.</ErrorNote></div>
        ) : !leads ? (
          <div className="p-5"><Skeleton rows={5} /></div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <Empty
              title={filter === 'waiting' ? 'Nobody is waiting' : q ? 'Nothing matches that' : 'No leads yet'}
              note={filter === 'waiting' ? 'Every lead has been called.' : q ? 'Try a shorter word, or a phone number.' : `Leads from ${session.brand.siteUrl.replace('https://', '')} land here the moment they are sent.`}
            />
          </div>
        ) : (
          <>
            {/* On a phone a five column table clips the one button that matters,
                so the same rows are cards down there and a table from md up. */}
            <ul className="md:hidden divide-y divide-[var(--cc-line)]">
              {rows.map((l) => (
                <li key={l.id} className="px-4 py-3.5">
                  <button onClick={() => setOpen(l)} className="block w-full text-left">
                    <span className="block font-semibold">{l.name ?? 'Someone'}</span>
                    <span className="block text-[12.5px] text-[var(--cc-muted)]">
                      {[l.town, l.project_type].filter(Boolean).join(' · ') || l.phone || l.email || ''}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[var(--cc-muted)]">
                      {(l.sources?.length ? l.sources.join(', ') : l.source) ?? 'Website'} · {when(l.created_at)}
                    </span>
                  </button>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {l.phone && (
                      <Button href={`tel:${l.phone.replace(/[^\d+]/g, '')}`}>
                        <Icon name="phone" size={15} /> Call
                      </Button>
                    )}
                    {l.handled_at ? (
                      <Badge tone="good">Called</Badge>
                    ) : (
                      <Button kind="primary" onClick={() => mark(l, true)} disabled={busy === l.id}>
                        <Icon name="check" size={15} /> {busy === l.id ? 'Saving' : 'Called'}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--cc-line)] bg-[#FAFBFC]">
                  <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)]">Person</th>
                  <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)] hidden md:table-cell">What they want</th>
                  <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)] hidden lg:table-cell">Door</th>
                  <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)]">Came in</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--cc-line)] last:border-0 hover:bg-[#FAFBFC]">
                    <td className="px-5 py-3 align-top">
                      <button onClick={() => setOpen(l)} className="text-left">
                        <span className="block font-semibold hover:text-[var(--cc-accent)]">{l.name ?? 'Someone'}</span>
                        <span className="block text-[12.5px] text-[var(--cc-muted)]">{[l.town, l.phone].filter(Boolean).join(' · ') || l.email || ''}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3 align-top hidden md:table-cell">
                      <span className="block text-[13.5px]">{l.project_type ?? '—'}</span>
                      {l.land && <span className="block text-[12.5px] text-[var(--cc-muted)]">{l.land}</span>}
                    </td>
                    <td className="px-3 py-3 align-top hidden lg:table-cell text-[13px] text-[var(--cc-muted)]">{(l.sources?.length ? l.sources.join(', ') : l.source) ?? '—'}</td>
                    <td className="px-3 py-3 align-top text-[13px] text-[var(--cc-muted)] whitespace-nowrap">{when(l.created_at)}</td>
                    <td className="px-5 py-3 align-top text-right whitespace-nowrap">
                      {l.handled_at ? (
                        <Badge tone="good">Called</Badge>
                      ) : (
                        <Button kind="primary" onClick={() => mark(l, true)} disabled={busy === l.id}>
                          <Icon name="check" size={15} /> {busy === l.id ? 'Saving' : 'Called'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.name ?? 'Lead'}
        footer={
          open && (
            <div className="flex flex-wrap items-center gap-2">
              {open.phone && <Button href={`tel:${open.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" size={15} /> {open.phone}</Button>}
              {open.email && <Button href={`mailto:${open.email}`}><Icon name="mail" size={15} /> Email</Button>}
              {open.handled_at ? (
                <Button onClick={() => mark(open, false)} disabled={busy === open.id}>Undo called</Button>
              ) : (
                <Button kind="primary" onClick={() => mark(open, true)} disabled={busy === open.id}>
                  <Icon name="check" size={15} /> Mark called
                </Button>
              )}
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-5 text-[14px]">
            <div className="flex flex-wrap gap-2">
              {open.handled_at ? <Badge tone="good">Called {when(open.handled_at)}</Badge> : <Badge tone="live">Waiting</Badge>}
              {open.priority ? <Badge>Priority {open.priority}</Badge> : null}
              {(open.sources?.length ? open.sources : [open.source]).filter(Boolean).map((s) => (
                <Badge key={String(s)}>{String(s)}</Badge>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Came in', dayLabel(open.created_at)],
                ['Town', open.town ?? '—'],
                ['Project', open.project_type ?? '—'],
                ['Land', open.land ?? '—'],
                ['Phone', open.phone ?? '—'],
                ['Email', open.email ?? '—'],
                ['Page', open.page ?? '—'],
                ['Referred by', open.referrer_name ?? '—'],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-lg border border-[var(--cc-line)] px-3 py-2">
                  <dt><Label>{k as string}</Label></dt>
                  <dd className="mt-0.5 break-words text-[13.5px]">{v as string}</dd>
                </div>
              ))}
            </dl>

            {open.message && (
              <div>
                <Label>What they wrote</Label>
                <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3 leading-relaxed">{open.message}</p>
              </div>
            )}

            {open.answers && open.answers.length > 0 && (
              <div>
                <Label>Their answers</Label>
                <ul className="mt-1.5 space-y-2">
                  {open.answers.map((a, i) => (
                    <li key={i} className="rounded-lg border border-[var(--cc-line)] px-4 py-2.5">
                      <p className="text-[12.5px] text-[var(--cc-muted)]">{a.q}</p>
                      <p className="mt-0.5">{a.a}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
