'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cinematic mountain range. Five SVG ridges in atmospheric perspective with a
 * sunrise sky and a glowing sun. Subtle scroll parallax per layer.
 *
 * Drop in as a section divider or feature panel. Aspect 3.2:1.
 *
 *   <MountainRange />                       full-width section divider
 *   <MountainRange height="lg" />           taller feature panel
 *   <MountainRange showSun={false} />       no sun (cooler atmosphere)
 */
type Props = {
  height?: 'sm' | 'md' | 'lg';
  showSun?: boolean;
  className?: string;
};

const HEIGHTS = {
  sm: 'h-40 md:h-56',
  md: 'h-56 md:h-80',
  lg: 'h-72 md:h-[28rem]',
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
      // -1 (above viewport) to +1 (below viewport)
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
      className={`relative w-full overflow-hidden ${HEIGHTS[height]} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1920 600"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Sky gradient: aubergine top -> rose -> gold horizon */}
          <linearGradient id="mr-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1140" />
            <stop offset="50%" stopColor="#2A1A55" />
            <stop offset="78%" stopColor="#5A2D5A" />
            <stop offset="92%" stopColor="#FF8E72" />
            <stop offset="100%" stopColor="#FFB347" />
          </linearGradient>

          {/* Sun glow */}
          <radialGradient id="mr-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE2B0" stopOpacity="1" />
            <stop offset="35%" stopColor="#FFB347" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#FF8E72" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
          </radialGradient>

          {/* Atmospheric haze between ridges (warm) */}
          <linearGradient id="mr-haze-warm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFB347" stopOpacity="0" />
            <stop offset="60%" stopColor="#FF8E72" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.28" />
          </linearGradient>

          {/* Atmospheric haze (cool, between higher ridges) */}
          <linearGradient id="mr-haze-cool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FE4C5" stopOpacity="0" />
            <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0.18" />
          </linearGradient>

          {/* Snow-cap highlight gradient */}
          <linearGradient id="mr-snow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FAFAFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#E8E0F0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="1920" height="600" fill="url(#mr-sky)" />

        {/* Sun disk */}
        {showSun && (
          <g style={{ transform: `translateY(${offset * 30}px)` }}>
            <circle cx="1380" cy="380" r="160" fill="url(#mr-sun)" />
            <circle cx="1380" cy="380" r="52" fill="#FFE2B0" opacity="0.95" />
          </g>
        )}

        {/* Ridge 1: farthest, washed in haze */}
        <g style={{ transform: `translateY(${offset * 14}px)` }}>
          <path
            d="M 0 600 L 0 350 L 240 340 L 480 348 L 720 337 L 960 343 L 1200 335 L 1440 342 L 1680 338 L 1920 345 L 1920 600 Z"
            fill="#3A2475"
            opacity="0.55"
          />
        </g>

        {/* Ridge 2 */}
        <g style={{ transform: `translateY(${offset * 22}px)` }}>
          <path
            d="M 0 600 L 0 380 L 200 358 L 380 372 L 560 345 L 740 365 L 920 340 L 1100 360 L 1280 335 L 1460 355 L 1640 340 L 1820 358 L 1920 348 L 1920 600 Z"
            fill="#2A1A55"
            opacity="0.85"
          />
        </g>

        {/* Cool haze layer over ridge 2 base */}
        <rect x="0" y="340" width="1920" height="80" fill="url(#mr-haze-cool)" />

        {/* Ridge 3 */}
        <g style={{ transform: `translateY(${offset * 32}px)` }}>
          <path
            d="M 0 600 L 0 410 L 160 365 L 300 388 L 440 325 L 600 368 L 760 315 L 920 358 L 1080 305 L 1240 348 L 1400 295 L 1560 338 L 1720 295 L 1920 328 L 1920 600 Z"
            fill="#1F134A"
            opacity="0.92"
          />
        </g>

        {/* Warm haze layer for sunrise glow at horizon */}
        <rect x="0" y="380" width="1920" height="100" fill="url(#mr-haze-warm)" />

        {/* Ridge 4 */}
        <g style={{ transform: `translateY(${offset * 45}px)` }}>
          <path
            d="M 0 600 L 0 450 L 120 380 L 220 415 L 340 340 L 480 385 L 620 310 L 760 355 L 900 285 L 1060 340 L 1200 275 L 1360 322 L 1500 268 L 1660 315 L 1820 292 L 1920 285 L 1920 600 Z"
            fill="#150E33"
            opacity="0.98"
          />
        </g>

        {/* Ridge 5: foreground, sharpest, near-black with snow caps */}
        <g style={{ transform: `translateY(${offset * 60}px)` }}>
          <path
            d="M 0 600 L 0 490 L 80 425 L 160 470 L 240 380 L 340 415 L 440 320 L 540 365 L 660 280 L 780 345 L 900 260 L 1020 325 L 1140 240 L 1280 305 L 1400 230 L 1540 295 L 1680 255 L 1820 315 L 1920 275 L 1920 600 Z"
            fill="#0A0620"
          />
          {/* Snow caps on the highest peaks of ridge 5 */}
          <path
            d="M 230 388 L 240 380 L 250 388 Z M 430 328 L 440 320 L 450 328 Z M 650 288 L 660 280 L 670 288 Z M 890 268 L 900 260 L 910 268 Z M 1130 248 L 1140 240 L 1150 248 Z M 1390 238 L 1400 230 L 1410 238 Z M 1670 263 L 1680 255 L 1690 263 Z"
            fill="url(#mr-snow)"
          />
        </g>
      </svg>
    </div>
  );
}
