'use client';

import { useEffect, useRef, useState } from 'react';
import type Vapi from '@vapi-ai/web';
import { trackEvent } from '@/lib/analytics';
import { HUCK } from '@/data/hatchery';

/**
 * Talk to Huck in the browser, no phone required. The signature moment made
 * literal: the mascot answers its own line, live, on the page.
 *
 * Auth is a short-lived, Huck-scoped JWT minted at /api/hatchery/voice-token
 * (the MMS public key is locked to Mr. Mustard). If that call fails, the widget
 * shows an error but the printed phone number on the page always still works.
 * Mic path is hardened against Krisp deafness (see lib/vapi-web.ts).
 */

type CallState = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

export default function HuckVoiceWidget() {
  const [state, setState] = useState<CallState>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  const start = async () => {
    if (state === 'connecting' || state === 'live') return;
    trackEvent('hatchery_talk_to_huck', { location: 'hatchery' });
    setError(null);
    setState('connecting');
    try {
      const res = await fetch('/api/hatchery/voice-token', { cache: 'no-store' });
      if (!res.ok) throw new Error(`token ${res.status}`);
      const { token, assistantId } = (await res.json()) as { token: string; assistantId: string };

      const { default: VapiClient } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
      // Fresh instance per call (with its fresh token): reusing one across
      // hang-up/redial races Daily's async teardown and produces deaf or mute
      // calls (teardownVapi).
      await teardownVapi(vapiRef.current);
      vapiRef.current = null;
      const vapi = new VapiClient(token);
      vapi.on('call-start', () => {
        setState('live');
        hardenMicPath(vapi);
      });
      vapi.on('call-end', () => {
        setState('ended');
        setSpeaking(false);
        setVolume(0);
      });
      vapi.on('speech-start', () => setSpeaking(true));
      vapi.on('speech-end', () => setSpeaking(false));
      vapi.on('volume-level', (v: number) => setVolume(v));
      vapi.on('error', (e: unknown) => {
        console.error('huck vapi error', e);
        setState('error');
        setError('The line dropped. Mind trying again?');
      });
      vapiRef.current = vapi;
      await vapi.start(assistantId);
    } catch (err) {
      console.error('huck voice start failed', err);
      setState('error');
      setError(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'Your microphone is blocked. Allow the mic and try again.'
          : `Could not open the line. You can always call him at ${HUCK.phone}.`,
      );
    }
  };

  const stop = () => {
    vapiRef.current?.stop();
    setState('ended');
  };

  const isLive = state === 'live';
  const isConnecting = state === 'connecting';

  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] text-[#161616] p-6 md:p-7 shadow-[6px_6px_0_0_#B54423]">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* The egg / mic */}
        <div className="relative flex-shrink-0">
          {isLive && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[#E8A542] opacity-40 animate-ping"
              style={{ animationDuration: '1.6s' }}
            />
          )}
          <button
            type="button"
            onClick={isLive ? stop : start}
            disabled={isConnecting}
            aria-label={isLive ? 'End the call with Huck' : 'Talk to Huck now'}
            className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 ${
              isLive
                ? 'bg-[#B54423] border-[#161616] shadow-[0_0_44px_rgba(232,165,66,0.55)]'
                : 'bg-[#F5B700] border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616]'
            } ${isConnecting ? 'opacity-60 cursor-wait' : ''}`}
            style={isLive ? { transform: `scale(${1 + Math.min(volume, 1) * 0.12})` } : undefined}
          >
            {isLive ? (
              <span className="block w-6 h-6 rounded-[4px] bg-[#FBF6EA]" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="#161616" />
                <path d="M5 11a7 7 0 0 0 14 0" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <path d="M12 18v3" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Status + copy */}
        <div className="flex-1 text-center sm:text-left">
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#B54423] font-mono font-bold block mb-1.5">
            {isLive
              ? speaking
                ? 'Huck is talking'
                : 'Huck is listening'
              : isConnecting
                ? 'Opening the line…'
                : state === 'ended'
                  ? 'Call ended'
                  : 'He answers his own phone'}
          </span>
          <p className="font-display text-xl md:text-2xl font-bold tracking-tight leading-snug mb-1">
            {isLive
              ? 'You are on with Huck.'
              : state === 'ended'
                ? 'Call him again anytime.'
                : 'Call him without a phone. Tap the egg.'}
          </p>
          <p className="text-[#161616]/65 text-sm leading-relaxed max-w-md" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.05rem' }}>
            {isLive
              ? 'Ask him how he got his name. Tell him yours. He will cheerfully remind you he is an AI mascot.'
              : `This is the same live line the whole town can dial at ${HUCK.phone}. Now it opens right here.`}
          </p>
          {error && <p className="text-[#B54423] text-xs font-mono mt-2">{error}</p>}
        </div>

        {isLive && (
          <button
            type="button"
            onClick={stop}
            className="px-5 py-2.5 rounded-full border-2 border-[#B54423] bg-[#B54423] text-[#FBF6EA] text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold hover:brightness-110 transition-all"
          >
            End call
          </button>
        )}
      </div>
    </div>
  );
}
