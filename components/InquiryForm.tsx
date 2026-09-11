'use client';

import { useState } from 'react';
import { trackLead, metaDedup } from '@/lib/analytics';

/**
 * THE PRIVATE INQUIRY. The one door into the studio.
 *
 * This replaced the old funnel of free demo builds, free audits, and a public
 * booking calendar (Sarah, 2026-09-11). The reasoning is worth keeping: a
 * published price is a ceiling, and a studio that gives the work away first is
 * telling the market it has nothing better to do. So there is no price here and
 * nothing is free. What does the qualifying instead is the budget field and one
 * line of copy above it, which filters harder than a price list ever did and
 * does it before Sarah spends a call.
 *
 * It posts to /api/contact like every other lead on the site, packing company,
 * budget, and timeline into the note so nothing new has to be migrated. The
 * lead lands in the same inbox and the same table.
 */

const BUDGETS = [
  { value: 'under-10k', label: 'Under $10,000' },
  { value: '10-25k', label: '$10,000 to $25,000' },
  { value: '25-50k', label: '$25,000 to $50,000' },
  { value: '50k-plus', label: '$50,000 and up' },
  { value: 'advisory', label: 'Advisory retainer, ongoing' },
  { value: 'unsure', label: 'Not sure yet' },
];

const TIMELINES = [
  { value: 'now', label: 'Ready now' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'half', label: 'Next six months' },
  { value: 'exploring', label: 'Exploring' },
];

const ENGAGEMENTS = [
  { id: 'website', label: 'Website and brand' },
  { id: 'software', label: 'Custom software' },
  { id: 'voice', label: 'Voice agent' },
  { id: 'advisory', label: 'Advisory' },
  { id: 'other', label: 'Something else' },
];

const inputCls =
  'w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-4 py-3 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 outline-none transition-shadow focus:shadow-[3px_3px_0_0_#F5B700]';

const labelCls =
  'mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a]';

export default function InquiryForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    budget: '',
    timeline: '',
  });
  const [kind, setKind] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    const budget = BUDGETS.find((b) => b.value === form.budget)?.label ?? 'Not given';
    const timeline = TIMELINES.find((t) => t.value === form.timeline)?.label ?? 'Not given';
    const engagement = ENGAGEMENTS.find((x) => x.id === kind)?.label ?? 'Not given';

    // Everything Sarah needs to answer well, in the body of one note. The API
    // stores `message` verbatim and puts it in the notification email.
    const message = [
      form.message.trim(),
      '',
      '---',
      `Engagement: ${engagement}`,
      `Company: ${form.company.trim() || 'Not given'}`,
      `Budget: ${budget}`,
      `Timeline: ${timeline}`,
      `Phone: ${form.phone.trim() || 'Not given'}`,
    ].join('\n');

    try {
      const dedup = metaDedup();
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message,
          source: `inquiry-${kind ?? 'general'}`,
          ...dedup,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        trackLead({ source: `inquiry-${kind ?? 'general'}`, eventId: dedup.metaEventId });
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to send. Please email sarah@modernmustardseed.com directly.');
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border-2 border-[#161616] bg-white p-8 md:p-12 shadow-[7px_7px_0_0_#161616]">
        <div className="mx-auto max-w-md text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">
            Received
          </p>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-[#161616]">
            Thank you. It is with Sarah.
          </h2>
          <p className="mt-4 font-body text-[15px] leading-relaxed text-[#5c554a]">
            She reads every inquiry herself and replies inside one business day. If the fit is
            right, the next note has a time on it and a few questions worth thinking about
            beforehand.
          </p>
          <p className="mt-6 font-body text-sm text-[#5c554a]">
            Anything urgent goes to{' '}
            <a
              href="mailto:sarah@modernmustardseed.com"
              className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]"
            >
              sarah@modernmustardseed.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-10 shadow-[7px_7px_0_0_#161616]">
      <div className="border-b-2 border-[#161616] pb-5">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.26em] text-[#E0301E]">
          Private Inquiry
        </p>
        <p className="mt-2 font-display text-2xl font-extrabold leading-none text-[#161616]">
          Modern Mustard Seed
        </p>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5c554a]">
          Kalispell, Montana · answered personally
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-6">
        <fieldset>
          <legend className={labelCls}>What are you after?</legend>
          <div className="flex flex-wrap gap-2">
            {ENGAGEMENTS.map((x) => {
              const active = kind === x.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setKind(x.id)}
                  className={`rounded-full border-2 border-[#161616] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${
                    active
                      ? '-translate-y-0.5 bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616]'
                      : 'bg-white text-[#161616] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#161616]'
                  }`}
                >
                  {x.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Name</span>
            <input type="text" required value={form.name} onChange={set('name')} className={inputCls} placeholder="Your name" />
          </label>
          <label className="block">
            <span className={labelCls}>Email</span>
            <input type="email" required value={form.email} onChange={set('email')} className={inputCls} placeholder="you@company.com" />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Company</span>
            <input type="text" value={form.company} onChange={set('company')} className={inputCls} placeholder="Where you operate" />
          </label>
          <label className="block">
            <span className={labelCls}>
              Phone <span className="font-body text-[10px] font-normal normal-case tracking-normal">(optional)</span>
            </span>
            <input type="tel" value={form.phone} onChange={set('phone')} className={inputCls} placeholder="(406) 555 0134" />
          </label>
        </div>

        <label className="block">
          <span className={labelCls}>What are you building?</span>
          <textarea
            required
            rows={5}
            value={form.message}
            onChange={set('message')}
            className={`${inputCls} resize-y leading-relaxed`}
            placeholder="The business, the problem, and what a good outcome looks like. Detail helps."
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Budget</span>
            <select required value={form.budget} onChange={set('budget')} className={inputCls}>
              <option value="" disabled>
                Select a range
              </option>
              {BUDGETS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Timeline</span>
            <select required value={form.timeline} onChange={set('timeline')} className={inputCls}>
              <option value="" disabled>
                Select a timeline
              </option>
              {TIMELINES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* The fence. It does the qualifying a price list used to do, without
            putting a ceiling on the page. Do not soften this line. */}
        <p className="rounded-lg border-2 border-dashed border-[#161616]/30 bg-[#FBF6EA] px-4 py-3 font-body text-[13px] leading-relaxed text-[#5c554a]">
          Studio engagements begin in the five figures. Advisory is retained by the quarter. If
          you are earlier than that, say so anyway and Sarah will point you somewhere useful.
        </p>

        {error && (
          <p className="rounded-lg border-2 border-[#E0301E] bg-[#FDECEA] px-4 py-3 font-body text-sm text-[#8a1c10]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-full border-2 border-[#161616] bg-[#161616] px-8 py-4 font-sans text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#FBF6EA] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send the inquiry'}
        </button>

        <p className="text-center font-body text-[12px] leading-relaxed text-[#5c554a]">
          Sarah reads every one herself and replies inside one business day.
        </p>
      </form>
    </div>
  );
}
