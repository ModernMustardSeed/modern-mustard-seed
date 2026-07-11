'use client';

import { useEffect, useRef, useState } from 'react';
import type { ForgedCall } from '@/lib/sidekick';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

type CallState = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

/**
 * Serves a forged demo website full-screen with the lead's AI receptionist
 * floating over it, bottom-right: the two demos in one link. The site itself
 * lives in an iframe (srcdoc) so its own styles and scripts stay contained;
 * the call widget lives in the parent so the mic permission is ours. A
 * one-time orientation card tells the prospect exactly what they are looking
 * at, because most of them have never met a website that answers its phone.
 */
export default function SiteDemoShell({
  html,
  business,
  call,
}: {
  html: string;
  business: string;
  call: ForgedCall | null;
}) {
  const [state, setState] = useState<CallState>('idle');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);

  // The orientation card: appears once per browser after a beat, leaves on
  // its own, never comes back after they dismiss it or start a call.
  useEffect(() => {
    let hide: number | undefined;
    const show = window.setTimeout(() => {
      try {
        if (localStorage.getItem('mms_demo_intro') === 'seen') return;
      } catch {
        /* storage blocked: still show once */
      }
      setShowIntro(true);
      hide = window.setTimeout(() => setShowIntro(false), 16000);
    }, 1600);
    return () => {
      window.clearTimeout(show);
      if (hide) window.clearTimeout(hide);
    };
  }, []);

  const dismissIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem('mms_demo_intro', 'seen');
    } catch {
      /* fine */
    }
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
    dismissIntro();
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
    <div className="fixed inset-0 bg-[#161616]">
      <iframe title={`${business} demo website`} srcDoc={html} className="w-full h-full border-0 bg-white" />

      {/* Orientation, once: what this is and what the gold button does. */}
      {showIntro && ready && state === 'idle' && (
        <div className="fixed bottom-24 right-4 z-50 max-w-[300px] bg-[#161616] border-2 border-[#F5B700] rounded-2xl shadow-[5px_5px_0_0_rgba(0,0,0,0.5)] p-4 animate-[demoIntro_.45s_ease-out]">
          <p className="font-sans font-bold uppercase tracking-[0.14em] text-[10px] text-[#F5B700]">Your demo, {business}</p>
          <p className="font-body text-[13px] leading-relaxed text-[#FBF6EA]/90 mt-1.5">
            This whole website is a working draft we built for you. One more thing: it answers its own phone.
            Tap the gold button and pretend you are a customer calling in.
          </p>
          <button
            onClick={dismissIntro}
            className="mt-3 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-lg px-3 py-1.5 font-sans font-bold uppercase tracking-[0.08em] text-[11px]"
          >
            Got it
          </button>
          <style>{`@keyframes demoIntro{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
        </div>
      )}

      {/* The receptionist, living on the site it answers for. */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
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
        ) : ready ? (
          <button
            onClick={() => void start()}
            disabled={state === 'connecting'}
            className="group bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] pl-4 pr-5 py-3 font-sans font-bold uppercase tracking-[0.08em] text-sm hover:-translate-y-0.5 transition-transform disabled:opacity-70 flex items-center gap-2.5"
          >
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#161616]/40 animate-ping group-hover:animate-none" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#161616]" />
            </span>
            {state === 'connecting' ? 'Ringing…' : state === 'ended' ? 'Call again' : 'Talk to this website'}
          </button>
        ) : null}
        {error && (
          <p className="bg-white border-2 border-[#161616] rounded-lg px-3 py-1.5 font-body text-[11px] text-[#E0301E] font-semibold max-w-[260px] text-right">
            {error}
          </p>
        )}
        <a
          href="https://modernmustardseed.com/book"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/95 text-[#161616] border-2 border-[#161616] rounded-full px-3.5 py-1.5 font-sans font-bold uppercase tracking-[0.08em] text-[10px] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
        >
          Demo by Modern Mustard Seed · Want it real?
        </a>
      </div>
    </div>
  );
}
