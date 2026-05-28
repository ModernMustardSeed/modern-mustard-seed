'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * MountainRange. Real cinematic alpine footage as a section banner, color-
 * graded to the brand. Reuses the hero skiing video as the visual asset so
 * the entire site lives inside one continuous filmed landscape rather than
 * illustrated cartoon peaks.
 *
 * Layered treatment over the video:
 *  - Midnight base tint (multiply) to anchor the brand
 *  - Brass + ember radial sun halo on the right
 *  - Vignette to focus attention
 *  - Painterly grain overlay
 *  - Optional sun disk in the upper right
 *
 *   <MountainRange />                full-width section banner
 *   <MountainRange height="lg" />    taller cinematic moment
 *   <MountainRange showSun={false} /> moody pre-dawn variant
 */
type Props = {
  height?: 'sm' | 'md' | 'lg';
  showSun?: boolean;
  className?: string;
};

const HEIGHTS = {
  sm: 'h-48 md:h-72',
  md: 'h-72 md:h-[28rem]',
  lg: 'h-96 md:h-[36rem]',
};

export default function MountainRange({
  height = 'md',
  showSun = true,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const t = (rect.top + rect.height / 2 - viewportH / 2) / viewportH;
      setOffset(t);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden isolate ${HEIGHTS[height]} ${className}`}
      aria-hidden="true"
    >
      {/* Layer 0: midnight plate */}
      <div className="absolute inset-0 z-0 bg-[#080c16]" />

      {/* Layer 1: real alpine footage, color-graded */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 motion-reduce-hide"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          backgroundColor: '#080c16',
          filter: 'brightness(0.7) contrast(1.05) saturate(0.78) sepia(0.15)',
        }}
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* Layer 2: midnight wash to push the footage into the brand */}
      <div
        className="absolute inset-0 z-[1] bg-[#080c16]/55 mix-blend-multiply pointer-events-none"
      />

      {/* Layer 3: brass + ember radial halo where the sun belongs */}
      {showSun && (
        <div
          className="absolute inset-0 z-[1] mix-blend-screen pointer-events-none"
          style={{
            background:
              'radial-gradient(circle 380px at 80% 28%, rgba(245,240,232,0.42) 0%, rgba(240,208,144,0.32) 20%, rgba(200,150,78,0.20) 38%, rgba(255,107,53,0.08) 60%, transparent 75%)',
          }}
        />
      )}

      {/* Layer 4: horizon brass band where the sun line drapes across */}
      {showSun && (
        <div
          className="absolute inset-x-0 z-[1] mix-blend-overlay pointer-events-none"
          style={{
            top: '52%',
            height: '14%',
            background:
              'linear-gradient(180deg, transparent 0%, rgba(200,150,78,0.32) 50%, transparent 100%)',
          }}
        />
      )}

      {/* Layer 5: vignette focuses the eye */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_40%,rgba(8,12,22,0.65)_88%,rgba(8,12,22,0.92)_100%)] pointer-events-none" />

      {/* Layer 6: top and bottom fades so the banner blends into surrounding sections */}
      <div className="absolute inset-x-0 top-0 h-1/4 z-[1] bg-gradient-to-b from-[#080c16] via-[#080c16]/40 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 z-[1] bg-gradient-to-t from-[#080c16] via-[#080c16]/60 to-transparent pointer-events-none" />

      {/* Layer 7: sun disk (drawn as a soft circle, parallax with scroll) */}
      {showSun && (
        <div
          className="absolute z-[2] pointer-events-none"
          style={{
            top: 'calc(22% + ' + offset * 18 + 'px)',
            right: '15%',
            width: 72,
            height: 72,
          }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background:
                'radial-gradient(circle, #FCFAF5 0%, #F5F0E8 35%, rgba(240,208,144,0.55) 65%, rgba(200,150,78,0) 100%)',
              boxShadow:
                '0 0 60px 20px rgba(240,208,144,0.35), 0 0 120px 40px rgba(200,150,78,0.2)',
            }}
          />
        </div>
      )}

      {/* Layer 8: painterly grain overlay */}
      <div className="absolute inset-0 z-[3] film-grain pointer-events-none" />
    </div>
  );
}
