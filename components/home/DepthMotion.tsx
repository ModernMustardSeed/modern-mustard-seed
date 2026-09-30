'use client';

import { useEffect } from 'react';

/**
 * Pointer depth for a layered hero: writes --mx and --my (each -1 to 1) on the
 * element with the given id, eased toward the pointer so the layers glide. Each
 * layer multiplies them by its own depth in CSS. Only with a real pointer, never
 * with reduced motion. Also sets data-ready so entrance animations can wait for
 * hydration. Renders nothing.
 */
export default function DepthMotion({ target }: { target: string }) {
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    el.dataset.ready = '1';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let tx = 0, ty = 0, x = 0, y = 0, frame = 0;
    const step = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty('--mx', x.toFixed(3));
      el.style.setProperty('--my', y.toFixed(3));
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onLeave = () => { tx = 0; ty = 0; if (!frame) frame = requestAnimationFrame(step); };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, [target]);
  return null;
}
