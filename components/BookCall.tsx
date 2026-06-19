'use client';

import { useEffect, useState, FormEvent } from 'react';
import { trackBooking } from '@/lib/analytics';

type Slot = { startIso: string; display: string; shortLabel: string; dayLabel: string; timeLabel: string };

const TIMELINES = ['As soon as possible', 'This quarter', 'Just exploring'];

export default function BookCall() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', business: '', focus: '', current: '', success: '', timeline: '', startIso: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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

  if (done) {
    return (
      <div className="glass-card p-10 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
          <span className="text-emerald-300 text-xl">✓</span>
        </div>
        <h2 className="font-display text-2xl font-semibold text-cream-50 mb-2">You are on my calendar</h2>
        <p className="text-white/60 font-body text-sm leading-relaxed">
          {done}. A calendar invite with the video link is on its way to your inbox. I read every answer before the call, so we can get right to it. See you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-8">
      {/* The questionnaire */}
      <div className="glass-card p-7 md:p-8 space-y-4">
        <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light/80 font-mono font-bold block">A little prep, so we make the most of it</span>
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
            <option value="" className="bg-neutral-900">Select...</option>
            {TIMELINES.map((t) => <option key={t} value={t} className="bg-neutral-900">{t}</option>)}
          </select>
        </Field>
      </div>

      {/* Slot picker */}
      <div className="glass-card p-7 md:p-8">
        <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light/80 font-mono font-bold block mb-1">Pick a day and time</span>
        <p className="text-white/45 font-body text-sm mb-5">30 minutes with Sarah, Mountain Time. Pick whichever day and time fits you best.</p>
        {slotsLoading ? (
          <p className="text-white/40 font-body italic text-sm">Loading open times...</p>
        ) : slots.length === 0 ? (
          <p className="text-white/55 font-body text-sm">Nothing that fits this week? Email <a href="mailto:sarah@modernmustardseed.com" className="text-gold-light underline">sarah@modernmustardseed.com</a> and we will find a time.</p>
        ) : (
          <div className="space-y-5">
            {groupByDay(slots).map(([day, times]) => (
              <div key={day}>
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium block mb-2">{day}</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {times.map((s) => {
                    const active = form.startIso === s.startIso;
                    return (
                      <button
                        type="button"
                        key={s.startIso}
                        onClick={() => setForm((f) => ({ ...f, startIso: s.startIso }))}
                        className={`text-center px-4 py-3 rounded-xl border text-sm font-body transition-all ${
                          active ? 'border-gold-light/60 bg-gold-light/10 text-cream-50' : 'border-white/[0.08] bg-white/[0.02] text-white/75 hover:border-gold-light/30'
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

      {error && <p className="text-rust-light text-sm font-body text-center">{error}</p>}

      <div className="text-center">
        <button
          type="submit"
          disabled={submitting || slots.length === 0}
          className="px-10 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] transition-all disabled:opacity-40"
        >
          {submitting ? 'Booking...' : 'Book my call'}
        </button>
      </div>
    </form>
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

const cls = 'w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 resize-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
