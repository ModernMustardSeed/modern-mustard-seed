'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bootcampTiers } from '@/data/bootcamp';
import type { Player as PlayerSpec } from '@/lib/bootcamp/sessions';
import CheckoutButton from '@/components/bootcamp/CheckoutButton';
import Player from './Player';
import { ErrorNote, SUPPORT_EMAIL } from '@/components/bootcamp/ui';

/**
 * THE STAGE CARD at the top of the room. Two states.
 *
 * Live: the stream (or the door to it), the questions box under it, and,
 * when Sarah flips the offer on at the pitch beat, the three seats right
 * there under the stream with the buyer's email already on the checkout.
 *
 * Not live: the next session, a clock, a calendar file with this person's
 * room in it, and the same questions box, which queues for that session.
 *
 * The room polls the public pulse every twenty seconds. When the stage
 * revision moves (a link was set, the offer went on) or a session opens or
 * closes, it re-renders itself through its signed page after a random pause
 * of up to eight seconds, so five thousand rooms do not refresh in the same
 * second.
 */

export type LiveView = { key: string; label: string; title: string; startsAt: string; endsAt: string };
export type TradeRoomLink = { slug: string; name: string; href: string; mine: boolean };
export type NextView = { key: string; label: string; title: string; startsAt: string; when: string; cal: string };

type Props = {
  id: string;
  k: string;
  rev: number;
  live: LiveView | null;
  livePlayer: PlayerSpec | null;
  next: NextView | null;
  doorsOpen: string | null;
  /** Day 2: the trade rooms, the person's own first. */
  rooms?: TradeRoomLink[];
  offer: { show: boolean; open: boolean; email: string; host: string | null };
  serverNow: number;
  /** What the card says once this seat has no session left. */
  done?: { kicker: string; title: string };
};

const POLL_MS = 20_000;

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, '0');

function Clock({ iso, serverNow }: { iso: string; serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const left = split(new Date(iso).getTime() - now);
  const cells = left.d > 0 ? [[left.d, 'days'], [left.h, 'hours'], [left.m, 'min']] : [[left.h, 'hours'], [left.m, 'min'], [left.s, 'sec']];
  return (
    <div className="flex gap-2.5 sm:gap-3" role="timer" aria-label="Time until the session">
      {cells.map(([v, l]) => (
        <div key={l as string} className="flex flex-col items-center">
          <span className="min-w-[58px] sm:min-w-[72px] rounded-[4px] border-2 border-[#141210] bg-white px-2 py-2.5 text-center font-display text-3xl sm:text-4xl font-black tabular-nums leading-none text-[#141210]">
            {pad(v as number)}
          </span>
          <span className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#fcfaf3]/70">{l}</span>
        </div>
      ))}
    </div>
  );
}

function AskBox({ id, k, live, forLabel }: { id: string; k: string; live: boolean; forLabel: string | null }) {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3 || state === 'sending') return;
    setState('sending');
    setMsg('');
    try {
      const res = await fetch('/api/bootcamp/room/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, k, text: text.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; label?: string; live?: boolean };
      if (!res.ok || !data.ok) {
        setState('error');
        setMsg(data.error || 'That did not go through.');
        return;
      }
      setText('');
      setState('sent');
      setMsg(data.live ? 'In the queue. Sarah reads them live.' : `Queued for ${data.label}. Sarah reads every one before the session.`);
    } catch {
      setState('error');
      setMsg('We could not reach the server.');
    }
  }

  return (
    <form onSubmit={send} className="mt-6" aria-label="Ask a question">
      <label htmlFor="room-ask" className="block font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#e8ecd0] mb-2">
        {live ? 'Ask a question' : `A question${forLabel ? ` for ${forLabel}` : ''}`}
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <textarea
          id="room-ask"
          rows={2}
          maxLength={600}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (state !== 'sending') setState('idle');
          }}
          placeholder={live ? 'What would you like Sarah to answer on screen?' : 'Ask now; it is answered in the session.'}
          className="flex-1 resize-y rounded-[4px] border-2 border-[#141210] bg-[#fcfaf3] px-4 py-3 font-body text-[15px] text-[#141210] placeholder:text-[#141210]/40 outline-none focus:shadow-[3px_3px_0_0_#f5b700]"
        />
        <button
          type="submit"
          disabled={text.trim().length < 3 || state === 'sending'}
          className="shrink-0 rounded-full border-2 border-[#141210] bg-[#f5b700] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#141210] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {state === 'sending' ? 'Sending…' : 'Send'}
        </button>
      </div>
      <p aria-live="polite" className="font-body text-[13px] mt-2 min-h-[1.25rem] text-[#fcfaf3]/75">
        {state === 'sent' || state === 'error' ? msg : 'Five per session. Trade questions first.'}
      </p>
      {state === 'error' && <span className="sr-only">{msg}</span>}
    </form>
  );
}

function OfferPanel({ open, email, host }: { open: boolean; email: string; host: string | null }) {
  return (
    <div className="mt-8 rounded-[4px] border-2 border-[#141210] bg-[#fcfaf3] p-5 sm:p-7 text-[#141210] shadow-[6px_6px_0_0_#f5b700]">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#c2261a]">On screen now</p>
      <p className="font-display text-2xl sm:text-3xl font-black mt-2 leading-tight">Take your seat for February.</p>
      <p className="font-body text-[15px] text-[#141210]/75 mt-2 leading-relaxed">Three live sessions, two agents you keep. Attend Day 1 live and, if it was not worth more than the ticket, email us that night for every dollar back.</p>
      <div className="grid sm:grid-cols-3 gap-3 mt-2">
        {bootcampTiers.map((t) => (
          <div key={t.slug}>
            <CheckoutButton
              tier={t.slug}
              label={`Ask Sarah for ${t.name}`}
              open={open}
              email={email}
              host={host}
              className={`${t.featured ? 'bg-[#141210] text-[#fcfaf3] shadow-[4px_4px_0_0_#f5b700]' : 'bg-white text-[#141210]'} inline-flex items-center justify-center rounded-full border-2 border-[#141210] px-4 py-3.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.14em] transition-all hover:-translate-y-0.5 disabled:opacity-60`}
            />
          </div>
        ))}
      </div>
      <p className="font-body text-xs text-[#141210]/55 mt-4">Checkout opens with {email} filled in. Card or bank, through Stripe.</p>
    </div>
  );
}

export default function RoomLive({ id, k, rev, live, livePlayer, next, doorsOpen, rooms = [], offer, serverNow, done }: Props) {
  const router = useRouter();
  const seen = useRef({ rev, live: live?.key ?? null });
  const [hereError, setHereError] = useState(false);

  // The heartbeat. Refresh only when something on the stage actually moved.
  useEffect(() => {
    let stopped = false;
    let pending: number | undefined;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/bootcamp/room/pulse', { cache: 'no-store' });
        if (!res.ok) return;
        const p = (await res.json()) as { rev: number; live: string | null };
        if (stopped) return;
        if (p.rev !== seen.current.rev || p.live !== seen.current.live) {
          seen.current = { rev: p.rev, live: p.live };
          window.clearTimeout(pending);
          pending = window.setTimeout(() => router.refresh(), Math.floor(Math.random() * 8000));
        }
      } catch {
        /* a missed beat is fine; the next one comes in twenty seconds */
      }
    };
    const t = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(t);
      window.clearTimeout(pending);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router]);

  // Attendance: once per session per browser, from the browser only.
  useEffect(() => {
    if (!live) return;
    const flag = `mms_bc_here_${live.key}`;
    try {
      if (window.sessionStorage.getItem(flag)) return;
    } catch {
      /* storage blocked: post anyway, the server dedupes */
    }
    void fetch('/api/bootcamp/room/here', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, k, session: live.key }),
    })
      .then((r) => {
        if (r.ok) {
          try {
            window.sessionStorage.setItem(flag, '1');
          } catch {
            /* fine */
          }
        } else setHereError(true);
      })
      .catch(() => setHereError(true));
  }, [id, k, live]);

  if (live) {
    return (
      <div className="rounded-[4px] border-2 border-[#141210] bg-[#141210] p-5 sm:p-8 text-[#fcfaf3] shadow-[8px_8px_0_0_#f5b700]">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#fcfaf3] bg-[#c2261a] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
            <span className="h-2 w-2 rounded-full bg-[#fcfaf3] motion-safe:animate-pulse" aria-hidden="true" /> Live
          </span>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#e8ecd0]">{live.label}</p>
        </div>
        <h2 className="font-display text-2xl sm:text-4xl font-black leading-tight mb-6">{live.title}</h2>
        {livePlayer ? (
          <Player player={livePlayer} title={`${live.label}: ${live.title}`} live dark />
        ) : (
          <div className="rounded-[4px] border-2 border-dashed border-[#e8ecd0] bg-[#0f4c47] px-6 py-10 text-center">
            <p className="font-display text-xl sm:text-2xl font-black">The stream appears right here.</p>
            <p className="font-body text-[15px] text-[#fcfaf3]/75 mt-2">
              {doorsOpen ? `Doors open at ${doorsOpen}. ` : ''}This page checks every twenty seconds and opens the stream on its own. No need to refresh.
            </p>
          </div>
        )}
        {rooms.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#e8ecd0] mb-3">The trade rooms</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {rooms.map((r) => (
                <a
                  key={r.slug}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 rounded-[4px] border-2 border-[#141210] px-4 py-3.5 font-sans text-[12px] font-extrabold uppercase tracking-[0.14em] transition-all hover:-translate-y-0.5 ${r.mine ? 'bg-[#f5b700] text-[#141210]' : 'bg-[#fcfaf3] text-[#141210]'}`}
                >
                  <span>{r.name}{r.mine ? ' · your room' : ''}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
            <p className="font-body text-[13px] text-[#fcfaf3]/65 mt-2">Each room opens in a new tab. Keep this tab for questions.</p>
          </div>
        )}
        {offer.show && <OfferPanel open={offer.open} email={offer.email} host={offer.host} />}
        <AskBox id={id} k={k} live forLabel={live.label} />
        {hereError && (
          <div className="mt-2">
            <ErrorNote>We could not mark you present. If this is Day 1 and you want the guarantee on record, email {SUPPORT_EMAIL} during the session.</ErrorNote>
          </div>
        )}
      </div>
    );
  }

  if (next) {
    return (
      <div className="rounded-[4px] border-2 border-[#141210] bg-[#141210] p-5 sm:p-8 text-[#fcfaf3] shadow-[8px_8px_0_0_#f5b700]">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#e8ecd0]">Next up · {next.label}</p>
        <h2 className="font-display text-2xl sm:text-4xl font-black leading-tight mt-2">{next.title}</h2>
        <p className="font-body text-[15px] text-[#fcfaf3]/80 mt-2">{next.when}</p>
        <div className="mt-6">
          <Clock iso={next.startsAt} serverNow={serverNow} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={next.cal}
            className="inline-flex items-center justify-center rounded-full border-2 border-[#141210] bg-[#f5b700] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#141210] transition-all hover:-translate-y-0.5"
          >
            Add it to my calendar
          </a>
        </div>
        <p className="font-body text-[13px] text-[#fcfaf3]/65 mt-3">
          This page turns into the live room fifteen minutes before the hour. Bookmark it; the calendar file carries the same link.
        </p>
        {offer.show && <OfferPanel open={offer.open} email={offer.email} host={offer.host} />}
        <AskBox id={id} k={k} live={false} forLabel={next.label} />
      </div>
    );
  }

  return (
    <div className="rounded-[4px] border-2 border-[#141210] bg-[#141210] p-6 sm:p-8 text-[#fcfaf3] shadow-[8px_8px_0_0_#f5b700]">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#e8ecd0]">{done?.kicker ?? 'The run is complete'}</p>
      <h2 className="font-display text-2xl sm:text-4xl font-black leading-tight mt-2">{done?.title ?? 'Every session is on replay below.'}</h2>
      <AskBox id={id} k={k} live={false} forLabel={null} />
    </div>
  );
}
