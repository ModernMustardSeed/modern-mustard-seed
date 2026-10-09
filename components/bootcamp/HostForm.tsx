'use client';

import { useState } from 'react';
import { tradeRooms } from '@/data/bootcamp';
import { ErrorNote, Field, SUPPORT_EMAIL, inputCls, isEmail } from './ui';

/** The host application. POSTs /api/bootcamp/host; Sarah reads every one. */

const AUDIENCE = [
  { value: 'under-1k', label: 'Under 1,000' },
  { value: '1k-10k', label: '1,000 to 10,000' },
  { value: '10k-50k', label: '10,000 to 50,000' },
  { value: '50k-250k', label: '50,000 to 250,000' },
  { value: '250k-plus', label: '250,000 or more' },
];

type Form = { name: string; brand: string; email: string; website: string; platforms: string; audience: string; vertical: string; room: string };
type Errors = Partial<Record<keyof Form, string>>;
const EMPTY: Form = { name: '', brand: '', email: '', website: '', platforms: '', audience: '', vertical: '', room: '' };

export default function HostForm() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'done'>('idle');
  const [serverError, setServerError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function validate(): Errors {
    const er: Errors = {};
    if (form.name.trim().length < 2) er.name = 'Your name.';
    if (!isEmail(form.email)) er.email = 'A working email. Your link and dashboard go here.';
    if (!form.audience) er.audience = 'Pick the closest range. We do not check it against anything; it sets the room size.';
    if (!form.vertical) er.vertical = 'Who your audience is, so we know which room fits.';
    if (form.room.trim().length < 10) er.room = 'A sentence or two about the room you want to run.';
    return er;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return;
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) {
      document.getElementById(`host-${Object.keys(er)[0]}`)?.focus();
      return;
    }
    setStatus('sending');
    setServerError('');
    try {
      const res = await fetch('/api/bootcamp/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          brand: form.brand.trim() || undefined,
          email: form.email.trim().toLowerCase(),
          website: form.website.trim() || undefined,
          platforms: form.platforms.trim() || undefined,
          audience: AUDIENCE.find((a) => a.value === form.audience)?.label ?? form.audience,
          vertical: form.vertical,
          room: form.room.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setServerError(data.error || 'That did not go through.');
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setServerError('We could not reach the server.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-[4px] border-2 border-[#141210] bg-white p-8 md:p-12 text-center" role="status">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0f4c47]">Received</p>
        <h3 className="mt-4 font-display text-3xl font-extrabold leading-tight text-[#141210]">Applied. Sarah reads every application herself.</h3>
        <p className="mt-4 font-body text-[15px] leading-relaxed text-[#5c554a] max-w-md mx-auto">
          A note confirming it is on its way to {form.email.trim().toLowerCase()}. When you are approved, the next email carries your link, your dashboard and the swipe copy, ready the same day.
        </p>
      </div>
    );
  }

  const sending = status === 'sending';

  return (
    <form onSubmit={submit} noValidate className="rounded-[4px] border-2 border-[#141210] bg-white p-6 md:p-10 space-y-5">
      <div className="border-b-2 border-[#141210] pb-5">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.26em] text-[#0f4c47]">Host application</p>
        <p className="mt-2 font-display text-2xl font-extrabold leading-none text-[#141210]">Host a Room</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="host-name" label="Name" error={errors.name}>
          <input id="host-name" name="name" type="text" autoComplete="name" required value={form.name} onChange={set('name')} aria-invalid={!!errors.name} className={inputCls} placeholder="Your name" />
        </Field>
        <Field id="host-brand" label="Brand or show" optional>
          <input id="host-brand" name="organization" type="text" autoComplete="organization" value={form.brand} onChange={set('brand')} className={inputCls} placeholder="The name your audience knows" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="host-email" label="Email" error={errors.email}>
          <input id="host-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} aria-invalid={!!errors.email} className={inputCls} placeholder="you@yourbrand.com" />
        </Field>
        <Field id="host-website" label="Website" optional>
          <input id="host-website" name="url" type="text" inputMode="url" autoComplete="url" value={form.website} onChange={set('website')} className={inputCls} placeholder="yourbrand.com" />
        </Field>
      </div>
      <Field id="host-platforms" label="Where your audience is" optional hint="Newsletter, YouTube, podcast, LinkedIn, a community, a membership. Handles welcome.">
        <input id="host-platforms" name="platforms" type="text" value={form.platforms} onChange={set('platforms')} className={inputCls} placeholder="Newsletter of 12,000 and a weekly podcast" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="host-audience" label="Audience size" error={errors.audience}>
          <select id="host-audience" name="audience" required value={form.audience} onChange={set('audience')} aria-invalid={!!errors.audience} className={inputCls}>
            <option value="">Choose a range</option>
            {AUDIENCE.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Field>
        <Field id="host-vertical" label="Who they are" error={errors.vertical}>
          <select id="host-vertical" name="vertical" required value={form.vertical} onChange={set('vertical')} aria-invalid={!!errors.vertical} className={inputCls}>
            <option value="">Choose the closest</option>
            {tradeRooms.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            <option value="ai-business">AI and business</option>
          </select>
        </Field>
      </div>
      <Field id="host-room" label="The room you want to host" error={errors.room} hint="Who would be in it, what they run, and what you would want built on screen for them.">
        <textarea id="host-room" name="room" rows={4} required value={form.room} onChange={set('room')} aria-invalid={!!errors.room} className={`${inputCls} resize-y leading-relaxed`} placeholder="Two hundred remodelers who follow me for pricing advice. I want the pre-construction pipeline built live for one of them." />
      </Field>
      <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="company_url" aria-hidden="true" className="hidden" />

      {status === 'error' && (
        <ErrorNote>
          {serverError} Try once more, or email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold underline underline-offset-2">{SUPPORT_EMAIL}</a> with the same details and we will file it for you.
        </ErrorNote>
      )}

      <button
        type="submit"
        disabled={sending}
        aria-busy={sending}
        className="w-full rounded-full border-2 border-[#141210] bg-[#f5b700] px-8 py-4 font-sans text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#141210] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Apply to host'}
      </button>
      <p className="text-center font-body text-[12px] leading-relaxed text-[#5c554a]">Sarah reads every application herself and answers inside two business days.</p>
    </form>
  );
}
