'use client';

import { useEffect, useRef, useState } from 'react';
import type { ForgedCall } from '@/lib/sidekick';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
const VOICE = DEMO_PRODUCTS.voice;

type CallState = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

/**
 * The prospect-facing side of a cockpit-forged demo: one big button that
 * starts a live web call with the receptionist already branded as their
 * business. Same Vapi web pattern as the public Sidekick page.
 */
export default function DemoCallExperience({
  business,
  city,
  call,
  forgeError,
  orderUrl,
}: {
  business: string;
  city: string | null;
  call: ForgedCall | null;
  forgeError: string | null;
  /** The lead's own hub order card. Present for every forged lead; null only for
   *  legacy runs forged before the hub existed. */
  orderUrl?: string | null;
}) {
  const [state, setState] = useState<CallState>('idle');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    if (state !== 'live') return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  useEffect(() => {
    return () => {
      try {
        vapiRef.current?.stop();
      } catch {
        /* leaving the page ends the call */
      }
    };
  }, []);

  const start = async () => {
    if (!call || !PUBLIC_KEY || !ASSISTANT_ID) return;
    setState('connecting');
    setError('');
    try {
      if (!vapiRef.current) {
        const { default: Vapi } = await import('@vapi-ai/web');
        const vapi = new Vapi(PUBLIC_KEY);
        vapi.on('call-start', () => setState('live'));
        vapi.on('call-end', () => setState('ended'));
        vapi.on('error', () => {
          setState('error');
          setError('The line dropped. Tap to try again.');
        });
        vapiRef.current = vapi;
      }
      await vapiRef.current.start(ASSISTANT_ID, {
        firstMessage: call.firstMessage,
        model: call.model,
        maxDurationSeconds: call.maxDurationSeconds,
        metadata: call.metadata,
      } as never);
    } catch (err) {
      setState('error');
      setError(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'Your mic is blocked. Allow microphone access and tap again.'
          : 'Could not start the call. Try again in a moment.',
      );
    }
  };

  const stop = () => {
    try {
      vapiRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setState('ended');
  };

  const ready = Boolean(call && PUBLIC_KEY && ASSISTANT_ID);
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <div className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold">Modern Mustard Seed presents</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#161616] mt-2 leading-tight">
            Meet {business}&apos;s AI receptionist
          </h1>
          <p className="font-body text-[#161616]/70 mt-3 max-w-lg mx-auto">
            We built it to answer as {business}{city ? ` in ${city}` : ''}: every call picked up in two rings, day or night, jobs booked while you work. Talk to it right now.
          </p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {ready && state === 'idle' && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              ['1', 'Tap the button', 'It answers out loud, right in your browser.'],
              ['2', 'Play the customer', 'Ask for a quote, hours, or to book something.'],
              ['3', 'Watch it work', 'It takes the details like your best front desk hire.'],
            ].map(([n, t, d]) => (
              <div key={n} className="bg-white border-2 border-[#161616] rounded-xl p-3.5 text-center">
                <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-[#F5B700] border-2 border-[#161616] font-sans font-bold text-sm text-[#161616]">{n}</span>
                <p className="font-sans font-bold uppercase tracking-[0.08em] text-[11px] text-[#161616] mt-2">{t}</p>
                <p className="font-body text-[11px] text-[#161616]/60 mt-1 leading-snug hidden sm:block">{d}</p>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8 text-center">
          {!ready && (
            <p className="font-body text-[#E0301E] font-semibold">{forgeError ?? 'The demo line is warming up. Refresh in a minute.'}</p>
          )}

          {ready && state !== 'live' && (
            <>
              <button
                onClick={() => void start()}
                disabled={state === 'connecting'}
                className="w-40 h-40 rounded-full bg-[#F5B700] border-4 border-[#161616] shadow-[6px_6px_0_0_#161616] font-sans font-bold uppercase tracking-[0.1em] text-[#161616] text-lg hover:-translate-y-1 transition-transform disabled:opacity-60"
              >
                {state === 'connecting' ? 'Ringing…' : state === 'ended' ? 'Call again' : '🎙 Talk to it'}
              </button>
              <p className="font-body text-sm text-[#161616]/55 mt-5">
                {state === 'ended'
                  ? 'That was it answering as your business. Imagine it catching every missed call this week.'
                  : 'Uses your microphone, right in the browser. Try asking for a quote or booking a job.'}
              </p>
              {error && <p className="font-body text-sm text-[#E0301E] font-semibold mt-2">{error}</p>}
            </>
          )}

          {state === 'live' && (
            <>
              <div className="w-40 h-40 mx-auto rounded-full bg-[#161616] border-4 border-[#F5B700] flex flex-col items-center justify-center animate-pulse-slow">
                <span className="text-[#F5B700] font-mono font-bold text-2xl">{mmss}</span>
                <span className="text-[#FBF6EA]/70 font-sans text-xs uppercase tracking-[0.2em] mt-1">Live</span>
              </div>
              <button onClick={stop} className="mt-5 px-6 py-2.5 rounded-xl border-2 border-[#161616] bg-white font-sans font-bold uppercase tracking-[0.1em] text-sm text-[#161616] shadow-[3px_3px_0_0_#161616]">
                Hang up
              </button>
            </>
          )}
        </div>

        {orderUrl ? (
          <div className="mt-8 bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#F5B700] p-7 text-center">
            <p className="font-sans font-bold uppercase tracking-[0.1em] text-[11px] text-[#F5B700]">Make it real</p>
            <p className="font-display text-2xl md:text-3xl font-bold text-[#FBF6EA] mt-2 leading-tight">
              Put it on {business}&apos;s real number
            </p>
            <p className="font-body text-[#FBF6EA]/70 mt-3 max-w-md mx-auto">
              {formatUsd(VOICE.setupCents)} to set it up, then {formatUsd(VOICE.monthlyCents)} a month. Month to
              month, cancel anytime, answering your line within a week.
            </p>
            <a
              href={orderUrl}
              className="inline-block mt-5 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-8 py-3.5 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-transform"
            >
              Make it real →
            </a>
            <p className="font-body text-[12px] text-[#FBF6EA]/50 mt-4">
              Takes you back to your demo suite, where you can add your website and command center too.{' '}
              <a href="/book" className="underline hover:text-[#F5B700]">
                Prefer to talk it through first?
              </a>
            </p>
          </div>
        ) : (
          <div className="mt-8 text-center">
            <p className="font-body text-[#161616]/70">
              Want it answering your real phone line, catching every call you miss?
            </p>
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <a href="/book" className="bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">
                Book the 10-minute setup call
              </a>
              <a href="/sidekick" className="bg-white text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">
                See pricing
              </a>
            </div>
          </div>
        )}
        <p className="font-mono text-[11px] text-[#161616]/40 mt-6 text-center">Demo calls cap at 4 minutes. Built by Modern Mustard Seed, Kalispell MT.</p>
      </main>
    </div>
  );
}
