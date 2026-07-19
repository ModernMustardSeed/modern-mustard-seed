'use client';

import { useMemo, useState } from 'react';
import { SectionTitle, StatCard, hash, useOs } from './os-kit';

/**
 * CALENDAR & BOOKING: the self-contained scheduling system at the heart of the
 * OS. One calendar that three things write into: the AI receptionist (books
 * calls straight in), the website's Book button, and the owner. Sample data is
 * deterministic (hash-seeded, hydration-safe). The pitch is "no double-bookings,
 * ever, and you never touch it" — the receptionist and the website keep it full.
 */

type Appt = { hour: number; mins: number; title: string; who: string; source: 'Receptionist' | 'Website' | 'You' };

const SOURCE_ICON: Record<Appt['source'], string> = { Receptionist: '🎙', Website: '🌐', You: '✋' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; // 8a–5p working hours

function label(h: number): string {
  const ampm = h >= 12 ? 'p' : 'a';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${ampm}`;
}

export default function CalendarTab() {
  const { config, preset, theme, say, fireBurst } = useOs();
  const bookUrl = `${config.business.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com/book`.slice(0, 40);

  // Seed the day from the trade's real jobs, then fill a few more slots so the
  // calendar looks alive. Deterministic per business (hydration law).
  const seeded = useMemo<Appt[]>(() => {
    const h = hash(config.business + 'cal');
    const out: Appt[] = [];
    preset.todayJobs.forEach((j, i) => {
      const hr = parseInt(j.time, 10);
      const clock = hr < 8 ? hr + 12 : hr; // presets use 24h-ish times
      out.push({ hour: Math.min(17, Math.max(8, clock)), mins: 0, title: j.title, who: j.who, source: i === 0 ? 'Receptionist' : i === 1 ? 'Website' : 'You' });
    });
    // A couple more the receptionist caught, on open hours.
    const extras: Array<[number, string]> = [
      [9, preset.customers[0]?.name ?? 'New caller'],
      [15, preset.customers[1]?.name ?? 'New caller'],
    ];
    for (const [hr, who] of extras) {
      if (!out.some((a) => a.hour === hr)) {
        out.push({ hour: hr, mins: 30 * ((h >> hr) % 2), title: `${preset.jobWord[0].toUpperCase()}${preset.jobWord.slice(1)}`, who, source: 'Receptionist' });
      }
    }
    return out.sort((a, b) => a.hour * 60 + a.mins - (b.hour * 60 + b.mins));
  }, [config.business, preset]);

  const [appts, setAppts] = useState<Appt[]>(seeded);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const booked = appts.length;
  const openSlots = HOURS.filter((h) => !appts.some((a) => a.hour === h)).length;
  const byAi = appts.filter((a) => a.source === 'Receptionist').length;
  const fillPct = Math.round((booked / (booked + openSlots || 1)) * 100);

  const h = hash(config.business + 'cal');
  const NAMES = ['Marisol V.', 'Tyler B.', 'Dev Patel', 'Karen L.', 'Sofia M.', 'Grant W.'];

  // Watch the receptionist drop a booking into an open slot, live.
  const catchBooking = (at: { x: number; y: number }) => {
    if (busy) return;
    const open = HOURS.filter((hr) => !appts.some((a) => a.hour === hr));
    if (!open.length) { say('The day is full. A good problem.'); return; }
    setBusy(true);
    const slot = open[(h + appts.length) % open.length];
    const who = NAMES[(h + appts.length) % NAMES.length];
    window.setTimeout(() => {
      const fresh: Appt = { hour: slot, mins: 0, title: `${preset.jobWord[0].toUpperCase()}${preset.jobWord.slice(1)}`, who, source: 'Receptionist' };
      setAppts((a) => [...a, fresh].sort((x, y) => x.hour - y.hour));
      fireBurst(at.x, at.y);
      say(`${who} just booked ${label(slot)} through your receptionist. You did not lift a finger.`);
      setBusy(false);
    }, 700);
  };

  const chip = (src: Appt['source']) => {
    const on = src === 'Receptionist';
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] rounded-full px-2 py-0.5 border" style={{ color: on ? theme.accentInk : theme.dim, background: on ? theme.accent : 'transparent', borderColor: on ? theme.accent : theme.line }}>
        {SOURCE_ICON[src]} {src === 'You' ? 'You' : src}
      </span>
    );
  };

  return (
    <div className="max-w-3xl">
      <SectionTitle title="Calendar" sub="One calendar your receptionist, your website, and you all book into. No double-bookings, ever, and you barely touch it." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Booked today" value={String(booked)} sub={`${byAi} by your receptionist`} i={0} pulse={byAi > 0} />
        <StatCard label="Open slots" value={String(openSlots)} sub="the AI is filling them" i={1} />
        <StatCard label="Filled" value={`${fillPct}%`} sub="of your working day" i={2} />
        <StatCard label="No-shows" value="0" sub="every booking gets reminders" i={3} />
      </div>

      {/* The booking link: the one place everything writes into. */}
      <div className="rounded-2xl border-2 p-4 mb-4 animate-[osIn_.5s_ease-out_.1s_both]" style={{ background: theme.accentSoft, borderColor: theme.accent }}>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.accent }}>Your booking link</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="font-mono text-[15px] font-bold" style={{ color: theme.text }}>{bookUrl}</span>
          <button
            onClick={() => { navigator.clipboard?.writeText(`https://${bookUrl}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
            className="text-[10px] uppercase tracking-[0.1em] font-bold rounded px-2.5 py-1 border"
            style={{ borderColor: theme.accent, color: theme.accent }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[11.5px]" style={{ color: theme.dim }}>Everything writes here:</span>
          <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 border" style={{ color: theme.text, borderColor: theme.line }}>🎙 Receptionist</span>
          <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 border" style={{ color: theme.text, borderColor: theme.line }}>🌐 Website Book button</span>
          <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 border" style={{ color: theme.text, borderColor: theme.line }}>🔗 Text it to anyone</span>
        </div>
      </div>

      {/* Today's agenda: the working day, booked and open. */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.dim }}>Today</p>
        <button
          onClick={(e) => catchBooking({ x: e.clientX, y: e.clientY })}
          disabled={busy}
          className="rounded-xl px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] disabled:opacity-60 transition-transform hover:-translate-y-0.5"
          style={{ background: theme.accent, color: theme.accentInk }}
        >
          {busy ? 'Ringing…' : '＋ Watch a booking land'}
        </button>
      </div>
      <div className="rounded-2xl border overflow-hidden" style={{ background: theme.panel, borderColor: theme.line }}>
        {HOURS.map((hr) => {
          const a = appts.find((x) => x.hour === hr);
          return (
            <div key={hr} className="flex items-stretch border-b last:border-b-0" style={{ borderColor: theme.line, minHeight: 44 }}>
              <div className="w-14 shrink-0 flex items-start justify-end pr-2.5 pt-2">
                <span className="font-mono text-[11px] font-bold" style={{ color: theme.dim }}>{label(hr)}</span>
              </div>
              <div className="flex-1 border-l p-1.5" style={{ borderColor: theme.line }}>
                {a ? (
                  <div className="rounded-lg px-3 py-2 flex items-center gap-2 animate-[osIn_.35s_ease-out_both]" style={{ background: a.source === 'Receptionist' ? theme.accentSoft : theme.panelSoft, border: `1px solid ${a.source === 'Receptionist' ? theme.accent : theme.line}` }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold truncate" style={{ color: theme.text }}>{a.title} · {a.who}</p>
                    </div>
                    {chip(a.source)}
                  </div>
                ) : (
                  <button
                    onClick={(e) => catchBooking({ x: e.clientX, y: e.clientY })}
                    className="w-full text-left rounded-lg px-3 py-2 text-[12px]"
                    style={{ color: theme.dim }}
                  >
                    Open
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* The week at a glance. */}
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold mt-5 mb-2.5" style={{ color: theme.dim }}>This week</p>
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((d, i) => {
          const n = i === 2 ? booked : 2 + ((h >> i) % 5);
          const today = i === 2;
          return (
            <div key={d} className="rounded-xl border p-2.5 text-center" style={{ background: today ? theme.accentSoft : theme.panel, borderColor: today ? theme.accent : theme.line }}>
              <p className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: today ? theme.accent : theme.dim }}>{d}</p>
              <p className="font-mono text-lg font-bold mt-0.5" style={{ color: theme.text }}>{n}</p>
              <p className="text-[9px]" style={{ color: theme.dim }}>booked</p>
            </div>
          );
        })}
      </div>

      <p className="text-[12px] mt-3" style={{ color: theme.dim }}>
        Sample calendar. In the real build it syncs both ways with your Google Calendar, your receptionist books into it live, and every appointment gets a confirmation and reminder text on its own.
      </p>
    </div>
  );
}
