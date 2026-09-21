'use client';

import { useMemo, useState } from 'react';
import type { Session } from '@/components/cc/Workspace';
import { Badge, Button, Card, Drawer, Empty, ErrorNote, Label, Skeleton, WAIT_BAR, WAIT_INK, Wait, cx, dayLabel, inputCls, waited, when } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';
import { CalledSheet, NoteBox, OwnerControl, Timeline, doorOf, lastTouch, tel, useLeadDesk, type Lead } from '@/components/cc/lead-desk';
import { eventSentence } from '@/lib/cc-lead-log';

/**
 * EVERY PERSON WHO REACHED OUT, in the order that costs the most to ignore:
 * waiting before called, then whoever has waited longest. Each row says how
 * long, who has it, and the last thing anyone heard, so a glance down the
 * list is a glance at what is going cold.
 *
 * The drawer holds the whole story: what they typed, what they answered, the
 * page they were on, the sign they scanned, and the desk's own log under it.
 *
 * "Called" is a human mark. Nothing in this app sets it but a person pressing
 * the button and confirming they talked.
 */

const FILTERS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'mine', label: 'Mine' },
  { key: 'all', label: 'Everyone' },
  { key: 'called', label: 'Called' },
] as const;

export default function Leads({ session, refreshPulse }: { session: Session; refreshPulse: () => void }) {
  const desk = useLeadDesk(refreshPulse);
  const { leads, summary, people, who, error, busy, load, act } = desk;
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('waiting');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [calling, setCalling] = useState<Lead | null>(null);

  // The drawer reads the live row, so a note saved inside it shows at once.
  const open = useMemo(() => (leads ?? []).find((l) => l.id === openId) ?? null, [leads, openId]);
  const filters = FILTERS.filter((f) => f.key !== 'mine' || who);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (leads ?? [])
      .filter((l) => (filter === 'all' ? true : filter === 'waiting' ? !l.handled_at : filter === 'mine' ? !l.handled_at && l.owner_key === who?.key : Boolean(l.handled_at)))
      .filter((l) =>
        !term
          ? true
          : [l.name, l.email, l.phone, l.town, l.project_type, l.message, l.source, l.owner_name, ...l.events.map((e) => e.body)].filter(Boolean).join(' ').toLowerCase().includes(term),
      );
  }, [leads, filter, q, who]);

  const waitingAll = (leads ?? []).filter((l) => !l.handled_at);
  const oldest = waitingAll.reduce<Lead | null>((a, l) => (!a || l.created_at < a.created_at ? l : a), null);
  const oldestWait = oldest ? waited(oldest.created_at) : null;
  const loose = waitingAll.filter((l) => !l.owner_key).length;
  const calledBy = (l: Lead) => l.events.find((e) => e.kind === 'called')?.author_name ?? null;

  const status = (l: Lead) => (l.handled_at ? <Badge tone="good">Called {when(l.handled_at)}</Badge> : <Wait since={l.created_at} />);

  const touchLine = (l: Lead) => {
    const t = lastTouch(l);
    if (!t || t.kind === 'called') return null;
    return (
      <span className="mt-1 block text-[12.5px] leading-snug text-[var(--cc-muted)]">
        <span className="font-medium text-[var(--cc-ink)]">{eventSentence(t)}</span> · {when(t.created_at)}
        {t.body ? `: “${t.body.length > 90 ? `${t.body.slice(0, 90).trimEnd()}…` : t.body}”` : ''}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="!p-4">
            <Label>Waiting on a call</Label>
            <p className="mt-1.5 text-[26px] font-semibold tabular-nums">{summary.waiting}</p>
            <p className="text-[12px] text-[var(--cc-muted)]">{summary.waiting === 0 ? 'Everyone has been called' : people.length ? `${loose} with no name on ${loose === 1 ? 'it' : 'them'}` : 'Longest wait first'}</p>
          </Card>
          <Card className="!p-4">
            <Label>Longest wait</Label>
            <p className={cx('mt-1.5 text-[26px] font-semibold tabular-nums', oldestWait ? WAIT_INK[oldestWait.tone] : '')}>{oldestWait ? oldestWait.text : 'None'}</p>
            <p className="truncate text-[12px] text-[var(--cc-muted)]">{oldest ? (oldest.name ?? 'Someone') : 'Nobody is waiting'}</p>
          </Card>
          <Card className="!p-4">
            <Label>Last {summary.days} days</Label>
            <p className="mt-1.5 text-[26px] font-semibold tabular-nums">{summary.total}</p>
            <p className="truncate text-[12px] text-[var(--cc-muted)]">{summary.byTown[0] ? `Most from ${summary.byTown[0].key}: ${summary.byTown[0].count}` : 'No towns given yet'}</p>
          </Card>
          <Card className="!p-4">
            <Label>Top door</Label>
            <p className="mt-1.5 truncate text-[15px] font-semibold leading-[1.75]">{summary.bySource[0]?.key ?? 'None yet'}</p>
            <p className="text-[12px] text-[var(--cc-muted)]">{summary.bySource[0] ? `${summary.bySource[0].count} of ${summary.total}` : 'No leads in this window'}</p>
          </Card>
        </div>
      )}

      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4 border-b border-[var(--cc-line)]">
          <div className="flex rounded-lg border border-[var(--cc-line)] p-0.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cx('rounded-md px-3 py-1.5 max-sm:min-h-[40px] text-[12.5px] font-semibold transition', filter === f.key ? 'bg-[var(--cc-ink)] text-white' : 'text-[var(--cc-muted)] hover:text-[var(--cc-ink)]')}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input className={cx(inputCls, 'flex-1 min-w-[180px] max-sm:text-[16px]')} placeholder="Search name, town, phone, a note" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={load} kind="ghost">Refresh</Button>
        </div>

        {desk.failed && <div className="px-5 pt-4"><ErrorNote onRetry={desk.clearFailed}>{desk.failed}</ErrorNote></div>}

        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The lead list did not load.</ErrorNote></div>
        ) : !leads ? (
          <div className="p-5"><Skeleton rows={5} /></div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <Empty
              title={q ? 'Nothing matches that' : filter === 'waiting' ? 'Nobody is waiting' : filter === 'mine' ? 'Nothing has your name on it' : filter === 'called' ? 'Nobody marked called yet' : 'No leads yet'}
              note={
                q
                  ? 'Try a shorter word, or a phone number.'
                  : filter === 'waiting'
                    ? 'Every lead has been called.'
                    : filter === 'mine'
                      ? 'Put your name on one from the Waiting list and it shows here.'
                      : filter === 'called'
                        ? 'A lead moves here when someone presses Called after talking to them.'
                        : `Leads from ${session.brand.siteUrl.replace(/^https?:\/\//, '')} land here the moment they are sent.`
              }
            />
          </div>
        ) : (
          <>
            {/* On a phone a five column table clips the one button that matters,
                so the same rows are cards down there and a table from md up. */}
            <ul className="md:hidden divide-y divide-[var(--cc-line)]">
              {rows.map((l) => (
                <li key={l.id} className="relative pl-5 pr-4 py-3.5">
                  {!l.handled_at && <span className={cx('absolute left-0 top-0 bottom-0 w-[4px]', WAIT_BAR[waited(l.created_at).tone])} aria-hidden />}
                  <button onClick={() => setOpenId(l.id)} className="block w-full text-left">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15.5px] font-semibold">{l.name ?? 'Someone'}</span>
                      {status(l)}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-[var(--cc-muted)]">{[l.project_type, l.town, doorOf(l)].filter(Boolean).join(' · ')}</span>
                    {touchLine(l)}
                  </button>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {!l.handled_at && <OwnerControl lead={l} people={people} who={who} act={act} busy={busy === l.id} compact />}
                    <span className="flex-1" />
                    {l.phone && (
                      <Button href={tel(l.phone)}>
                        <Icon name="phone" size={15} /> Call
                      </Button>
                    )}
                    {!l.handled_at && (
                      <Button kind="primary" onClick={() => setCalling(l)} disabled={busy === l.id}>
                        <Icon name="check" size={15} /> Called
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
                    {['Person', 'What they want', 'Waiting', 'Who has it', ''].map((h, i) => (
                      <th key={i} className={cx('py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[var(--cc-muted)]', i === 0 || i === 4 ? 'px-5' : 'px-3', i === 1 && 'hidden lg:table-cell')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--cc-line)] last:border-0 hover:bg-[#FAFBFC]">
                      <td className="relative px-5 py-3 align-top">
                        {!l.handled_at && <span className={cx('absolute left-0 top-0 bottom-0 w-[3px]', WAIT_BAR[waited(l.created_at).tone])} aria-hidden />}
                        <button onClick={() => setOpenId(l.id)} className="text-left">
                          <span className="block font-semibold hover:text-[var(--cc-accent)]">{l.name ?? 'Someone'}</span>
                          <span className="block text-[12.5px] text-[var(--cc-muted)]">{[l.town, l.phone].filter(Boolean).join(' · ') || l.email || ''}</span>
                          {touchLine(l)}
                        </button>
                      </td>
                      <td className="px-3 py-3 align-top hidden lg:table-cell">
                        <span className="block text-[13.5px]">{l.project_type ?? <span className="text-[var(--cc-muted)]">Not said</span>}</span>
                        <span className="block text-[12.5px] text-[var(--cc-muted)]">{doorOf(l)}</span>
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {status(l)}
                        <span className="mt-1 block text-[12px] text-[var(--cc-muted)]">{l.handled_at ? (calledBy(l) ? `by ${calledBy(l)}` : '') : `Came in ${dayLabel(l.created_at)}`}</span>
                      </td>
                      <td className="px-3 py-3 align-top">{l.handled_at ? <span className="text-[13px] text-[var(--cc-muted)]">{l.owner_name ?? ''}</span> : <OwnerControl lead={l} people={people} who={who} act={act} busy={busy === l.id} compact />}</td>
                      <td className="px-5 py-3 align-top text-right whitespace-nowrap">
                        {l.handled_at ? (
                          <Button kind="ghost" onClick={() => setOpenId(l.id)}>Open</Button>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {l.phone && <Button href={tel(l.phone)} title={l.phone}><Icon name="phone" size={15} /> Call</Button>}
                            <Button kind="primary" onClick={() => setCalling(l)} disabled={busy === l.id}>
                              <Icon name="check" size={15} /> Called
                            </Button>
                          </span>
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
        onClose={() => setOpenId(null)}
        title={open?.name ?? 'Lead'}
        footer={
          open && (
            <div className="flex flex-wrap items-center gap-2">
              {open.phone && <Button href={tel(open.phone)}><Icon name="phone" size={15} /> {open.phone}</Button>}
              {open.email && <Button href={`mailto:${open.email}`}><Icon name="mail" size={15} /> Email</Button>}
              <span className="flex-1" />
              {open.handled_at ? (
                <Button onClick={() => act(open.id, 'uncalled')} disabled={busy === open.id}>Undo called</Button>
              ) : (
                <Button kind="primary" onClick={() => setCalling(open)} disabled={busy === open.id}>
                  <Icon name="check" size={15} /> Called
                </Button>
              )}
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-6 text-[14px]">
            <div className="flex flex-wrap items-center gap-2">
              {open.handled_at ? <Badge tone="good">Called {when(open.handled_at)}</Badge> : <Wait since={open.created_at} />}
              {open.priority ? <Badge>Priority {open.priority}</Badge> : null}
              {(open.sources?.length ? open.sources : [open.source]).filter(Boolean).map((s) => (
                <Badge key={String(s)}>{String(s)}</Badge>
              ))}
              {!open.handled_at && <OwnerControl lead={open} people={people} who={who} act={act} busy={busy === open.id} />}
            </div>

            {open.message && (
              <div>
                <Label>What they wrote</Label>
                <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3 leading-relaxed">{open.message}</p>
              </div>
            )}

            <div>
              <Label>What has happened</Label>
              <div className="mt-2.5"><Timeline lead={open} /></div>
              <div className="mt-3.5"><NoteBox key={open.id} lead={open} act={act} busy={busy === open.id} /></div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              {(
                [
                  ['Came in', dayLabel(open.created_at)],
                  ['Town', open.town],
                  ['Project', open.project_type],
                  ['Land', open.land],
                  ['Phone', open.phone],
                  ['Email', open.email],
                  ['Page', open.page],
                  ['Referred by', open.referrer_name],
                  ['Sign or ad', open.campaign],
                ] as Array<[string, string | null]>
              )
                .filter(([, v]) => Boolean(v))
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-[var(--cc-line)] px-3 py-2">
                    <dt><Label>{k}</Label></dt>
                    <dd className="mt-0.5 break-words text-[13.5px]">{v}</dd>
                  </div>
                ))}
            </dl>

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

      <CalledSheet key={calling?.id ?? 'none'} lead={calling} onClose={() => setCalling(null)} act={act} busy={Boolean(calling && busy === calling.id)} />
    </div>
  );
}
