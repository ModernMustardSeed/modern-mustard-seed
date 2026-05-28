/**
 * Clouds. Painterly multi-lobe cumulus with morning sunshine on top.
 *
 * Each cloud is a composition of 5-8 overlapping ellipses wrapped in a
 * Gaussian blur + turbulence filter so the edges read as fluffy cumulus
 * rather than a single SVG path. A two-stop gradient gives every cloud
 * a warm peach top (sun-lit) and a cool deep-sky underbelly (shadow).
 *
 *   <section className="relative">
 *     <Clouds />
 *     ...content
 *   </section>
 *
 * Six clouds drifting on independent paths (48s to 110s). A few stars
 * peek through the upper dawn. Honors prefers-reduced-motion.
 */
type Props = {
  density?: 'subtle' | 'medium' | 'bold';
  className?: string;
};

const OPACITY = {
  subtle: 0.6,
  medium: 0.82,
  bold: 1,
};

type Lobe = { cx: number; cy: number; rx: number; ry: number };

// Six hand-tuned cumulus silhouettes. Each is a multi-ellipse composition
// that, when blurred, reads as a single fluffy cloud with believable lobes.
const CLOUD_SHAPES: Record<string, { lobes: Lobe[]; w: number; h: number }> = {
  // Large billowing cumulus
  a: {
    w: 420, h: 180,
    lobes: [
      { cx: 90,  cy: 130, rx: 70, ry: 50 },
      { cx: 140, cy: 95,  rx: 60, ry: 55 },
      { cx: 195, cy: 75,  rx: 70, ry: 60 },
      { cx: 250, cy: 90,  rx: 65, ry: 55 },
      { cx: 305, cy: 110, rx: 60, ry: 50 },
      { cx: 350, cy: 135, rx: 55, ry: 40 },
      { cx: 175, cy: 130, rx: 80, ry: 35 },
      { cx: 250, cy: 135, rx: 70, ry: 32 },
    ],
  },
  // Compact puffy cumulus
  b: {
    w: 300, h: 150,
    lobes: [
      { cx: 70,  cy: 105, rx: 50, ry: 38 },
      { cx: 120, cy: 75,  rx: 55, ry: 50 },
      { cx: 170, cy: 70,  rx: 50, ry: 45 },
      { cx: 215, cy: 95,  rx: 50, ry: 42 },
      { cx: 145, cy: 105, rx: 70, ry: 30 },
    ],
  },
  // Stretched horizontal cumulus
  c: {
    w: 540, h: 160,
    lobes: [
      { cx: 80,  cy: 110, rx: 60, ry: 40 },
      { cx: 140, cy: 85,  rx: 55, ry: 50 },
      { cx: 200, cy: 75,  rx: 60, ry: 55 },
      { cx: 270, cy: 80,  rx: 65, ry: 50 },
      { cx: 340, cy: 90,  rx: 60, ry: 48 },
      { cx: 410, cy: 100, rx: 55, ry: 45 },
      { cx: 470, cy: 115, rx: 50, ry: 40 },
      { cx: 260, cy: 115, rx: 110, ry: 30 },
    ],
  },
  // Small wisp
  d: {
    w: 220, h: 90,
    lobes: [
      { cx: 50,  cy: 55, rx: 35, ry: 25 },
      { cx: 95,  cy: 42, rx: 38, ry: 30 },
      { cx: 140, cy: 50, rx: 35, ry: 26 },
      { cx: 175, cy: 60, rx: 28, ry: 20 },
    ],
  },
  // Mid cumulus with high top
  e: {
    w: 360, h: 200,
    lobes: [
      { cx: 90,  cy: 140, rx: 55, ry: 45 },
      { cx: 140, cy: 100, rx: 55, ry: 55 },
      { cx: 190, cy: 75,  rx: 60, ry: 60 },
      { cx: 245, cy: 95,  rx: 55, ry: 55 },
      { cx: 295, cy: 130, rx: 50, ry: 45 },
      { cx: 195, cy: 145, rx: 90, ry: 30 },
    ],
  },
  // Tiny distant cloud
  f: {
    w: 180, h: 80,
    lobes: [
      { cx: 45,  cy: 50, rx: 30, ry: 22 },
      { cx: 80,  cy: 38, rx: 32, ry: 28 },
      { cx: 115, cy: 45, rx: 30, ry: 25 },
      { cx: 145, cy: 55, rx: 22, ry: 18 },
    ],
  },
};

function CloudPiece({
  id,
  size,
  className,
}: {
  id: keyof typeof CLOUD_SHAPES;
  size: number;
  className?: string;
}) {
  const shape = CLOUD_SHAPES[id];
  const w = (size * shape.w) / shape.h;
  return (
    <svg
      viewBox={`0 0 ${shape.w} ${shape.h}`}
      width={w}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Campfire-lit cumulus: cream-gold tops, lake-deep underbellies */}
      <defs>
        <linearGradient id={`cl-${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#F5F0E8" stopOpacity="0.98" />
          <stop offset="22%" stopColor="#F0D090" stopOpacity="0.96" />
          <stop offset="48%" stopColor="#E8C88A" stopOpacity="0.92" />
          <stop offset="78%" stopColor="#3B6B8A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1A1A2E" stopOpacity="0.55" />
        </linearGradient>

        {/* Brass campfire highlight on the upper-left of every cloud */}
        <radialGradient id={`cl-${id}-sun`} cx="35%" cy="22%" r="55%">
          <stop offset="0%"  stopColor="#F0D090" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#C8964E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#C8964E" stopOpacity="0" />
        </radialGradient>

        {/* Soft fluffy edge: gaussian blur + light noise displacement */}
        <filter id={`cl-${id}-fluff`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="3" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" />
        </filter>

        {/* Soft underbelly shadow */}
        <filter id={`cl-${id}-shadow`} x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Cloud underbelly shadow (drawn first, behind everything) */}
      <g filter={`url(#cl-${id}-shadow)`} opacity="0.55">
        {shape.lobes.map((l, i) => (
          <ellipse
            key={`s-${i}`}
            cx={l.cx}
            cy={l.cy + 12}
            rx={l.rx}
            ry={l.ry * 0.5}
            fill="#0F1422"
          />
        ))}
      </g>

      {/* Main cloud body. Lobes blurred together with the fluff filter */}
      <g filter={`url(#cl-${id}-fluff)`}>
        {shape.lobes.map((l, i) => (
          <ellipse
            key={`b-${i}`}
            cx={l.cx}
            cy={l.cy}
            rx={l.rx}
            ry={l.ry}
            fill={`url(#cl-${id}-fill)`}
          />
        ))}
      </g>

      {/* Sun-lit highlight on top */}
      <g filter={`url(#cl-${id}-fluff)`} opacity="0.85">
        {shape.lobes.map((l, i) => (
          <ellipse
            key={`h-${i}`}
            cx={l.cx + 6}
            cy={l.cy - l.ry * 0.45}
            rx={l.rx * 0.7}
            ry={l.ry * 0.55}
            fill={`url(#cl-${id}-sun)`}
          />
        ))}
      </g>
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
      {/* A handful of stars peek through the upper dawn */}
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

      <div className="cloud-layer cloud-l1" style={{ opacity: baseOpacity * 0.92 }}>
        <CloudPiece id="a" size={170} />
      </div>
      <div className="cloud-layer cloud-l2" style={{ opacity: baseOpacity * 0.78 }}>
        <CloudPiece id="b" size={110} />
      </div>
      <div className="cloud-layer cloud-l3" style={{ opacity: baseOpacity * 0.88 }}>
        <CloudPiece id="c" size={195} />
      </div>
      <div className="cloud-layer cloud-l4" style={{ opacity: baseOpacity * 0.65 }}>
        <CloudPiece id="d" size={85} />
      </div>
      <div className="cloud-layer cloud-l5" style={{ opacity: baseOpacity * 0.82 }}>
        <CloudPiece id="e" size={145} />
      </div>
      <div className="cloud-layer cloud-l6" style={{ opacity: baseOpacity * 0.58 }}>
        <CloudPiece id="f" size={68} />
      </div>

      <style>{`
        .cloud-layer {
          position: absolute;
          will-change: transform;
          filter: drop-shadow(0 8px 22px rgba(8, 12, 22, 0.45));
        }
        @keyframes cloud-drift-right {
          0%   { transform: translateX(-30%); }
          100% { transform: translateX(160%); }
        }
        @keyframes cloud-drift-left {
          0%   { transform: translateX(160%); }
          100% { transform: translateX(-30%); }
        }

        .cloud-l1 { top: 7%;  animation: cloud-drift-right  90s linear infinite; }
        .cloud-l2 { top: 22%; animation: cloud-drift-left   65s linear infinite; }
        .cloud-l3 { top: 36%; animation: cloud-drift-right 115s linear infinite; }
        .cloud-l4 { top: 14%; animation: cloud-drift-left   50s linear infinite; }
        .cloud-l5 { top: 50%; animation: cloud-drift-right  98s linear infinite; }
        .cloud-l6 { top: 30%; animation: cloud-drift-left   75s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .cloud-layer { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
