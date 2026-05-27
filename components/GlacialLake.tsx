/**
 * GlacialLake. A stylized SVG illustration: peaks reflected in a turquoise
 * lake with animated ripples. Use as a one-off feature illustration.
 *
 *   <GlacialLake />                    default, 16:9-ish frame
 *   <GlacialLake variant="dawn" />     sunrise-tinted reflection
 *
 * The ripples animate via SVG feTurbulence baseFrequency, mutating slowly so
 * the lake surface visibly breathes without ever feeling busy.
 */
type Props = {
  variant?: 'dawn' | 'twilight';
  className?: string;
};

export default function GlacialLake({ variant = 'dawn', className = '' }: Props) {
  const isDawn = variant === 'dawn';

  return (
    <div
      aria-hidden="true"
      className={`relative w-full overflow-hidden rounded-2xl ${className}`}
    >
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="block w-full h-full"
      >
        <defs>
          {/* Sky */}
          <linearGradient id="gl-sky" x1="0" y1="0" x2="0" y2="1">
            {isDawn ? (
              <>
                <stop offset="0%" stopColor="#1A1140" />
                <stop offset="45%" stopColor="#3A1A4F" />
                <stop offset="75%" stopColor="#FF8E72" />
                <stop offset="92%" stopColor="#FFB347" />
                <stop offset="100%" stopColor="#FFE2B0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#0E0824" />
                <stop offset="60%" stopColor="#1A1140" />
                <stop offset="100%" stopColor="#3A2475" />
              </>
            )}
          </linearGradient>

          {/* Lake water gradient. Turquoise glacial. */}
          <linearGradient id="gl-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FE4C5" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#4ECDC4" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1A6C7A" stopOpacity="1" />
          </linearGradient>

          {/* Reflected sun streak on water */}
          <linearGradient id="gl-streak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE2B0" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#FFB347" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF8E72" stopOpacity="0" />
          </linearGradient>

          {/* Sun glow */}
          <radialGradient id="gl-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE2B0" stopOpacity="1" />
            <stop offset="35%" stopColor="#FFB347" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#FF8E72" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
          </radialGradient>

          {/* Ripple filter on the water. baseFrequency animates very slowly so
              the surface looks alive without ever feeling jittery. */}
          <filter id="gl-ripple" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.04"
              numOctaves="2"
              seed="3"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="22s"
                values="0.012 0.04;0.018 0.05;0.012 0.04"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" />
          </filter>

          {/* Reflection mask (mirror the upper mountain shape down) */}
          <linearGradient id="gl-reflect-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <mask id="gl-reflect-mask">
            <rect x="0" y="450" width="1600" height="450" fill="url(#gl-reflect-fade)" />
          </mask>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="1600" height="450" fill="url(#gl-sky)" />

        {/* Sun in sky */}
        {isDawn && (
          <>
            <circle cx="1180" cy="320" r="180" fill="url(#gl-sun)" />
            <circle cx="1180" cy="320" r="58" fill="#FFE2B0" opacity="0.95" />
          </>
        )}

        {/* Distant ridge */}
        <path
          d="M 0 450 L 0 360 L 180 340 L 360 355 L 540 330 L 720 348 L 900 325 L 1080 345 L 1260 330 L 1440 350 L 1600 340 L 1600 450 Z"
          fill="#3A2475"
          opacity="0.6"
        />

        {/* Mid ridge */}
        <path
          d="M 0 450 L 0 380 L 140 330 L 280 360 L 440 290 L 600 340 L 780 270 L 940 320 L 1120 260 L 1300 310 L 1460 285 L 1600 320 L 1600 450 Z"
          fill="#2A1A55"
          opacity="0.85"
        />

        {/* Foreground ridge (sharp peaks with snow caps) */}
        <g>
          <path
            d="M 0 450 L 0 405 L 90 365 L 180 400 L 280 320 L 380 380 L 480 280 L 600 360 L 740 250 L 880 340 L 1020 270 L 1160 350 L 1300 285 L 1440 365 L 1600 310 L 1600 450 Z"
            fill="#0E0824"
          />
          {/* Snow caps on the sharpest peaks */}
          <path
            d="M 273 328 L 280 320 L 287 328 Z M 472 288 L 480 280 L 488 288 Z M 732 258 L 740 250 L 748 258 Z M 1012 278 L 1020 270 L 1028 278 Z M 1292 293 L 1300 285 L 1308 293 Z"
            fill="#F5F0FA"
            opacity="0.85"
          />
        </g>

        {/* Water surface base */}
        <rect x="0" y="450" width="1600" height="450" fill="url(#gl-water)" />

        {/* Reflected mountains group, vertically flipped + rippled */}
        <g
          mask="url(#gl-reflect-mask)"
          transform="translate(0,900) scale(1,-1)"
          filter="url(#gl-ripple)"
          opacity="0.65"
        >
          {/* Distant reflected ridge */}
          <path
            d="M 0 450 L 0 360 L 180 340 L 360 355 L 540 330 L 720 348 L 900 325 L 1080 345 L 1260 330 L 1440 350 L 1600 340 L 1600 450 Z"
            fill="#3A2475"
          />
          {/* Mid reflected ridge */}
          <path
            d="M 0 450 L 0 380 L 140 330 L 280 360 L 440 290 L 600 340 L 780 270 L 940 320 L 1120 260 L 1300 310 L 1460 285 L 1600 320 L 1600 450 Z"
            fill="#2A1A55"
          />
          {/* Foreground reflected ridge */}
          <path
            d="M 0 450 L 0 405 L 90 365 L 180 400 L 280 320 L 380 380 L 480 280 L 600 360 L 740 250 L 880 340 L 1020 270 L 1160 350 L 1300 285 L 1440 365 L 1600 310 L 1600 450 Z"
            fill="#0E0824"
          />
        </g>

        {/* Sun reflection streak on water */}
        {isDawn && (
          <rect
            x="1140"
            y="450"
            width="80"
            height="380"
            fill="url(#gl-streak)"
            filter="url(#gl-ripple)"
            opacity="0.85"
          />
        )}

        {/* Horizon glow line where mountains meet water */}
        <rect x="0" y="446" width="1600" height="6" fill="#FFB347" opacity="0.25" />
        <rect x="0" y="448" width="1600" height="2" fill="#FFE2B0" opacity="0.55" />

        {/* Subtle water highlights */}
        <g opacity="0.35" filter="url(#gl-ripple)">
          <line x1="0" y1="540" x2="1600" y2="540" stroke="#7FE4C5" strokeWidth="1" />
          <line x1="0" y1="600" x2="1600" y2="600" stroke="#7FE4C5" strokeWidth="0.6" />
          <line x1="0" y1="680" x2="1600" y2="680" stroke="#7FE4C5" strokeWidth="0.4" />
          <line x1="0" y1="760" x2="1600" y2="760" stroke="#7FE4C5" strokeWidth="0.3" />
        </g>
      </svg>
    </div>
  );
}
