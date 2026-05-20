'use client';

import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  strength?: number;
};

export default function MagneticLink({
  href,
  children,
  className = '',
  strength = 0.35,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setOffset({
      x: (e.clientX - cx) * strength,
      y: (e.clientY - cy) * strength,
    });
  };

  const handleLeave = () => setOffset({ x: 0, y: 0 });

  const resting = offset.x === 0 && offset.y === 0;

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`${className} will-change-transform inline-block`}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: resting
          ? 'transform 0.55s cubic-bezier(0.2, 1.2, 0.4, 1)'
          : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <span
        className="block"
        style={{
          transform: `translate3d(${offset.x * 0.3}px, ${offset.y * 0.3}px, 0)`,
          transition: resting
            ? 'transform 0.55s cubic-bezier(0.2, 1.2, 0.4, 1)'
            : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {children}
      </span>
    </Link>
  );
}
