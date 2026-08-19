'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The doorway's one interaction.
 *
 * A phone number, a checkbox, a button, and then his voice. No navigation, no
 * second CTA, no product tour.
 *
 * Built phone-first, because most people arrive from a Facebook or LinkedIn app
 * on a handset: `inputMode="tel"` for the right keyboard, tap targets over
 * 56px, and the three states are the same card so nothing reflows underneath a
 * thumb mid-tap.
 *
 * House grammar: pop-card, ink borders, hard sticker shadows, Playfair for the
 * display lines, JetBrains Mono for labels, ring waves on the calling state
 * (the same `.ring-wave` the /voice-agents number uses).
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
  /** Only set when a magic link told us who this is. */
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
      setError('The call did not go out. Try again, or ring him direct at (406) 312-1223.');
      setPhase('error');
    }
  };

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
      <div className="pop-card-yellow relative overflow-hidden p-7 sm:p-9 text-center" role="status" aria-live="polite">
        <div className="relative mx-auto mb-7 h-28 w-28" aria-hidden="true">
          <span className="ring-wave h-24 w-24 -translate-x-1/2 -translate-y-1/2" style={{ borderColor: 'rgba(22,22,22,.55)' }} />
          <span className="ring-wave h-24 w-24 -translate-x-1/2 -translate-y-1/2" style={{ borderColor: 'rgba(22,22,22,.4)', animationDelay: '1.4s' }} />
          <span className="ring-wave h-24 w-24 -translate-x-1/2 -translate-y-1/2" style={{ borderColor: 'rgba(22,22,22,.28)', animationDelay: '2.8s' }} />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#161616] bg-[#FBF6EA] text-3xl">
            📞
          </span>
        </div>

        <h2 className="font-display text-[2rem] sm:text-4xl font-extrabold leading-tight tracking-tight text-[#161616]">
          {phase === 'queued' ? (
            <>
              You are <span className="italic">next</span> in line
            </>
          ) : phase === 'connected' ? (
            <>
              You are talking to him <span className="italic">now</span>
            </>
          ) : (
            <>
              Mr. Mustard is <span className="italic">calling you</span>
            </>
          )}
        </h2>

        <p className="mt-3 text-lg leading-relaxed text-[#161616]/80">
          {phase === 'queued' ? message || 'He will ring you shortly.' : 'He is grabbing his headset. Keep your phone nearby.'}
        </p>

        <p className="mt-5 inline-block rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-4 py-2 font-mono text-xl font-bold tracking-wide">
          {phone}
        </p>

        <p className="mt-7 text-sm leading-relaxed text-[#161616]/70">
          Do not let him present. Give him the call your team actually gets, and try to break him.
        </p>
        <p className="mt-3 text-sm text-[#161616]/60">
          Nothing rang? His line is{' '}
          <a className="font-bold underline underline-offset-4" href="tel:+14063121223">
            (406) 312-1223
          </a>
          .
        </p>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="pop-card p-7 sm:p-9 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#C4160B]">That was him</p>
        <h2 className="mt-3 font-display text-[2rem] sm:text-4xl font-extrabold leading-tight tracking-tight">
          Want one that answers for <span className="italic">{business || 'your business'}</span>?
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-[#161616]/75">
          On your real number, around the clock, in your words.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          {demoUrl && (
            <a href={demoUrl} className={bigButton}>
              Open the one he built you
            </a>
          )}
          <a href="/voice-agents" className={bigButtonQuiet}>
            Build my receptionist
          </a>
          <a href="/book" className="text-center text-sm font-semibold underline underline-offset-4 text-[#161616]/70">
            Or talk it through with Sarah
          </a>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="pop-card p-7 sm:p-9 text-center" style={{ borderColor: '#E0301E', boxShadow: '5px 5px 0 0 #E0301E' }}>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">Snag</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight">
          Mr. Mustard hit a <span className="italic">snag</span>.
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-[#161616]/75">{error}</p>
        <button onClick={retry} className={`${bigButton} mt-6 w-full`}>
          Try again
        </button>
        <p className="mt-4 text-sm text-[#161616]/60">
          Or call him yourself at{' '}
          <a className="font-bold underline underline-offset-4" href="tel:+14063121223">
            (406) 312-1223
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="pop-card p-6 sm:p-8">
      {props.knownAs && (
        <p className="mb-5 rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-2 text-sm font-semibold">
          Welcome back, {props.knownAs}. Just confirm the number.
        </p>
      )}

      <label htmlFor="mustard-phone" className="block font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
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
        className="mt-2 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-4 py-4 font-mono text-2xl font-bold tracking-wide text-[#161616] outline-none transition-shadow placeholder:text-[#161616]/25 focus:shadow-[0_0_0_4px_#F5B700]"
        aria-describedby="mustard-consent"
      />

      {showBusiness ? (
        <div className="mt-4">
          <label htmlFor="mustard-business" className="block font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#161616]/45">
            Business name, so he can answer as you
          </label>
          <input
            id="mustard-business"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="ABC Heating &amp; Air"
            autoComplete="organization"
            className="mt-2 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#161616]/25 focus:shadow-[0_0_0_4px_#F5B700]"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowBusiness(true)}
          className="mt-3 block text-left text-[13.5px] font-semibold underline underline-offset-4 text-[#161616]/55 hover:text-[#161616]"
        >
          Add your business name, and he answers as you
        </button>
      )}

      {/*
        THE PERMISSION SLIP.

        The consent sentence is legally load-bearing: TCPA consent for an AI
        voice placing a marketing call. The words come from lib/acq/consent.ts
        verbatim, versioned, never pre-checked, refused server-side without the
        box. None of that changes here and none of it ever should.

        What changed is the packaging. The old block was gray text in a faint
        gray border, which is the visual grammar of a warning label, and Sarah
        watched it scare people. So the same sentence now arrives as a
        permission slip: a friendly headline that says what the box means in
        nine words, a solid ink border and sticker shadow like every other
        object on the page, and the legalese underneath at the same 12.5px it
        always was. Fine print reads as a trap when it is styled like one.
      */}
      <div className="mt-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">
          The permission slip
        </p>
        <p className="mt-1.5 text-[14px] font-semibold text-[#161616]">
          He is polite. He only calls people who invite him.
        </p>
        <label className="mt-2.5 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] p-3.5 shadow-[3px_3px_0_0_#161616] transition-colors hover:bg-white">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 rounded border-2 border-[#161616] accent-[#F5B700]"
            aria-describedby="mustard-consent"
          />
          <span id="mustard-consent" className="text-[12.5px] leading-[1.65] text-[#161616]/60">
            {props.consentText}
          </span>
        </label>
      </div>

      {error && (
        <p className="mt-4 text-sm font-bold text-[#E0301E]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={phase === 'sending'} className={`${bigButton} mt-5 w-full`}>
        {phase === 'sending' ? 'Getting him on the line...' : props.ctaLabel}
      </button>

      <p className="mt-3.5 text-center text-[13px] text-[#161616]/55">
        He rings in about ten seconds. Three minutes, no card, no obligation.
      </p>

      {/*
        THE OTHER DOOR, and on a phone it is the better one.

        Outbound is the metered direction: the studio's number can only PLACE a
        limited number of calls a day, and an email blast that lands hundreds of
        people on this page at once will exhaust that long before it exhausts
        the interest. Inbound has no such limit and never has. So the page
        offers both, and the person on a handset, which is most of them, gets a
        one-tap path that cannot be rationed and does not make them wait.

        It sits UNDER the form on purpose. Giving us the number is still the
        thing we want, because it captures a lead even when the call does not
        connect. This is the escape hatch, not the headline.
      */}
      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#161616]/15" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#161616]/40">or</span>
        <span className="h-px flex-1 bg-[#161616]/15" />
      </div>

      <a
        href="tel:+14063121223"
        className="mt-4 flex min-h-[60px] w-full items-center justify-center gap-3 rounded-xl border-2 border-[#161616] bg-white px-5 py-4 font-display text-lg font-extrabold tracking-tight text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616] active:translate-y-0 active:shadow-[3px_3px_0_0_#161616]"
      >
        <span aria-hidden="true" className="text-xl">
          📞
        </span>
        Call him yourself, right now
      </a>

      <p className="mt-2.5 text-center font-mono text-[13px] font-bold tracking-wide text-[#161616]/70">
        (406) 312-1223
      </p>
      <p className="mt-1 text-center text-[12.5px] text-[#161616]/55">He picks up on the first ring, any hour.</p>
    </form>
  );
}

const bigButton =
  'inline-flex min-h-[60px] items-center justify-center rounded-xl border-2 border-[#161616] bg-[#F5B700] px-6 py-4 font-display text-xl font-extrabold tracking-tight text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616] active:translate-y-0 active:shadow-[3px_3px_0_0_#161616] disabled:opacity-60 disabled:translate-y-0';
const bigButtonQuiet =
  'inline-flex min-h-[60px] items-center justify-center rounded-xl border-2 border-[#161616] bg-white px-6 py-4 font-display text-lg font-extrabold tracking-tight text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616] active:translate-y-0';
