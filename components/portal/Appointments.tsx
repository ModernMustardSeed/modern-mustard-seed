'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * THE DIARY, in the owner's own Command Center.
 *
 * Every time a visitor booked on the website. The next ones first, because
 * that is the only part anybody acts on, with the rest folded away behind a
 * line. Done, no-show and cancelled are marks the owner makes here; nothing in
 * the app sets them on its own.
 *
 * The card says nothing at all until there is something to say, and says so
 * plainly when booking has not been switched on yet, rather than rendering an
 * empty frame that looks broken.
 */
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'block text-[10px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616]/55 mb-2';
const BTN = 'px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';

type Appt = {
  id: string; kindLabel: string; when: string; minutes: number; place: string | null;
  status: string; past: boolean; name: string | null; phone: string | null; email: string | null;
  town: string | null; projectType: string | null; address: string | null; notes: string | null;
};
type Payload = { ready: boolean; bookUrl?: string; upcoming: Appt[]; past: Appt[] } | null;

const STATUS_LABEL: Record<string, string> = { booked: 'Booked', done: 'Done', 'no-show': 'No show', cancelled: 'Cancelled' };

export default function Appointments() {
  const [data, setData] = useState<Payload>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/appointments');
      const j = (await r.json()) as { appointments: Payload };
      setData(j.appointments ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mark = async (id: string, status: string) => {
    setBusy(id);
    try {
      await fetch('/api/portal/appointments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) });
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading || !data) return null;

  // Silent until there is an appointment to show. Booking can be switched off on a
  // client's site (Built Right, 2026-09-18), and an empty diary card would then promise
  // something the site no longer offers.
  if (!data.ready || (!data.upcoming.length && !data.past.length)) return null;

  const list = (rows: Appt[]) =>
    rows.map((a) => (
      <div key={a.id} className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-base font-semibold text-[#161616]">{a.when}</p>
          <span className="text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616]/55">
            {a.kindLabel}
            {a.status !== 'booked' ? ` · ${STATUS_LABEL[a.status] ?? a.status}` : ''}
          </span>
        </div>
        <p className="font-body text-sm text-[#161616] mt-1">
          {a.name}
          {a.town ? `, ${a.town}` : ''}
          {a.place ? ` · ${a.place}` : ''}
        </p>
        {a.address ? <p className="font-body text-sm text-[#161616]/75">{a.address}</p> : null}
        <p className="font-body text-sm text-[#161616]/75">
          {a.phone ? <a className="underline" href={`tel:${a.phone.replace(/[^\d+]/g, '')}`}>{a.phone}</a> : null}
          {a.phone && a.email ? ' · ' : ''}
          {a.email ? <a className="underline" href={`mailto:${a.email}`}>{a.email}</a> : null}
        </p>
        {a.projectType ? <p className="font-body text-sm text-[#161616]/75">{a.projectType}</p> : null}
        {a.notes ? <p className="font-body text-sm text-[#161616]/85 mt-1">{a.notes}</p> : null}
        {a.status === 'booked' ? (
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" className={BTN} disabled={busy === a.id} onClick={() => void mark(a.id, 'done')}>It happened</button>
            <button type="button" className={BTN} disabled={busy === a.id} onClick={() => void mark(a.id, 'no-show')}>No show</button>
            <button type="button" className={BTN} disabled={busy === a.id} onClick={() => void mark(a.id, 'cancelled')}>Cancel it</button>
          </div>
        ) : null}
      </div>
    ));

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Appointments</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">
        {data.upcoming.length ? `${data.upcoming.length} ${data.upcoming.length === 1 ? 'appointment' : 'appointments'} coming up` : 'Nothing in the diary yet'}
      </h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">
        {data.upcoming.length
          ? 'Booked from the website. Mark each one when it is behind you, and the time frees up if you cancel.'
          : 'When somebody picks a time on the website it appears here, and you get a text and an email the moment they do.'}
        {data.bookUrl ? (
          <>
            {' '}
            <a className="underline" href={data.bookUrl} target="_blank" rel="noopener noreferrer">
              See the booking page
            </a>
            .
          </>
        ) : null}
      </p>

      {data.upcoming.length ? <div className="space-y-3">{list(data.upcoming)}</div> : null}

      {data.past.length ? (
        <>
          <button type="button" className="mt-4 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616]/60 underline" onClick={() => setShowPast((v) => !v)}>
            {showPast ? 'Hide' : `Show the ${data.past.length} before now`}
          </button>
          {showPast ? <div className="space-y-3 mt-3">{list(data.past)}</div> : null}
        </>
      ) : null}
    </section>
  );
}
