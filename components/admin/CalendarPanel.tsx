'use client';

import { useEffect, useState } from 'react';
import AdminHeader from './AdminHeader';

type Booking = {
  id: string;
  name: string;
  email: string;
  business: string | null;
  painSummary: string;
  startIso: string;
  endIso: string;
  display: string;
  shortLabel: string;
  isPast: boolean;
  bookedAt: string;
  bookedBy: string;
};

type CalendarData = {
  bookings: Booking[];
  conferenceLink: string | null;
  slotMinutes: number;
};

function gcalUrl(b: Booking, location: string) {
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Discovery call — ${b.name}${b.business ? ` (${b.business})` : ''}`,
    dates: `${fmt(b.startIso)}/${fmt(b.endIso)}`,
    details: `Email: ${b.email}\n\n${b.painSummary}`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function CalendarPanel() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => {
    fetch('/api/admin/calendar')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const upcoming = data?.bookings.filter((b) => !b.isPast) ?? [];
  const past = data?.bookings.filter((b) => b.isPast) ?? [];
  const link = data?.conferenceLink ?? '';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="calendar" title="Calendar" onRefresh={load} />

      <main className="max-w-5xl mx-auto px-5 md:px-6 py-8">
        {/* Meeting room card: always visible, always one click away */}
        <div className="pop-card-yellow p-6 md:p-7 mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <span className="text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#161616]/70 block mb-1">
              Your meeting room
            </span>
            <p className="font-display text-lg md:text-xl font-black tracking-tight">
              Every discovery call happens here
            </p>
            <p className="text-[#161616]/70 text-xs font-mono mt-1 break-all">{link || 'No conference link configured'}</p>
          </div>
          {link && (
            <div className="flex gap-2.5">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] hover:-translate-y-0.5 transition-all"
              >
                Join room
              </a>
              <button
                type="button"
                onClick={() => copy(link, 'room')}
                className="px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] hover:-translate-y-0.5 transition-all"
              >
                {copied === 'room' ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-[#E0301E] text-sm font-mono mb-6">Failed to load: {error}</p>
        )}

        {/* Upcoming */}
        <div className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl font-black tracking-tight">Upcoming calls</h2>
            <span className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/45">
              {upcoming.length} booked
            </span>
          </div>

          {!data && !error && <p className="text-[#161616]/50 text-sm font-body">Loading…</p>}

          {data && upcoming.length === 0 && (
            <div className="pop-card p-8 text-center">
              <p className="font-display text-lg font-black mb-1">Nothing on the books yet</p>
              <p className="text-[#3a3733] text-sm font-body">
                When Mr. Mustard or the site chat books a call, it lands here instantly.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {upcoming.map((b) => (
              <div key={b.id} className="pop-card p-6 md:p-7">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="md:w-52 shrink-0">
                    <span className="font-display text-lg font-black text-[#161616] tracking-tight block leading-snug">
                      {b.shortLabel}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-[#E0301E] block mt-1.5">
                      {b.bookedBy}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-bold text-base">
                      {b.name}
                      {b.business ? <span className="text-[#161616]/55 font-medium"> · {b.business}</span> : null}
                    </p>
                    <button
                      type="button"
                      onClick={() => copy(b.email, b.id)}
                      title="Copy email"
                      className="text-[#1E50C8] hover:text-[#E0301E] text-xs font-mono transition-colors"
                    >
                      {copied === b.id ? 'Copied!' : b.email}
                    </button>
                    {b.painSummary && (
                      <p className="text-[#3a3733] text-sm font-body leading-6 mt-2 line-clamp-3">{b.painSummary}</p>
                    )}
                  </div>
                  <div className="flex md:flex-col gap-2 shrink-0">
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center px-4 py-2 text-[9px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                      >
                        Join
                      </a>
                    )}
                    <a
                      href={gcalUrl(b, link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center px-4 py-2 text-[9px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-all whitespace-nowrap"
                    >
                      + Google Cal
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-sync explainer */}
        <div className="pop-card p-6 md:p-7 mb-10">
          <span className="text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#E0301E] block mb-2">
            Auto-sync to your real calendar
          </span>
          <p className="text-[#3a3733] text-sm font-body leading-6 mb-3">
            Subscribe once and every booking appears in Google Calendar automatically. In Google
            Calendar: Other calendars → + → From URL, then paste your private feed URL
            (<span className="font-mono">/api/calendar/feed?token=…</span> with the CALENDAR_FEED_TOKEN
            from Vercel env).
          </p>
          <p className="text-[#161616]/45 text-xs font-body">
            Google refreshes subscribed feeds on its own schedule (a few times a day). For instant
            adds, use the + Google Cal button on any booking.
          </p>
        </div>

        {/* Recent past */}
        {past.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-black tracking-tight mb-4 text-[#161616]/60">
              Past 7 days
            </h2>
            <div className="space-y-2.5">
              {past.map((b) => (
                <div key={b.id} className="pop-card p-4 opacity-60 flex items-center justify-between gap-4">
                  <span className="font-mono text-xs">{b.shortLabel}</span>
                  <span className="font-sans font-bold text-sm flex-1 truncate">
                    {b.name}
                    {b.business ? ` · ${b.business}` : ''}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-[#161616]/45">{b.bookedBy}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
