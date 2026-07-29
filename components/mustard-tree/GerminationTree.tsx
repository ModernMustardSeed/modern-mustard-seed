/**
 * The Germination: the signature moment of /mustard-tree. A screenprint
 * mustard tree draws itself out of a planted seed on page load, the business
 * organs stickered on the branches, agents perched as birds. Pure SVG + CSS,
 * server-rendered, deterministic (seeded LCG, no Math.random), honors
 * prefers-reduced-motion.
 */

const BRANCHES = [
  { x: 155, y: 340, label: 'THE PLAN', gold: false },
  { x: 305, y: 190, label: 'THE BRAND', gold: true },
  { x: 545, y: 122, label: 'THE STORE', gold: false },
  { x: 792, y: 182, label: 'THE SITE', gold: true },
  { x: 938, y: 330, label: 'THE BOOKS', gold: false },
  { x: 862, y: 498, label: 'THE MARKETING', gold: true },
];

const FORK_X = 540;
const FORK_Y = 486;
const BASE_Y = 742;

type Dot = { cx: number; cy: number; r: number; fill: string; op: number; delay: number };

function buildDots(): Dot[] {
  // deterministic noise so server render is stable
  let seed = 20260729;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const dots: Dot[] = [];
  const clusters: Array<[number, number, number, number]> = [
    [540, 235, 34, 190],
    ...BRANCHES.map((b): [number, number, number, number] => [b.x, b.y - 24, 24, 92]),
  ];
  for (const [tx, ty, count, spread] of clusters) {
    const n = count + Math.floor(rnd() * 8);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * spread;
      const r = 5 + rnd() * 13;
      const roll = rnd();
      const fill = roll > 0.93 ? '#E0301E' : roll > 0.86 ? '#1E50C8' : '#F5B700';
      dots.push({
        cx: Math.round((tx + Math.cos(a) * d * 1.25) * 10) / 10,
        cy: Math.round((ty + Math.sin(a) * d) * 10) / 10,
        r: Math.round(r * 10) / 10,
        fill,
        op: Math.round((0.55 + rnd() * 0.45) * 100) / 100,
        delay: Math.round((1.05 + rnd() * 1.15) * 100) / 100,
      });
    }
  }
  return dots;
}

const DOTS = buildDots();

function tagWidth(label: string): number {
  return Math.round(label.length * 11.4 + 30);
}

export default function GerminationTree({ className = '' }: { className?: string }) {
  const bird = (x: number, y: number, s: number, delay: number) => (
    <path
      key={`${x}-${y}`}
      className="mtree-bird"
      style={{ animationDelay: `${delay}s` }}
      d={`M${x},${y} q${6 * s},${-9 * s} ${12 * s},0 q${6 * s},${-9 * s} ${12 * s},0`}
      fill="none"
      stroke="#161616"
      strokeWidth={4}
      strokeLinecap="round"
    />
  );

  return (
    <div className={className}>
      <style>{`
        .mtree-limb{stroke-dasharray:1;stroke-dashoffset:1;animation:mtreeDraw .9s ease-out forwards}
        .mtree-dot{opacity:0;transform:scale(.2);transform-box:fill-box;transform-origin:center;animation:mtreePop .5s cubic-bezier(.2,1.4,.4,1) forwards}
        .mtree-tag{opacity:0;transform:translateY(10px);transform-box:fill-box;transform-origin:center;animation:mtreeTag .5s ease-out forwards}
        .mtree-bird{opacity:0;animation:mtreeFade .6s ease-out forwards}
        .mtree-seedcap{opacity:0;animation:mtreeFade .7s ease-out .5s forwards}
        @keyframes mtreeDraw{to{stroke-dashoffset:0}}
        @keyframes mtreePop{to{opacity:1;transform:scale(1)}}
        @keyframes mtreeTag{to{opacity:1;transform:translateY(0)}}
        @keyframes mtreeFade{to{opacity:1}}
        @media (prefers-reduced-motion: reduce){
          .mtree-limb{stroke-dashoffset:0;animation:none}
          .mtree-dot,.mtree-tag,.mtree-bird,.mtree-seedcap{opacity:1;transform:none;animation:none}
        }
      `}</style>
      <svg viewBox="0 0 1080 820" role="img" aria-label="A mustard tree growing out of a single planted seed, with the plan, brand, store, site, books, and marketing on its branches" className="w-full h-auto">
        {DOTS.map((d, i) => (
          <circle
            key={i}
            className="mtree-dot"
            style={{ animationDelay: `${d.delay}s` }}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill={d.fill}
            opacity={d.op}
          />
        ))}

        {/* trunk */}
        <path
          className="mtree-limb"
          pathLength={1}
          style={{ animationDelay: '0.15s' }}
          d={`M${FORK_X},${BASE_Y} C${FORK_X - 14},${BASE_Y - 110} ${FORK_X + 12},${FORK_Y + 90} ${FORK_X},${FORK_Y}`}
          stroke="#161616"
          strokeWidth={21}
          strokeLinecap="round"
          fill="none"
        />

        {/* branches */}
        {BRANCHES.map((b, i) => {
          const cx = (FORK_X + b.x) / 2;
          const cy = Math.min(b.y, FORK_Y) - 66;
          return (
            <path
              key={b.label}
              className="mtree-limb"
              pathLength={1}
              style={{ animationDelay: `${0.7 + i * 0.12}s` }}
              d={`M${FORK_X},${FORK_Y} Q${cx},${cy} ${b.x},${b.y}`}
              stroke="#161616"
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}

        {/* perched agents */}
        {bird(280, 132, 1.15, 2.5)}
        {bird(748, 118, 1, 2.65)}
        {bird(906, 268, 0.85, 2.8)}

        {/* ground + seed */}
        <line className="mtree-limb" pathLength={1} style={{ animationDelay: '0s' }} x1={70} y1={BASE_Y} x2={1010} y2={BASE_Y} stroke="#161616" strokeWidth={5} strokeLinecap="round" />
        <g className="mtree-seedcap">
          <path d={`M${FORK_X - 46},${BASE_Y} Q${FORK_X},${BASE_Y - 26} ${FORK_X + 46},${BASE_Y}`} fill="#FBF6EA" stroke="#161616" strokeWidth={5} />
          <circle cx={FORK_X} cy={BASE_Y - 7} r={11} fill="#F5B700" stroke="#161616" strokeWidth={4} />
        </g>

        {/* sticker tags on the branches */}
        {BRANCHES.map((b, i) => {
          const w = tagWidth(b.label);
          const h = 40;
          const x = Math.min(Math.max(b.x - w / 2, 12), 1080 - w - 12);
          const y = b.y - 62;
          return (
            <g key={b.label} className="mtree-tag" style={{ animationDelay: `${1.5 + i * 0.12}s` }}>
              <rect x={x + 4} y={y + 4} width={w} height={h} fill="#161616" />
              <rect x={x} y={y} width={w} height={h} fill={b.gold ? '#F5B700' : '#FFFFFF'} stroke="#161616" strokeWidth={3} />
              <text
                x={x + w / 2}
                y={y + h / 2 + 6}
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontSize={19}
                fontWeight={700}
                letterSpacing="0.1em"
                fill="#161616"
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
