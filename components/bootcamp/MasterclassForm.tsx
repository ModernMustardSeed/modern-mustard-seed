'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tradeRooms } from '@/data/bootcamp';
import { ErrorNote, Field, SUPPORT_EMAIL, inputCls, isEmail } from './ui';

/**
 * The free seat. Name and email are the only hard requirements; the rest
 * shapes which room a person lands in on Day 2 and what Sarah reads before
 * the masterclass. `via` arrives from the page (the ?via= param or the host
 * cookie) and rides along so a host gets credit for the seat. A new free
 * seat walks straight into its own room; an address that already holds a
 * ticket lands on the confirmation page, because its room link is in its
 * receipt and this public form does not hand it out.
 */

type Form = { name: string; email: string; business: string; website: string; trade: string; why: string };
type Errors = Partial<Record<keyof Form, string>>;

const EMPTY: Form = { name: '', email: '', business: '', website: '', trade: '', why: '' };

export default function MasterclassForm({ via }: { via: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function validate(): Errors {
    const er: Errors = {};
    if (form.name.trim().length < 2) er.name = 'Your name, so the room knows who you are.';
    if (!isEmail(form.email)) er.email = 'A working email. The link to the room goes here.';
    if (form.website.trim() && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(form.website.trim())) er.website = 'That does not look like a web address. yourbusiness.com is enough.';
    return er;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return;
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) {
      const first = Object.keys(er)[0];
      document.getElementById(`mc-${first}`)?.focus();
      return;
    }
    setStatus('sending');
    setServerError('');
    try {
      const res = await fetch('/api/bootcamp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          business: form.business.trim() || undefined,
          website: form.website.trim() || undefined,
          trade: form.trade || undefined,
          why: form.why.trim() || undefined,
          via: via || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; room?: string | null };
      if (!res.ok || !data.ok) {
        setServerError(data.error || 'That did not go through.');
        setStatus('error');
        return;
      }
      if (data.room) {
        // Same origin as this page, so a preview deployment stays on the preview.
        const u = new URL(data.room);
        router.push(`${u.pathname}${u.search}&new=1`);
        return;
      }
      router.push('/bootcamp/welcome?masterclass=1');
    } catch {
      setServerError('We could not reach the server.');
      setStatus('error');
    }
  }

  const sending = status === 'sending';

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-describedby="mc-form-note">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="mc-name" label="Name" error={errors.name}>
          <input id="mc-name" name="name" type="text" autoComplete="name" required value={form.name} onChange={set('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'mc-name-error' : undefined} className={inputCls} placeholder="Your name" />
        </Field>
        <Field id="mc-email" label="Email" error={errors.email}>
          <input id="mc-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'mc-email-error' : undefined} className={inputCls} placeholder="you@company.com" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="mc-business" label="Business" optional>
          <input id="mc-business" name="organization" type="text" autoComplete="organization" value={form.business} onChange={set('business')} className={inputCls} placeholder="What it is called" />
        </Field>
        <Field id="mc-website" label="Website" optional error={errors.website}>
          <input id="mc-website" name="url" type="text" inputMode="url" autoComplete="url" value={form.website} onChange={set('website')} aria-invalid={!!errors.website} aria-describedby={errors.website ? 'mc-website-error' : undefined} className={inputCls} placeholder="yourbusiness.com" />
        </Field>
      </div>
      <Field id="mc-trade" label="Your trade" optional hint="Picks your room on Day 2.">
        <select id="mc-trade" name="trade" value={form.trade} onChange={set('trade')} className={inputCls}>
          <option value="">Choose the closest</option>
          {tradeRooms.map((r) => (
            <option key={r.slug} value={r.slug}>{r.name}: {r.who}</option>
          ))}
          <option value="other">Other</option>
        </select>
      </Field>
      <Field id="mc-why" label="What would you build first?" optional hint="One line is plenty. Sarah reads these before the masterclass.">
        <textarea id="mc-why" name="why" rows={3} value={form.why} onChange={set('why')} className={`${inputCls} resize-y leading-relaxed`} placeholder="The job you would hand to an agent tomorrow if you could." />
      </Field>
      <input type="hidden" name="via" value={via} />
      <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="company_url" aria-hidden="true" className="hidden" />

      {status === 'error' && (
        <ErrorNote>
          {serverError} Give it one more try, or email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold underline underline-offset-2">{SUPPORT_EMAIL}</a> with your name and we will seat you by hand.
        </ErrorNote>
      )}

      <button
        type="submit"
        disabled={sending}
        aria-busy={sending}
        className="w-full rounded-full border-2 border-[#141210] bg-[#141210] px-8 py-4 font-sans text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#fcfaf3] shadow-[4px_4px_0_0_#f5b700] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? 'Saving your seat…' : 'Save my free seat'}
      </button>
      <p id="mc-form-note" className="text-center font-body text-[12px] leading-relaxed text-[#5c554a]">
        Free. No card. A calendar invite and the room link land in your inbox right away, with one reminder the day before and one an hour out.
      </p>
    </form>
  );
}
