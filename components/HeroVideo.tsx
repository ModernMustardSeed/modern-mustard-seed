'use client';

import { useRef, useState } from 'react';

// Contained, comic-framed hero video with an optional soundtrack. Lives at the
// bottom of the hero now (no longer the backdrop). Autoplays muted; one tap
// brings the music in, since browsers block autoplay with audio.
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) v.play().catch(() => {});
  }

  return (
    <div className="relative rounded-3xl overflow-hidden border-[3px] border-[#161616] bg-[#161616] shadow-[8px_8px_0_0_#161616]">
      <video
        ref={videoRef}
        className="w-full aspect-video object-cover block"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{ backgroundColor: '#161616' }}
      >
        <source src="/video/hero-seed.mp4" type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={!muted}
        aria-label={muted ? 'Turn on sound' : 'Mute sound'}
        className="group absolute bottom-3 right-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] font-bold hover:bg-[#FFC400] transition-colors"
      >
        {muted ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
        <span className="text-[9px] uppercase tracking-[0.25em] font-mono">{muted ? 'Sound' : 'Mute'}</span>
      </button>
    </div>
  );
}
