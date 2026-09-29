'use client';

import { useEffect } from 'react';

/**
 * Drives the sand story. Writes CSS variables on #sand-story and moves the
 * glint that rides the tip of whatever is being written. Renders nothing.
 */

const WAVES = [
  [0.1, 0.19, 0.28],
  [0.4, 0.49, 0.58],
  [0.68, 0.77, 0.86],
] as const;

const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outQuad = (t: number) => 1 - (1 - t) * (1 - t);

export default function SandMotion() {
  useEffect(() => {
    const el = document.getElementById('sand-story');
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.dataset.still = '1';
      return;
    }
    el.dataset.live = '1';

    // Every stroke's length, per message and layout, measured once.
    type Stroke = { path: SVGPathElement; a: number; b: number; len: number };
    const layouts = new Map<SVGSVGElement, { strokes: Stroke[]; tip: SVGCircleElement | null }>();
    el.querySelectorAll<SVGSVGElement>('[data-msg] svg').forEach((svg) => {
      const strokes = Array.from(svg.querySelectorAll<SVGPathElement>('path')).map((path) => ({
        path,
        a: parseFloat(path.style.getPropertyValue('--a')),
        b: parseFloat(path.style.getPropertyValue('--b')),
        len: path.getTotalLength(),
      }));
      layouts.set(svg, { strokes, tip: svg.querySelector('circle') });
    });

    const moveTip = (key: string, w: number) => {
      el.querySelectorAll<SVGSVGElement>(`[data-msg="${key}"] svg`).forEach((svg) => {
        const lay = layouts.get(svg);
        if (!lay?.tip || svg.getBoundingClientRect().width === 0) return;
        const writing = w > 0.002 && w < 0.998;
        lay.tip.style.opacity = writing ? '1' : '0';
        if (!writing) return;
        const st = lay.strokes.find((x) => w >= x.a && w < x.b) ?? lay.strokes[lay.strokes.length - 1];
        const pt = st.path.getPointAtLength(st.len * seg(w, st.a, st.b));
        lay.tip.setAttribute('cx', pt.x.toFixed(1));
        lay.tip.setAttribute('cy', pt.y.toFixed(1));
      });
    };

    const set = (k: string, v: number) => el.style.setProperty(k, v.toFixed(4));

    // The kids write the name as the page opens: about four seconds, easing out.
    const t0 = performance.now();
    const INTRO_MS = 4200;
    let intro = 0;
    let p = 0;
    let frame = 0;
    let introFrame = 0;

    const render = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;

      let wave = 0;
      let wet = 0;
      for (const [a, m, b] of WAVES) {
        const w = p < m ? ease(seg(p, a, m)) : 1 - ease(seg(p, m, b));
        wave = Math.max(wave, w);
        wet = Math.max(wet, p < m ? seg(p, a + 0.04, m) : 1 - seg(p, b, b + 0.1));
      }
      const mms = p > 0.05 ? 1 : intro;
      const web = outQuad(seg(p, 0.2, 0.36));
      const ai = outQuad(seg(p, 0.5, 0.66));
      const life = outQuad(seg(p, 0.79, 0.93));

      set('--p', p);
      set('--wave', wave);
      set('--wet', wet);
      set('--w-mms', mms);
      set('--w-web', web);
      set('--w-ai', ai);
      set('--w-life', life);
      set('--o-mms', 1 - seg(p, 0.15, 0.19));
      set('--o-web', seg(p, 0.19, 0.195) * (1 - seg(p, 0.45, 0.49)));
      set('--o-ai', seg(p, 0.49, 0.495) * (1 - seg(p, 0.73, 0.77)));
      set('--o-life', seg(p, 0.77, 0.775));
      set('--dusk', ease(seg(p, 0.66, 0.82)));
      set('--k-out', ease(seg(p, 0.06, 0.16)));
      set('--c-intro', 1 - seg(p, 0.03, 0.09));
      set('--c-web', seg(p, 0.28, 0.33) * (1 - seg(p, 0.4, 0.44)));
      set('--c-ai', seg(p, 0.58, 0.63) * (1 - seg(p, 0.68, 0.72)));
      set('--c-life', seg(p, 0.86, 0.92));
      el.dataset.end = p > 0.88 ? '1' : '0';

      moveTip('mms', mms);
      moveTip('web', web);
      moveTip('ai', ai);
      moveTip('life', life);
    };

    const tickIntro = (now: number) => {
      intro = outQuad(Math.min(1, (now - t0) / INTRO_MS));
      render();
      if (intro < 1 && p <= 0.05) introFrame = requestAnimationFrame(tickIntro);
    };

    const onScroll = () => { if (!frame) frame = requestAnimationFrame(render); };
    render();
    introFrame = requestAnimationFrame(tickIntro);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(introFrame);
    };
  }, []);

  return null;
}
