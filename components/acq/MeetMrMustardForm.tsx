'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * THE PERMISSION FORM.
 *
 * Three fields and a checkbox, because the thing being asked for is a phone
 * call, not a relationship. The checkbox is NEVER pre-checked and the button
 * refuses to submit without it: the consent is the reason this is a requested
 * callback instead of a cold call, and the server refuses an unchecked
 * submission too, so the UI is a courtesy rather than the enforcement.
 *
 * After a successful submit the page becomes the product: "MR. MUSTARD IS
 * CALLING YOU", with a live ring animation. The surprise is the demo.
 */

type Props = {
  leadId: string | null;
  variant: string | null;
  consentVersion: string;
  consentText: string;
  prefill: { firstName: string; businessName: string; website: string; phone: string };
};

type State = 'idle' | 'sending' | 'ringing' | 'queued' | 'error';

export default function MeetMrMustardForm({ leadId, variant, consentVersion, consentText, prefill }: Props) {
  const [firstName, setFirstName] = useState(prefill.firstName);
  const [businessName, setBusinessName] = useState(prefill.businessName);
  const [website, setWebsite] = useState(prefill.website);
  const [phone, setPhone] = useState(prefill.phone);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === 'ringing' || state === 'queued') liveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [state]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setError('');
    if (!consent) {
      setError('Check the box below so Mr. Mustard is allowed to call you.');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/acq/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          variant,
          firstName,
          businessName,
          website,
          phone,
          consent: true,
          typedName: firstName,
          consentVersion,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; queued?: boolean; message?: string };
      if (!json.ok) {
        setError(json.error || 'Something went wrong. Try again.');
        setState('error');
        return;
      }
      setMessage(json.message ?? '');
      setState(json.queued ? 'queued' : 'ringing');
    } catch {
      setError('Something went wrong on our end. Try again, or call him yourself at (406) 312-1223.');
      setState('error');
    }
  };

  if (state === 'ringing' || state === 'queued') {
    return (
      <div
        ref={liveRef}
        className="rounded-2xl border-[3px] border-[#161616] bg-[#F5B700] shadow-[8px_8px_0_0_#161616] p-8 md:p-10 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-center gap-1.5 mb-5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-2 rounded-full bg-[#161616] animate-eq"
              style={{ height: 34, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
        <h2 className="font-oswald text-3xl md:text-4xl font-bold uppercase tracking-tight text-[#161616]">
          {state === 'ringing' ? 'Mr. Mustard is calling you' : 'You are next in line'}
        </h2>
        <p className="mt-3 text-[#161616]/80 text-lg leading-relaxed">
          {state === 'ringing'
            ? 'Your phone should ring in a few seconds. Pick up and try to break him.'
            : message || 'He will ring you shortly.'}
        </p>
        <p className="mt-5 text-sm text-[#161616]/70">
          Nothing rang? He is on <a className="underline font-semibold" href="tel:+14063121223">(406) 312-1223</a> and he
          answers his own phone.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border-[3px] border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] p-6 md:p-8"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name" value={firstName} onChange={setFirstName} autoComplete="given-name" placeholder="Dana" />
        <Field
          label="Business name"
          value={businessName}
          onChange={setBusinessName}
          required
          autoComplete="organization"
          placeholder="ABC Heating & Air"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Field
          label="Phone number"
          value={phone}
          onChange={setPhone}
          required
          type="tel"
          autoComplete="tel"
          placeholder="(602) 555-0134"
          hint="The phone he should ring."
        />
        <Field
          label="Website"
          value={website}
          onChange={setWebsite}
          type="url"
          autoComplete="url"
          placeholder="abcheating.com"
          hint="Optional. It helps him sound like he knows you."
        />
      </div>

      <label className="mt-6 flex gap-3 items-start cursor-pointer group">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[#F5B700] border-2 border-[#161616] rounded"
          aria-describedby="consent-text"
        />
        <span id="consent-text" className="text-[13px] leading-relaxed text-[#161616]/75">
          {consentText}
        </span>
      </label>

      {error && (
        <p className="mt-4 text-sm font-semibold text-[#E0301E]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-6 w-full rounded-xl border-[3px] border-[#161616] bg-[#F5B700] px-6 py-4 font-oswald text-lg md:text-xl font-bold uppercase tracking-wide text-[#161616] shadow-[5px_5px_0_0_#161616] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616] disabled:opacity-60 disabled:translate-x-0 disabled:shadow-[5px_5px_0_0_#161616]"
      >
        {state === 'sending' ? 'Getting him on the line...' : 'Have Mr. Mustard call me'}
      </button>

      <p className="mt-3 text-center text-xs text-[#161616]/55">
        He rings in about ten seconds. Three minutes, no card, no obligation.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `f-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-[#161616]/60">
        {label}
        {rest.required && <span className="text-[#E0301E]"> *</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
        className="mt-1.5 w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-3 text-[15px] text-[#161616] outline-none transition-shadow focus:shadow-[0_0_0_3px_#F5B700]"
      />
      {hint && <p className="mt-1 text-[11px] text-[#161616]/50">{hint}</p>}
    </div>
  );
}
