'use client';

import { useEffect, useRef } from 'react';

/**
 * A six-second scroll through the real live site, laid over the still. It plays
 * while the card is hovered on a desktop, and while the card is on screen on a
 * touch device. Nothing loads until it is needed (preload none), and it stays a
 * still under prefers-reduced-motion.
 */
export default function WorkVideo({ src, className }: { src: string; className: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    const card = video?.closest('a');
    if (!video || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const play = () => { video.play().then(() => video.setAttribute('data-playing', '')).catch(() => {}); };
    const stop = () => { video.pause(); video.currentTime = 0; video.removeAttribute('data-playing'); };

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      card.addEventListener('pointerenter', play);
      card.addEventListener('pointerleave', stop);
      card.addEventListener('focus', play);
      card.addEventListener('blur', stop);
      return () => {
        card.removeEventListener('pointerenter', play);
        card.removeEventListener('pointerleave', stop);
        card.removeEventListener('focus', play);
        card.removeEventListener('blur', stop);
      };
    }
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : stop()), { threshold: 0.6 });
    io.observe(card);
    return () => io.disconnect();
  }, []);

  return <video ref={ref} className={className} src={src} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />;
}
