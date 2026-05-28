'use client';

import { useEffect, useRef, useState } from 'react';

export default function MagneticCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;
    setEnabled(true);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const handleMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }
    };

    const handleOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const interactive = t.closest(
        'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]'
      );
      setHovering(!!interactive);
    };

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseover', handleOver, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseover', handleOver);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[100]"
        style={{
          width: hovering ? '0px' : '5px',
          height: hovering ? '0px' : '5px',
          borderRadius: '50%',
          background: '#6FACE7',
          boxShadow: '0 0 10px rgba(78,205,196, 0.95)',
          mixBlendMode: 'screen',
          transition: 'width 0.25s ease, height 0.25s ease',
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[100]"
        style={{
          width: hovering ? '56px' : '30px',
          height: hovering ? '56px' : '30px',
          borderRadius: '50%',
          border: hovering
            ? '1.5px solid rgba(255, 224, 130, 0.85)'
            : '1px solid rgba(255, 224, 130, 0.4)',
          background: hovering ? 'rgba(255, 224, 130, 0.06)' : 'transparent',
          mixBlendMode: 'screen',
          transition:
            'width 0.3s cubic-bezier(0.2, 1.2, 0.4, 1), height 0.3s cubic-bezier(0.2, 1.2, 0.4, 1), border 0.3s ease, background 0.3s ease',
        }}
      />
    </>
  );
}
