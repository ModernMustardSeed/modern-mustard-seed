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
 * it wears the agency's color, streams the transcript up to the page, and
 * reports the run id and call length so the page can show the owner's real
 * text after the call.
 *
 * `variant="bubble"` is the same call dressed as the widget on a client's site.
 */
export default function WlCallButton({
  agency,
  client,
  sample,
  city,
  siteKey,
  bg,
  fg,
  variant = 'button',
  onLine,
  onStart,
  onEnd,
}: {
  agency: string;
  client: string;
  sample: string;
  city: string;
  siteKey: string | null;
  bg: string;
  fg: string;
  variant?: 'button' | 'bubble';
  onLine: (l: Line) => void;
  onStart: (runId: string) => void;
  onEnd: (seconds: number) => void;
}) {
  const [state, setState] = useState<State>('idle');
  const [msg, setMsg] = useState('');
  const [seconds, setSeconds] = useState(0);
  const secondsRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    if (state !== 'live') return;
    const t = window.setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
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
    secondsRef.current = 0;
    setSeconds(0);
    try {
      const res = await fetch('/api/white-label/demo-call', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agency, client, sample, city, siteKey }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; call?: BuiltCall; message?: string };
      if (!res.ok || !data.call) {
        setState('error');
        setMsg(data.message || 'Could not open the line. Try again in a moment.');
        return;
      }
      const call = data.call;
      onStart(String(call.metadata.runId));
      const { default: Vapi } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
      await teardownVapi(vapiRef.current);
      vapiRef.current = null;
      const vapi = new Vapi(PUBLIC_KEY);
      vapi.on('call-start', () => {
        setState('live');
        hardenMicPath(vapi);
      });
      vapi.on('call-end', () => {
        setState('ended');
        onEnd(secondsRef.current);
      });
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
    onEnd(secondsRef.current);
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  if (variant === 'bubble') {
    return (
      <div className="flex flex-col items-end gap-2">
        {msg && state === 'error' && <p className="max-w-[220px] rounded-xl bg-white px-3 py-2 text-xs text-neutral-700 shadow">{msg}</p>}
        <button
          onClick={state === 'live' ? stop : start}
          disabled={state === 'connecting'}
          className="inline-flex items-center gap-2.5 rounded-full py-3 pl-3 pr-5 text-sm font-bold shadow-xl ring-1 ring-black/10 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          style={{ background: bg, color: fg }}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
            {state === 'live' ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" /> : <Mic />}
          </span>
          {state === 'connecting' ? 'Connecting…' : state === 'live' ? `Talking · ${mmss} · End` : `Talk to ${client}`}
        </button>
      </div>
    );
  }

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
        style={{ background: bg, color: fg }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
        </svg>
        {state === 'connecting' ? 'Connecting…' : state === 'ended' ? 'Call again' : `Call ${client}`}
      </button>
      <p className="mt-3 text-sm opacity-75">{msg || 'Uses your microphone. Play a customer: ask a question, then book an appointment.'}</p>
    </div>
  );
}

function Mic() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
    </svg>
  );
}
