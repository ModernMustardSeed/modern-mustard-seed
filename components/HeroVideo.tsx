'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';

// Contained, comic-framed film: the Night Shift commercial (the 3D mustard
// seed mascot spot). Lives in TheClose at the bottom of the homepage.
// Autoplays muted; one tap brings the sound in, since browsers block
// autoplay with audio. Tracks view / sound-on / watched-through so the
// spot's pull toward "Book a call" is measurable.
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const viewed = useRef(false);
  const watched = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // The film is preload="none" so the page load never pays for it (the
    // source is ~2.5MB, the old eager 1080p was 22MB). Start fetching and
    // playing only when the band approaches the viewport.
    const loader = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        loader.disconnect();
        v.play().catch(() => {});
      },
      { rootMargin: '800px 0px' }
    );
    loader.observe(v);
    // A real "view" is the film band actually on screen, not fetch starting.
    const io = new IntersectionObserver(
      (entries) => {
        if (viewed.current || !entries.some((e) => e.isIntersecting)) return;
        viewed.current = true;
        track('commercial_view');
      },
      { threshold: 0.5 }
    );
    io.observe(v);
    // The film loops, so 'ended' never fires. Count a watch-through the
    // first time playback crosses 90% of the runtime while on screen.
    const onTime = () => {
      if (watched.current || !viewed.current || !v.duration) return;
      if (v.currentTime / v.duration > 0.9) {
        watched.current = true;
        track('commercial_watched');
      }
    };
    v.addEventListener('timeupdate', onTime);
    return () => {
      io.disconnect();
      v.removeEventListener('timeupdate', onTime);
    };
  }, []);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) {
      track('commercial_sound_on');
      v.play().catch(() => {});
    }
  }

  return (
    <div className="relative rounded-3xl overflow-hidden border-[3px] border-[#161616] bg-[#161616] shadow-[8px_8px_0_0_#161616]">
      <video
        ref={videoRef}
        className="w-full aspect-video object-cover block"
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        style={{ backgroundColor: '#161616' }}
      >
        <source src="/video/night-shift-960.mp4" type="video/mp4" />
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
