'use client';

import { useEffect, useRef, useState } from 'react';
import type Vapi from '@vapi-ai/web';
import { trackEvent } from '@/lib/analytics';

/**
 * "Give me the tour." Mr. Mustard opens the call with a tour script (a
 * firstMessage override, so his own persona, voice and tools stay intact) and
 * the page scrolls to each part as he names it. Each stop fires on whichever
 * comes first: his words arriving in the transcript, or a timer paced to the
 * script. When the tour ends he is simply on the call, asking about their
 * business, where he can build their demo live.
 *
 * Words only, never numerals, in anything he speaks (his voice standard).
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

const STOPS = [
  { key: 'the work', target: 'selected-work', text: 'Up first, the work. A landscaper in Tallahassee, a homebuilder in Montana, and our own apparel brand, all live right now. Hover any of them and it plays.' },
  { key: 'what changed', target: 'results', text: 'Next, what changed after. One client went from days of work to thirty minutes. Another closed eighty percent more deals.' },
  { key: 'the practice', target: 'practice', text: 'Then the practice: websites, custom software, voice agents like me, marketing, and advisory.' },
  { key: 'paste your website', target: 'show-me-mine', text: 'And the fun part. Paste your website right here, and we will build you a new one, free.' },
];
const OPEN = 'Hey there, I am Mister Mustard. Let me give you the quick tour.';
const CLOSE = 'So tell me, what is your business?';
const SCRIPT = [OPEN, ...STOPS.map((s) => s.text), CLOSE].join(' ');
const WORDS_PER_SECOND = 2.6;

type State = 'idle' | 'connecting' | 'touring' | 'error';

export default function MustardTour({ className, pillClass }: { className: string; pillClass: string }) {
  const [state, setState] = useState<State>('idle');
  const vapiRef = useRef<Vapi | null>(null);
  const done = useRef<Set<string>>(new Set());
  const timers = useRef<number[]>([]);
  const canCall = Boolean(PUBLIC_KEY && ASSISTANT_ID);

  const go = (target: string) => {
    if (done.current.has(target)) return;
    done.current.add(target);
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };

  useEffect(() => () => { clearTimers(); vapiRef.current?.stop(); }, []);

  const start = async () => {
    if (!canCall || state === 'connecting' || state === 'touring') return;
    trackEvent('mustard_tour_start', { location: 'home-hero' });
    done.current = new Set();
    setState('connecting');
    try {
      const { default: VapiClient } = await import('@vapi-ai/web');
      const { hardenMicPath, teardownVapi } = await import('@/lib/vapi-web');
      await teardownVapi(vapiRef.current);
      const vapi = new VapiClient(PUBLIC_KEY as string);
      let paced = false;
      vapi.on('call-start', () => { setState('touring'); hardenMicPath(vapi); });
      vapi.on('speech-start', () => {
        if (paced) return;
        paced = true;
        // The timer track: each stop is due when the words before it are spoken.
        let words = OPEN.split(' ').length;
        STOPS.forEach((s) => {
          const at = (words / WORDS_PER_SECOND) * 1000;
          timers.current.push(window.setTimeout(() => go(s.target), at));
          words += s.text.split(' ').length;
        });
      });
      vapi.on('message', (m: { type?: string; role?: string; transcript?: string }) => {
        if (m?.type !== 'transcript' || m.role !== 'assistant' || !m.transcript) return;
        const said = m.transcript.toLowerCase();
        STOPS.forEach((s) => { if (said.includes(s.key)) go(s.target); });
      });
      vapi.on('call-end', () => { clearTimers(); setState('idle'); });
      vapi.on('error', () => { clearTimers(); setState('error'); });
      vapiRef.current = vapi;
      await vapi.start(ASSISTANT_ID as string, { firstMessage: SCRIPT });
    } catch {
      clearTimers();
      setState('error');
    }
  };

  const end = () => { clearTimers(); vapiRef.current?.stop(); setState('idle'); };

  if (!canCall) return null;

  return (
    <>
      <button type="button" className={className} onClick={start} disabled={state === 'connecting' || state === 'touring'}>
        <span aria-hidden="true">▶</span>
        {state === 'connecting' ? 'Waking Mr. Mustard…' : state === 'error' ? 'Mic blocked? Try the tour again' : 'Or take the tour with Mr. Mustard'}
      </button>
      {state === 'touring' && (
        <div className={pillClass} role="status">
          <i aria-hidden="true" />Mr. Mustard is giving you the tour
          <button type="button" onClick={end}>End</button>
        </div>
      )}
    </>
  );
}
