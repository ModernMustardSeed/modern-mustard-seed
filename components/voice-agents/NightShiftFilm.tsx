'use client';

import { useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * The Night Shift commercial, click to play with sound. Poster-first so the
 * page never pays for 2.5MB of video the visitor did not ask for.
 */
export default function NightShiftFilm() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const el = videoRef.current;
    if (!el) return;
    trackEvent('video_play', { name: 'night-shift', location: 'voice-agents' });
    el.play();
    setPlaying(true);
  };

  return (
    <figure className="relative rotate-[-0.8deg]">
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-[#161616] bg-[#161616] shadow-[10px_10px_0_0_#F5B700]">
        <video
          ref={videoRef}
          className="block w-full h-auto"
          poster="/video/night-shift-poster.jpg"
          preload="none"
          playsInline
          controls={playing}
          onEnded={() => setPlaying(false)}
        >
          <source src="/video/night-shift-960.mp4" type="video/mp4" />
        </video>

        {!playing && (
          <button
            type="button"
            onClick={play}
            aria-label="Play the Night Shift commercial"
            className="group absolute inset-0 flex items-center justify-center bg-[#161616]/25 transition-colors hover:bg-[#161616]/10"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-[#161616] bg-[#F5B700] shadow-[4px_4px_0_0_#161616] transition-transform duration-300 group-hover:scale-110">
              <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true">
                <path d="M2 2.5 24 15 2 27.5Z" fill="#161616" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#FBF6EA]/70">
        The Night Shift · 60 seconds · sound on
      </figcaption>
    </figure>
  );
}
