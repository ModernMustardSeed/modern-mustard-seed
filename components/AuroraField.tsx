/**
 * AuroraField. Pure-CSS aurora curtains drifting slowly across a section.
 *
 * Drop inside any section with `relative` positioning. The field uses screen
 * blend mode so it adds light to dark backgrounds without darkening anything.
 *
 *   <section className="relative">
 *     <AuroraField />
 *     ...content
 *   </section>
 *
 * Three blurred radial blobs animated on independent slow paths. Honors
 * prefers-reduced-motion via globals.css (the .animate-pulse-slow / shimmer
 * rules disable when the user requests).
 */
type Props = {
  intensity?: 'subtle' | 'medium' | 'bold';
  className?: string;
};

const INTENSITY_OPACITY = {
  subtle: 'opacity-45',
  medium: 'opacity-65',
  bold: 'opacity-85',
};

export default function AuroraField({ intensity = 'medium', className = '' }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen ${INTENSITY_OPACITY[intensity]} ${className}`}
    >
      {/* Rose curtain. Sweeps top-left to bottom-right. */}
      <div
        className="absolute -inset-40 aurora-curtain aurora-1"
        style={{
          background:
            'radial-gradient(45% 75% at 30% 50%, rgba(255,107,107,0.55) 0%, rgba(255,107,107,0) 65%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Peach-gold curtain. Crosses the middle. */}
      <div
        className="absolute -inset-40 aurora-curtain aurora-2"
        style={{
          background:
            'radial-gradient(55% 65% at 60% 40%, rgba(255,179,71,0.55) 0%, rgba(255,142,114,0) 70%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Mint-cyan curtain. Sweeps right to left. */}
      <div
        className="absolute -inset-40 aurora-curtain aurora-3"
        style={{
          background:
            'radial-gradient(50% 70% at 70% 60%, rgba(78,205,196,0.50) 0%, rgba(127,228,197,0) 70%)',
          filter: 'blur(65px)',
        }}
      />

      {/* Deep glow accent. Slowest layer. */}
      <div
        className="absolute -inset-40 aurora-curtain aurora-4"
        style={{
          background:
            'radial-gradient(60% 80% at 20% 80%, rgba(159,211,224,0.35) 0%, rgba(159,211,224,0) 70%)',
          filter: 'blur(80px)',
        }}
      />

      <style>{`
        @keyframes aurora-drift-1 {
          0%   { transform: translate(-8%, -4%) rotate(-8deg) scale(1.05); }
          50%  { transform: translate(6%, 4%) rotate(4deg) scale(1.15); }
          100% { transform: translate(-8%, -4%) rotate(-8deg) scale(1.05); }
        }
        @keyframes aurora-drift-2 {
          0%   { transform: translate(4%, -6%) rotate(6deg) scale(1.1); }
          50%  { transform: translate(-6%, 6%) rotate(-4deg) scale(1.2); }
          100% { transform: translate(4%, -6%) rotate(6deg) scale(1.1); }
        }
        @keyframes aurora-drift-3 {
          0%   { transform: translate(6%, 6%) rotate(-2deg) scale(1.05); }
          50%  { transform: translate(-4%, -6%) rotate(8deg) scale(1.15); }
          100% { transform: translate(6%, 6%) rotate(-2deg) scale(1.05); }
        }
        @keyframes aurora-drift-4 {
          0%   { transform: translate(-4%, 4%) rotate(2deg) scale(1.08); }
          50%  { transform: translate(6%, -4%) rotate(-6deg) scale(1.2); }
          100% { transform: translate(-4%, 4%) rotate(2deg) scale(1.08); }
        }
        .aurora-1 { animation: aurora-drift-1 28s ease-in-out infinite; }
        .aurora-2 { animation: aurora-drift-2 34s ease-in-out infinite; }
        .aurora-3 { animation: aurora-drift-3 40s ease-in-out infinite; }
        .aurora-4 { animation: aurora-drift-4 46s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .aurora-curtain { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
