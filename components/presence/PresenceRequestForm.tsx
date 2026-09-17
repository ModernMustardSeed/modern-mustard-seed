'use client';

import { useState } from 'react';
import { trackLead, metaDedup } from '@/lib/analytics';

/**
 * REQUEST THE FULL THREE-PILLAR REPORT.
 *
 * The website pillar runs on the page. The profile and review pillars are read
 * off the business's real Google listing (lib/presence-audit.ts), which is a
 * lookup rather than a render, so this collects what the match needs and hands
 * it over instead of pretending to produce a report instantly.
 *
 * It posts to /api/contact like every other lead on the site, tagged
 * presence-audit, so the request lands in the same inbox and the same table and
 * nothing new has to be migrated. Sarah runs the audit from the admin, where the
 * presence engine already lives.
 *
 * Every field declares its name and autocomplete purpose. An unnamed form with
 * an email and a phone in it gets classified by the browser as a payment profile
 * and offered to a wallet, which is exactly what happened on the inquiry form.
 */

const inputCls =
  'w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-4 py-3 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 outline-none transition-shadow focus:shadow-[3px_3px_0_0_#F5B700]';

const labelCls =
  'mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a]';

export default function PresenceRequestForm({ defaultUrl = '' }: { defaultUrl?: string }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    business: '',
    website: defaultUrl,
    town: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    const message = [
      `Requested the full Online Presence Audit.`,
      '',
      '---',
      `Business: ${form.business.trim() || 'Not given'}`,
      `Website: ${form.website.trim() || 'Not given'}`,
      `Town: ${form.town.trim() || 'Not given'}`,
    ].join('\n');

    try {
      const dedup = metaDedup();
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message,
          source: 'presence-audit',
          ...dedup,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        trackLead({ source: 'presence-audit', eventId: dedup.metaEventId });
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
      <div className="rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-8 text-center shadow-[7px_7px_0_0_#161616] md:p-10">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#161616]/70">
          Requested
        </p>
        <h3 className="mt-3 font-display text-2xl font-extrabold italic leading-tight md:text-3xl">
          We are going to go and look.
        </h3>
        <p className="mx-auto mt-4 max-w-md font-body text-[15px] leading-relaxed text-[#161616]/80">
          Your profile and your reviews get read off your real Google listing rather than guessed
          at, so the full report comes by email rather than instantly. It is yours to keep, and
          nobody rings you unless you ask.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      name="presence-audit-request"
      id="presence-audit-request"
      autoComplete="on"
      className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[7px_7px_0_0_#161616] md:p-8"
    >
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.26em] text-[#E0301E]">
        The full report
      </p>
      <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight">
        All three pillars, by email.
      </h3>
      <p className="mt-2 font-body text-[14px] leading-relaxed text-[#5c554a]">
        The website grade above, plus your Google profile scored on eight checks and your reviews
        measured against your trade. No card, and no call unless you ask for one.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className={labelCls}>Your name</span>
          <input
            id="pa-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={set('name')}
            className={inputCls}
            placeholder="Your name"
          />
        </label>
        <label className="block min-w-0">
          <span className={labelCls}>Email</span>
          <input
            id="pa-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={set('email')}
            className={inputCls}
            placeholder="you@company.com"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className={labelCls}>Business name</span>
          <input
            id="pa-business"
            name="organization"
            type="text"
            autoComplete="organization"
            required
            value={form.business}
            onChange={set('business')}
            className={inputCls}
            placeholder="As it reads on Google"
          />
        </label>
        <label className="block min-w-0">
          <span className={labelCls}>Town</span>
          <input
            id="pa-town"
            name="address-level2"
            type="text"
            autoComplete="address-level2"
            value={form.town}
            onChange={set('town')}
            className={inputCls}
            placeholder="So the right listing is matched"
          />
        </label>
      </div>

      <label className="mt-5 block min-w-0">
        <span className={labelCls}>Website</span>
        <input
          id="pa-website"
          name="url"
          type="text"
          autoComplete="url"
          value={form.website}
          onChange={set('website')}
          className={inputCls}
          placeholder="yourbusiness.com"
        />
      </label>

      {error && (
        <p className="mt-5 rounded-lg border-2 border-[#E0301E] bg-[#FDECEA] px-4 py-3 font-body text-sm text-[#8a1c10]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-6 w-full rounded-full border-2 border-[#161616] bg-[#161616] px-8 py-4 font-sans text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#FBF6EA] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Send me the full report'}
      </button>
    </form>
  );
}
