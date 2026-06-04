'use client';

import { useRef, useState } from 'react';

// Hero backdrop video with an optional soundtrack. Browsers block autoplay
// with audio, so the video autoplays muted and the visitor taps once to bring
// the music in. No periods in user-facing copy (brand rule).
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) {
      // Restart from the top so the music lands with the visual
      v.play().catch(() => {});
    }
  }

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0 motion-reduce-hide"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{ backgroundColor: '#D98E2B' }}
      >
        <source src="/video/hero-seed.mp4" type="video/mp4" />
      </video>

      {/* Sound toggle: brings the music in on first tap */}
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={!muted}
        aria-label={muted ? 'Turn on sound' : 'Mute sound'}
        className="group absolute bottom-10 right-6 md:right-10 z-20 inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-cream-100/35 bg-midnight-700/45 backdrop-blur-md text-cream-100 hover:border-cream-100/60 hover:bg-midnight-700/65 transition-all"
      >
        {muted ? (
          <svg className="w-4 h-4 text-gold-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gold-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
        <span className="text-[9px] uppercase tracking-[0.3em] font-mono font-medium">
          {muted ? 'Sound' : 'Mute'}
        </span>
      </button>
    </>
  );
}
