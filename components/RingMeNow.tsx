'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { metaDedup, trackEvent, trackLead } from '@/lib/analytics';
import { DEMO_LINE } from '@/data/trade-pages';

/**
 * THE RING BOX. One field, one promise, and the phone rings.
 *
 * Sarah 2026-08-13: *"add a mechanism to the hero area where they drop their
 * phone number and Mr. Mustard calls them back right away and starts asking
 * them about their business and if he can make them their very own voice
 * agent. Something simple but loud."*
 *
 * 2026-08-19: on the homepage it moved out of the hero and into its own band
 * one screen down (JourneyRing, "The Turnout"). The hero had gotten crowded.
 * Nothing about the card changed except that it always shows in full now.
 *
 * Simple is the whole design. It asks for ONE thing, because a phone number is
 * the only thing a stranger hands over in a single gesture, and because the
 * product IS a phone call: the fastest way to sell a voice agent is to be one.
 * The name, the email, and the business all get collected by Mr. Mustard on the
 * call itself (capture_lead), so nothing is lost by not asking here.
 *
 * ⚠️ THE CONSENT LINE UNDER THE FIELD IS THE FEATURE, NOT THE PAPERWORK. This
 * dials a real handset. It is a requested callback, not a cold call, only
 * because the page said so in plain words before they typed. Do not remove it.
 * (Same rule as lib/instant-callback.ts.)
 */

type State = 'idle' | 'dialing' | 'ringing' | 'error';

/** "4062021451" -> "(406) 202-1451", live, as they type. */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const REASONS: Record<string, string> = {
  'bad-phone': 'That number is not quite right. Ten digits, US line.',
  'rate-limited': 'That number is already on its way. Give it a minute.',
  duplicate: 'He called you in the last half hour. Call him back instead.',
};

export default function RingMeNow({
  source = 'hero-ring',
  className = '',
}: {
  source?: string;
  className?: string;
}) {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(12);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // The countdown is the proof. It runs down while the phone is actually being
  // dialed, so the promise on the page and the handset agree.
  useEffect(() => {
    if (state !== 'ringing') return;
    timer.current = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [state]);

  const digits = phone.replace(/\D/g, '');
  const ready = digits.length === 10;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || state === 'dialing' || state === 'ringing') return;
    setError('');
    setState('dialing');
    trackEvent('ring_me_submit', { location: source });

    try {
      const dedup = metaDedup();
      const res = await fetch('/api/ring-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source, ...dedup }),
      });
      const data = (await res.json().catch(() => ({}))) as { ringing?: boolean; reason?: string };

      if (data.ringing) {
        setSeconds(12);
        setState('ringing');
        trackLead({ source, eventId: dedup.metaEventId });
        return;
      }
      setState('error');
      setError(REASONS[data.reason ?? ''] ?? `Could not place the call. Ring him yourself at ${DEMO_LINE.display}.`);
    } catch {
      setState('error');
      setError(`Could not place the call. Ring him yourself at ${DEMO_LINE.display}.`);
    }
  };

  return (
    <div
      className={`relative w-full max-w-xl rounded-2xl border-[3px] border-[#161616] bg-[#FBF6EA] p-5 text-left shadow-[7px_7px_0_0_#161616] sm:p-6 ${className}`}
    >
      {state === 'ringing' ? (
        <div aria-live="polite">
          <div className="flex items-center gap-3.5">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#161616] bg-[#F5B700]">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[#F5B700] opacity-50 motion-safe:animate-ping"
                style={{ animationDuration: '1.5s' }}
              />
              <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="relative h-9 w-auto" />
            </span>
            <div>
              <p className="font-display text-xl font-black leading-tight text-[#161616] sm:text-2xl">
                Answer your phone.
              </p>
              <p className="font-body text-sm leading-snug text-[#3a3733]">
                {seconds > 0 ? (
                  <>
                    Mr. Mustard is dialing {formatPhone(phone)} in about{' '}
                    <span className="font-mono font-bold text-[#161616]">{seconds}s</span>.
                  </>
                ) : (
                  <>He is calling {formatPhone(phone)} right now. It shows up as {DEMO_LINE.display}.</>
                )}
              </p>
            </div>
          </div>
          <p className="mt-4 border-t-2 border-dashed border-[#161616]/20 pt-3 font-body text-[12px] leading-relaxed text-[#5c554a]">
            He will ask what your business is and tell you exactly what your own voice agent would
            answer. If you miss it, call him back at{' '}
            <a href={`tel:${DEMO_LINE.tel}`} className="font-bold text-[#C2261A] underline underline-offset-2">
              {DEMO_LINE.display}
            </a>
            .
          </p>
        </div>
      ) : (
        <>
          <span className="inline-block border-2 border-[#161616] bg-[#F5B700] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616] shadow-[3px_3px_0_0_#161616]">
            Your phone, ten seconds
          </span>

          <p className="mt-3.5 font-display text-[26px] font-black leading-[1.05] tracking-tight text-[#161616] sm:text-[32px]">
            Hear your own voice agent.
          </p>
          <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-[#3a3733] sm:text-base">
            Drop your number and Mr. Mustard calls you right now. He asks what your business is,
            then tells you exactly what your own agent would answer.
          </p>

          <form onSubmit={submit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Your phone number</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  if (state === 'error') setState('idle');
                }}
                placeholder="(406) 555-0134"
                aria-invalid={state === 'error'}
                className="h-[52px] w-full rounded-xl border-2 border-[#161616] bg-white px-4 font-mono text-lg font-bold tracking-wide text-[#161616] outline-none placeholder:text-[#161616]/25 focus:shadow-[0_0_0_3px_#F5B700]"
              />
            </label>
            <button
              type="submit"
              disabled={!ready || state === 'dialing'}
              className="h-[52px] shrink-0 rounded-xl border-2 border-[#161616] bg-[#F5B700] px-6 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_#161616]"
            >
              {state === 'dialing' ? 'Dialing…' : 'Call Me Now'}
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-2.5 font-body text-[13px] font-bold text-[#C2261A]">
              {error}
            </p>
          )}

          {/* ⚠️ Consent. See the header comment. This sentence is why the call is
              welcome. It does not get trimmed. */}
          <p className="mt-3 font-body text-[12px] leading-relaxed text-[#5c554a]">
            One call, placed by our AI to the number you just typed, because you asked for it. No
            list, no spam, and he will not ring you twice. Rather dial him?{' '}
            <a href={`tel:${DEMO_LINE.tel}`} className="font-bold text-[#C2261A] underline underline-offset-2">
              {DEMO_LINE.display}
            </a>
          </p>
        </>
      )}
    </div>
  );
}
