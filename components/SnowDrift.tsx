'use client';

import { useEffect, useRef } from 'react';

/**
 * SnowDrift. Canvas particle layer for premium "gold tier" sections.
 *
 * Slow downward drift with sine-wave horizontal sway. Defaults to warm
 * sunrise-tinted flecks (cream-gold) so the effect reads as fire embers and
 * snow at once. Pass `color="255,255,255"` for pure white snow.
 *
 *   <SnowDrift />                              warm, medium density
 *   <SnowDrift density="bold" />              more particles
 *   <SnowDrift color="255,255,255" />         cool, pure-white snow
 *
 * Container must be `relative` and `overflow-hidden`. Honors
 * prefers-reduced-motion (renders nothing).
 */
type Props = {
  density?: 'subtle' | 'medium' | 'bold';
  color?: string; // CSS rgb triplet "R,G,B"
  className?: string;
};

const DENSITIES = { subtle: 18, medium: 36, bold: 60 };

export default function SnowDrift({
  density = 'medium',
  color = '245,240,232',
  className = '',
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = parent.clientWidth || 400;
    let h = parent.clientHeight || 400;

    const resize = () => {
      w = parent.clientWidth || 400;
      h = parent.clientHeight || 400;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    type Particle = {
      x: number;
      y: number;
      r: number;
      vy: number;
      alpha: number;
      phase: number;
      sway: number;
    };

    const count = DENSITIES[density];
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.6,
      vy: 0.12 + Math.random() * 0.35,
      alpha: 0.25 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      sway: 0.2 + Math.random() * 0.4,
    }));

    let raf = 0;
    let t = 0;
    const render = () => {
      t += 0.008;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += Math.sin(t + p.phase) * p.sway;
        p.y += p.vy;
        if (p.y > h + 4) {
          p.y = -4;
          p.x = Math.random() * w;
        }
        if (p.x < -4) p.x = w + 4;
        else if (p.x > w + 4) p.x = -4;

        // soft glow around larger flecks
        if (p.r > 1.2) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          grad.addColorStop(0, `rgba(${color}, ${p.alpha * 0.5})`);
          grad.addColorStop(1, `rgba(${color}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [density, color]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
