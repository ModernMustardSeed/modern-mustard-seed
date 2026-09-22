'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardHead, Drawer, Empty, ErrorNote, Field, Label, Skeleton, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * THE BENCH: the trades this business builds with.
 *
 * The room is organised around the one fact nobody else keeps: whether their
 * liability insurance is still in date. It is at the top, it is counted, and a
 * lapsed one is red before anything else on the screen is anything at all.
 *
 * "No certificate on file" is its own state and deliberately not green.
 * "Nobody ever asked" and "it is in date" are different facts, and only one of
 * them is a defence when a lawyer asks.
 */

type Rating = 'first-call' | 'fine' | 'last-resort' | 'never-again';

type Trade = {
  id: string;
  company: string;
  trade: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  rate: string | null;
  insurance_expires: string | null;
  license_expires: string | null;
  license_no: string | null;
  last_used_on: string | null;
  rating: Rating | null;
  notes: string | null;
  active: boolean;
};

type Cert = { level: 'ok' | 'soon' | 'urgent' | 'lapsed' | 'unknown'; days: number | null; say: string };

const RATING_WORD: Record<Rating, string> = { 'first-call': 'First call', fine: 'Fine', 'last-resort': 'Last resort', 'never-again': 'Never again' };

const CERT_LOOK: Record<Cert['level'], string> = {
  ok: 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]',
  soon: 'border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]',
  urgent: 'border-[#FDA29B] bg-[#FFFBFA] text-[#B42318]',
  lapsed: 'border-[#FDA29B] bg-[#FEF3F2] text-[#B42318]',
  unknown: 'border-[var(--cc-line)] bg-[#F7F8FA] text-[var(--cc-muted)]',
};

const DAY = 86_400_000;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

/** The same rule the server keeps, so the colour here and the brief in the morning agree. */
function certState(expires: string | null): Cert {
  if (!expires) return { level: 'unknown', days: null, say: 'No certificate on file' };
  const days = Math.round((Date.parse(`${expires}T12:00:00Z`) - Date.parse(`${today()}T12:00:00Z`)) / DAY);
  if (days < 0) return { level: 'lapsed', days, say: `Lapsed ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago` };
  if (days <= 7) return { level: 'urgent', days, say: days === 0 ? 'Runs out today' : `Runs out in ${days} ${days === 1 ? 'day' : 'days'}` };
  if (days <= 30) return { level: 'soon', days, say: `Runs out in ${days} days` };
  return { level: 'ok', days, say: `In date` };
}

const BLANK = { company: '', trade: '', contact_name: '', phone: '', email: '', rate: '', insurance_expires: '', license_no: '', last_used_on: '', rating: '', notes: '' };

export default function Trades() {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<Trade | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/cc/trades', { cache: 'no-store' });
      const j = (await r.json()) as { trades?: Trade[]; error?: string };
      if (j.error) return setError(true);
      setTrades(j.trades ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/cc/trades', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json()) as { ok?: boolean; trades?: Trade[]; trade?: Trade; error?: string };
      if (j.trades) setTrades(j.trades);
      if (j.trade && open) setOpen(j.trade);
      return j;
    } finally {
      setBusy(false);
    }
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (trades ?? []).filter((t) => (!term ? true : [t.company, t.trade, t.contact_name, t.phone, t.notes].filter(Boolean).join(' ').toLowerCase().includes(term)));
    const order = { lapsed: 0, urgent: 1, soon: 2, unknown: 3, ok: 4 } as const;
    return list.sort((a, b) => order[certState(a.insurance_expires).level] - order[certState(b.insurance_expires).level] || a.company.localeCompare(b.company));
  }, [trades, q]);

  const needing = (trades ?? []).filter((t) => t.active && ['lapsed', 'urgent', 'soon'].includes(certState(t.insurance_expires).level));
  const unknown = (trades ?? []).filter((t) => t.active && !t.insurance_expires);

  const add = async () => {
    const r = await act({ action: 'save', ...form });
    if (r?.ok) {
      setForm({ ...BLANK });
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      {(needing.length > 0 || unknown.length > 0) && trades && (
        <Card className={cx(needing.some((t) => certState(t.insurance_expires).level === 'lapsed') ? 'border-[#FDA29B]' : 'border-[#FEDF89]')}>
          <CardHead
            title="Certificates"
            hint="The one thing about a subcontractor that lapses silently, and lands on you when it does."
          />
          <div className="flex flex-wrap gap-2">
            {needing.map((t) => {
              const c = certState(t.insurance_expires);
              return (
                <button key={t.id} onClick={() => setOpen(t)} className={cx('rounded-lg border px-3 py-2 text-left text-[13px]', CERT_LOOK[c.level])}>
                  <span className="block font-semibold">{t.company}</span>
                  <span className="block">{c.say}</span>
                </button>
              );
            })}
            {unknown.length > 0 && (
              <span className="rounded-lg border border-dashed border-[var(--cc-line)] px-3 py-2 text-[13px] text-[var(--cc-muted)]">
                {unknown.length} with no certificate on file
              </span>
            )}
          </div>
        </Card>
      )}

      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--cc-line)] px-5 py-4">
          <input className={cx(inputCls, 'min-w-[200px] flex-1')} placeholder="A company, a trade, a name" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button kind="primary" onClick={() => setAdding((v) => !v)}>
            <Icon name="plus" size={15} /> Add a trade
          </Button>
        </div>

        {adding && (
          <div className="border-b border-[var(--cc-line)] bg-[#FAFBFC] px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company"><input className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Glacier Metalwork" /></Field>
              <Field label="What they do"><input className={inputCls} value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} placeholder="Framing" /></Field>
              <Field label="Who you call"><input className={inputCls} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Nate" /></Field>
              <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(406) 555 0134" /></Field>
              <Field label="What they charge" hint="However you think of it."><input className={inputCls} value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="Bids each job" /></Field>
              <Field label="Insurance runs out" hint="Off their certificate. Leave it blank if you have not seen one.">
                <input type="date" className={inputCls} value={form.insurance_expires} onChange={(e) => setForm({ ...form, insurance_expires: e.target.value })} />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button kind="primary" onClick={add} disabled={busy || form.company.trim().length < 2}>{busy ? 'Saving' : 'Put them on the bench'}</Button>
              <Button kind="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The bench did not load.</ErrorNote></div>
        ) : !trades ? (
          <div className="p-5"><Skeleton rows={5} /></div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <Empty
              title={q ? 'Nobody matches that' : 'Nobody on the bench yet'}
              note={q ? 'Try a shorter word.' : 'The subs and suppliers you build with, with the one date that lapses quietly. Add the five you call most and the rest can wait.'}
              action={!q ? <Button kind="primary" onClick={() => setAdding(true)}>Add the first one</Button> : undefined}
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {rows.map((t) => {
              const c = certState(t.insurance_expires);
              return (
                <li key={t.id}>
                  <button onClick={() => setOpen(t)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-[#F7F8FA]">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-semibold">{t.company}</span>
                        {t.trade && <Badge>{t.trade}</Badge>}
                        {t.rating && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--cc-muted)]">{RATING_WORD[t.rating]}</span>}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-[var(--cc-muted)]">
                        {[t.contact_name, t.phone, t.rate].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className={cx('flex-none rounded-full border px-2.5 py-1 text-[11.5px] font-semibold', CERT_LOOK[c.level])}>{c.say}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.company ?? 'Trade'}
        footer={
          open ? (
            <div className="flex flex-wrap gap-2">
              {open.phone && <Button kind="primary" href={`tel:${open.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" size={14} /> Call</Button>}
              {open.email && <Button href={`mailto:${open.email}?subject=${encodeURIComponent('Your insurance certificate')}`}><Icon name="mail" size={14} /> Ask for the certificate</Button>}
              <Button kind="ghost" onClick={async () => { await act({ action: 'delete', id: open.id }); setOpen(null); }} disabled={busy}>Remove</Button>
            </div>
          ) : undefined
        }
      >
        {open && (
          <div className="space-y-4">
            <div className={cx('rounded-lg border px-4 py-3 text-[13.5px]', CERT_LOOK[certState(open.insurance_expires).level])}>
              <p className="font-semibold">Liability insurance</p>
              <p className="mt-0.5">{certState(open.insurance_expires).say}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company"><input className={inputCls} defaultValue={open.company} onBlur={(e) => act({ action: 'save', id: open.id, company: e.target.value })} /></Field>
              <Field label="What they do"><input className={inputCls} defaultValue={open.trade ?? ''} onBlur={(e) => act({ action: 'save', id: open.id, trade: e.target.value })} /></Field>
              <Field label="Who you call"><input className={inputCls} defaultValue={open.contact_name ?? ''} onBlur={(e) => act({ action: 'save', id: open.id, contact_name: e.target.value })} /></Field>
              <Field label="Phone"><input className={inputCls} defaultValue={open.phone ?? ''} onBlur={(e) => act({ action: 'save', id: open.id, phone: e.target.value })} /></Field>
              <Field label="Email"><input className={inputCls} defaultValue={open.email ?? ''} onBlur={(e) => act({ action: 'save', id: open.id, email: e.target.value })} /></Field>
              <Field label="What they charge"><input className={inputCls} defaultValue={open.rate ?? ''} onBlur={(e) => act({ action: 'save', id: open.id, rate: e.target.value })} /></Field>
              <Field label="Insurance runs out"><input type="date" className={inputCls} defaultValue={open.insurance_expires ?? ''} onChange={(e) => act({ action: 'save', id: open.id, insurance_expires: e.target.value })} /></Field>
              <Field label="Licence number"><input className={inputCls} defaultValue={open.license_no ?? ''} onBlur={(e) => act({ action: 'save', id: open.id, license_no: e.target.value })} /></Field>
              <Field label="Last on a job"><input type="date" className={inputCls} defaultValue={open.last_used_on ?? ''} onChange={(e) => act({ action: 'save', id: open.id, last_used_on: e.target.value })} /></Field>
              <Field label="How they are">
                <select className={inputCls} value={open.rating ?? ''} onChange={(e) => act({ action: 'save', id: open.id, rating: e.target.value })}>
                  <option value="">Not said</option>
                  {(Object.keys(RATING_WORD) as Rating[]).map((r) => (
                    <option key={r} value={r}>{RATING_WORD[r]}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <span className="mb-1.5 block"><Label>Notes</Label></span>
              <textarea className={cx(inputCls, 'min-h-[100px] resize-y leading-relaxed')} defaultValue={open.notes ?? ''} onBlur={(e) => act({ action: 'save', id: open.id, notes: e.target.value })} placeholder="Does his own trusses. Never shows before eight." />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
