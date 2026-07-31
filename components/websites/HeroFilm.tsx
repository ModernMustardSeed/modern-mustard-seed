'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

/**
 * The /websites hero film: a real scroll through a real build, recorded off
 * the live site by scripts/record-wildmere-scroll.mjs.
 *
 * The poster carries the hero. It is a next/image with priority, so it is the
 * LCP paint and mobile gets a small AVIF instead of the full-width JPEG. The
 * film layers on top and fades in once it can actually play, and it is only
 * ever fetched when all three are true: a screen wide enough to read a whole
 * website inside a 16:10 box, no prefers-reduced-motion, and the frame in
 * view. On a phone the film's own type is too small to read anyway, so the
 * poster stands alone there and the page load never pays the 2.5MB.
 *
 * Silent and decorative (the caption underneath carries the meaning for
 * assistive tech), but it loops past five seconds, so WCAG 2.2.2 needs a way
 * to stop it. Hence the corner control, which only appears with the film.
 */
const FILM_MIN_WIDTH = 768;

export default function HeroFilm({
  src,
  poster,
  alt,
}: {
  src: string;
  poster: string;
  alt: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [wanted, setWanted] = useState(false); // this visitor should get the film
  const [ready, setReady] = useState(false); // it has enough data to show
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia(`(min-width: ${FILM_MIN_WIDTH}px)`);
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!wide.matches || calm.matches) return;

    const wrap = wrapRef.current;
    if (!wrap) return;
    // Nothing is fetched until the frame is near the viewport, which keeps the
    // film off the critical path even though it sits above the fold.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setWanted(true);
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!wanted || !v) return;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [wanted]);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Image
        src={poster}
        alt={alt}
        width={1280}
        height={800}
        priority
        sizes="(min-width: 1024px) 58vw, 100vw"
        className="block w-full h-auto aspect-[16/10] object-cover"
      />

      {wanted && (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onCanPlay={() => setReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {wanted && ready && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={!playing}
          aria-label={playing ? 'Pause the site walkthrough' : 'Play the site walkthrough'}
          className="group absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 text-[#161616] shadow-[2px_2px_0_0_#161616] transition-colors hover:bg-[#FFC400]"
        >
          {playing ? (
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]">
            {playing ? 'Pause' : 'Play'}
          </span>
        </button>
      )}
    </div>
  );
}
