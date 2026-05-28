'use client';

import { useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
};

export default function TiltCard({ children, className = '', maxTilt = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, x: 50, y: 50, active: false });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: -(py - 0.5) * 2 * maxTilt,
      ry: (px - 0.5) * 2 * maxTilt,
      x: px * 100,
      y: py * 100,
      active: true,
    });
  };

  const handleLeave = () => setTilt((t) => ({ ...t, rx: 0, ry: 0, active: false }));

  return (
    <div
      className={className}
      style={{ perspective: '1000px' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div
        ref={ref}
        className="relative h-full"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: 'preserve-3d',
          transition: tilt.active
            ? 'transform 0.12s ease-out'
            : 'transform 0.55s cubic-bezier(0.2, 1.2, 0.4, 1)',
          willChange: 'transform',
        }}
      >
        {children}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{
            background: tilt.active
              ? `radial-gradient(380px circle at ${tilt.x}% ${tilt.y}%, rgba(78,205,196, 0.14), transparent 55%)`
              : 'transparent',
            transition: 'background 0.35s ease-out',
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </div>
  );
}
