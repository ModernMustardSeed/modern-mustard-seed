'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Label, Sheet, Who, cx, inputCls, when } from '@/components/cc/ui';
import { Icon, type IconName } from '@/components/cc/icons';
import { eventSentence, type LeadEvent, type Person } from '@/lib/cc-lead-log';

/**
 * THE SHARED DESK, the parts the first screen and the Leads room both use.
 *
 * Three ideas live here. A lead has an age, so the list can say who has waited
 * longest. A lead has a holder, so three people stop guessing. And a lead has
 * a log, so the second person to pick it up reads what the first one heard.
 *
 * Nothing in this file marks a lead on its own. Every write is the press of a
 * button, and the called mark is only ever offered beside a person's own
 * confirmation that they made the call.
 */

export type Lead = {
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
  campaign: string | null;
  handled_at: string | null;
  owner_key: string | null;
  owner_name: string | null;
  owner_at: string | null;
  created_at: string;
  events: LeadEvent[];
  /** The pages this person opened before reaching out, oldest first. Absent when it cannot be known. */
  trail?: Array<{ page: string; time: string; at: string }>;
};

export type LeadSummary = { days: number; total: number; waiting: number; bySource: Array<{ key: string; count: number }>; byTown: Array<{ key: string; count: number }> };
export type LeadAction = 'note' | 'tried' | 'called' | 'uncalled' | 'take' | 'hand' | 'release';

export const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
export const doorOf = (l: Pick<Lead, 'sources' | 'source' | 'campaign'>) => l.campaign ?? (l.sources?.length ? l.sources.join(', ') : l.source) ?? 'Website';

/** The last thing a person did on a lead, leaving out the bare ownership rows. */
export function lastTouch(l: Lead): LeadEvent | null {
  return l.events.find((e) => e.kind === 'note' || e.kind === 'tried' || e.kind === 'called') ?? null;
}

export function useLeadDesk(onChange?: () => void) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [who, setWho] = useState<Person | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const changed = useRef(onChange);
  useEffect(() => {
    changed.current = onChange;
  }, [onChange]);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/cc/leads', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { leads: Lead[]; summary: LeadSummary; people: Person[]; who: Person | null };
      setLeads(j.leads ?? []);
      setSummary(j.summary ?? null);
      setPeople(j.people ?? []);
      setWho(j.who ?? null);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** One press, one write. The row on screen changes only after the server says it saved. */
  const act = useCallback(async (id: string, action: LeadAction, extra?: { body?: string; to?: string }): Promise<boolean> => {
    setBusy(id);
    setFailed(null);
    try {
      const r = await fetch('/api/cc/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action, ...extra }) });
      const j = (await r.json()) as { ok?: boolean; error?: string; patch?: Partial<Lead>; event?: LeadEvent };
      if (!r.ok || !j.ok || !j.event) {
        setFailed(j.error ?? 'That did not save. Try again.');
        return false;
      }
      setLeads((prev) => (prev ? prev.map((l) => (l.id === id ? { ...l, ...(j.patch ?? {}), events: [j.event as LeadEvent, ...l.events] } : l)) : prev));
      changed.current?.();
      return true;
    } catch {
      setFailed('That did not save. Check your signal and try again.');
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  return { leads, summary, people, who, error, busy, failed, clearFailed: () => setFailed(null), load, act };
}

/* ── after the call ───────────────────────────────────────── */

/**
 * The moment after a call is the only moment anyone remembers what was said.
 * So the called button asks one thing, once, and takes no for an answer: the
 * note is optional and the mark saves without it. "No answer" is here too,
 * because it is the other true ending of a call, and it leaves the lead
 * waiting. Mount it with key={lead.id} so each call starts with an empty box.
 */
export function CalledSheet({ lead, onClose, act, busy }: { lead: Lead | null; onClose: () => void; act: (id: string, action: LeadAction, extra?: { body?: string }) => Promise<boolean>; busy: boolean }) {
  const [text, setText] = useState('');
  if (!lead) return null;
  const name = lead.name ?? 'them';
  const save = async (action: 'called' | 'tried') => {
    if (await act(lead.id, action, { body: text })) onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={`You called ${name}`}
      hint="One line now saves the next person a cold start. Skip it if there is nothing to say."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={() => save('tried')} disabled={busy} title="Keeps them on the waiting list">
            <Icon name="clock" size={15} /> No answer, still waiting
          </Button>
          <Button kind="primary" onClick={() => save('called')} disabled={busy}>
            <Icon name="check" size={15} /> {busy ? 'Saving' : 'We talked, mark called'}
          </Button>
        </div>
      }
    >
      <label className="block">
        <span className="mb-1.5 block"><Label>What was said</Label></span>
        <textarea
          className={cx(inputCls, 'min-h-[112px] resize-y text-[16px] sm:text-[14px]')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Wants to break ground in spring. Has the lot. Walk it Thursday at 2."
          autoFocus
        />
      </label>
    </Sheet>
  );
}

/* ── who has it ───────────────────────────────────────────── */

export function OwnerControl({ lead, people, who, act, busy, compact }: { lead: Lead; people: Person[]; who: Person | null; act: (id: string, action: LeadAction, extra?: { to?: string }) => Promise<boolean>; busy: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  if (!people.length) return null;
  const mine = Boolean(who && lead.owner_key === who.key);

  return (
    <div className="relative inline-block" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 max-sm:min-h-[36px] transition disabled:opacity-40',
          lead.owner_name ? 'border-[var(--cc-line)] bg-white hover:border-[var(--cc-ink)]' : 'border-dashed border-[#98A2B3] bg-transparent text-[12px] font-medium text-[var(--cc-muted)] hover:border-[var(--cc-ink)] hover:text-[var(--cc-ink)]',
        )}
      >
        {lead.owner_name ? <Who name={lead.owner_name} mine={mine} /> : compact ? 'Nobody has it' : 'Nobody has it yet'}
        <svg width="10" height="10" viewBox="0 0 20 20" aria-hidden className="text-[var(--cc-muted)]"><path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-30 mt-1 w-52 rounded-xl border border-[var(--cc-line)] bg-white p-1 text-[var(--cc-ink)] shadow-[0_12px_32px_-12px_rgba(16,24,40,.35)]">
          <p className="px-2.5 pb-1 pt-1.5"><Label>Who has this one</Label></p>
          {people.map((p) => (
            <button
              key={p.key}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (lead.owner_key !== p.key) void act(lead.id, 'hand', { to: p.key });
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] hover:bg-[#F4F5F7]"
            >
              <Who name={p.name} mine={who?.key === p.key} size="md" />
              {lead.owner_key === p.key && <span className="text-[var(--cc-accent)]"><Icon name="check" size={15} /></span>}
            </button>
          ))}
          {lead.owner_key && (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void act(lead.id, 'release');
              }}
              className="mt-1 w-full rounded-lg border-t border-[var(--cc-line)] px-2.5 py-2 text-left text-[13px] text-[var(--cc-muted)] hover:bg-[#F4F5F7] hover:text-[var(--cc-ink)]"
            >
              Nobody, put it back
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── the log ──────────────────────────────────────────────── */

const EVENT_ICON: Record<LeadEvent['kind'], IconName> = { note: 'note', tried: 'clock', called: 'check', uncalled: 'clock', taken: 'hand', handed: 'hand', released: 'hand' };

export function Timeline({ lead }: { lead: Lead }) {
  return (
    <ol className="relative space-y-3.5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--cc-line)]">
      {lead.events.map((e) => (
        <li key={e.id} className="relative flex gap-3">
          <span className={cx('relative z-10 grid h-[23px] w-[23px] flex-none place-items-center rounded-full border bg-white', e.kind === 'called' ? 'border-[#ABEFC6] text-[#067647]' : e.kind === 'tried' ? 'border-[#FEDF89] text-[#B54708]' : 'border-[var(--cc-line)] text-[var(--cc-muted)]')}>
            <Icon name={EVENT_ICON[e.kind]} size={12} />
          </span>
          <div className="min-w-0 flex-1 pt-px">
            <p className="text-[13px] leading-snug">
              <span className="font-semibold">{eventSentence(e)}</span>
              <span className="text-[var(--cc-muted)]"> · {when(e.created_at)}</span>
            </p>
            {e.body && <p className="mt-1 whitespace-pre-wrap rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-3 py-2 text-[13.5px] leading-relaxed">{e.body}</p>}
          </div>
        </li>
      ))}
      <li className="relative flex gap-3">
        <span className="relative z-10 grid h-[23px] w-[23px] flex-none place-items-center rounded-full border border-[var(--cc-line)] bg-white text-[var(--cc-muted)]">
          <Icon name="leads" size={12} />
        </span>
        <p className="pt-px text-[13px] leading-snug">
          <span className="font-semibold">{lead.name ?? 'Someone'} reached out</span>
          <span className="text-[var(--cc-muted)]"> · {when(lead.created_at)} · {doorOf(lead)}</span>
        </p>
      </li>
    </ol>
  );
}

export function NoteBox({ lead, act, busy }: { lead: Lead; act: (id: string, action: LeadAction, extra?: { body?: string }) => Promise<boolean>; busy: boolean }) {
  const [text, setText] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (text.trim() && (await act(lead.id, 'note', { body: text }))) setText('');
      }}
      className="flex items-end gap-2"
    >
      <textarea className={cx(inputCls, 'min-h-[44px] flex-1 resize-y text-[16px] sm:text-[14px]')} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for whoever picks this up next" />
      <Button type="submit" disabled={busy || !text.trim()}>Save note</Button>
    </form>
  );
}
