'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ForgedCall } from '@/lib/sidekick';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

type CallState = 'idle' | 'forging' | 'connecting' | 'live' | 'ended' | 'error';

/**
 * Mr. Mustard's desk line: the floating voice pill for internal surfaces
 * (admin, client portal, partner hub). Forges the desk persona on demand from
 * the gated endpoint, then runs a live web call. The mascot bounces with his
 * actual speech volume while he talks, so the pill feels alive on the line.
 */
export default function MustardDeskCall({
  endpoint,
  label = 'Talk to Mr. Mustard',
  sublabel,
  positionClass = 'bottom-5 right-5',
}: {
  endpoint: string;
  label?: string;
  sublabel?: string;
  positionClass?: string;
}) {
  const [state, setState] = useState<CallState>('idle');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [volume, setVolume] = useState(0);
  const [speaking, setSpeaking] = useState(false);
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
    if (!PUBLIC_KEY || !ASSISTANT_ID) return;
    setState('forging');
    setError('');
    setSeconds(0);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { call?: ForgedCall; error?: string };
      if (!res.ok || !json.call) {
        setState('error');
        setError(
          res.status === 401
            ? 'Your session expired. Refresh and sign in again.'
            : 'He is away from the desk. Try again in a minute.',
        );
        return;
      }
      const call = json.call;
      setState('connecting');
      const { default: Vapi } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
      // Fresh instance per call: reusing one across hang-up/redial races
      // Daily's async teardown and produces deaf or mute calls.
      await teardownVapi(vapiRef.current);
      vapiRef.current = null;
      const vapi = new Vapi(PUBLIC_KEY);
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
      vapi.on('error', () => {
        setState('error');
        setError('The line dropped. Tap to call him back.');
      });
      vapiRef.current = vapi;
      await vapi.start(ASSISTANT_ID, {
        firstMessage: call.firstMessage,
        model: call.model,
        transcriber: call.transcriber,
        startSpeakingPlan: call.startSpeakingPlan,
        stopSpeakingPlan: call.stopSpeakingPlan,
        backgroundSpeechDenoisingPlan: call.backgroundSpeechDenoisingPlan,
        silenceTimeoutSeconds: call.silenceTimeoutSeconds,
        maxDurationSeconds: call.maxDurationSeconds,
        metadata: call.metadata,
        voice: call.voice,
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

  if (!PUBLIC_KEY || !ASSISTANT_ID) return null;
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const busy = state === 'forging' || state === 'connecting';

  return (
    <div className={`fixed ${positionClass} z-50 flex flex-col items-end gap-2`}>
      {state === 'live' ? (
        <div className="bg-[#161616] border-2 border-[#F5B700] rounded-2xl shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] pl-3 pr-4 py-3 flex items-center gap-3">
          <div
            className="relative flex items-center justify-center transition-transform duration-100"
            style={{ transform: `scale(${1 + Math.min(volume, 1) * 0.35})` }}
          >
            {speaking && (
              <span className="absolute inline-flex h-9 w-9 rounded-full bg-[#F5B700]/30 animate-ping" />
            )}
            <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="relative h-8 w-auto" />
          </div>
          <div className="text-left">
            <p className="font-sans font-bold uppercase tracking-[0.1em] text-[11px] text-[#FBF6EA]">
              {speaking ? 'Mr. Mustard is talking' : `Live · ${mmss}`}
            </p>
            {sublabel && <p className="font-body text-[11px] text-[#FBF6EA]/60">{sublabel}</p>}
          </div>
          <button
            onClick={stop}
            className="ml-1 bg-[#E0301E] text-white border-2 border-[#161616] rounded-lg px-3 py-1.5 font-sans font-bold uppercase tracking-[0.08em] text-[11px]"
          >
            Hang up
          </button>
        </div>
      ) : (
        <button
          onClick={() => void start()}
          disabled={busy}
          className="group flex items-center gap-2.5 pl-2.5 pr-5 py-2.5 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-wait"
        >
          <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-7 w-auto" />
          <span className="text-left">
            <span className="block font-sans font-extrabold uppercase tracking-[0.08em] text-[12px] leading-tight">
              {state === 'forging' ? 'One second…' : state === 'connecting' ? 'Ringing him…' : state === 'ended' ? 'Talk again' : label}
            </span>
            {sublabel && state === 'idle' && (
              <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-[#161616]/60 leading-tight mt-0.5">
                {sublabel}
              </span>
            )}
          </span>
        </button>
      )}
      {error && (
        <p className="bg-white border-2 border-[#161616] rounded-lg px-3 py-1.5 font-body text-[11px] text-[#E0301E] font-semibold text-right max-w-[240px]">
          {error}
        </p>
      )}
    </div>
  );
}
