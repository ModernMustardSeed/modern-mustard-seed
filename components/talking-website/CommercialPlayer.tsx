'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * The hero film for /talking-website: the Talking Website commercial.
 *
 * Unlike the /websites scroll film, this one is a narrative ad with a
 * voiceover, so muting it would throw away the whole point. It stays a poster
 * until the visitor asks for it, then plays with sound and native controls.
 * The poster is the LCP paint (next/image, priority) and the 16:9 box is
 * reserved up front, so starting the film shifts nothing.
 */
export default function CommercialPlayer({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function start() {
    setStarted(true);
    trackEvent('talking_website_commercial_play', { src });
    // The element mounts this tick; play on the next one.
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  }

  return (
    <div className="relative aspect-video bg-[#161616]">
      {!started && (
        <>
          <Image
            src={poster}
            alt={label}
            width={1280}
            height={720}
            priority
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* The whole frame is the click target, but the visible pill sits in
              the corner so it never covers the film's own title card.
              WCAG 2.5.3: the accessible name must CONTAIN the visible text
              ("Play with sound"), or voice-control users cannot say it. */}
          <button
            type="button"
            onClick={start}
            className="group absolute inset-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#F5B700]"
            aria-label={`Play with sound: ${label}`}
          >
            <span className="absolute inset-0 bg-[#161616]/10 transition-colors group-hover:bg-transparent" aria-hidden />
            <span className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full border-2 border-[#161616] bg-[#F5B700] pl-4 pr-5 py-2.5 shadow-[4px_4px_0_0_#161616] transition-transform group-hover:-translate-y-0.5">
              <svg className="h-3.5 w-3.5 text-[#161616]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#161616]">
                Play with sound
              </span>
            </span>
          </button>
        </>
      )}

      {started && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <track kind="captions" />
        </video>
      )}
    </div>
  );
}
