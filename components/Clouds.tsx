/**
 * Clouds. Pure-CSS-animated SVG clouds drifting across a section.
 *
 * Six pillowy clouds at different heights, sizes, opacities, and drift
 * speeds (45s to 110s). Soft sky-blue gradient fills with a darker
 * lavender underbelly so they read three-dimensional, not flat.
 *
 *   <section className="relative">
 *     <Clouds />
 *     ...content
 *   </section>
 *
 * Honors prefers-reduced-motion. Pointer-events disabled.
 */
type Props = {
  density?: 'subtle' | 'medium' | 'bold';
  className?: string;
};

const OPACITY = {
  subtle: 0.55,
  medium: 0.75,
  bold: 0.95,
};

// Stylized cloud shape. Multi-lobed top, soft flat-ish bottom.
function CloudShape({
  id,
  className,
  style,
  size,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  size: number;
}) {
  const w = size * 1.8;
  const h = size;
  return (
    <svg
      viewBox="0 0 300 100"
      width={w}
      height={h}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`cloud-${id}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FAFCFF" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#DCEBFB" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#8FC0EF" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={`cloud-${id}-shadow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FC0EF" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#3776C2" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* Soft shadow underneath */}
      <ellipse
        cx="150"
        cy="84"
        rx="120"
        ry="8"
        fill={`url(#cloud-${id}-shadow)`}
      />
      {/* Main cloud body. Composite of soft round bumps. */}
      <path
        d="
          M 40 78
          Q 18 78, 18 62
          Q 18 44, 42 42
          Q 48 22, 78 22
          Q 92 6, 124 14
          Q 144 -2, 172 12
          Q 196 4, 218 22
          Q 248 22, 256 42
          Q 282 44, 282 62
          Q 282 78, 260 78
          Z
        "
        fill={`url(#cloud-${id}-top)`}
      />
    </svg>
  );
}

export default function Clouds({ density = 'medium', className = '' }: Props) {
  const baseOpacity = OPACITY[density];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Stars peeking through the dawn (subtle, only at top) */}
      <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          <circle cx="12%" cy="14%" r="1" fill="#F0F5FB" opacity="0.7" />
          <circle cx="28%" cy="6%" r="0.8" fill="#F0F5FB" opacity="0.55" />
          <circle cx="44%" cy="18%" r="0.7" fill="#F0F5FB" opacity="0.5" />
          <circle cx="62%" cy="9%" r="1.2" fill="#F0F5FB" opacity="0.8" />
          <circle cx="76%" cy="22%" r="0.6" fill="#F0F5FB" opacity="0.4" />
          <circle cx="88%" cy="12%" r="0.9" fill="#F0F5FB" opacity="0.65" />
          <circle cx="34%" cy="28%" r="0.5" fill="#F0F5FB" opacity="0.35" />
          <circle cx="58%" cy="32%" r="0.7" fill="#F0F5FB" opacity="0.45" />
        </svg>
      </div>

      <div className="cloud-layer cloud-l1" style={{ opacity: baseOpacity * 0.9 }}>
        <CloudShape id="a" size={180} />
      </div>
      <div className="cloud-layer cloud-l2" style={{ opacity: baseOpacity * 0.75 }}>
        <CloudShape id="b" size={120} />
      </div>
      <div className="cloud-layer cloud-l3" style={{ opacity: baseOpacity * 0.85 }}>
        <CloudShape id="c" size={220} />
      </div>
      <div className="cloud-layer cloud-l4" style={{ opacity: baseOpacity * 0.6 }}>
        <CloudShape id="d" size={90} />
      </div>
      <div className="cloud-layer cloud-l5" style={{ opacity: baseOpacity * 0.8 }}>
        <CloudShape id="e" size={150} />
      </div>
      <div className="cloud-layer cloud-l6" style={{ opacity: baseOpacity * 0.55 }}>
        <CloudShape id="f" size={70} />
      </div>

      <style>{`
        .cloud-layer {
          position: absolute;
          will-change: transform;
        }
        @keyframes cloud-drift-right {
          0%   { transform: translateX(-30%); }
          100% { transform: translateX(160%); }
        }
        @keyframes cloud-drift-left {
          0%   { transform: translateX(160%); }
          100% { transform: translateX(-30%); }
        }

        .cloud-l1 { top: 8%;  animation: cloud-drift-right  85s linear infinite; }
        .cloud-l2 { top: 22%; animation: cloud-drift-left   62s linear infinite; }
        .cloud-l3 { top: 38%; animation: cloud-drift-right 110s linear infinite; }
        .cloud-l4 { top: 16%; animation: cloud-drift-left   48s linear infinite; }
        .cloud-l5 { top: 52%; animation: cloud-drift-right  95s linear infinite; }
        .cloud-l6 { top: 32%; animation: cloud-drift-left   72s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .cloud-layer { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
