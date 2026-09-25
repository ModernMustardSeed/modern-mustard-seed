'use client';

import { useEffect, useRef, useState } from 'react';

export type RingSite = { name: string; place: string; slug: string; url: string };

/**
 * WorkRing: the live work hung on a slow carousel in 3D, like pieces on a
 * gallery turntable. It drifts on its own, spins under a drag with a little
 * inertia, and the piece facing the viewer plays its film while the rest hold
 * a still. The caption names whichever piece is in front.
 */
export default function WorkRing({ sites, className, stageClass, panelClass, frontClass, captionClass }: {
  sites: RingSite[]; className: string; stageClass: string; panelClass: string; frontClass: string; captionClass: string;
}) {
  const ring = useRef<HTMLDivElement>(null);
  const [front, setFront] = useState(0);
  const step = 360 / sites.length;

  useEffect(() => {
    const el = ring.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let angle = 0, vel = 0, drag = false, lastX = 0, moved = 0, raf = 0, last = performance.now(), shown = 0, visible = true;
    const panels = Array.from(el.children) as HTMLElement[];
    const paint = () => {
      el.style.transform = 'translateZ(calc(var(--r) * -1)) rotateY(' + angle + 'deg)';
      panels.forEach((p, i) => {
        const rel = (((i * step + angle) % 360) + 540) % 360 - 180;
        const f = Math.cos((rel * Math.PI) / 180);
        p.style.opacity = String(Math.pow(Math.max(0, f), 0.7));
        p.style.visibility = f > 0.02 ? 'visible' : 'hidden';
        p.style.filter = 'saturate(' + (0.4 + Math.max(0, f) * 0.6) + ') brightness(' + (0.82 + Math.max(0, f) * 0.18) + ')';
      });
      const idx = ((Math.round(-angle / step) % sites.length) + sites.length) % sites.length;
      if (idx !== shown) { shown = idx; setFront(idx); }
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!drag) { vel += ((still ? 0 : -6) - vel) * Math.min(1, dt * 1.6); angle += vel * dt; }
      paint();
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    const down = (e: PointerEvent) => { drag = true; moved = 0; lastX = e.clientX; vel = 0; };
    const move = (e: PointerEvent) => { if (!drag) return; moved += Math.abs(e.clientX - lastX); if (moved > 6 && !el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId); const d = (e.clientX - lastX) * 0.18; lastX = e.clientX; angle += d; vel = d * 40; };
    const up = () => { drag = false; };
    const click = (e: MouseEvent) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } };
    el.addEventListener('click', click, true);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });
    io.observe(el);
    paint();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); io.disconnect();
      el.removeEventListener('click', click, true); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    };
  }, [sites.length, step]);

  const f = sites[front];
  return <div className={className}>
    <div className={stageClass}>
      <div ref={ring} data-ring="">
        {sites.map((x, i) => <a key={x.slug} href={x.url} target="_blank" rel="noopener noreferrer" draggable={false} className={panelClass + (i === front ? ' ' + frontClass : '')} style={{ transform: 'rotateY(' + i * step + 'deg) translateZ(var(--r))' }} aria-label={x.name + ', visit the live site'} tabIndex={i === front ? 0 : -1}>
          {i === front
            ? <video key={x.slug} src={'/video/work/' + x.slug + '.mp4'} poster={'/images/editorial/' + x.slug + '-960.avif'} autoPlay muted loop playsInline preload="metadata" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={'/images/editorial/' + x.slug + '-960.avif'} alt="" width={960} height={600} loading={i < 2 ? 'eager' : 'lazy'} draggable={false} />}
        </a>)}
      </div>
    </div>
    <p className={captionClass} aria-live="polite"><span>No. 0{front + 1}</span><strong>{f.name}</strong><em>{f.place}</em><a href={f.url} target="_blank" rel="noopener noreferrer">Visit the live site <span aria-hidden="true">↗</span></a></p>
  </div>;
}
