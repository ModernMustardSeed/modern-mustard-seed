'use client';

import { useEffect, useState, FormEvent } from 'react';
import Image from 'next/image';
import { trackBooking } from '@/lib/analytics';

type Slot = { startIso: string; display: string; shortLabel: string; dayLabel: string; timeLabel: string };

const TIMELINES = ['As soon as possible', 'This quarter', 'Just exploring'];

/** The rubber stamp has two stages, like a real datebook: penciled in, then inked. */
type StampState = 'none' | 'held' | 'booked';

export default function BookCall() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', business: '', focus: '', current: '', success: '', timeline: '', startIso: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Arriving from the home-page terminal ("/book?idea=..."), the visitor already
  // typed what they want to build. Carry it into the focus field so they never
  // type it twice. Read from location, not useSearchParams, so this page stays
  // prerendered (no Suspense boundary needed).
  useEffect(() => {
    const idea = new URLSearchParams(window.location.search).get('idea');
    if (idea) setForm((f) => (f.focus ? f : { ...f, focus: idea.slice(0, 300) }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/book/slots');
        const data = await res.json();
        setSlots(data.slots ?? []);
      } catch {
        /* leave empty */
      } finally {
        setSlotsLoading(false);
      }
    })();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.startIso) { setError('Pick a time below.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(data.display);
        trackBooking({ source: 'book-call' });
      } else setError(data.error ?? 'Something went wrong.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const picked = slots.find((s) => s.startIso === form.startIso);
  const stamp: StampState = done ? 'booked' : form.startIso ? 'held' : 'none';

  /* ── Confirmed: the card you filled in IS the receipt. ── */
  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center">
        <StampStyles />
        <AppointmentCard name={form.name} business={form.business} focus={form.focus} timeLabel={done} stamp="booked" />
        <h2 className="mt-10 font-display text-3xl md:text-4xl font-extrabold text-[#161616] leading-[1.05]">
          You are on the book.
        </h2>
        <p className="mt-3 text-[#5c554a] font-body leading-relaxed">
          A calendar invite with the video link is on its way to your inbox. Sarah reads every answer before the call, so you can skip the throat-clearing and get right to it.
        </p>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#5c554a]">
          Something come up?{' '}
          <a href="mailto:sarah@modernmustardseed.com" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
            Email Sarah
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-6xl mx-auto">
      <StampStyles />
      <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-8 lg:gap-10 items-start">

        {/* ───── Left: the questions, then the times ───── */}
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-8 shadow-[5px_5px_0_0_#161616] space-y-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#E0301E] block">
              A little prep, so we make the most of it
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Your name"><input required value={form.name} onChange={set('name')} className={cls} placeholder="Jane Builder" /></Field>
              <Field label="Email"><input required type="email" value={form.email} onChange={set('email')} className={cls} placeholder="you@yourbusiness.com" /></Field>
            </div>
            <Field label="Business or website (optional)"><input value={form.business} onChange={set('business')} className={cls} placeholder="yourbusiness.com" /></Field>
            <Field label="What do you want to work on?"><textarea required value={form.focus} onChange={set('focus')} rows={3} className={cls} placeholder="The project, problem, or idea you want to talk through." /></Field>
            <Field label="Where are you now? (optional)"><textarea value={form.current} onChange={set('current')} rows={2} className={cls} placeholder="What exists today, what is working, what is stuck." /></Field>
            <Field label="What would success look like? (optional)"><textarea value={form.success} onChange={set('success')} rows={2} className={cls} placeholder="If this goes great, what is true 90 days from now?" /></Field>
            <Field label="Timeline (optional)">
              <select value={form.timeline} onChange={set('timeline')} className={cls}>
                <option value="">Select...</option>
                {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          {/* Slot picker */}
          <div id="pick" className="scroll-mt-24 rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-8 shadow-[5px_5px_0_0_#161616]">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#E0301E] block mb-1">
              Pick a day and time
            </span>
            <p className="text-[#5c554a] font-body text-sm mb-5">
              Thirty minutes with Sarah, Mountain Time. Pick whichever one fits you best and it lands on your card.
            </p>

            {slotsLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <span className="sr-only">Loading open times</span>
                {[0, 1].map((g) => (
                  <div key={g}>
                    <div className="h-2.5 w-28 rounded-full bg-[#161616]/10 mb-3" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-12 rounded-xl border-2 border-[#161616]/15 bg-[#F5F0E8] bc-pulse" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-[#5c554a] font-body text-sm">
                Nothing open this week. Email{' '}
                <a href="mailto:sarah@modernmustardseed.com" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
                  sarah@modernmustardseed.com
                </a>{' '}
                and we will find a time that works.
              </p>
            ) : (
              <div className="space-y-5">
                {groupByDay(slots).map(([day, times]) => (
                  <div key={day}>
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em] font-bold text-[#5c554a] block mb-2.5">{day}</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {times.map((s) => {
                        const active = form.startIso === s.startIso;
                        return (
                          <button
                            type="button"
                            key={s.startIso}
                            aria-pressed={active}
                            onClick={() => { setForm((f) => ({ ...f, startIso: s.startIso })); setError(''); }}
                            className={`rounded-xl border-2 border-[#161616] px-3 py-3 font-mono text-sm font-bold transition-all ${
                              active
                                ? 'bg-[#F5B700] text-[#161616] shadow-[3px_3px_0_0_#161616] -translate-y-0.5'
                                : 'bg-white text-[#161616] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#161616]'
                            }`}
                          >
                            {s.timeLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ───── Right: the card that writes itself, and the button ───── */}
        <div className="lg:sticky lg:top-24">
          <AppointmentCard name={form.name} business={form.business} focus={form.focus} timeLabel={picked?.display ?? ''} stamp={stamp} />

          <div className="mt-8">
            {error && (
              <p role="alert" className="mb-4 text-center font-body text-sm font-bold text-[#E0301E]">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || (!slotsLoading && slots.length === 0)}
              className="w-full rounded-full border-2 border-[#161616] bg-[#F5B700] px-8 py-4 font-sans text-sm font-extrabold uppercase tracking-[0.14em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_#161616]"
            >
              {submitting ? 'Booking...' : 'Stamp it and book'}
            </button>
            <p className="mt-4 text-center font-body text-[13px] leading-relaxed text-[#5c554a]">
              Free, 30 minutes, no pitch. You will get a calendar invite with the video link the moment you book.
            </p>
          </div>
        </div>

      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
   The Appointment Card. It fills in as you type and takes the
   stamp when you pick a time, so the form reads as a ticket you
   are holding rather than a list of questions you owe.
   ───────────────────────────────────────────────────────────── */
function AppointmentCard({
  name, business, focus, timeLabel, stamp,
}: { name: string; business: string; focus: string; timeLabel: string; stamp: StampState }) {
  return (
    <figure className="relative mx-auto max-w-md rotate-[-1.5deg] rounded-2xl border-2 border-[#161616] bg-white p-5 md:p-6 shadow-[7px_7px_0_0_#161616]">
      <div className="flex items-start justify-between gap-3 border-b-2 border-[#161616] pb-3">
        <div>
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.24em] text-[#5c554a]">Modern Mustard Seed</p>
          <p className="mt-0.5 font-display text-xl font-extrabold leading-none text-[#161616]">Appointment Card</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5c554a]">Kalispell, Montana</p>
        </div>
        <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#161616] bg-[#F5B700]">
          <Image src="/brand/mascot.png" alt="" fill sizes="44px" className="object-contain p-[3px]" />
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <CardRow label="Name" value={name} ghost="Your name" />
        <CardRow label="Business" value={business} ghost="Optional" />
        <CardRow label="Working on" value={focus} ghost="What you want to build" clamp />
        <CardRow label="Time · Mountain" value={timeLabel} ghost="Pick a time below" mono />
      </div>

      {/* The rubber stamp. Blue while it is only held, red once it is booked. */}
      {stamp !== 'none' && (
        <div
          key={stamp}
          aria-hidden="true"
          className={`bc-stamp absolute -bottom-3 -right-2 rotate-[-13deg] rounded-lg border-[3px] bg-[#FBF6EA]/85 px-3 py-1 ${
            stamp === 'booked' ? 'border-[#E0301E]' : 'border-[#1E50C8]'
          }`}
        >
          <p className={`font-mono text-[17px] font-bold tracking-[0.14em] ${stamp === 'booked' ? 'text-[#E0301E]' : 'text-[#1E50C8]'}`}>
            {stamp === 'booked' ? 'BOOKED' : 'HELD'}
          </p>
        </div>
      )}
      <figcaption className="sr-only">
        {stamp === 'booked' ? `Booked for ${timeLabel}.` : stamp === 'held' ? `Time held for ${timeLabel}. Not booked until you submit.` : 'Your appointment card, filled in as you type.'}
      </figcaption>
    </figure>
  );
}

function CardRow({ label, value, ghost, clamp, mono }: { label: string; value: string; ghost: string; clamp?: boolean; mono?: boolean }) {
  const filled = value.trim().length > 0;
  return (
    <div>
      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#5c554a]">{label}</p>
      <p
        className={`mt-1 min-h-[22px] border-b border-dashed border-[#161616]/30 pb-1 text-[15px] leading-snug transition-colors ${
          mono ? 'font-mono text-[13px]' : 'font-body'
        } ${filled ? 'font-semibold text-[#161616]' : 'italic text-[#767066]'} ${clamp ? 'line-clamp-2' : 'truncate'}`}
      >
        {filled ? value : ghost}
      </p>
    </div>
  );
}

/** Group offered slots under their day, preserving chronological order. */
function groupByDay(slots: Slot[]): [string, Slot[]][] {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const list = map.get(s.dayLabel);
    if (list) list.push(s);
    else map.set(s.dayLabel, [s]);
  }
  return Array.from(map.entries());
}

/** The stamp thunk. Overshoots, settles, and stays put for reduced-motion readers. */
function StampStyles() {
  return (
    <style>{`
      @keyframes bc-thunk {
        0%   { opacity: 0; transform: rotate(-34deg) scale(2.4); }
        55%  { opacity: 1; transform: rotate(-10deg) scale(.94); }
        75%  { transform: rotate(-14deg) scale(1.04); }
        100% { opacity: 1; transform: rotate(-13deg) scale(1); }
      }
      .bc-stamp { animation: bc-thunk .42s cubic-bezier(.2,.8,.2,1) both; transform-origin: 60% 60%; }
      @keyframes bc-fade { from { opacity: .45 } to { opacity: 1 } }
      .bc-pulse { animation: bc-fade 1.1s ease-in-out infinite alternate; }
      @media (prefers-reduced-motion: reduce) {
        .bc-stamp { animation: none; }
        .bc-pulse { animation: none; }
      }
    `}</style>
  );
}

const cls =
  'w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-2.5 text-sm text-[#161616] font-body placeholder-[#767066] focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow resize-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] font-bold text-[#5c554a] block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
