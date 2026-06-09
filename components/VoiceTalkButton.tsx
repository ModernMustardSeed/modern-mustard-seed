'use client';

import { useEffect, useRef, useState } from 'react';
import type Vapi from '@vapi-ai/web';

/**
 * Live in-browser voice call with Mr. Mustard via Vapi.
 *
 * The signature proof moment for /voice-agents: the page that sells voice
 * agents lets you talk to one. Renders nothing unless both env vars are set:
 *   NEXT_PUBLIC_VAPI_PUBLIC_KEY
 *   NEXT_PUBLIC_VAPI_ASSISTANT_ID
 */

type CallState = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

export default function VoiceTalkButton() {
  const [state, setState] = useState<CallState>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  if (!PUBLIC_KEY || !ASSISTANT_ID) return null;

  const start = async () => {
    if (state === 'connecting' || state === 'live') return;
    setError(null);
    setState('connecting');
    try {
      if (!vapiRef.current) {
        const { default: VapiClient } = await import('@vapi-ai/web');
        const vapi = new VapiClient(PUBLIC_KEY);
        vapi.on('call-start', () => setState('live'));
        vapi.on('call-end', () => {
          setState('ended');
          setSpeaking(false);
          setVolume(0);
          setMuted(false);
        });
        vapi.on('speech-start', () => setSpeaking(true));
        vapi.on('speech-end', () => setSpeaking(false));
        vapi.on('volume-level', (v: number) => setVolume(v));
        vapi.on('error', (e: unknown) => {
          console.error('vapi error', e);
          setState('error');
          setError('Call dropped. Mind trying again?');
        });
        vapiRef.current = vapi;
      }
      await vapiRef.current.start(ASSISTANT_ID);
    } catch (err) {
      console.error('vapi start failed', err);
      setState('error');
      setError(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'Microphone access is blocked. Allow the mic and try again.'
          : 'Could not start the call. Try again in a moment.'
      );
    }
  };

  const stop = () => {
    vapiRef.current?.stop();
    setState('ended');
  };

  const toggleMute = () => {
    if (!vapiRef.current || state !== 'live') return;
    const next = !muted;
    vapiRef.current.setMuted(next);
    setMuted(next);
  };

  const isLive = state === 'live';
  const isConnecting = state === 'connecting';

  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-7 md:p-9 shadow-[6px_6px_0_0_#F5B700]">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Mic orb */}
        <div className="relative flex-shrink-0">
          {isLive && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[#F5B700] opacity-30 animate-ping"
              style={{ animationDuration: '1.6s' }}
            />
          )}
          <button
            type="button"
            onClick={isLive ? stop : start}
            disabled={isConnecting}
            aria-label={isLive ? 'End the call' : 'Start a live call with Mr. Mustard'}
            className={`relative w-24 h-24 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 ${
              isLive
                ? 'bg-[#E0301E] border-white shadow-[0_0_40px_rgba(224,48,30,0.45)]'
                : 'bg-[#F5B700] border-[#161616] shadow-[3px_3px_0_0_#FBF6EA] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#FBF6EA]'
            } ${isConnecting ? 'opacity-60 cursor-wait' : ''}`}
            style={
              isLive
                ? { transform: `scale(${1 + Math.min(volume, 1) * 0.12})` }
                : undefined
            }
          >
            {isLive ? (
              // Stop square
              <span className="block w-7 h-7 rounded-[4px] bg-white" />
            ) : (
              // Mic glyph
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="#161616" />
                <path
                  d="M5 11a7 7 0 0 0 14 0"
                  stroke="#161616"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M12 18v3" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Status + copy */}
        <div className="flex-1 text-center sm:text-left">
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F5B700] font-mono font-bold block mb-1.5">
            {isLive
              ? speaking
                ? 'Mr. Mustard is talking'
                : 'Listening to you'
              : isConnecting
                ? 'Connecting…'
                : state === 'ended'
                  ? 'Call ended'
                  : 'Live demo'}
          </span>
          <p className="font-display text-xl md:text-2xl font-black tracking-tight leading-snug mb-1.5">
            {isLive
              ? 'You are live with Mr. Mustard.'
              : state === 'ended'
                ? 'How did he do?'
                : 'Talk to Mr. Mustard. Right now.'}
          </p>
          <p className="text-[#FBF6EA]/65 text-sm font-body leading-relaxed max-w-md">
            {isLive
              ? 'Ask him anything. What we build, how it works, or book a real call with Sarah without hanging up.'
              : state === 'ended'
                ? 'That agent answered, qualified, and books real appointments. Yours can too.'
                : 'This is not a recording. It is the same voice agent we will build for you, and it can book a real call with Sarah while you talk.'}
          </p>
          {error && <p className="text-[#FF8550] text-xs font-mono mt-2">{error}</p>}
        </div>

        {/* Live controls */}
        {isLive && (
          <div className="flex sm:flex-col gap-2.5">
            <button
              type="button"
              onClick={toggleMute}
              className={`px-5 py-2.5 rounded-full border-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold transition-all ${
                muted
                  ? 'bg-[#F5B700] text-[#161616] border-[#F5B700]'
                  : 'bg-transparent text-[#FBF6EA] border-[#FBF6EA]/40 hover:border-[#FBF6EA]'
              }`}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              type="button"
              onClick={stop}
              className="px-5 py-2.5 rounded-full border-2 border-[#E0301E] bg-[#E0301E] text-white text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold hover:bg-[#c22717] transition-all"
            >
              End call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
