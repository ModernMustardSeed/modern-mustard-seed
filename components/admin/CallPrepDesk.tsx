'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { api, btnDanger, btnGhost, btnPrimary, card, eyebrow, inputCls, labelCls, Stat, ToastHost, useToasts } from '@/components/admin/acquisition/ui';
import Modal from '@/components/ui/Modal';
import { CALL_STATUSES, CALL_STATUS_LABELS, toLines, type CallBrief, type CallPrep, type CallStatus } from '@/lib/call-prep';

const TZ = 'America/Denver';

const STATUS_STYLE: Record<CallStatus, string> = {
  lined_up: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  done: 'bg-[#DDEBFF] text-[#161616] border-[#1E50C8]',
  won: 'bg-[#161616] text-[#F5B700] border-[#161616]',
  passed: 'bg-white text-[#161616]/60 border-[#161616]/25',
  no_show: 'bg-white text-[#E0301E] border-[#E0301E]',
};

function when(iso: string | null): { day: string; time: string; rel: string; soon: boolean } {
  if (!iso) return { day: 'No time set', time: '', rel: '', soon: false };
  const d = new Date(iso);
  const dayKey = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: TZ });
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 864e5);
  const day =
    dayKey(d) === dayKey(now)
      ? 'Today'
      : dayKey(d) === dayKey(tomorrow)
        ? 'Tomorrow'
        : d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const mins = Math.round((d.getTime() - now.getTime()) / 60000);
  const rel =
    mins > 0 && mins < 60 ? `in ${mins} min` : mins >= 60 && mins < 24 * 60 ? `in ${Math.round(mins / 60)} hr` : mins < 0 && mins > -90 ? 'now' : '';
  return { day, time, rel, soon: mins > -90 && mins < 24 * 60 };
}

/** datetime-local wants local wall time with no zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function gradeTone(score: number | null): string {
  if (score === null) return 'bg-white text-[#161616]';
  if (score >= 80) return 'bg-[#3f5d34] text-white';
  if (score >= 60) return 'bg-[#F5B700] text-[#161616]';
  return 'bg-[#E0301E] text-white';
}

export default function CallPrepDesk() {
  const [calls, setCalls] = useState<CallPrep[]>([]);
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<CallPrep | 'new' | null>(null);
  const { toasts, push } = useToasts();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ calls: CallPrep[] }>('/api/admin/call-prep');
      setCalls(data.calls);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the calls.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upcoming = useMemo(() => calls.filter((c) => c.status === 'lined_up'), [calls]);
  const past = useMemo(
    () => calls.filter((c) => c.status !== 'lined_up').sort((a, b) => (b.call_at ?? b.updated_at).localeCompare(a.call_at ?? a.updated_at)),
    [calls],
  );
  const today = useMemo(() => upcoming.filter((c) => when(c.call_at).day === 'Today').length, [upcoming]);
  const won = useMemo(() => calls.filter((c) => c.status === 'won').length, [calls]);
  const shown = view === 'upcoming' ? upcoming : past;

  const save = async (id: string, patch: Partial<CallPrep>, note?: string) => {
    try {
      const data = await api<{ call: CallPrep }>(`/api/admin/call-prep/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setCalls((prev) => prev.map((c) => (c.id === id ? { ...data.call, audit: c.audit } : c)));
      if (note) push(note);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not save.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="call-prep" title="Call Prep" onRefresh={load} />
      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-32">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className={eyebrow}>Desk</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">Call Prep</h1>
            <p className="font-sans text-sm text-[#161616]/70 mt-1 max-w-2xl">
              Every prospect call we have lined up, with the audit it leans on and the brief we go over together first. Notes and the outcome land on the same card after the call.
            </p>
          </div>
          <button className={btnPrimary} onClick={() => setEditing('new')}>Line up a call</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Today" value={today} tone={today ? 'red' : 'ink'} />
          <Stat label="Lined up" value={upcoming.length} />
          <Stat label="Talked" value={past.length} />
          <Stat label="Won" value={won} tone={won ? 'seed' : 'ink'} />
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setView('upcoming')} className={pill(view === 'upcoming')}>Lined up {upcoming.length}</button>
          <button onClick={() => setView('past')} className={pill(view === 'past')}>After the call {past.length}</button>
        </div>

        {error && <div className="bg-white border-2 border-[#E0301E] rounded-2xl p-4 mb-5 font-sans text-sm">{error}</div>}
        {loading && !calls.length && <p className="font-sans text-sm text-[#161616]/70">Loading the calls.</p>}
        {!loading && !shown.length && !error && (
          <div className={`${card} p-6 font-sans text-sm text-[#161616]/80`}>
            {view === 'upcoming' ? 'Nothing lined up. Press "Line up a call" to add the next one.' : 'No calls have happened yet.'}
          </div>
        )}

        <div className="grid gap-5">
          {shown.map((c) => (
            <CallCard key={c.id} call={c} onSave={save} onEdit={() => setEditing(c)} defaultOpen={c.status === 'lined_up'} />
          ))}
        </div>
      </main>

      <CallForm
        call={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          setEditing(null);
          push(isNew ? 'Call lined up.' : 'Saved.');
          if (isNew) setView('upcoming');
          load();
          void saved;
        }}
        onDeleted={(id) => {
          setEditing(null);
          setCalls((prev) => prev.filter((c) => c.id !== id));
          push('Removed from the desk.');
        }}
      />
      <ToastHost toasts={toasts} />
    </div>
  );
}

function pill(on: boolean) {
  return `px-3 py-1 rounded-full border-2 text-[11px] font-oswald uppercase tracking-[0.12em] transition-colors ${on ? 'bg-[#161616] text-[#F5B700] border-[#161616]' : 'bg-white border-[#161616]/30 text-[#161616] hover:border-[#161616]'}`;
}

function CallCard({
  call: c,
  onSave,
  onEdit,
  defaultOpen,
}: {
  call: CallPrep;
  onSave: (id: string, patch: Partial<CallPrep>, note?: string) => Promise<void>;
  onEdit: () => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [notes, setNotes] = useState(c.notes ?? '');
  const [outcome, setOutcome] = useState(c.outcome ?? '');
  useEffect(() => setNotes(c.notes ?? ''), [c.notes]);
  useEffect(() => setOutcome(c.outcome ?? ''), [c.outcome]);
  const t = when(c.call_at);
  const b = c.brief ?? {};
  const auditUrl = c.audit_id ? `/demo/audit/${c.audit_id}` : null;

  return (
    <article className={`${card} overflow-hidden`}>
      <div className="grid md:grid-cols-[220px_1fr]">
        <div className={`p-5 border-b-2 md:border-b-0 md:border-r-2 border-[#161616] ${t.soon && c.status === 'lined_up' ? 'bg-[#F5B700]' : 'bg-[#FFF3C4]'}`}>
          <p className="font-oswald uppercase tracking-[0.18em] text-[11px] font-semibold">{t.day}</p>
          <p className="font-display text-3xl font-bold leading-none mt-1">{t.time || ' '}</p>
          {t.rel && c.status === 'lined_up' && <p className="font-sans text-xs mt-1 font-semibold">{t.rel}</p>}
          <p className="font-sans text-xs mt-3 text-[#161616]/80">{t.time ? 'Mountain time' : ''}</p>
          {c.taken_by && <p className="font-sans text-sm mt-3"><span className="text-[#161616]/65">Taking it:</span> <b>{c.taken_by}</b></p>}
          <span className={`inline-block mt-3 border-2 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] font-oswald font-semibold ${STATUS_STYLE[c.status]}`}>
            {CALL_STATUS_LABELS[c.status]}
          </span>
        </div>

        <div className="p-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold leading-tight">{c.business_name}</h2>
              <p className="font-sans text-sm text-[#161616]/80 mt-1 break-words">
                {[c.contact_name, c.city].filter(Boolean).join(' · ')}
                {c.phone && (
                  <>
                    {c.contact_name || c.city ? ' · ' : ''}
                    <a className="underline decoration-[#F5B700] decoration-2" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>
                  </>
                )}
                {c.email && <> · <a className="underline decoration-[#F5B700] decoration-2" href={`mailto:${c.email}`}>{c.email}</a></>}
              </p>
              {c.website && (
                <a className="font-sans text-xs text-[#161616]/70 underline break-all" href={c.website} target="_blank" rel="noreferrer">
                  {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </div>
            {auditUrl && (
              <a href={auditUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-2 border-[#161616] rounded-xl px-3 py-2 bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">
                <span className={`font-oswald font-bold text-xl px-2 py-0.5 rounded-md ${gradeTone(c.audit?.score ?? null)}`}>
                  {c.audit?.letter ?? '?'} {c.audit?.score ?? ''}
                </span>
                <span className="font-oswald uppercase tracking-[0.14em] text-[11px] font-semibold">Open the audit</span>
              </a>
            )}
          </div>
          {c.audit?.headline && <p className="font-sans text-sm italic mt-3 border-l-4 border-[#F5B700] pl-3">{c.audit.headline}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            <button className={btnGhost} onClick={() => setOpen((v) => !v)}>{open ? 'Hide the brief' : 'Read the brief'}</button>
            <button className={btnGhost} onClick={onEdit}>Edit</button>
          </div>

          {open && (
            <div className="mt-5 grid gap-5 font-sans text-[15px] leading-relaxed">
              {b.who && <Block title="Who they are"><p>{b.who}</p></Block>}
              {b.opening && <Block title="Open with"><p className="bg-white border-2 border-[#161616]/15 rounded-xl p-3">{b.opening}</p></Block>}
              {!!b.findings?.length && <Block title="What the audit found"><List items={b.findings} /></Block>}
              {!!b.questions?.length && <Block title="Ask them"><List items={b.questions} numbered /></Block>}
              {b.offer && <Block title="What we put in front of them"><p>{b.offer}</p></Block>}
              {!!b.watch_outs?.length && <Block title="Watch out" tone="red"><List items={b.watch_outs} /></Block>}
              {b.next_step && <Block title="The ask that ends the call"><p className="font-semibold">{b.next_step}</p></Block>}
              {!Object.values(b).some((v) => (Array.isArray(v) ? v.length : v)) && (
                <p className="text-sm text-[#161616]/70">No brief yet. Press Edit to write one.</p>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className={labelCls}>Team notes</label>
              <textarea
                className={`${inputCls} min-h-[110px]`}
                value={notes}
                placeholder="Anything the team should know before or after the call."
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== (c.notes ?? '') && onSave(c.id, { notes }, 'Notes saved.')}
              />
            </div>
            <div>
              <label className={labelCls}>How it went</label>
              <textarea
                className={`${inputCls} min-h-[110px]`}
                value={outcome}
                placeholder="What they said, what they want, what we promised."
                onChange={(e) => setOutcome(e.target.value)}
                onBlur={() => outcome !== (c.outcome ?? '') && onSave(c.id, { outcome }, 'Saved.')}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {CALL_STATUSES.map((s) => (
              <button key={s} onClick={() => s !== c.status && onSave(c.id, { status: s }, `Marked ${CALL_STATUS_LABELS[s].toLowerCase()}.`)} className={pill(c.status === s)}>
                {CALL_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function Block({ title, tone, children }: { title: string; tone?: 'red'; children: React.ReactNode }) {
  return (
    <section>
      <h3 className={`font-oswald uppercase tracking-[0.2em] text-[11px] font-semibold mb-1.5 ${tone === 'red' ? 'text-[#E0301E]' : 'text-[#161616]/70'}`}>{title}</h3>
      {children}
    </section>
  );
}

function List({ items, numbered }: { items: string[]; numbered?: boolean }) {
  const Tag = numbered ? 'ol' : 'ul';
  return (
    <Tag className={`${numbered ? 'list-decimal' : 'list-disc'} pl-5 grid gap-1.5 marker:text-[#161616]/60`}>
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </Tag>
  );
}

type FormState = {
  business_name: string; contact_name: string; phone: string; email: string; website: string; city: string;
  call_at: string; taken_by: string; audit: string;
  who: string; opening: string; findings: string; questions: string; offer: string; watch_outs: string; next_step: string;
};

function formFrom(c: CallPrep | null): FormState {
  const b: CallBrief = c?.brief ?? {};
  return {
    business_name: c?.business_name ?? '', contact_name: c?.contact_name ?? '', phone: c?.phone ?? '', email: c?.email ?? '',
    website: c?.website ?? '', city: c?.city ?? '', call_at: toLocalInput(c?.call_at ?? null), taken_by: c?.taken_by ?? '',
    audit: c?.audit_id ? `https://modernmustardseed.com/demo/audit/${c.audit_id}` : '',
    who: b.who ?? '', opening: b.opening ?? '', findings: (b.findings ?? []).join('\n'), questions: (b.questions ?? []).join('\n'),
    offer: b.offer ?? '', watch_outs: (b.watch_outs ?? []).join('\n'), next_step: b.next_step ?? '',
  };
}

function CallForm({
  call,
  onClose,
  onSaved,
  onDeleted,
}: {
  call: CallPrep | 'new' | null;
  onClose: () => void;
  onSaved: (c: CallPrep, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const existing = call && call !== 'new' ? call : null;
  const [form, setForm] = useState<FormState>(formFrom(existing));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    setForm(formFrom(call && call !== 'new' ? call : null));
    setErr('');
  }, [call]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      const body = {
        business_name: form.business_name, contact_name: form.contact_name, phone: form.phone, email: form.email,
        website: form.website, city: form.city, taken_by: form.taken_by,
        call_at: form.call_at ? new Date(form.call_at).toISOString() : null,
        audit_id: form.audit.trim() || null,
        brief: {
          who: form.who, opening: form.opening, offer: form.offer, next_step: form.next_step,
          findings: toLines(form.findings), questions: toLines(form.questions), watch_outs: toLines(form.watch_outs),
        },
      };
      const data = existing
        ? await api<{ call: CallPrep }>(`/api/admin/call-prep/${existing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await api<{ call: CallPrep }>('/api/admin/call-prep', { method: 'POST', body: JSON.stringify(body) });
      onSaved(data.call, !existing);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await api(`/api/admin/call-prep/${existing.id}`, { method: 'DELETE' });
      onDeleted(existing.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not remove.');
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof FormState, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className={labelCls}>{label}</label><input className={inputCls} value={form[k]} onChange={set(k)} {...props} /></div>
  );
  const area = (k: keyof FormState, label: string, placeholder: string, rows = 3) => (
    <div><label className={labelCls}>{label}</label><textarea className={inputCls} rows={rows} value={form[k]} onChange={set(k)} placeholder={placeholder} /></div>
  );

  return (
    <Modal
      open={call !== null}
      onClose={onClose}
      eyebrow="Call Prep"
      title={existing ? `Edit: ${existing.business_name}` : 'Line up a call'}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <div>{existing && <button className={btnDanger} disabled={busy} onClick={remove}>Remove</button>}</div>
          <div className="flex gap-2">
            <button className={btnGhost} onClick={onClose}>Cancel</button>
            <button className={btnPrimary} disabled={busy || !form.business_name.trim()} onClick={submit}>{busy ? 'Saving' : existing ? 'Save' : 'Line it up'}</button>
          </div>
        </div>
      }
    >
      <div className="grid gap-3 text-[#161616]">
        {err && <p className="font-sans text-sm text-[#E0301E]">{err}</p>}
        <div className="grid md:grid-cols-2 gap-3">
          {field('business_name', 'Business')}
          {field('contact_name', 'Who we are talking to')}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {field('call_at', 'When', { type: 'datetime-local' })}
          {field('taken_by', 'Taking the call', { placeholder: 'Sarah' })}
          {field('city', 'City')}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {field('phone', 'Phone', { type: 'tel' })}
          {field('email', 'Email', { type: 'email' })}
          {field('website', 'Website', { placeholder: 'https://' })}
        </div>
        {field('audit', 'Presence Audit link', { placeholder: 'https://modernmustardseed.com/demo/audit/...' })}
        <hr className="border-[#161616]/15 my-1" />
        {area('who', 'Who they are', 'Two or three sentences.')}
        {area('opening', 'Open with', 'The first thirty seconds.')}
        {area('findings', 'What the audit found (one per line)', 'Strongest first.', 5)}
        {area('questions', 'Ask them (one per line)', 'What we need to learn.', 5)}
        {area('offer', 'What we put in front of them', 'The package and its price.')}
        {area('watch_outs', 'Watch out (one per line)', 'What not to say or assume.', 3)}
        {area('next_step', 'The ask that ends the call', 'One ask.', 2)}
      </div>
    </Modal>
  );
}
