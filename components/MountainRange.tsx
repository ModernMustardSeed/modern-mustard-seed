'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * MountainRange. Painterly cinematic ridge with morning sunshine.
 *
 * Five ridges drawn with smooth-curve SVG paths (quadratic Bezier) so they
 * read as eroded alpine ridges rather than stick-figure peaks. Each ridge
 * carries a sun-lit warm rim highlight on its sun-facing side and a cool
 * deep-sky shadow on the opposite side. Snow caps flow along the ridge
 * contours instead of sitting as separate triangles. Atmospheric perspective
 * blurs the rear layers; the foreground is sharp. The whole composition is
 * draped with a strong morning sun, warm halo, and horizon glow.
 *
 *   <MountainRange />                full-width feature, sun on
 *   <MountainRange height="lg" />    taller cinematic banner
 *   <MountainRange showSun={false} /> moody pre-dawn variant
 */
type Props = {
  height?: 'sm' | 'md' | 'lg';
  showSun?: boolean;
  className?: string;
};

const HEIGHTS = {
  sm: 'h-44 md:h-64',
  md: 'h-64 md:h-96',
  lg: 'h-80 md:h-[32rem]',
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
      className={`relative w-full overflow-hidden ${HEIGHTS[height]} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1920 700"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Cabin-at-dusk sky: midnight top deepening to brass horizon */}
          <linearGradient id="mr-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#04060d" />
            <stop offset="28%" stopColor="#080c16" />
            <stop offset="55%" stopColor="#1A1A2E" />
            <stop offset="78%" stopColor="#2D2D44" />
            <stop offset="90%" stopColor="#C8964E" />
            <stop offset="100%" stopColor="#F0D090" />
          </linearGradient>

          {/* Sun: cream-white core, brass corona, fading to ember */}
          <radialGradient id="mr-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#FCFAF5" stopOpacity="1" />
            <stop offset="20%" stopColor="#F5F0E8" stopOpacity="0.96" />
            <stop offset="42%" stopColor="#F0D090" stopOpacity="0.80" />
            <stop offset="72%" stopColor="#C8964E" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
          </radialGradient>

          {/* Wide brass halo wash across the right side of the sky */}
          <radialGradient id="mr-halo" cx="78%" cy="32%" r="55%">
            <stop offset="0%"  stopColor="#E8C88A" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#C8964E" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#C8964E" stopOpacity="0" />
          </radialGradient>

          {/* Horizon glow ribbon (sun line meets the rear ridge): brass+ember */}
          <linearGradient id="mr-horizon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#F0D090" stopOpacity="0" />
            <stop offset="50%" stopColor="#C8964E" stopOpacity="0.60" />
            <stop offset="100%" stopColor="#C86A45" stopOpacity="0" />
          </linearGradient>

          {/* Cool lake haze between distant ridges */}
          <linearGradient id="mr-haze-cool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#5C8AA8" stopOpacity="0" />
            <stop offset="100%" stopColor="#3B6B8A" stopOpacity="0.32" />
          </linearGradient>

          {/* Sun-facing brass rim highlight (warm gradient sweep) */}
          <linearGradient id="mr-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#C8964E" stopOpacity="0" />
            <stop offset="50%"  stopColor="#E8C88A" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#F5F0E8" stopOpacity="0.95" />
          </linearGradient>

          {/* Snow gradient: cream-bright top, fading to lake-tinted rock below */}
          <linearGradient id="mr-snow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FCFAF5" stopOpacity="0.95" />
            <stop offset="55%"  stopColor="#F5F0E8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#5C8AA8" stopOpacity="0" />
          </linearGradient>

          {/* Sun-lit snow (right side, catching the brass sun) */}
          <linearGradient id="mr-snow-lit" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#FCFAF5" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#F0D090" stopOpacity="0.78" />
          </linearGradient>

          {/* Painterly texture: fine fractal noise applied with overlay blend */}
          <filter id="mr-paint" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" values="0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.88  0 0 0 0.18 0" />
          </filter>

          {/* Soft atmospheric blur for distant ridges */}
          <filter id="mr-blur-far"  x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="3.5" /></filter>
          <filter id="mr-blur-mid"  x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="1.6" /></filter>

          {/* Sun-side clip: anything inside this region gets the brass rim */}
          <linearGradient id="mr-warm-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#000" stopOpacity="0" />
            <stop offset="55%"  stopColor="#000" stopOpacity="0" />
            <stop offset="80%"  stopColor="#C8964E" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#E8C88A" stopOpacity="0.52" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="1920" height="700" fill="url(#mr-sky)" />

        {/* Wide warm sun halo over the right half of the sky */}
        {showSun && <rect x="0" y="0" width="1920" height="700" fill="url(#mr-halo)" />}

        {/* Sun disk */}
        {showSun && (
          <g style={{ transform: `translateY(${offset * 25}px)` }}>
            <circle cx="1480" cy="295" r="230" fill="url(#mr-sun)" />
            <circle cx="1480" cy="295" r="62" fill="#F5F0E8" opacity="0.98" />
            <circle cx="1480" cy="295" r="36" fill="#FCFAF5" opacity="0.98" />
          </g>
        )}

        {/* Ridge 1: farthest, pale, atmospheric.  Curves flow gently. */}
        <g filter="url(#mr-blur-far)" style={{ transform: `translateY(${offset * 12}px)` }}>
          <path
            d="
              M 0 700
              L 0 410
              Q 160 372 320 405
              T 640 395
              T 960 380
              T 1280 388
              T 1600 372
              T 1920 388
              L 1920 700 Z
            "
            fill="#1a1a2e"
            opacity="0.5"
          />
          {/* Sun-facing rim on rear ridge */}
          <path
            d="
              M 0 700
              L 0 410
              Q 160 372 320 405
              T 640 395
              T 960 380
              T 1280 388
              T 1600 372
              T 1920 388
              L 1920 700 Z
            "
            fill="url(#mr-warm-side)"
            opacity="0.55"
          />
        </g>

        {/* Cool atmospheric haze drifting up off the rear ridges */}
        <rect x="0" y="380" width="1920" height="80" fill="url(#mr-haze-cool)" />

        {/* Ridge 2: mid-far, soft blur still */}
        <g filter="url(#mr-blur-mid)" style={{ transform: `translateY(${offset * 22}px)` }}>
          <path
            d="
              M 0 700
              L 0 440
              Q 220 380 420 422
              Q 560 395 720 408
              Q 880 370 1080 405
              Q 1240 370 1420 410
              Q 1580 388 1780 405
              Q 1860 398 1920 408
              L 1920 700 Z
            "
            fill="#0f1422"
            opacity="0.88"
          />
          <path
            d="
              M 0 700
              L 0 440
              Q 220 380 420 422
              Q 560 395 720 408
              Q 880 370 1080 405
              Q 1240 370 1420 410
              Q 1580 388 1780 405
              Q 1860 398 1920 408
              L 1920 700 Z
            "
            fill="url(#mr-warm-side)"
            opacity="0.7"
          />
        </g>

        {/* Horizon glow line where sun light grazes the mid ridges */}
        {showSun && (
          <rect x="0" y="402" width="1920" height="42" fill="url(#mr-horizon)" />
        )}

        {/* Ridge 3: mid, sharper but still rolling */}
        <g style={{ transform: `translateY(${offset * 32}px)` }}>
          <path
            d="
              M 0 700
              L 0 478
              Q 140 412 300 448
              Q 420 380 560 422
              Q 700 358 860 410
              Q 1010 350 1170 405
              Q 1320 348 1480 400
              Q 1640 360 1800 398
              Q 1880 386 1920 400
              L 1920 700 Z
            "
            fill="#080c16"
            opacity="0.95"
          />
          {/* Sun rim along the top edge, only on the right (sun) side */}
          <path
            d="
              M 0 478
              Q 140 412 300 448
              Q 420 380 560 422
              Q 700 358 860 410
              Q 1010 350 1170 405
              Q 1320 348 1480 400
              Q 1640 360 1800 398
              Q 1880 386 1920 400
              L 1920 412
              Q 1880 398 1800 410
              Q 1640 372 1480 412
              Q 1320 360 1170 417
              Q 1010 362 860 422
              Q 700 370 560 434
              Q 420 392 300 460
              Q 140 424 0 490 Z
            "
            fill="url(#mr-rim)"
            opacity="0.75"
          />
          {/* Subtle flowing snow caps along the highest peaks */}
          <path
            d="
              M 280 458
              Q 300 442 320 458
              Q 320 462 318 466
              Q 300 462 282 466
              Z
              M 540 432
              Q 560 412 580 432
              Q 580 437 578 442
              Q 560 437 542 442
              Z
              M 840 422
              Q 860 398 880 422
              Q 880 428 878 432
              Q 860 428 842 432
              Z
              M 1150 415
              Q 1170 390 1190 415
              Q 1190 421 1188 425
              Q 1170 421 1152 425
              Z
              M 1460 410
              Q 1480 386 1500 410
              Q 1500 416 1498 420
              Q 1480 416 1462 420
              Z
              M 1780 408
              Q 1800 388 1820 408
              Q 1820 414 1818 418
              Q 1800 414 1782 418
              Z
            "
            fill="url(#mr-snow)"
          />
        </g>

        {/* Ridge 4: mid-front. Rolling curves with a couple of sharper peaks */}
        <g style={{ transform: `translateY(${offset * 46}px)` }}>
          <path
            d="
              M 0 700
              L 0 525
              Q 120 450 240 505
              Q 360 410 500 475
              Q 640 380 800 450
              Q 960 365 1120 442
              Q 1280 360 1440 432
              Q 1600 380 1760 422
              Q 1840 412 1920 432
              L 1920 700 Z
            "
            fill="#04060d"
            opacity="0.97"
          />
          {/* Lit edge along sun-facing peaks (right half) */}
          <path
            d="
              M 800 450
              Q 960 365 1120 442
              Q 1280 360 1440 432
              Q 1600 380 1760 422
              Q 1840 412 1920 432
              L 1920 446
              Q 1840 425 1760 436
              Q 1600 396 1440 448
              Q 1280 378 1120 458
              Q 960 384 800 466 Z
            "
            fill="url(#mr-rim)"
            opacity="0.85"
          />
          {/* Snow caps following the ridge curves */}
          <path
            d="
              M 220 490
              Q 240 462 262 490
              L 262 498
              Q 240 494 220 498 Z
              M 480 462
              Q 500 425 522 462
              L 522 470
              Q 500 466 480 470 Z
              M 780 460
              Q 800 408 822 460
              L 822 468
              Q 800 464 780 468 Z
              M 1100 450
              Q 1120 388 1142 450
              L 1142 460
              Q 1120 456 1100 460 Z
              M 1420 442
              Q 1440 385 1462 442
              L 1462 452
              Q 1440 448 1420 452 Z
              M 1740 432
              Q 1760 400 1782 432
              L 1782 440
              Q 1760 436 1740 440 Z
            "
            fill="url(#mr-snow)"
            opacity="0.95"
          />
          {/* Warm-lit snow on the right (sun-facing) flanks */}
          <path
            d="
              M 1100 450
              Q 1120 388 1142 450
              L 1142 460
              Q 1120 456 1100 460 Z
              M 1420 442
              Q 1440 385 1462 442
              L 1462 452
              Q 1440 448 1420 452 Z
              M 1740 432
              Q 1760 400 1782 432
              L 1782 440
              Q 1760 436 1740 440 Z
            "
            fill="url(#mr-snow-lit)"
          />
        </g>

        {/* Ridge 5: foreground, sharpest, most detail */}
        <g style={{ transform: `translateY(${offset * 62}px)` }}>
          <path
            d="
              M 0 700
              L 0 595
              Q 60 545 130 580
              Q 200 495 290 555
              Q 360 470 460 540
              Q 540 450 660 510
              Q 760 425 880 500
              Q 1000 410 1140 490
              Q 1260 405 1400 488
              Q 1540 415 1680 478
              Q 1800 440 1920 470
              L 1920 700 Z
            "
            fill="#04060d"
          />
          {/* Foreground lit-edge along the right ridge tops */}
          <path
            d="
              M 880 500
              Q 1000 410 1140 490
              Q 1260 405 1400 488
              Q 1540 415 1680 478
              Q 1800 440 1920 470
              L 1920 484
              Q 1800 456 1680 492
              Q 1540 432 1400 502
              Q 1260 420 1140 506
              Q 1000 426 880 516 Z
            "
            fill="url(#mr-rim)"
            opacity="0.9"
          />
          {/* Hero snow caps along the highest foreground peaks */}
          <path
            d="
              M 115 575
              Q 130 538 150 575
              L 150 585
              Q 130 580 115 585 Z
              M 275 552
              Q 290 482 312 552
              L 312 562
              Q 290 557 275 562 Z
              M 440 540
              Q 460 458 482 540
              L 482 552
              Q 460 547 440 552 Z
              M 640 510
              Q 660 438 682 510
              L 682 522
              Q 660 517 640 522 Z
              M 860 502
              Q 880 412 902 502
              L 902 515
              Q 880 510 860 515 Z
              M 1118 490
              Q 1140 398 1162 490
              L 1162 504
              Q 1140 499 1118 504 Z
              M 1378 488
              Q 1400 392 1422 488
              L 1422 502
              Q 1400 497 1378 502 Z
              M 1658 478
              Q 1680 402 1702 478
              L 1702 492
              Q 1680 487 1658 492 Z
            "
            fill="url(#mr-snow)"
          />
          {/* Warm-lit snow on the right side (catching the sun) */}
          <path
            d="
              M 860 502
              Q 880 412 902 502
              L 902 515
              Q 880 510 860 515 Z
              M 1118 490
              Q 1140 398 1162 490
              L 1162 504
              Q 1140 499 1118 504 Z
              M 1378 488
              Q 1400 392 1422 488
              L 1422 502
              Q 1400 497 1378 502 Z
              M 1658 478
              Q 1680 402 1702 478
              L 1702 492
              Q 1680 487 1658 492 Z
            "
            fill="url(#mr-snow-lit)"
          />
        </g>

        {/* Painterly texture overlay across everything (fine fractal grain) */}
        <rect x="0" y="0" width="1920" height="700" filter="url(#mr-paint)" opacity="0.35" />

        {/* Warm sun light "drape": a soft warm wash across the lower-right
            foreground, as if morning light is spilling onto the ridges */}
        {showSun && (
          <rect
            x="0" y="380" width="1920" height="320"
            fill="url(#mr-halo)"
            opacity="0.45"
          />
        )}
      </svg>
    </div>
  );
}
