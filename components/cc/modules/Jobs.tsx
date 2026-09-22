'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Drawer, Empty, ErrorNote, Field, Label, Skeleton, cx, dayLabel, inputCls, when } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';
import type { Session } from '@/components/cc/Workspace';
import { handoffFields, handoffText } from '@/lib/cc-handoff';

/**
 * THE BOARD: every job between "somebody asked" and "Buildertrend has it".
 *
 * A custom home is eight to fourteen months of selling before a contract, and
 * that whole stretch used to live in a truck cab and a notebook. So this is
 * built to be read in ten seconds, standing up, one handed: the number in
 * play, what needs a person today, then the jobs themselves with the stage,
 * the money, and the one line that says why a row is shouting.
 *
 * It is a list, not a drag-and-drop pipeline. Dragging a card is a desktop
 * gesture for a person with a mouse and a spare hand, and neither is
 * guaranteed on a job site. A stage is a press.
 */

type Stage = 'inquiry' | 'talking' | 'visit' | 'design' | 'estimate' | 'contract' | 'building' | 'complete' | 'hold' | 'lost';

type Job = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  stage: Stage;
  value_cents: number | null;
  confidence: 'guess' | 'rough' | 'firm';
  kind: string;
  site: string | null;
  town: string | null;
  source: string | null;
  owner_key: string | null;
  owner_name: string | null;
  next_step: string | null;
  next_step_on: string | null;
  stage_changed_at: string;
  last_touch_at: string;
  notes: string | null;
  bt_job: string | null;
  lost_reason: string | null;
  created_at: string;
};

type JobEvent = { id: string; kind: string; body: string | null; from_stage: string | null; to_stage: string | null; author_name: string | null; created_at: string };

type Summary = {
  open: number;
  openValueCents: number;
  firmValueCents: number;
  needing: number;
  byStage: Array<{ stage: Stage; count: number; valueCents: number }>;
  wonThisYear: { count: number; valueCents: number };
  lostThisYear: { count: number; valueCents: number };
};

const STAGE_LABEL: Record<Stage, string> = {
  inquiry: 'New inquiry',
  talking: 'Talking',
  visit: 'Site visit',
  design: 'Design agreement',
  estimate: 'Estimate out',
  contract: 'Contract signed',
  building: 'Building',
  complete: 'Complete',
  hold: 'On hold',
  lost: 'Lost',
};

const OPEN: Stage[] = ['inquiry', 'talking', 'visit', 'design', 'estimate'];
const ALL: Stage[] = [...OPEN, 'contract', 'building', 'complete', 'hold', 'lost'];
const KINDS = ['new-build', 'remodel', 'addition', 'shop', 'other'] as const;
const KIND_LABEL: Record<string, string> = { 'new-build': 'New build', remodel: 'Remodel', addition: 'Addition', shop: 'Shop', other: 'Other' };

const money = (cents: number | null | undefined): string => {
  if (cents == null) return '';
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(d >= 10_000_000 ? 0 : 1)}M`;
  if (d >= 1_000) return `$${Math.round(d / 1_000)}k`;
  return `$${Math.round(d)}`;
};

const DAY = 86_400_000;
const daysSince = (iso: string | null | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / DAY);
};

/** The same rule the server keeps, so the colour on screen and the brief in the morning agree. */
const QUIET_AFTER: Record<Stage, number | null> = { inquiry: 1, talking: 5, visit: 7, design: 14, estimate: 7, contract: 30, building: null, complete: null, hold: 90, lost: null };

function riskOf(job: Job): { level: 'ok' | 'due' | 'quiet' | 'cold'; why: string | null } {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
  if (job.next_step_on && job.next_step_on < today) {
    const late = Math.max(1, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${job.next_step_on}T12:00:00Z`)) / DAY));
    return { level: late >= 7 ? 'cold' : 'due', why: `${job.next_step ?? 'Next step'} was due ${late} ${late === 1 ? 'day' : 'days'} ago` };
  }
  const limit = QUIET_AFTER[job.stage];
  const silent = daysSince(job.last_touch_at);
  if (limit !== null && silent !== null && silent > limit) {
    return { level: silent > limit * 2 ? 'cold' : 'quiet', why: `Nobody has touched this in ${silent} days` };
  }
  if (job.next_step_on === today) return { level: 'due', why: `${job.next_step ?? 'Next step'} is today` };
  return { level: 'ok', why: null };
}

const RISK_BAR: Record<string, string> = { ok: 'bg-[var(--cc-line)]', due: 'bg-[#F79009]', quiet: 'bg-[#F79009]', cold: 'bg-[#D92D20]' };
const RISK_INK: Record<string, string> = { ok: 'text-[var(--cc-muted)]', due: 'text-[#B54708]', quiet: 'text-[#B54708]', cold: 'text-[#B42318]' };

export default function Jobs({ session }: { session: Session }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<Job | null>(null);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'open' | 'needs' | 'all'>('open');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [form, setForm] = useState({ name: '', contact_name: '', contact_phone: '', contact_email: '', town: '', value: '', kind: 'new-build', stage: 'inquiry' as Stage, source: '' });
  // The Buildertrend packet, shown on a job that is sold. Their form refuses a
  // server post (an invisible captcha, tested), so the honest help is removing
  // the retyping rather than pretending to push.
  const [handoff, setHandoff] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/cc/jobs', { cache: 'no-store' });
      const j = (await r.json()) as { jobs?: Job[]; summary?: Summary; error?: string };
      if (j.error) {
        setError(true);
        return;
      }
      setJobs(j.jobs ?? []);
      setSummary(j.summary ?? null);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openJob = async (job: Job) => {
    setOpen(job);
    setEvents([]);
    try {
      const r = await fetch(`/api/cc/jobs?id=${encodeURIComponent(job.id)}`, { cache: 'no-store' });
      const j = (await r.json()) as { job?: Job; events?: JobEvent[] };
      if (j.job) setOpen(j.job);
      setEvents(j.events ?? []);
    } catch {
      /* the card still shows what the list already knew */
    }
  };

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/cc/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json()) as { ok?: boolean; job?: Job; events?: JobEvent[]; error?: string };
      if (j.job) setOpen(j.job);
      if (j.events) setEvents(j.events);
      void load();
      return j;
    } finally {
      setBusy(false);
    }
  };

  const rows = useMemo(() => {
    const list = (jobs ?? []).filter((j) => (filter === 'all' ? true : filter === 'needs' ? OPEN.includes(j.stage) && riskOf(j).level !== 'ok' : OPEN.includes(j.stage)));
    const order = { cold: 0, due: 1, quiet: 2, ok: 3 } as const;
    return list.sort((a, b) => order[riskOf(a).level] - order[riskOf(b).level] || (b.value_cents ?? 0) - (a.value_cents ?? 0) || a.name.localeCompare(b.name));
  }, [jobs, filter]);

  const add = async () => {
    const r = await act({ action: 'create', ...form });
    if (r?.ok) {
      setAdding(false);
      setForm({ name: '', contact_name: '', contact_phone: '', contact_email: '', town: '', value: '', kind: 'new-build', stage: 'inquiry', source: '' });
    }
  };

  return (
    <div className="space-y-5">
      {/* The number in play, and what it is standing on. A builder's board gets
          taken to a bank, so the priced total is shown beside the total rather
          than folded into it. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Label>In play</Label>
          <p className="mt-2 text-[30px] leading-none font-semibold tabular-nums">{summary ? money(summary.openValueCents) || '0' : '…'}</p>
          <p className="mt-1.5 text-[12px] text-[var(--cc-muted)]">{summary ? `${summary.open} ${summary.open === 1 ? 'job' : 'jobs'}` : ''}</p>
        </Card>
        <Card className="p-4">
          <Label>Priced, not guessed</Label>
          <p className="mt-2 text-[30px] leading-none font-semibold tabular-nums">{summary ? money(summary.firmValueCents) || '0' : '…'}</p>
          <p className="mt-1.5 text-[12px] text-[var(--cc-muted)]">The part you could take to a bank</p>
        </Card>
        <Card className={cx('p-4', summary?.needing ? 'border-[#FEDF89]' : undefined)}>
          <Label>Needs you</Label>
          <p className={cx('mt-2 text-[30px] leading-none font-semibold tabular-nums', summary?.needing ? 'text-[#B54708]' : undefined)}>{summary ? summary.needing : '…'}</p>
          <p className="mt-1.5 text-[12px] text-[var(--cc-muted)]">Overdue or gone quiet</p>
        </Card>
        <Card className="p-4">
          <Label>Signed this year</Label>
          <p className="mt-2 text-[30px] leading-none font-semibold tabular-nums">{summary ? summary.wonThisYear.count : '…'}</p>
          <p className="mt-1.5 text-[12px] text-[var(--cc-muted)]">{summary?.wonThisYear.valueCents ? money(summary.wonThisYear.valueCents) : 'Nothing yet'}</p>
        </Card>
      </div>

      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cc-line)] px-5 py-4">
          {(['open', 'needs', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                'rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition',
                filter === f ? 'border-[var(--cc-ink)] bg-[var(--cc-ink)] text-white' : 'border-[var(--cc-line)] bg-white text-[var(--cc-muted)] hover:border-[var(--cc-ink)] hover:text-[var(--cc-ink)]',
              )}
            >
              {f === 'open' ? 'In play' : f === 'needs' ? 'Needs you' : 'Everything'}
            </button>
          ))}
          <span className="ml-auto" />
          <Button kind="primary" onClick={() => setAdding((v) => !v)}>
            <Icon name="plus" size={15} /> Add a job
          </Button>
        </div>

        {adding && (
          <div className="border-b border-[var(--cc-line)] bg-[#FAFBFC] px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="What to call it" hint='The way you would say it: "Kestrel Ridge new build".'>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kestrel Ridge new build" />
              </Field>
              <Field label="Homeowner"><input className={inputCls} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Dana and Rob Fulbright" /></Field>
              <Field label="Phone"><input className={inputCls} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="(406) 555 0134" /></Field>
              <Field label="Email"><input className={inputCls} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="dana@example.com" /></Field>
              <Field label="Town"><input className={inputCls} value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} placeholder="Bigfork" /></Field>
              <Field label="Worth about" hint="Leave it blank until somebody has priced it. 1.4m, 875k, blank.">
                <input className={inputCls} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="1.4m" />
              </Field>
              <Field label="Kind">
                <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{KIND_LABEL[k]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Stage">
                <select className={inputCls} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}>
                  {ALL.map((s) => (
                    <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Where it came from" hint="The realtor, the architect, a past client, the website.">
                <input className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Referral, Kim Marland" />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button kind="primary" onClick={add} disabled={busy || form.name.trim().length < 2}>{busy ? 'Saving' : 'Put it on the board'}</Button>
              <Button kind="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The board did not load.</ErrorNote></div>
        ) : !jobs ? (
          <div className="p-5"><Skeleton rows={5} /></div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <Empty
              title={filter === 'needs' ? 'Nothing is overdue' : 'Nothing on the board yet'}
              note={filter === 'needs' ? 'Every job in play has been touched inside its window.' : 'Put the jobs you are chasing on here, or turn a website inquiry into one from Leads. Buildertrend runs a job once it is signed; this is the months before that.'}
              action={filter !== 'needs' ? <Button kind="primary" onClick={() => setAdding(true)}>Add the first one</Button> : undefined}
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {rows.map((job) => {
              const risk = riskOf(job);
              return (
                <li key={job.id}>
                  <button onClick={() => openJob(job)} className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-[#F7F8FA]">
                    <span className={cx('mt-1 h-10 w-1 flex-none rounded-full', RISK_BAR[risk.level])} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold">{job.name}</span>
                        <Badge>{STAGE_LABEL[job.stage]}</Badge>
                        {job.value_cents != null && (
                          <span className="font-mono text-[12px] tabular-nums text-[var(--cc-ink)]">
                            {money(job.value_cents)}
                            {job.confidence === 'guess' && <span className="text-[var(--cc-muted)]"> guess</span>}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[13px] text-[var(--cc-muted)]">
                        {[job.contact_name, job.town, job.source].filter(Boolean).join(' · ')}
                      </span>
                      {risk.why ? (
                        <span className={cx('mt-1 block text-[12.5px] font-medium', RISK_INK[risk.level])}>{risk.why}</span>
                      ) : job.next_step ? (
                        <span className="mt-1 block text-[12.5px] text-[var(--cc-muted)]">Next: {job.next_step}{job.next_step_on ? `, ${dayLabel(job.next_step_on)}` : ''}</span>
                      ) : (
                        <span className="mt-1 block text-[12.5px] text-[var(--cc-muted)]">No next step set</span>
                      )}
                    </span>
                    <span className="flex-none text-[12px] text-[var(--cc-muted)]">{job.owner_name ?? ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {summary && summary.byStage.some((s) => s.count > 0) && (
        <Card>
          <div className="flex flex-wrap gap-2">
            {summary.byStage.map((s) => (
              <span key={s.stage} className="rounded-lg border border-[var(--cc-line)] px-3 py-2 text-[12.5px]">
                <span className="font-semibold">{STAGE_LABEL[s.stage]}</span>
                <span className="text-[var(--cc-muted)]"> · {s.count}{s.valueCents ? ` · ${money(s.valueCents)}` : ''}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.name ?? 'Job'}
        footer={
          open ? (
            <div className="flex flex-wrap items-center gap-2">
              {open.contact_phone && (
                <Button kind="primary" href={`tel:${open.contact_phone.replace(/[^\d+]/g, '')}`}>
                  <Icon name="phone" size={14} /> Call
                </Button>
              )}
              <Button onClick={() => act({ action: 'log', id: open.id, kind: 'call', body: 'Called' })} disabled={busy}>Log a call</Button>
              <Button kind="ghost" onClick={() => act({ action: 'update', id: open.id, stage: 'lost' })} disabled={busy}>Mark lost</Button>
            </div>
          ) : undefined
        }
      >
        {open && (
          <div className="space-y-5">
            <div>
              <span className="mb-2 block"><Label>Stage</Label></span>
              <div className="flex flex-wrap gap-1.5">
                {ALL.map((s) => (
                  <button
                    key={s}
                    onClick={() => act({ action: 'update', id: open.id, stage: s })}
                    disabled={busy}
                    className={cx(
                      'rounded-full border px-2.5 py-1 text-[12px] font-semibold transition',
                      open.stage === s ? 'border-[var(--cc-accent)] bg-[var(--cc-accent)] text-white' : 'border-[var(--cc-line)] bg-white text-[var(--cc-muted)] hover:border-[var(--cc-ink)] hover:text-[var(--cc-ink)]',
                    )}
                  >
                    {STAGE_LABEL[s]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] text-[var(--cc-muted)]">
                In {STAGE_LABEL[open.stage].toLowerCase()} for {daysSince(open.stage_changed_at) ?? 0} days. Last touched {when(open.last_touch_at) || 'never'}.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Worth about">
                <input
                  className={inputCls}
                  defaultValue={open.value_cents != null ? String(open.value_cents / 100) : ''}
                  placeholder="1.4m"
                  onBlur={(e) => act({ action: 'update', id: open.id, value: e.target.value })}
                />
              </Field>
              <Field label="How sure">
                <select className={inputCls} value={open.confidence} onChange={(e) => act({ action: 'update', id: open.id, confidence: e.target.value })}>
                  <option value="guess">A guess</option>
                  <option value="rough">Rough number</option>
                  <option value="firm">Priced</option>
                </select>
              </Field>
              <Field label="Next step">
                <input className={inputCls} defaultValue={open.next_step ?? ''} placeholder="Walk the lot with Shan" onBlur={(e) => act({ action: 'update', id: open.id, next_step: e.target.value })} />
              </Field>
              <Field label="By when">
                <input type="date" className={inputCls} defaultValue={open.next_step_on ?? ''} onChange={(e) => act({ action: 'update', id: open.id, next_step_on: e.target.value })} />
              </Field>
              <Field label="Who owns it">
                <select className={inputCls} value={open.owner_key ?? ''} onChange={(e) => {
                  const person = session.people.find((p) => p.key === e.target.value);
                  void act({ action: 'update', id: open.id, owner_key: e.target.value, owner_name: person?.name ?? '' });
                }}>
                  <option value="">Nobody yet</option>
                  {session.people.map((p) => (
                    <option key={p.key} value={p.key}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Buildertrend job" hint="Written here once it is signed and set up there.">
                <input className={inputCls} defaultValue={open.bt_job ?? ''} placeholder="Job name in Buildertrend" onBlur={(e) => act({ action: 'update', id: open.id, bt_job: e.target.value })} />
              </Field>
            </div>

            {['contract', 'building', 'complete'].includes(open.stage) && (
              <div className="rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold">Hand it to Buildertrend</p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--cc-muted)]">
                      Everything this job learned, in the order Buildertrend asks for it.
                    </p>
                  </div>
                  <Button onClick={() => setHandoff((v) => !v)}>{handoff ? 'Hide it' : 'Show the packet'}</Button>
                </div>
                {handoff && (
                  <div className="mt-3 space-y-2">
                    {handoffFields(open as never, session.brand.business)
                      .filter((f) => f.value.trim())
                      .map((f) => (
                        <div key={f.label} className="rounded-lg border border-[var(--cc-line)] bg-white px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)]">{f.label}</span>
                            <button
                              className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--cc-accent)] underline"
                              onClick={async () => {
                                await navigator.clipboard.writeText(f.value);
                                setCopied(f.label);
                              }}
                            >
                              {copied === f.label ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[13px]">{f.value}</p>
                        </div>
                      ))}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        kind="primary"
                        onClick={async () => {
                          await navigator.clipboard.writeText(handoffText(open as never, session.brand.business));
                          setCopied('all');
                        }}
                      >
                        {copied === 'all' ? 'Copied the lot' : 'Copy all of it'}
                      </Button>
                      <Button href="https://buildertrend.net/app/login">Open Buildertrend</Button>
                    </div>
                    <p className="text-[12px] text-[var(--cc-muted)]">
                      Buildertrend's own form refuses anything posted by software, so this is a paste rather than a push. It saves the retyping, not the login.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <span className="mb-1.5 block"><Label>Notes</Label></span>
              <textarea className={cx(inputCls, 'min-h-[90px] resize-y leading-relaxed')} defaultValue={open.notes ?? ''} onBlur={(e) => act({ action: 'update', id: open.id, notes: e.target.value })} />
            </div>

            <div>
              <span className="mb-1.5 block"><Label>Add to the trail</Label></span>
              <textarea className={cx(inputCls, 'min-h-[70px] resize-y')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Walked the lot. Septic is in, well is not." />
              <div className="mt-2 flex gap-2">
                <Button onClick={async () => { await act({ action: 'log', id: open.id, kind: 'note', body: note }); setNote(''); }} disabled={busy || note.trim().length < 2}>Save the note</Button>
                <Button onClick={async () => { await act({ action: 'log', id: open.id, kind: 'meeting', body: note || 'Met' }); setNote(''); }} disabled={busy}>Log a meeting</Button>
              </div>
            </div>

            {events.length > 0 && (
              <div>
                <span className="mb-2 block"><Label>What has happened</Label></span>
                <ul className="space-y-2">
                  {events.map((e) => (
                    <li key={e.id} className="rounded-lg border border-[var(--cc-line)] px-3 py-2">
                      <p className="text-[12px] text-[var(--cc-muted)]">
                        {e.kind === 'stage' && e.to_stage ? `Moved to ${STAGE_LABEL[e.to_stage as Stage] ?? e.to_stage}` : e.kind === 'won' ? 'Signed' : e.kind === 'lost' ? 'Marked lost' : e.kind === 'created' ? 'Added to the board' : e.kind === 'agent' ? 'From the standing work' : e.kind}
                        {e.author_name ? `, ${e.author_name}` : ''} · {when(e.created_at)}
                      </p>
                      {e.body && <p className="mt-1 whitespace-pre-wrap text-[13.5px]">{e.body}</p>}
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
