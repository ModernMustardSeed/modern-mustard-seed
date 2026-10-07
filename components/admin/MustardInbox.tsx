'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fmtPhone, fmtWhen } from '@/components/calls/CallDetail';

/**
 * MR. MUSTARD'S INBOX, on the call log.
 *
 * What he owes callers after the phone goes down, and what he did about it.
 * Rows come from his own calls (read by the drainer) and from Sarah. The ones
 * waiting on her sit at the top with Approve and Dismiss. The rules for what he
 * does alone live in lib/mustard-inbox.ts; the switches for them live here.
 */

type Kind = 'callback' | 'send_link' | 'email_note';
type Status = 'proposed' | 'queued' | 'running' | 'done' | 'failed' | 'dismissed';
type Row = {
  id: string;
  kind: Kind;
  status: Status;
  source: 'call' | 'sarah';
  due_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  business: string | null;
  instruction: string;
  links: string[];
  subject: string | null;
  note: string | null;
  from_call_id: string | null;
  result_call_id: string | null;
  result: string | null;
  created_at: string;
};
type Settings = { autoCallbacks: boolean; autoLinks: boolean; dailyCallbacks: number };
type Api = {
  ok: boolean;
  rows: Row[];
  settings?: Settings;
  links?: { key: string; label: string }[];
  canEdit?: boolean;
  reason?: string;
};

const KIND_LABEL: Record<Kind, string> = { callback: 'Call back', send_link: 'Send a link', email_note: 'Email a note' };
const STATUS_LABEL: Record<Status, string> = {
  proposed: 'Needs your OK',
  queued: 'Scheduled',
  running: 'Working',
  done: 'Done',
  failed: 'Failed',
  dismissed: 'Dismissed',
};
const STATUS_STYLE: Record<Status, string> = {
  proposed: 'bg-[#F5B700]',
  queued: 'bg-white',
  running: 'bg-[#BFE3C0]',
  done: 'bg-[#BFE3C0]',
  failed: 'bg-[#F4B9B2]',
  dismissed: 'bg-[#161616]/10',
};

export default function MustardInbox({ onOpenCall }: { onOpenCall?: (vapiCallId: string) => void }) {
  const [data, setData] = useState<Api | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/mustard-inbox', { cache: 'no-store' });
      setData((await res.json()) as Api);
    } catch {
      setData({ ok: false, rows: [], reason: 'error' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: 'approve' | 'dismiss' | 'retry') => {
    setBusy(id);
    setErr(null);
    const res = await fetch('/api/admin/mustard-inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) setErr(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'That did not work.');
    setBusy(null);
    load();
  };

  const saveSettings = async (patch: Partial<Settings>) => {
    if (!data?.settings) return;
    setData({ ...data, settings: { ...data.settings, ...patch } });
    await fetch('/api/admin/mustard-inbox', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: patch }),
    });
  };

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const waiting = rows.filter((r) => r.status === 'proposed');
  const open = rows.filter((r) => r.status === 'queued' || r.status === 'running' || r.status === 'failed');
  const closed = rows.filter((r) => r.status === 'done' || r.status === 'dismissed');
  const canEdit = Boolean(data?.canEdit);

  if (data && !data.ok && data.reason === 'table-missing') {
    return (
      <section className="mb-8 bg-white border-2 border-[#161616] rounded-xl p-5 shadow-[3px_3px_0_0_#161616]">
        <h2 className="font-sans text-lg font-bold">Mr. Mustard&apos;s inbox</h2>
        <p className="mt-1 text-sm text-[#161616]/70">Migration 155 has not been applied yet, so there is nowhere to keep it.</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight">Mr. Mustard&apos;s inbox</h2>
          <p className="mt-0.5 text-sm text-[#161616]/60 max-w-2xl">
            What he owes callers after the phone goes down. He sends promised links and calls back people who asked,
            weekdays 10 to 4 Mountain. Anything new in your name waits for you.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="bg-[#F5B700] border-2 border-[#161616] rounded-lg px-3 py-2 font-sans text-xs font-bold shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
          >
            {adding ? 'Close' : 'Give him a task'}
          </button>
        )}
      </div>

      {canEdit && data?.settings && (
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-sans">
          <Toggle label="Calls back on his own" on={data.settings.autoCallbacks} onChange={(v) => saveSettings({ autoCallbacks: v })} />
          <Toggle label="Sends promised links on his own" on={data.settings.autoLinks} onChange={(v) => saveSettings({ autoLinks: v })} />
          <label className="flex items-center gap-2">
            <span className="font-semibold">Callbacks a day</span>
            <select
              value={data.settings.dailyCallbacks}
              onChange={(e) => saveSettings({ dailyCallbacks: Number(e.target.value) })}
              className="border-2 border-[#161616] rounded-md bg-white px-1.5 py-0.5"
            >
              {[0, 2, 4, 6, 8, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {adding && canEdit && <AddTask links={data?.links ?? []} onDone={() => { setAdding(false); load(); }} />}

      {err && <p className="mb-3 text-sm font-semibold text-[#C2261A]">{err}</p>}

      {!data && <p className="text-sm text-[#161616]/50">Opening his inbox...</p>}

      {data?.ok && rows.length === 0 && (
        <p className="text-sm text-[#161616]/60 bg-white border-2 border-[#161616] rounded-xl px-5 py-4">
          Nothing owed. After each real call he reads it back and files what he promised here.
        </p>
      )}

      {[...waiting, ...open].length > 0 && (
        <ul className="space-y-3">
          {[...waiting, ...open].map((r) => (
            <Item key={r.id} r={r} canEdit={canEdit} busy={busy === r.id} act={act} onOpenCall={onOpenCall} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowDone((v) => !v)} className="text-xs font-sans font-bold underline underline-offset-2">
            {showDone ? 'Hide' : 'Show'} {closed.length} finished
          </button>
          {showDone && (
            <ul className="mt-3 space-y-3">
              {closed.map((r) => (
                <Item key={r.id} r={r} canEdit={canEdit} busy={busy === r.id} act={act} onOpenCall={onOpenCall} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Item({
  r,
  canEdit,
  busy,
  act,
  onOpenCall,
}: {
  r: Row;
  canEdit: boolean;
  busy: boolean;
  act: (id: string, a: 'approve' | 'dismiss' | 'retry') => void;
  onOpenCall?: (id: string) => void;
}) {
  const who = r.name || r.business || (r.phone ? fmtPhone(r.phone) : r.email) || 'Caller';
  const target = r.kind === 'callback' ? (r.phone ? fmtPhone(r.phone) : '') : r.email ?? '';
  return (
    <li className="bg-white border-2 border-[#161616] rounded-xl px-5 py-4 shadow-[3px_3px_0_0_#161616]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-sans text-base font-bold leading-tight">
              {KIND_LABEL[r.kind]}: {who}
            </h3>
            {target && <span className="font-mono text-xs text-[#161616]/60 break-all">{target}</span>}
          </div>
          <p className="mt-0.5 text-xs text-[#161616]/55">
            {r.source === 'sarah' ? 'From you' : 'From a call'} &middot; filed {fmtWhen(r.created_at)}
            {(r.status === 'queued' || r.status === 'proposed') && <> &middot; due {fmtWhen(r.due_at)}</>}
          </p>
          <p className="mt-2 text-[13px] text-[#161616]/85 leading-relaxed">{r.instruction}</p>
          {r.kind === 'email_note' && r.note && (
            <div className="mt-2 border-l-4 border-[#F5B700] pl-3 text-[13px] text-[#161616]/80">
              {r.subject && <p className="font-semibold">{r.subject}</p>}
              <p className="whitespace-pre-line">{r.note}</p>
            </div>
          )}
          {r.links.length > 0 && <p className="mt-1 text-xs text-[#161616]/60">Pages: {r.links.join(', ')}</p>}
          {r.result && <p className="mt-2 text-[13px] text-[#161616]/70 italic">{r.result}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-sans font-bold">
            {r.from_call_id && onOpenCall && (
              <button onClick={() => onOpenCall(r.from_call_id as string)} className="underline underline-offset-2">
                The call it came from
              </button>
            )}
            {r.result_call_id && onOpenCall && (
              <button onClick={() => onOpenCall(r.result_call_id as string)} className="underline underline-offset-2">
                The follow-up call
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-md border-2 border-[#161616] text-[11px] font-sans font-bold ${STATUS_STYLE[r.status]}`}>
            {STATUS_LABEL[r.status]}
          </span>
          {canEdit && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {r.status === 'proposed' && (
                <ActionButton label="Approve" strong disabled={busy} onClick={() => act(r.id, 'approve')} />
              )}
              {r.status === 'failed' && <ActionButton label="Try again" strong disabled={busy} onClick={() => act(r.id, 'retry')} />}
              {(r.status === 'proposed' || r.status === 'queued' || r.status === 'failed') && (
                <ActionButton label="Dismiss" disabled={busy} onClick={() => act(r.id, 'dismiss')} />
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ActionButton({ label, onClick, disabled, strong }: { label: string; onClick: () => void; disabled?: boolean; strong?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-md border-2 border-[#161616] font-sans text-xs font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${
        strong ? 'bg-[#F5B700] shadow-[2px_2px_0_0_#161616]' : 'bg-white'
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center gap-2" aria-pressed={on}>
      <span
        className={`relative inline-block w-9 h-5 rounded-full border-2 border-[#161616] transition-colors ${on ? 'bg-[#F5B700]' : 'bg-white'}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#161616] transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function AddTask({ links, onDone }: { links: { key: string; label: string }[]; onDone: () => void }) {
  const [kind, setKind] = useState<Kind>('callback');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [business, setBusiness] = useState('');
  const [instruction, setInstruction] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErr(null);
    const res = await fetch('/api/admin/mustard-inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        name,
        phone,
        email,
        business,
        instruction,
        links: picked,
        subject,
        note,
        dueAt: when ? new Date(when).toISOString() : '',
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setErr(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'That did not save.');
      return;
    }
    onDone();
  };

  const field = 'w-full border-2 border-[#161616] rounded-lg bg-white px-3 py-2 text-sm';
  return (
    <div className="mb-4 bg-white border-2 border-[#161616] rounded-xl p-5 shadow-[3px_3px_0_0_#161616]">
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-lg border-2 border-[#161616] font-sans text-xs font-bold ${kind === k ? 'bg-[#F5B700]' : 'bg-white'}`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="Their name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={field} placeholder="Business" value={business} onChange={(e) => setBusiness(e.target.value)} />
        {kind === 'callback' ? (
          <input className={field} placeholder="Phone, ten digits" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        ) : (
          <input className={field} placeholder="Email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
        <label className="text-xs font-sans font-semibold text-[#161616]/70">
          When (blank means now; calls wait for 10 to 4 Mountain)
          <input className={`${field} mt-1`} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
      </div>
      {kind === 'callback' && (
        <textarea
          className={`${field} mt-3 min-h-[84px]`}
          placeholder="What he should call about, in a sentence or two. He reads this as his briefing."
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
        />
      )}
      {kind === 'send_link' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((l) => (
            <button
              key={l.key}
              onClick={() => setPicked((p) => (p.includes(l.key) ? p.filter((x) => x !== l.key) : [...p, l.key]))}
              className={`px-2.5 py-1 rounded-md border-2 border-[#161616] text-xs font-sans font-semibold ${picked.includes(l.key) ? 'bg-[#F5B700]' : 'bg-white'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
      {kind === 'email_note' && (
        <>
          <input className={`${field} mt-3`} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className={`${field} mt-3 min-h-[110px]`} placeholder="The note" value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )}
      {err && <p className="mt-3 text-sm font-semibold text-[#C2261A]">{err}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 bg-[#F5B700] border-2 border-[#161616] rounded-lg px-4 py-2 font-sans text-sm font-bold shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-50"
      >
        {saving ? 'Filing it...' : 'Put it in his inbox'}
      </button>
    </div>
  );
}
