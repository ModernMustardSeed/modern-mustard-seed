'use client';

import { useEffect, useRef, useState } from 'react';
import type { ForgedCall } from '@/lib/sidekick';
import { sidekickVoice, genderFromVoiceId, type VoiceGender } from '@/lib/sidekick-voice';
import VoiceGenderToggle from '@/components/sidekick/VoiceGenderToggle';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

export type VoiceState = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

/**
 * The one voice call button shared by every forged-demo surface (the demo
 * website overlay and the business OS demo): starts a live web call with the
 * lead's own receptionist. Same Vapi web pattern as DemoCallExperience.
 */
export default function DemoVoiceWidget({
  business,
  call,
  label = 'Talk to this website',
  onStateChange,
}: {
  business: string;
  call: ForgedCall | null;
  label?: string;
  onStateChange?: (s: VoiceState) => void;
}) {
  const [state, setStateRaw] = useState<VoiceState>('idle');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [gender, setGender] = useState<VoiceGender>(() => genderFromVoiceId(call?.voice?.voiceId));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);

  const setState = (s: VoiceState) => {
    setStateRaw(s);
    onStateChange?.(s);
  };

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
      const { default: Vapi } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
      // Fresh instance per call: reusing one across hang-up/redial races
      // Daily's async teardown and produces deaf or mute calls (teardownVapi).
      await teardownVapi(vapiRef.current);
      vapiRef.current = null;
      const vapi = new Vapi(PUBLIC_KEY);
      vapi.on('call-start', () => {
        setState('live');
        hardenMicPath(vapi);
      });
      vapi.on('call-end', () => setState('ended'));
      vapi.on('error', () => {
        setState('error');
        setError('The line dropped. Tap to try again.');
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
        voice: sidekickVoice(gender),
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
  if (!ready) return null;
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-end gap-2">
      {state !== 'live' && state !== 'connecting' && (
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] px-3 pt-2 pb-2.5">
          <VoiceGenderToggle value={gender} onChange={setGender} tone="light" />
        </div>
      )}
      {state === 'live' ? (
        <div className="bg-[#161616] border-2 border-[#F5B700] rounded-2xl shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] px-4 py-3 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F5B700] animate-pulse" />
          <div className="text-left">
            <p className="font-sans font-bold uppercase tracking-[0.1em] text-[11px] text-[#FBF6EA]">Live · {mmss}</p>
            <p className="font-body text-[11px] text-[#FBF6EA]/60">{business}&apos;s AI receptionist</p>
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
          disabled={state === 'connecting'}
          className="group bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] pl-4 pr-5 py-3 font-sans font-bold uppercase tracking-[0.08em] text-sm hover:-translate-y-0.5 transition-transform disabled:opacity-70 flex items-center gap-2.5"
        >
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-[#161616]/40 animate-ping group-hover:animate-none" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#161616]" />
          </span>
          {state === 'connecting' ? 'Ringing…' : state === 'ended' ? 'Call again' : label}
        </button>
      )}
      {error && (
        <p className="bg-white border-2 border-[#161616] rounded-lg px-3 py-1.5 font-body text-[11px] text-[#E0301E] font-semibold text-right">
          {error}
        </p>
      )}
    </div>
  );
}
