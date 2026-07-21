'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type Vapi from '@vapi-ai/web';
import { trackEvent } from '@/lib/analytics';

/**
 * Hero unit: talk to Mr. Mustard, your way. One pop-art card, two doors:
 * a LIVE voice call that starts right here in the hero, or the chat widget.
 * If the Vapi env is missing, the Talk button gracefully links to
 * /voice-agents instead of rendering a dead control.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

type CallState = 'idle' | 'connecting' | 'live' | 'error';

export default function MrMustardHeroCTA({ location = 'hero' }: { location?: string }) {
  const [state, setState] = useState<CallState>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  const canCall = Boolean(PUBLIC_KEY && ASSISTANT_ID);

  const startCall = async () => {
    if (!canCall || state === 'connecting' || state === 'live') return;
    trackEvent('mustard_talk_live', { location });
    setError(null);
    setState('connecting');
    try {
      const { default: VapiClient } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
      // Fresh instance per call: reusing one across hang-up/redial races
      // Daily's async teardown and produces deaf or mute calls (teardownVapi).
      await teardownVapi(vapiRef.current);
      vapiRef.current = null;
      const vapi = new VapiClient(PUBLIC_KEY as string);
      vapi.on('call-start', () => {
        setState('live');
        hardenMicPath(vapi);
      });
      vapi.on('call-end', () => {
        setState('idle');
        setSpeaking(false);
      });
      vapi.on('speech-start', () => setSpeaking(true));
      vapi.on('speech-end', () => setSpeaking(false));
      vapi.on('error', (e: unknown) => {
        console.error('vapi error', e);
        setState('error');
        setError('Call dropped. Try again?');
      });
      vapiRef.current = vapi;
      await vapi.start(ASSISTANT_ID as string);
    } catch (err) {
      console.error('vapi start failed', err);
      setState('error');
      setError(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'Mic blocked. Allow it and try again.'
          : 'Could not start the call. Try again.'
      );
    }
  };

  const endCall = () => {
    vapiRef.current?.stop();
    setState('idle');
  };

  const openChat = () => {
    trackEvent('mustard_chat_open', { location });
    window.dispatchEvent(new Event('mustardseed:open'));
  };

  const isLive = state === 'live';
  const isConnecting = state === 'connecting';

  return (
    <div className="opacity-0 animate-fade-in-up-delay-3 mt-10 max-w-xl mx-auto">
      <div className="relative rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] px-5 py-4 md:px-6 md:py-5">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Mascot */}
          <div className="relative shrink-0">
            {isLive && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[#F5B700] opacity-40 animate-ping"
                style={{ animationDuration: '1.6s' }}
              />
            )}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#FBF6EA] border-2 border-[#161616] overflow-hidden">
              <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-11 w-auto" />
            </span>
          </div>

          {/* Copy */}
          <div className="flex-1 text-center sm:text-left">
            <p className="font-display text-lg md:text-xl font-black text-[#161616] tracking-tight leading-snug">
              {isLive
                ? speaking
                  ? 'Mr. Mustard is talking…'
                  : 'He is listening. Go ahead.'
                : 'Talk to Mr. Mustard about your business'}
            </p>
            <p className="text-[#3a3733] text-xs md:text-sm font-body leading-snug mt-0.5">
              {isLive
                ? 'Ask anything. He can even book your call with Sarah.'
                : 'Our AI right hand. Live voice or chat, your pick.'}
            </p>
            {error && <p className="text-[#E0301E] text-[11px] font-mono mt-1">{error}</p>}
          </div>

          {/* The two doors */}
          <div className="flex gap-2.5 shrink-0">
            {isLive ? (
              <button
                type="button"
                onClick={endCall}
                className="px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-white bg-[#E0301E] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                End call
              </button>
            ) : canCall ? (
              <button
                type="button"
                onClick={startCall}
                disabled={isConnecting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="#161616" />
                  <path d="M5 11a7 7 0 0 0 14 0" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                  <path d="M12 18v3" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                {isConnecting ? 'Connecting…' : 'Talk live'}
              </button>
            ) : (
              <Link
                href="/voice-agents"
                className="px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all whitespace-nowrap"
              >
                Talk live
              </Link>
            )}
            <button
              type="button"
              onClick={openChat}
              className="px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              Chat instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
