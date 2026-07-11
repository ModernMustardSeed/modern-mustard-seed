'use client';

import { useEffect, useState } from 'react';
import type { ForgedCall } from '@/lib/sidekick';
import DemoVoiceWidget, { type VoiceState } from '@/components/demo/DemoVoiceWidget';

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
  const [showIntro, setShowIntro] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');

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

  return (
    <div className="fixed inset-0 bg-[#161616]">
      <iframe title={`${business} demo website`} srcDoc={html} className="w-full h-full border-0 bg-white" />

      {/* The receptionist, living on the site it answers for. One column,
          bottom-right: orientation card, then the call pill, then the credit
          chip. A single flex stack so nothing can ever overlap, at any
          viewport. */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 max-w-[min(320px,calc(100vw-2rem))]">
        {showIntro && voiceState === 'idle' && (
          <div className="bg-[#161616] border-2 border-[#F5B700] rounded-2xl shadow-[5px_5px_0_0_rgba(0,0,0,0.5)] p-4 animate-[demoIntro_.45s_ease-out]">
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
        <DemoVoiceWidget
          business={business}
          call={call}
          onStateChange={(s) => {
            setVoiceState(s);
            if (s === 'connecting') dismissIntro();
          }}
        />
        {/* Keep the corner quiet while the orientation card is up. */}
        {!showIntro && (
          <a
            href="https://modernmustardseed.com/book"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/95 text-[#161616] border-2 border-[#161616] rounded-full px-3.5 py-1.5 font-sans font-bold uppercase tracking-[0.08em] text-[10px] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
          >
            Demo by Modern Mustard Seed · Want it real?
          </a>
        )}
      </div>
    </div>
  );
}
