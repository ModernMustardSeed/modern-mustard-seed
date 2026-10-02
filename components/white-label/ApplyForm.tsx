'use client';

import { useState } from 'react';

const COUNTS = ['1 to 10', '11 to 30', '31 to 100', 'More than 100'];

const input =
  'w-full rounded-lg border-2 border-[#0b3b44] bg-[#fbf5ea] px-4 py-3 font-body text-[15px] text-[#0b3b44] placeholder:text-[#0b3b44]/35 outline-none transition-shadow focus:shadow-[3px_3px_0_0_#f5b700]';
const label = 'mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a]';

/**
 * The White Label application. Posts to /api/white-label/apply, which saves
 * the agency, emails them their demo, and tells Sarah. The success state
 * hands them the same demo link right here, so the next step is never an
 * empty "we'll be in touch".
 */
export default function ApplyForm() {
  const [f, setF] = useState({ agency: '', name: '', email: '', phone: '', website: '', clients: '', sells: '', color: '#0b3b44', company_url: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/white-label/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...f, source: new URLSearchParams(window.location.search).get('ref') || 'apply' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const demo = `/white-label/demo?${new URLSearchParams({ agency: f.agency || 'Your Agency', color: f.color.replace('#', ''), sample: 'dental' }).toString()}`;

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-[#0b3b44] bg-white p-7 shadow-[6px_6px_0_0_#f5b700]">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#0a7c78]">Application in</p>
        <h2 className="mt-2 font-display text-3xl font-black">Your demo is ready, {f.name.split(' ')[0] || 'friend'}.</h2>
        <p className="mt-3 font-body leading-relaxed text-[#0b3b44]/80">
          It already has {f.agency} on it. Paste one of your clients’ websites into the panel and call the receptionist. We emailed you the link too. Sarah reads every application herself; your price sheet and portal arrive within one business day.
        </p>
        <a href={demo} className="mt-6 inline-flex rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-7 py-3.5 font-sans text-xs font-extrabold uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#0b3b44]">
          Open my demo
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-[#0b3b44] bg-white p-6 md:p-8 shadow-[6px_6px_0_0_#0b3b44]">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={label}>Agency name</span>
          <input className={input} required maxLength={80} value={f.agency} onChange={(e) => setF({ ...f, agency: e.target.value })} />
        </label>
        <label>
          <span className={label}>Your name</span>
          <input className={input} required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label>
          <span className={label}>Email</span>
          <input className={input} required type="email" maxLength={120} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </label>
        <label>
          <span className={label}>Phone (optional)</span>
          <input className={input} type="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </label>
        <label>
          <span className={label}>Agency website</span>
          <input className={input} maxLength={200} placeholder="youragency.com" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
        </label>
        <label>
          <span className={label}>Active clients</span>
          <select className={input} value={f.clients} onChange={(e) => setF({ ...f, clients: e.target.value })}>
            <option value="">Choose one</option>
            {COUNTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>Brand color</span>
          <div className="flex items-center gap-3">
            <input type="color" aria-label="Brand color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="h-12 w-14 cursor-pointer rounded-lg border-2 border-[#0b3b44]" />
            <span className="font-mono text-sm text-[#0b3b44]/70">{f.color}</span>
          </div>
        </label>
        <label className="sm:col-span-2">
          <span className={label}>What do you sell clients today?</span>
          <textarea className={`${input} min-h-[96px]`} maxLength={600} placeholder="Websites and hosting, local SEO, Google Ads for trades..." value={f.sells} onChange={(e) => setF({ ...f, sells: e.target.value })} />
        </label>
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.company_url} onChange={(e) => setF({ ...f, company_url: e.target.value })} />
      </div>
      {error && <p className="mt-4 font-body text-sm text-[#b42318]">{error}</p>}
      <button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-7 py-4 font-sans text-xs font-extrabold uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#0b3b44] disabled:opacity-60">
        {busy ? 'Sending' : 'Apply and get my demo'}
      </button>
      <p className="mt-3 text-center font-body text-xs text-[#0b3b44]/60">No license fee, no minimum. Your demo arrives by email the moment you apply.</p>
    </form>
  );
}
