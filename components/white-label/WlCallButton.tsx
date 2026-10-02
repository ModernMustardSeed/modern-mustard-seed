'use client';

import { useEffect, useRef, useState } from 'react';
import type { BuiltCall } from '@/lib/demo-agent';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

export type Line = { role: 'agent' | 'caller'; text: string };
type State = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

/**
 * The live call on the white label demo. Same Vapi web pattern as
 * DemoVoiceWidget (fresh instance per call, Krisp off via hardenMicPath), but
 * it wears the agency's color and streams the transcript up to the page so
 * the room can read the call as it happens.
 */
export default function WlCallButton({
  agency,
  client,
  sample,
  city,
  color,
  ink,
  onLine,
  onReset,
}: {
  agency: string;
  client: string;
  sample: string;
  city: string;
  color: string;
  ink: string;
  onLine: (l: Line) => void;
  onReset: () => void;
}) {
  const [state, setState] = useState<State>('idle');
  const [msg, setMsg] = useState('');
  const [seconds, setSeconds] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    if (state !== 'live') return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  useEffect(
    () => () => {
      try {
        vapiRef.current?.stop();
      } catch {
        /* leaving the page ends the call */
      }
    },
    [],
  );

  const start = async () => {
    if (!PUBLIC_KEY || !ASSISTANT_ID) {
      setState('error');
      setMsg('The demo line is offline right now.');
      return;
    }
    setState('connecting');
    setMsg('');
    setSeconds(0);
    onReset();
    try {
      const res = await fetch('/api/white-label/demo-call', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agency, client, sample, city }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; call?: BuiltCall; message?: string };
      if (!res.ok || !data.call) {
        setState('error');
        setMsg(data.message || 'Could not open the line. Try again in a moment.');
        return;
      }
      const call = data.call;
      const { default: Vapi } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
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
        setMsg('The line dropped. Tap to call again.');
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapi.on('message', (m: any) => {
        if (m?.type === 'transcript' && m.transcriptType === 'final' && typeof m.transcript === 'string') {
          onLine({ role: m.role === 'assistant' ? 'agent' : 'caller', text: m.transcript });
        }
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
      setMsg(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'The microphone is blocked. Allow it in the address bar and tap again.'
          : 'Could not open the line. Try again in a moment.',
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

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  if (state === 'live') {
    return (
      <div className="inline-flex items-center gap-4 rounded-full bg-white/95 py-2 pl-5 pr-2 shadow-lg ring-1 ring-black/10">
        <span className="h-2.5 w-2.5 rounded-full animate-pulse bg-green-600" aria-hidden="true" />
        <span className="text-sm font-semibold text-neutral-900">Live with {client} · {mmss}</span>
        <button onClick={stop} className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white">
          Hang up
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={state === 'connecting'}
        className="inline-flex items-center gap-3 rounded-full px-7 py-4 text-base font-bold shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-70"
        style={{ background: color, color: ink }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
        </svg>
        {state === 'connecting' ? 'Connecting…' : state === 'ended' ? 'Call again' : `Call ${client}`}
      </button>
      <p className="mt-3 text-sm opacity-75">
        {msg || 'Uses your microphone. Play a customer: ask a question, then book an appointment.'}
      </p>
    </div>
  );
}
