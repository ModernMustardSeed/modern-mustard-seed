'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MASTERCLASS_SCRIPT } from '@/data/bootcamp-marketing';
import { worksheetQuestions } from '@/data/bootcamp-worksheet';
import { tradeRooms } from '@/data/bootcamp';
import { api, btn, btnGold, btnInk, card, emptyBox, errorBox, fmtDateTime, input, label, muted, post, useCopy, TIER_LABEL } from './shared';

/**
 * THE STAGE. What Sarah runs a live session from.
 *
 * Top: what is live or next, and the offer switch (it puts the three seats
 * under the stream in every free seat's room, within about thirty seconds).
 * Then the run of show for the masterclass, with the current beat lit while
 * it is live. Then the question queue for the session in view, refreshing
 * every fifteen seconds while it is live. Then every session's links: the
 * live link, the replay, the transcript. A replay link is what releases that
 * session's replay letter. Last, the Idea Director worksheets, for picking
 * the front row before Day 2.
 */

type StageSession = {
  key: string;
  label: string;
  title: string;
  startsAt: string;
  minutes: number;
  audience: 'everyone' | 'ticket' | 'operator';
  live: boolean;
  ended: boolean;
  seats: number;
  present: number;
  liveUrl: string;
  replayUrl: string;
  transcriptUrl: string;
  /** Day 2 only: a live link per trade room. */
  rooms: Record<string, string> | null;
  liveKind: 'youtube' | 'vimeo' | 'link' | null;
  replayKind: 'youtube' | 'vimeo' | 'link' | null;
  replayHeld: boolean;
};

type Question = {
  id: number;
  text: string;
  name: string | null;
  business: string | null;
  trade: string | null;
  tier: string | null;
  email: string | null;
  answered: boolean;
  at: string;
};

type DeliverablesStatus = {
  releaseAt: string;
  released: boolean;
  items: {
    slug: string;
    name: string;
    minTier: 'vip' | 'platinum';
    holders: number;
    files: { name: string; kind: string; bytes: number; builtAt: string | null; downloads: number; people: number }[];
  }[];
};

type StagePayload = {
  ok: true;
  deliverables?: DeliverablesStatus;
  now: string;
  live: string | null;
  next: string | null;
  focus: string;
  offer: { open: boolean; at: string | null };
  rev: number;
  sessions: StageSession[];
  questions: Question[];
  worksheets: number;
};

type WorksheetRow = {
  registrationId: string;
  name: string | null;
  email: string | null;
  business: string | null;
  trade: string | null;
  tier: string;
  answered: number;
  savedAt: string;
  answers: Record<string, string>;
  brief: string;
};

const KIND_LABEL: Record<string, string> = { youtube: 'Plays in the room', vimeo: 'Plays in the room', link: 'Opens in a new tab' };

function untilText(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'now';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m % 60}m`;
  return `in ${m}m`;
}

function SessionRow({ s, onSaved }: { s: StageSession; onSaved: () => void }) {
  const [liveUrl, setLiveUrl] = useState(s.liveUrl);
  const [replayUrl, setReplayUrl] = useState(s.replayUrl);
  const [transcriptUrl, setTranscriptUrl] = useState(s.transcriptUrl);
  const [rooms, setRooms] = useState<Record<string, string>>(s.rooms ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const roomsDirty = Boolean(s.rooms) && tradeRooms.some((r) => (rooms[r.slug] ?? '') !== (s.rooms?.[r.slug] ?? ''));
  const dirty = liveUrl !== s.liveUrl || replayUrl !== s.replayUrl || transcriptUrl !== s.transcriptUrl || roomsDirty;
  const rate = s.seats > 0 ? Math.round((s.present / s.seats) * 100) : 0;

  async function save() {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await post('/api/admin/bootcamp/stage', {
        session: {
          key: s.key,
          liveUrl: liveUrl.trim(),
          replayUrl: replayUrl.trim(),
          transcriptUrl: transcriptUrl.trim(),
          ...(s.rooms ? { rooms: Object.fromEntries(tradeRooms.map((r) => [r.slug, (rooms[r.slug] ?? '').trim()])) } : {}),
        },
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Not saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${card} p-4 ${s.live ? 'shadow-[4px_4px_0_0_#E0301E]' : ''}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold">
            {s.label}
            {s.live && <span className="ml-2 align-middle rounded-full bg-[#E0301E] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white">Live</span>}
          </p>
          <p className={muted}>{s.title}</p>
        </div>
        <p className="font-mono text-[11px] text-[#3A3733]">{fmtDateTime(s.startsAt)} · {s.minutes} min</p>
      </div>
      <p className="mt-2 font-mono text-[11px] text-[#3A3733]">
        {s.present.toLocaleString('en-US')} present of {s.seats.toLocaleString('en-US')} seats{s.seats > 0 && (s.live || s.ended) ? ` · ${rate}% showed` : ''}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <label className={label} htmlFor={`live-${s.key}`}>Live link</label>
          <input id={`live-${s.key}`} className={input} value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://youtube.com/live/..." />
          {s.liveKind && <p className="mt-1 font-mono text-[10px] text-[#0a7c78]">{KIND_LABEL[s.liveKind]}</p>}
        </div>
        <div>
          <label className={label} htmlFor={`replay-${s.key}`}>Replay link</label>
          <input id={`replay-${s.key}`} className={input} value={replayUrl} onChange={(e) => setReplayUrl(e.target.value)} placeholder="https://youtu.be/..." />
          {s.replayKind && <p className="mt-1 font-mono text-[10px] text-[#0a7c78]">{KIND_LABEL[s.replayKind]}</p>}
          {s.replayHeld && <p className="mt-1 font-mono text-[10px] font-bold text-[#E0301E]">Replay letter waiting on this link</p>}
        </div>
        <div>
          <label className={label} htmlFor={`tx-${s.key}`}>Transcript link (VIP and up)</label>
          <input id={`tx-${s.key}`} className={input} value={transcriptUrl} onChange={(e) => setTranscriptUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>
      {s.rooms && (
        <div className="mt-3 rounded-lg border-2 border-dashed border-[#161616]/30 p-3">
          <p className={label}>Trade rooms (each person sees their own trade first)</p>
          <div className="grid gap-3 md:grid-cols-2">
            {tradeRooms.map((r) => (
              <div key={r.slug}>
                <label className="block font-mono text-[10px] text-[#3A3733] mb-1" htmlFor={`room-${r.slug}`}>{r.name}</label>
                <input id={`room-${r.slug}`} className={input} value={rooms[r.slug] ?? ''} onChange={(e) => setRooms((m) => ({ ...m, [r.slug]: e.target.value }))} placeholder="https://..." />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={btnInk} disabled={!dirty || busy} onClick={save}>
          {busy ? 'Saving…' : 'Save links'}
        </button>
        {saved && !dirty && <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#0a7c78]">Saved. Rooms pick it up within 30 seconds.</span>}
        {error && <span className="font-body text-sm text-[#E0301E]">{error}</span>}
      </div>
    </div>
  );
}

const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** The tier deliverables: built, held and downloaded. They open in the rooms by themselves when Day 3 ends. */
function DeliverablesPanel({ d }: { d: DeliverablesStatus }) {
  return (
    <section className={`${card} p-5`} aria-labelledby="kit-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kit-heading" className="font-display text-xl font-semibold">Deck, Kit and Playbook</h2>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${d.released ? 'bg-[#0a7c78] text-white' : 'bg-[#F5B700] text-[#161616]'}`}>
          {d.released ? 'Open in the rooms' : `Opens ${fmtDateTime(d.releaseAt)}`}
        </span>
      </div>
      <p className={`${muted} mt-1`}>
        They open in every VIP, Platinum and cohort room on their own when Day 3 ends, and the &quot;in your room&quot; letter goes on the next hourly run. Nothing to set. To change a file, edit private/bootcamp/src and run scripts/bootcamp-deliverables-build.mjs.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {d.items.map((item) => (
          <div key={item.slug} className="rounded-lg border-2 border-[#161616]/20 bg-white p-3">
            <p className="font-display text-lg font-semibold">{item.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#3A3733]">
              {item.minTier === 'vip' ? 'VIP and up' : 'Platinum and cohort'} · {item.holders.toLocaleString('en-US')} seat{item.holders === 1 ? '' : 's'}
            </p>
            <ul className="mt-2 space-y-1.5">
              {item.files.map((f) => (
                <li key={f.name} className="font-mono text-[11px] text-[#161616]">
                  {f.bytes ? (
                    <>
                      {f.name} · {kb(f.bytes)}
                      <br />
                      <span className="text-[#3A3733]">
                        {f.people.toLocaleString('en-US')} downloaded{item.holders ? ` of ${item.holders.toLocaleString('en-US')}` : ''}
                        {f.builtAt ? ` · built ${fmtDateTime(f.builtAt)}` : ''}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-[#E0301E]">{f.name} is missing from the build</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function RunOfShow({ live, startsAt, now }: { live: boolean; startsAt: string; now: number }) {
  const minute = live ? Math.floor((now - new Date(startsAt).getTime()) / 60000) : -1;
  const current = live ? MASTERCLASS_SCRIPT.reduce((acc, b, i) => (b.minute <= minute ? i : acc), -1) : -1;
  return (
    <ol className="space-y-2">
      {MASTERCLASS_SCRIPT.map((b, i) => {
        const on = i === current;
        const past = live && i < current;
        return (
          <li key={b.minute} className={`rounded-lg border-2 px-3 py-2.5 ${on ? 'border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616]' : past ? 'border-[#161616]/15 bg-white/50 opacity-60' : 'border-[#161616]/20 bg-white'}`}>
            <div className="flex gap-3">
              <span className="font-mono text-xs font-bold w-10 shrink-0 text-[#161616]">{String(b.minute).padStart(2, '0')}:00</span>
              <div className="min-w-0">
                <p className="font-body text-sm text-[#161616] leading-snug">{b.beat}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#3A3733] mt-1">On screen: {b.onScreen}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Worksheets() {
  const [rows, setRows] = useState<WorksheetRow[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const { copy, labelFor } = useCopy();

  useEffect(() => {
    api<{ ok: true; rows: WorksheetRow[] }>('/api/admin/bootcamp/worksheets')
      .then((d) => setRows(d.rows))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the worksheets.'));
  }, []);

  if (error) return <div className={errorBox}>{error}</div>;
  if (!rows) return <p className={muted}>Loading worksheets…</p>;
  if (!rows.length) return <div className={emptyBox}>No worksheets yet. The pre-work letter goes to every ticket the day after the masterclass; worksheets land here as people type.</div>;

  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const isOpen = open === r.registrationId;
        return (
          <li key={r.registrationId} className={`${card} p-3`}>
            <button type="button" onClick={() => setOpen(isOpen ? null : r.registrationId)} aria-expanded={isOpen} className="w-full text-left flex flex-wrap items-center justify-between gap-2">
              <span className="font-body text-sm font-semibold">
                {r.name ?? r.email}
                {r.business ? <span className="font-normal text-[#3A3733]">, {r.business}</span> : null}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#3A3733]">
                {TIER_LABEL[r.tier] ?? r.tier} · {r.trade ?? 'no trade'} · {r.answered}/{worksheetQuestions.length}
              </span>
            </button>
            {isOpen && (
              <div className="mt-3 space-y-3">
                {worksheetQuestions.map((q) =>
                  r.answers[q.key] ? (
                    <div key={q.key}>
                      <p className={label}>{q.title}</p>
                      <p className="font-body text-sm text-[#161616] whitespace-pre-wrap">{r.answers[q.key]}</p>
                    </div>
                  ) : null,
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => copy(r.brief, r.registrationId)}>{labelFor(r.registrationId, 'Copy the brief')}</button>
                  {r.email && <a className={btn} href={`mailto:${r.email}`}>Email them</a>}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function StageTab() {
  const [data, setData] = useState<StagePayload | null>(null);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState<string>('');
  const [showAnswered, setShowAnswered] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [showWorksheets, setShowWorksheets] = useState(false);
  const [showCohort, setShowCohort] = useState(false);

  const load = useCallback(async (key?: string) => {
    try {
      const qs = key ? `?session=${encodeURIComponent(key)}` : '';
      const d = await api<StagePayload>(`/api/admin/bootcamp/stage${qs}`);
      setData(d);
      setFocus(d.focus);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the stage.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // While a session is live, the queue and the counts refresh on their own.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (!data?.live) return;
    const t = window.setInterval(() => void load(focus), 15_000);
    return () => window.clearInterval(t);
  }, [data?.live, focus, load]);

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const liveS = sessions.find((s) => s.key === data?.live) ?? null;
  const nextS = sessions.find((s) => s.key === data?.next) ?? null;
  const mc = sessions.find((s) => s.key === 'masterclass');

  async function flipOffer(open: boolean) {
    setOfferBusy(true);
    setOfferError('');
    try {
      await post('/api/admin/bootcamp/stage', { offerOpen: open });
      await load(focus);
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'The switch did not move.');
    } finally {
      setOfferBusy(false);
    }
  }

  async function answer(q: Question) {
    try {
      await api('/api/admin/bootcamp/stage', { method: 'PATCH', body: JSON.stringify({ session: focus, questionId: q.id }) });
      setData((d) => (d ? { ...d, questions: d.questions.map((x) => (x.id === q.id ? { ...x, answered: true } : x)) } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark it answered.');
    }
  }

  if (error && !data) return <div className={errorBox}>{error}</div>;
  if (!data) return <p className={muted}>Loading the stage…</p>;

  const launchSessions = sessions.filter((s) => s.audience !== 'operator');
  const cohortSessions = sessions.filter((s) => s.audience === 'operator');
  const queue = data.questions.filter((q) => showAnswered || !q.answered);
  const open = data.questions.filter((q) => !q.answered).length;
  const focusSession = sessions.find((s) => s.key === focus);

  return (
    <div className="space-y-6">
      {error && <div className={errorBox}>{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className={`${card} p-5 ${liveS ? 'bg-[#161616] text-[#FBF6EA]' : ''}`}>
          <p className={`text-[10px] uppercase tracking-[0.3em] font-mono font-bold ${liveS ? 'text-[#F5B700]' : 'text-[#E0301E]'}`}>{liveS ? 'Live now' : 'Next on stage'}</p>
          {liveS ? (
            <>
              <p className="font-display text-3xl font-semibold mt-1 text-[#FBF6EA]">{liveS.label}</p>
              <p className="font-body text-sm text-[#FBF6EA]/80 mt-1">{liveS.title}</p>
              <p className="font-mono text-sm mt-3 text-[#FBF6EA]">
                {liveS.present.toLocaleString('en-US')} in the room · {open} open question{open === 1 ? '' : 's'}
              </p>
              {!liveS.liveUrl && <p className="mt-3 rounded-lg bg-[#E0301E] px-3 py-2 font-body text-sm text-white">No live link set. Rooms are showing "the stream appears right here". Paste it below and save.</p>}
            </>
          ) : nextS ? (
            <>
              <p className="font-display text-3xl font-semibold mt-1">{nextS.label} <span className="font-body text-base text-[#3A3733]">{untilText(nextS.startsAt, now)}</span></p>
              <p className={`${muted} mt-1`}>{nextS.title} · {fmtDateTime(nextS.startsAt)}</p>
              <p className="font-mono text-[11px] mt-3 text-[#3A3733]">
                {nextS.liveUrl ? 'Live link set.' : 'No live link yet. Set it any time before the doors open, fifteen minutes before the hour.'}
              </p>
            </>
          ) : (
            <p className="font-display text-2xl mt-1">Every session has run.</p>
          )}
        </div>

        <div className={`${card} p-5`}>
          <p className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#E0301E]">The offer</p>
          <p className="font-display text-2xl font-semibold mt-1">{data.offer.open ? 'On screen' : 'Off'}</p>
          <p className={`${muted} mt-1`}>
            Puts the three seats under the stream in every free seat&apos;s room, with their email already on the checkout. Rooms pick it up within about thirty seconds. Flip it on at minute {MASTERCLASS_SCRIPT.find((b) => /tiers/i.test(b.beat))?.minute ?? 52}.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className={btnGold} disabled={offerBusy || data.offer.open} onClick={() => flipOffer(true)}>Put the offer up</button>
            <button type="button" className={btn} disabled={offerBusy || !data.offer.open} onClick={() => flipOffer(false)}>Take it down</button>
          </div>
          {data.offer.at && <p className="mt-2 font-mono text-[10px] text-[#3A3733]">Last moved {fmtDateTime(data.offer.at)}</p>}
          {offerError && <p className="mt-2 font-body text-sm text-[#E0301E]">{offerError}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className={`${card} p-5`} aria-labelledby="queue-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 id="queue-heading" className="font-display text-xl font-semibold">Questions</h2>
            <div className="flex items-center gap-2">
              <select aria-label="Session" className={`${input} w-auto py-1.5`} value={focus} onChange={(e) => void load(e.target.value)}>
                {sessions.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#3A3733]">
                <input type="checkbox" checked={showAnswered} onChange={(e) => setShowAnswered(e.target.checked)} /> answered
              </label>
            </div>
          </div>
          <p className={`${muted} mb-3`}>
            {focusSession?.live ? 'Live: refreshing every fifteen seconds.' : 'Questions asked between sessions queue here for the next one.'} Oldest first.
          </p>
          {queue.length === 0 ? (
            <div className={emptyBox}>{data.questions.length ? 'Every question here is answered.' : 'No questions for this session yet.'}</div>
          ) : (
            <ol className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {queue.map((q) => (
                <li key={q.id} className={`rounded-lg border-2 px-3 py-2.5 ${q.answered ? 'border-[#161616]/15 opacity-60' : 'border-[#161616] bg-[#FBF6EA]'}`}>
                  <p className="font-body text-[15px] text-[#161616] leading-snug">{q.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A3733]">
                      {q.name ?? q.email ?? 'Someone'}
                      {q.business ? `, ${q.business}` : ''}
                      {q.trade ? ` · ${q.trade}` : ''}
                      {q.tier ? ` · ${TIER_LABEL[q.tier] ?? q.tier}` : ''} · {fmtDateTime(q.at)}
                    </p>
                    {!q.answered && (
                      <button type="button" className={btn} onClick={() => void answer(q)}>Answered</button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={`${card} p-5`} aria-labelledby="ros-heading">
          <h2 id="ros-heading" className="font-display text-xl font-semibold">Run of show: the masterclass</h2>
          <p className={`${muted} mb-3`}>{mc?.live ? 'The current beat is lit, by the clock.' : 'Sixty minutes, twenty beats. The current beat lights up while the masterclass is live.'}</p>
          <div className="max-h-[560px] overflow-y-auto pr-1">
            <RunOfShow live={Boolean(mc?.live)} startsAt={mc?.startsAt ?? ''} now={now} />
          </div>
        </section>
      </div>

      <section aria-labelledby="links-heading" className="space-y-3">
        <div>
          <h2 id="links-heading" className="font-display text-xl font-semibold">Every session&apos;s links</h2>
          <p className={muted}>
            Paste a YouTube or Vimeo link and it plays inside the room; anything else (Zoom, Zoho Meeting, StreamYard) becomes a button that opens it in a new tab. Setting a replay link releases that session&apos;s replay letter on the next hourly run.
          </p>
        </div>
        {launchSessions.map((s) => (
          <SessionRow key={`${s.key}|${s.liveUrl}|${s.replayUrl}|${s.transcriptUrl}|${JSON.stringify(s.rooms)}`} s={s} onSaved={() => void load(focus)} />
        ))}
        <button type="button" className={btn} onClick={() => setShowCohort((v) => !v)} aria-expanded={showCohort}>
          {showCohort ? 'Hide' : 'Show'} the Operator Program sessions ({cohortSessions.length})
        </button>
        {showCohort && cohortSessions.map((s) => <SessionRow key={`${s.key}|${s.liveUrl}|${s.replayUrl}|${s.transcriptUrl}`} s={s} onSaved={() => void load(focus)} />)}
      </section>

      {data.deliverables && <DeliverablesPanel d={data.deliverables} />}

      <section className={`${card} p-5`} aria-labelledby="ws-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="ws-heading" className="font-display text-xl font-semibold">Idea Director worksheets ({data.worksheets})</h2>
            <p className={muted}>Platinum first. Pick the Day 2 front row from these, and plan each trade room around the jobs people named.</p>
          </div>
          <button type="button" className={btn} onClick={() => setShowWorksheets((v) => !v)} aria-expanded={showWorksheets}>
            {showWorksheets ? 'Hide' : 'Read them'}
          </button>
        </div>
        {showWorksheets && (
          <div className="mt-4">
            <Worksheets />
          </div>
        )}
      </section>
    </div>
  );
}
