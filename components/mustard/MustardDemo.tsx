'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * /mustard, the doorway.
 *
 * One objective and exactly one: get this person to experience Mr. Mustard. No
 * navigation, no second CTA, no product tour. A phone number, a checkbox, a
 * button, and then his voice.
 *
 * Built phone-first because most people arrive from a Facebook or LinkedIn app
 * on a handset: `inputMode="tel"` for the right keyboard, tap targets over
 * 48px, no layout shift between the three states, and the whole thing fits
 * above the fold on a small screen.
 */

type Props = {
  surface: string;
  headline: string;
  ctaLabel: string;
  sellerName: string;
  consentVersion: string;
  consentText: string;
  source: string;
  token: string | null;
  landingUrl: string;
  prefill: { phone: string; businessName: string; contactName: string };
  /** Only shown when a magic link told us who this is. */
  knownAs: string | null;
};

type Phase = 'form' | 'sending' | 'calling' | 'queued' | 'connected' | 'done' | 'error';

/** US formatting as they type. Never rewrites what they cannot see. */
function formatUsPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (ten.length <= 3) return ten;
  if (ten.length <= 6) return `(${ten.slice(0, 3)}) ${ten.slice(3)}`;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6, 10)}`;
}

const isDialable = (raw: string): boolean => {
  const d = raw.replace(/\D/g, '');
  return d.length === 10 || (d.length === 11 && d.startsWith('1'));
};

export default function MustardDemo(props: Props) {
  const [phone, setPhone] = useState(formatUsPhone(props.prefill.phone));
  const [business, setBusiness] = useState(props.prefill.businessName);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState('');
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [showBusiness, setShowBusiness] = useState(Boolean(props.prefill.businessName));

  // One key per attempt. A double-tapped button reuses it, so the server
  // returns the same call instead of placing a second one.
  const idempotencyKey = useRef<string>('');
  if (!idempotencyKey.current && typeof crypto !== 'undefined') idempotencyKey.current = crypto.randomUUID();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === 'sending' || phase === 'calling') return;
    setError('');
    if (!isDialable(phone)) {
      setError('Enter a ten digit US phone number.');
      return;
    }
    if (!consent) {
      setError('Check the box so Mr. Mustard is allowed to call you.');
      return;
    }
    setPhase('sending');
    try {
      const res = await fetch('/api/mustard/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surface: props.surface,
          phone,
          businessName: business || null,
          consent: true,
          consentVersion: props.consentVersion,
          token: props.token,
          landingUrl: props.landingUrl,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; status?: string; requestId?: string; message?: string };
      if (!json.ok) {
        setError(json.error || 'Mr. Mustard hit a snag.');
        setPhase('error');
        return;
      }
      setRequestId(json.requestId ?? '');
      setMessage(json.message ?? '');
      setPhase(json.status === 'queued' ? 'queued' : 'calling');
    } catch {
      setError('Something went wrong on our end.');
      setPhase('error');
    }
  };

  /* ── while he is on the line ── */

  const poll = useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await fetch(`/api/mustard/status?id=${requestId}`);
      const json = (await res.json()) as { ok: boolean; status?: string; demoUrl?: string | null };
      if (!json.ok) return;
      if (json.demoUrl) setDemoUrl(json.demoUrl);
      if (json.status === 'connected') setPhase('connected');
      if (json.status === 'completed') setPhase('done');
    } catch {
      /* a dropped poll is not worth telling anybody about */
    }
  }, [requestId]);

  useEffect(() => {
    if (!['calling', 'queued', 'connected'].includes(phase) || !requestId) return;
    const t = window.setInterval(() => void poll(), 6000);
    return () => window.clearInterval(t);
  }, [phase, requestId, poll]);

  const retry = () => {
    idempotencyKey.current = crypto.randomUUID();
    setPhase('form');
    setError('');
  };

  /* ────────────────────────────── the states ─────────────────────────────── */

  if (phase === 'calling' || phase === 'queued' || phase === 'connected') {
    return (
      <Panel>
        <Ringer />
        <h2 className="mt-6 font-oswald text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#161616]">
          {phase === 'queued' ? 'You are next in line' : phase === 'connected' ? 'You are talking to him now' : 'Mr. Mustard is calling you'}
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-[#161616]/75">
          {phase === 'queued' ? message || 'He will ring you shortly.' : 'He is grabbing his headset. Keep your phone nearby.'}
        </p>
        <p className="mt-5 font-mono text-xl font-bold text-[#161616]">{phone}</p>
        <p className="mt-6 text-sm text-[#161616]/60">
          Do not let him present. Give him the call your team actually gets, and try to break him.
        </p>
        <p className="mt-4 text-sm text-[#161616]/55">
          Nothing rang? His own line is{' '}
          <a className="font-semibold underline" href="tel:+14063121223">
            (406) 312-1223
          </a>{' '}
          and he answers it himself.
        </p>
      </Panel>
    );
  }

  if (phase === 'done') {
    return (
      <Panel>
        <h2 className="font-oswald text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#161616]">
          That was him.
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-[#161616]/75">
          Want one that answers for {business || 'your business'}, on your real number, around the clock?
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {demoUrl && (
            <a href={demoUrl} className={bigButton}>
              Open the one he built you
            </a>
          )}
          <a href="/voice-agents" className={bigButtonQuiet}>
            Build my receptionist
          </a>
          <a href="/book" className="text-center text-sm font-semibold underline text-[#161616]/70">
            Or talk it through with Sarah
          </a>
        </div>
      </Panel>
    );
  }

  if (phase === 'error') {
    return (
      <Panel>
        <h2 className="font-oswald text-3xl font-bold uppercase tracking-tight text-[#E0301E]">Mr. Mustard hit a snag</h2>
        <p className="mt-3 text-lg leading-relaxed text-[#161616]/75">{error}</p>
        <button onClick={retry} className={`${bigButton} mt-6`}>
          Try again
        </button>
        <p className="mt-4 text-sm text-[#161616]/55">
          Or just call him yourself at{' '}
          <a className="font-semibold underline" href="tel:+14063121223">
            (406) 312-1223
          </a>
          .
        </p>
      </Panel>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border-[3px] border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] p-6 sm:p-8">
      {props.knownAs && (
        <p className="mb-4 text-sm font-semibold text-[#161616]/70">
          Welcome back{props.knownAs ? `, ${props.knownAs}` : ''}. Just confirm the number.
        </p>
      )}

      <label htmlFor="mustard-phone" className="block font-oswald text-sm font-bold uppercase tracking-[0.16em] text-[#161616]/65">
        The number he should ring
      </label>
      <input
        id="mustard-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint="go"
        placeholder="(602) 555-0134"
        value={phone}
        onChange={(e) => setPhone(formatUsPhone(e.target.value))}
        className="mt-2 w-full rounded-xl border-[3px] border-[#161616] bg-[#FBF6EA] px-4 py-4 text-2xl font-bold tracking-wide text-[#161616] outline-none transition-shadow focus:shadow-[0_0_0_4px_#F5B700]"
        aria-describedby="mustard-consent"
      />

      {showBusiness ? (
        <div className="mt-4">
          <label htmlFor="mustard-business" className="block font-oswald text-xs font-bold uppercase tracking-[0.16em] text-[#161616]/55">
            Business name (optional, it makes him better)
          </label>
          <input
            id="mustard-business"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="ABC Heating & Air"
            autoComplete="organization"
            className="mt-1.5 w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-3 text-base text-[#161616] outline-none focus:shadow-[0_0_0_3px_#F5B700]"
          />
        </div>
      ) : (
        <button type="button" onClick={() => setShowBusiness(true)} className="mt-3 text-sm font-semibold underline text-[#161616]/55">
          Tell him your business name, and he can answer as you
        </button>
      )}

      <label className="mt-5 flex gap-3 items-start cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-6 w-6 shrink-0 accent-[#F5B700] rounded border-2 border-[#161616]"
          aria-describedby="mustard-consent"
        />
        <span id="mustard-consent" className="text-[13px] leading-relaxed text-[#161616]/75">
          {props.consentText}
        </span>
      </label>

      {error && (
        <p className="mt-4 text-sm font-bold text-[#E0301E]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={phase === 'sending'} className={`${bigButton} mt-5 w-full`}>
        {phase === 'sending' ? 'Getting him on the line...' : props.ctaLabel}
      </button>

      <p className="mt-3 text-center text-xs text-[#161616]/55">
        He rings in about ten seconds. Three minutes, no card, no obligation.
      </p>
      <p className="mt-2 text-center text-[11px] text-[#161616]/40">
        <a href="/privacy" className="underline">
          Privacy
        </a>
        {' · '}
        <a href="/terms" className="underline">
          Terms
        </a>
      </p>
    </form>
  );
}

const bigButton =
  'inline-flex items-center justify-center rounded-xl border-[3px] border-[#161616] bg-[#F5B700] px-6 py-4 min-h-[56px] font-oswald text-xl font-bold uppercase tracking-wide text-[#161616] shadow-[5px_5px_0_0_#161616] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616] disabled:opacity-60 disabled:translate-x-0';
const bigButtonQuiet =
  'inline-flex items-center justify-center rounded-xl border-[3px] border-[#161616] bg-white px-6 py-4 min-h-[56px] font-oswald text-lg font-bold uppercase tracking-wide text-[#161616] shadow-[5px_5px_0_0_#161616] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616]';

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border-[3px] border-[#161616] bg-[#F5B700] shadow-[8px_8px_0_0_#161616] p-7 sm:p-9 text-center"
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

/** Five bars that behave like a ringing line. Purely decorative. */
function Ringer() {
  return (
    <div className="flex items-end justify-center gap-1.5 h-10" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="w-2.5 rounded-full bg-[#161616] animate-eq" style={{ height: 38, animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );
}
