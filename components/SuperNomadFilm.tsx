'use client';

import { useState } from 'react';

/**
 * The Super Nomad launch film.
 *
 * Nothing but the poster loads until somebody asks for it: `preload="none"`
 * and the video element is not even mounted until the play button is pressed.
 * The film is silent and carries its own on-screen lines, so there is no audio
 * track to caption.
 */
export default function SuperNomadFilm() {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="overflow-hidden rounded-3xl border border-[#F4ECDC]/12 bg-[#050A14] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]">
      <div className="relative aspect-video w-full">
        {playing ? (
          <video
            className="absolute inset-0 h-full w-full"
            controls
            autoPlay
            playsInline
            preload="auto"
            poster="/super-nomad/super-nomad-launch-poster.jpg"
          >
            <source src="/super-nomad/super-nomad-launch-1280.webm" type="video/webm" />
            <source src="/super-nomad/super-nomad-launch-1280.mp4" type="video/mp4" />
            Your browser cannot play this video.{' '}
            <a href="/super-nomad/super-nomad-launch-1280.mp4">Download it instead.</a>
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play the Super Nomad film, 41 seconds, no sound"
            className="group absolute inset-0 h-full w-full cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/super-nomad/super-nomad-launch-poster.jpg"
              alt="Earth's curved horizon at the day and night line, under the words Where should your life happen next"
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 transition-colors group-hover:bg-[#070D1A]/10"
              style={{ background: 'radial-gradient(60% 60% at 50% 55%, rgba(7,13,26,0.28) 0%, rgba(7,13,26,0) 70%)' }}
            />
            {/* The poster sets its type on the left, so the button takes the empty side. */}
            <span className="absolute inset-0 flex items-center justify-center md:left-auto md:w-2/5">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F5B700] shadow-[0_14px_40px_-8px_rgba(245,183,0,0.7)] transition-transform group-hover:scale-105 md:h-24 md:w-24">
                <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true">
                  <path d="M28.5 15.3a2 2 0 0 1 0 3.4L3.1 33.6A2 2 0 0 1 0 31.9V2.1A2 2 0 0 1 3.1.4Z" fill="#070D1A" />
                </svg>
              </span>
            </span>
            <span className="absolute bottom-5 left-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[#E6DCC6]/80 md:bottom-7 md:left-8">
              Watch · 41 seconds · no sound
            </span>
          </button>
        )}
      </div>
      <figcaption className="border-t border-[#F4ECDC]/10 px-6 py-4 font-body text-sm text-[#98A1B4] md:px-8">
        Every phone frame is the real app running, captured from the live demo. Not a mockup.
      </figcaption>
    </figure>
  );
}
