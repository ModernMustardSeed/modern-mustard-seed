'use client';

import { useState } from 'react';
import { trackLead, metaDedup } from '@/lib/analytics';
import { readAttribution } from '@/lib/ai-attribution';

/**
 * ASK FOR THE AUDIT.
 *
 * Nothing is graded on the page. The visitor leaves an email and the request
 * lands on the Audit Desk (/admin/audit), where Sarah reads their Google listing
 * and presses Run, and the finished report is emailed to them. The form's job is
 * to make that ask feel like thirty seconds, because it is.
 *
 * Email and business name are the only required fields. Everything else helps
 * the right listing get matched, and nothing else is asked for.
 *
 * `company_site` is a honeypot: hidden from people, irresistible to bots, and
 * the route quietly drops anything that fills it.
 *
 * Every field declares its name and autocomplete purpose. An unnamed form with
 * an email in it gets classified by the browser as a payment profile and offered
 * to a wallet, which is exactly what happened on the inquiry form.
 */

const inputCls =
  'w-full min-w-0 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-4 py-3.5 font-body text-[16px] text-[#161616] placeholder:text-[#161616]/35 outline-none transition-shadow focus:bg-white focus:shadow-[4px_4px_0_0_#F5B700]';

const labelCls = 'mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#5c554a]';

export default function PresenceRequestForm({ id = 'get' }: { id?: string }) {
  const [form, setForm] = useState({
    email: '',
    business: '',
    website: '',
    town: '',
    name: '',
    googleUrl: '',
    company_site: '',
  });
  const [more, setMore] = useState(false);
  const [sent, setSent] = useState<null | { email: string; business: string }>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const dedup = metaDedup();
      // Which post sent them: the utm_source on the link they tapped, kept by
      // the site-wide attribution capture, or on this URL if they landed here.
      let via = '';
      try {
        via = readAttribution()?.campaign.utm_source || new URLSearchParams(window.location.search).get('utm_source') || '';
      } catch {
        /* storage blocked; the request still goes through untagged */
      }
      const source = via ? `presence-audit:${via.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40)}` : 'presence-audit';
      const res = await fetch('/api/presence-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source, ...dedup }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setSent({ email: form.email.trim(), business: form.business.trim() });
        trackLead({ source: 'presence-audit', eventId: dedup.metaEventId });
      } else {
        setError((data && data.error) || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('We could not reach the desk. Email sarah@modernmustardseed.com and we will run it.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div id={id} className="relative scroll-mt-28 rounded-3xl border-2 border-[#161616] bg-[#F5B700] p-7 shadow-[8px_8px_0_0_#161616] md:p-9">
        <span className="absolute -top-4 left-7 rotate-[-3deg] rounded-full border-2 border-[#161616] bg-[#161616] px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">
          You are on the desk
        </span>
        <h3 className="mt-3 font-display text-3xl font-extrabold italic leading-[1.05] text-[#161616] md:text-4xl">
          We are going to go and look.
        </h3>
        <p className="mt-4 font-body text-[15px] leading-relaxed text-[#161616]/80">
          The audit for <strong>{sent.business}</strong> is in the queue. We will read your listing, your reviews and your
          site, then email the full report to <strong className="break-all">{sent.email}</strong>.
        </p>
        <ol className="mt-6 space-y-2.5">
          {['A note is on its way now, so you know it landed.', 'We run the audit ourselves, all three pillars.', 'The full report arrives in your inbox, yours to keep.'].map(
            (t, i) => (
              <li key={t} className="flex items-start gap-3 font-body text-[14px] text-[#161616]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[#161616] bg-white font-mono text-[11px] font-bold">
                  {i + 1}
                </span>
                {t}
              </li>
            ),
          )}
        </ol>
        <p className="mt-6 font-body text-[13px] text-[#161616]/65">Nobody will call you unless you ask.</p>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={submit}
      name="presence-audit-request"
      autoComplete="on"
      className="relative scroll-mt-28 rounded-3xl border-2 border-[#161616] bg-white p-6 shadow-[8px_8px_0_0_#161616] md:p-8"
    >
      <span className="absolute -top-4 right-6 rotate-[3deg] rounded-full border-2 border-[#161616] bg-[#E0301E] px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-white shadow-[3px_3px_0_0_#161616]">
        Free
      </span>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#C4160B]">Get your audit</p>
      <h2 className="mt-2 font-display text-[1.75rem] font-extrabold leading-[1.05] text-[#161616] md:text-3xl">
        Where should we send it?
      </h2>

      <div className="mt-6 space-y-4">
        <label className="block min-w-0">
          <span className={labelCls}>Your email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={form.email}
            onChange={set('email')}
            className={inputCls}
            placeholder="you@yourbusiness.com"
          />
        </label>
        <label className="block min-w-0">
          <span className={labelCls}>Business name</span>
          <input
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
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <label className="block min-w-0">
            <span className={labelCls}>Website</span>
            <input
              name="url"
              type="text"
              autoComplete="url"
              inputMode="url"
              spellCheck={false}
              autoCapitalize="none"
              value={form.website}
              onChange={set('website')}
              className={inputCls}
              placeholder="yourbusiness.com"
            />
          </label>
          <label className="block min-w-0">
            <span className={labelCls}>Town</span>
            <input
              name="address-level2"
              type="text"
              autoComplete="address-level2"
              value={form.town}
              onChange={set('town')}
              className={inputCls}
              placeholder="Kalispell, MT"
            />
          </label>
        </div>

        {more ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={labelCls}>Your name</span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
                className={inputCls}
                placeholder="So we know who to write to"
              />
            </label>
            <label className="block min-w-0">
              <span className={labelCls}>Google listing link</span>
              <input
                name="google-listing"
                type="url"
                autoComplete="off"
                spellCheck={false}
                value={form.googleUrl}
                onChange={set('googleUrl')}
                className={inputCls}
                placeholder="https://maps.app.goo.gl/..."
              />
            </label>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMore(true)}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#161616]/55 underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:text-[#161616]"
          >
            + Add your name or your Google listing link
          </button>
        )}

        {/* The honeypot. Off-screen, out of the tab order, unlabelled for people. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Company site
            <input name="company_site" type="text" tabIndex={-1} autoComplete="off" value={form.company_site} onChange={set('company_site')} />
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-lg border-2 border-[#E0301E] bg-[#FDECEA] px-4 py-3 font-body text-sm text-[#8a1c10]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#161616] bg-[#F5B700] px-8 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616] active:translate-y-0 active:shadow-[3px_3px_0_0_#161616] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? 'Putting it on the desk…' : 'Get my free audit'}
        {!sending && <span className="transition-transform group-hover:translate-x-1">→</span>}
      </button>
      <p className="mt-4 text-center font-body text-[12.5px] leading-relaxed text-[#161616]/55">
        No card. No call unless you ask. Your email is used to send your report, and that is all.
      </p>
    </form>
  );
}
