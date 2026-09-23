'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type Vapi from '@vapi-ai/web';
import { metaDedup, trackEvent, trackLead } from '@/lib/analytics';
import { DEMO_LINE } from '@/data/trade-pages';

/**
 * The hero's speech bubble is a door. Tap "Let's build yours." and Mr. Mustard
 * offers two ways in: talk to him out loud right here (the same live Vapi call
 * MrMustardHeroCTA places), or drop a number and he rings you (the same
 * /api/ring-me callback RingMeNow uses).
 *
 * ⚠️ The consent sentence under the phone field is load-bearing: it is what
 * makes the call a requested callback. Same rule as RingMeNow and
 * lib/instant-callback.ts. Do not trim it.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

type Call = 'idle' | 'connecting' | 'live' | 'error';
type Ring = 'idle' | 'dialing' | 'ringing' | 'error';

const REASONS: Record<string, string> = {
  'bad-phone': 'Ten digits, US line.',
  'rate-limited': 'That number is already on its way.',
  duplicate: 'I called you in the last half hour. Call me back instead.',
};

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function HeroTalk({ bubbleClass, panelClass }: { bubbleClass: string; panelClass: string }) {
  const [open, setOpen] = useState(false);
  const [call, setCall] = useState<Call>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [callError, setCallError] = useState('');
  const [phone, setPhone] = useState('');
  const [ring, setRing] = useState<Ring>('idle');
  const [ringError, setRingError] = useState('');
  const vapiRef = useRef<Vapi | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);
  const canCall = Boolean(PUBLIC_KEY && ASSISTANT_ID);

  useEffect(() => () => { vapiRef.current?.stop(); }, []);

  // Closing the card hands focus back to the bubble that opened it.
  useEffect(() => {
    if (open) { wasOpen.current = true; return; }
    if (wasOpen.current) bubbleRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggle = () => {
    if (!open) trackEvent('hero_bubble_open', { location: 'home-hero' });
    setOpen((o) => !o);
  };

  const startCall = async () => {
    if (!canCall || call === 'connecting' || call === 'live') return;
    trackEvent('mustard_talk_live', { location: 'home-hero-bubble' });
    setCallError('');
    setCall('connecting');
    try {
      const { default: VapiClient } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
      await teardownVapi(vapiRef.current);
      vapiRef.current = null;
      const vapi = new VapiClient(PUBLIC_KEY as string);
      vapi.on('call-start', () => { setCall('live'); hardenMicPath(vapi); });
      vapi.on('call-end', () => { setCall('idle'); setSpeaking(false); });
      vapi.on('speech-start', () => setSpeaking(true));
      vapi.on('speech-end', () => setSpeaking(false));
      vapi.on('error', () => { setCall('error'); setCallError('Call dropped. Try again?'); });
      vapiRef.current = vapi;
      await vapi.start(ASSISTANT_ID as string);
    } catch (err) {
      setCall('error');
      setCallError(err instanceof Error && /denied|permission/i.test(err.message) ? 'Mic blocked. Allow it and try again.' : 'Could not start the call. Try again.');
    }
  };

  const endCall = () => { vapiRef.current?.stop(); setCall('idle'); };

  const digits = phone.replace(/\D/g, '');
  const ready = digits.length === 10;

  const ringMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || ring === 'dialing' || ring === 'ringing') return;
    setRingError('');
    setRing('dialing');
    trackEvent('ring_me_submit', { location: 'home-hero-bubble' });
    try {
      const dedup = metaDedup();
      const res = await fetch('/api/ring-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source: 'home-hero-bubble', ...dedup }),
      });
      const data = (await res.json().catch(() => ({}))) as { ringing?: boolean; reason?: string };
      if (data.ringing) {
        setRing('ringing');
        trackLead({ source: 'home-hero-bubble', eventId: dedup.metaEventId });
        return;
      }
      setRing('error');
      setRingError(REASONS[data.reason ?? ''] ?? `Could not place the call. Ring me at ${DEMO_LINE.display}.`);
    } catch {
      setRing('error');
      setRingError(`Could not place the call. Ring me at ${DEMO_LINE.display}.`);
    }
  };

  const live = call === 'live';

  return (
    <>
      <button ref={bubbleRef} type="button" className={bubbleClass} onClick={toggle} aria-expanded={open} aria-controls="hero-talk-panel">
        <span>Let’s build yours.</span>
        <small><i aria-hidden="true" />Tap to talk to me</small>
      </button>

      {open && (
        <div id="hero-talk-panel" ref={panelRef} role="dialog" aria-label="Talk to Mr. Mustard" className={panelClass}>
          <div data-head>
            <span data-face><Image src="/brand/mascot.png" alt="" width={885} height={1180} /></span>
            <div>
              <strong>Hi, I’m Mr. Mustard.</strong>
              <p>Ask me anything about what you want built. Out loud, right here, or I’ll call your phone.</p>
            </div>
            <button type="button" data-close onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          {canCall ? (
            live ? (
              <div data-live aria-live="polite">
                <span data-pulse aria-hidden="true" />
                <p>{speaking ? 'I’m talking…' : 'I’m listening. Go ahead.'}</p>
                <button type="button" data-end onClick={endCall}>End call</button>
              </div>
            ) : (
              <button type="button" data-talk onClick={startCall} disabled={call === 'connecting'}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M12 18v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                {call === 'connecting' ? 'Connecting…' : 'Talk to me right now'}
              </button>
            )
          ) : (
            <a data-talk href={`tel:${DEMO_LINE.tel}`}>Call me at {DEMO_LINE.display}</a>
          )}
          {callError && <p data-error role="alert">{callError}</p>}

          <div data-or><span>or I’ll call you</span></div>

          {ring === 'ringing' ? (
            <p data-ringing aria-live="polite">Answer your phone. I’m dialing {formatPhone(phone)} now, and I’ll show up as {DEMO_LINE.display}.</p>
          ) : (
            <form onSubmit={ringMe}>
              <label>
                <span className="sr-only">Your phone number</span>
                <input type="tel" inputMode="tel" autoComplete="tel" required value={phone} placeholder="(406) 555-0134"
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); if (ring === 'error') setRing('idle'); }} />
              </label>
              <button type="submit" disabled={!ready || ring === 'dialing'}>{ring === 'dialing' ? 'Dialing…' : 'Call me'}</button>
            </form>
          )}
          {ringError && <p data-error role="alert">{ringError}</p>}
          {/* ⚠️ Consent. See the header comment. */}
          <p data-consent>One call, placed by Mr. Mustard to the number you typed, because you asked for it. No list, no spam, and I will not ring you twice.</p>
        </div>
      )}
    </>
  );
}
