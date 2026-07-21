'use client';

/**
 * The /ads hero: the three-line promise, then the broadcast monitor playing
 * the Timberline demo spot. The monitor is a pop-art "studio deck" card with
 * an ON AIR lamp and a real sound toggle. Autoplays muted (feed behavior,
 * which is itself the sales point: captionless hooks still land).
 */

import { useRef, useState } from 'react';
import Reveal from '@/components/mustard-mode/Reveal';
import { BROADCAST } from '@/data/ads';

export default function BroadcastHero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    if (muted) {
      v.muted = false;
      v.currentTime = 0;
      void v.play();
      setMuted(false);
    } else {
      v.muted = true;
      setMuted(true);
    }
  };

  return (
    <section className="halftone-bg border-b-2 border-[#161616]">
      <div className="max-w-6xl mx-auto px-5 pt-16 md:pt-24 pb-16 md:pb-20">
        <div className="text-center mb-10 md:mb-12">
          <Reveal variant="eyebrow">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">{BROADCAST.wordmark}</p>
          </Reveal>
          <Reveal variant="slam">
            <h1 className="font-display text-4xl md:text-6xl lg:text-[4.6rem] font-black text-[#161616] tracking-tight leading-[1.02]">
              We make the commercial.
              <br />
              We run the ads.
              <br />
              <span className="relative inline-block pb-3 md:pb-4">
                You answer the phone.
                <svg className="absolute bottom-0 left-0 w-full h-2 md:h-2.5 text-[#F5B700]" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3,6 C60,2 240,2 297,6" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
          </Reveal>
          <Reveal variant="rise" delay={120}>
            <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-2xl mx-auto mt-6 leading-relaxed">
              Done-for-you advertising for local businesses. A cinematic commercial produced for you, launched on Facebook, Instagram, and Google, managed every week, reported in plain English every month.
            </p>
          </Reveal>
          <Reveal variant="drop" delay={220}>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <a
                href="#packages"
                className="rounded-full bg-[#F5B700] border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-[#161616] text-sm uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5"
              >
                See The Packages
              </a>
              <a
                href="#planner"
                className="rounded-full bg-white border-2 border-[#161616] px-8 py-3.5 font-sans font-bold text-[#161616] text-sm uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5"
              >
                Plan My Budget
              </a>
            </div>
          </Reveal>
        </div>

        {/* The broadcast monitor */}
        <Reveal variant="rise" delay={150}>
          <div className="max-w-4xl mx-auto md:rotate-[-0.6deg]">
            <div className="rounded-2xl bg-[#161616] border-2 border-[#161616] shadow-[10px_10px_0_0_#F5B700] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#161616]">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E0301E] inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5B700] inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1E50C8] inline-block" />
                </div>
                <p className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-[#FBF6EA]/80">Mustard Network · CH 01 · Ironwood Roofing Co.</p>
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#E0301E] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#E0301E] animate-pulse inline-block" aria-hidden="true" />
                  On Air
                </p>
              </div>
              <video
                ref={videoRef}
                className="w-full block bg-black"
                src={BROADCAST.demoVideo}
                poster={BROADCAST.demoPoster}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Demo commercial for Ironwood Roofing Co., a fictional roofing company"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#161616] border-t border-[#FBF6EA]/15">
                <p className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-[#FBF6EA]/60">
                  Written, filmed, scored, and cut by the studio in one afternoon
                </p>
                <button
                  type="button"
                  onClick={toggleSound}
                  className="rounded-full bg-[#F5B700] border-2 border-[#F5B700] px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#161616] transition-all hover:-translate-y-0.5"
                >
                  {muted ? '► Watch With Sound' : '❚❚ Mute'}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
