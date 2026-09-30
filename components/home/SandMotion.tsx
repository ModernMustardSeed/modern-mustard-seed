'use client';

import { useEffect } from 'react';

/**
 * Drives the sand story on a clock. Writes CSS variables on #sand-story and
 * moves the glint that rides the tip of whatever is being written. Renders nothing.
 */

const WAVES = [
  [0.1, 0.19, 0.28],
  [0.4, 0.49, 0.58],
  [0.68, 0.77, 0.86],
] as const;

const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outQuad = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * Sand you can touch. On a desktop, the cursor draws a groove in the opening
 * beach; the sand smooths itself over a few seconds and the first wave takes
 * whatever is left. Runs only while there is something to draw or fade.
 */
function touchSand(el: HTMLElement, progress: () => number) {
  const canvas = el.querySelector<HTMLCanvasElement>('[data-touch]');
  const stage = canvas?.parentElement;
  if (!canvas || !stage || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let dpr = 1;
  let last: { x: number; y: number } | null = null;
  let frame = 0;
  let lastInk = 0;

  const size = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  };

  // Every frame, lift a little of everything drawn, so the sand smooths over.
  const fade = (now: number) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.018)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    frame = now - lastInk < 6000 ? requestAnimationFrame(fade) : 0;
  };

  const groove = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    // Nearer the horizon the groove is thinner, as it would be in perspective.
    const depth = Math.min(1, Math.max(0.25, b.y / canvas.height));
    const w = (2.5 + 7 * depth) * dpr;
    const line = (dy: number, color: string, width: number) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + dy);
      ctx.lineTo(b.x, b.y + dy);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    ctx.lineCap = 'round';
    line(1.4 * dpr, 'rgba(91,61,23,0.34)', w);
    line(-1.4 * dpr, 'rgba(255,244,220,0.5)', w);
    line(0, 'rgba(148,112,63,0.5)', w * 0.72);
  };

  const onMove = (e: PointerEvent) => {
    if (progress() > 0.08) { last = null; return; }
    const r = canvas.getBoundingClientRect();
    const pt = { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
    if (pt.y < 0 || pt.x < 0 || pt.x > canvas.width) { last = null; return; }
    if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 80 * dpr) groove(last, pt);
    last = pt;
    lastInk = performance.now();
    if (!frame) frame = requestAnimationFrame(fade);
  };
  const onLeave = () => { last = null; };

  size();
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', onLeave);
  window.addEventListener('resize', size);
  return () => {
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('resize', size);
    cancelAnimationFrame(frame);
  };
}

export default function SandMotion() {
  useEffect(() => {
    const el = document.getElementById('sand-story');
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.dataset.still = '1';
      return;
    }
    el.dataset.live = '1';

    // Fetch the sunset once the page has loaded, so it never competes with the first paint.
    const fillDusk = () => {
      el.querySelectorAll<HTMLSourceElement>('source[data-srcset]').forEach((n) => { n.srcset = n.dataset.srcset ?? ''; n.removeAttribute('data-srcset'); });
      el.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((n) => { n.src = n.dataset.src ?? ''; n.removeAttribute('data-src'); });
    };
    const duskTimer = document.readyState === 'complete' ? window.setTimeout(fillDusk, 300) : 0;
    const onLoad = () => window.setTimeout(fillDusk, 300);
    if (!duskTimer) window.addEventListener('load', onLoad, { once: true });

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

    // Which layout is on screen (wide or narrow), per message, decided per resize,
    // so the frame loop never has to measure anything.
    const narrow = window.matchMedia('(max-width: 760px)');
    const msgs = new Map<string, { box: HTMLElement; svg: SVGSVGElement | undefined }>();
    const pick = () => {
      el.querySelectorAll<HTMLElement>('[data-msg]').forEach((box) => {
        const svgs = box.querySelectorAll<SVGSVGElement>('svg');
        msgs.set(box.dataset.msg ?? '', { box, svg: svgs[narrow.matches ? 1 : 0] });
      });
    };
    pick();

    const moveTip = (key: string, w: number) => {
      const lay = msgs.get(key)?.svg && layouts.get(msgs.get(key)!.svg!);
      if (!lay?.tip) return;
      const writing = w > 0.002 && w < 0.998;
      lay.tip.style.opacity = writing ? '1' : '0';
      if (!writing) return;
      const st = lay.strokes.find((x) => w >= x.a && w < x.b) ?? lay.strokes[lay.strokes.length - 1];
      const pt = st.path.getPointAtLength(st.len * seg(w, st.a, st.b));
      lay.tip.setAttribute('cx', pt.x.toFixed(1));
      lay.tip.setAttribute('cy', pt.y.toFixed(1));
    };

    // Write a variable only when it changes, and only on the element that reads it:
    // a rewrite on the whole section restyles every stroke in it.
    const last = new Map<string, string>();
    const put = (node: HTMLElement, k: string, v: number) => {
      const key = (node === el ? 'story' : node.dataset.msg ?? 'touch') + k;
      const val = v.toFixed(3);
      if (last.get(key) === val) return;
      last.set(key, val);
      node.style.setProperty(k, val);
    };
    const set = (k: string, v: number) => put(el, k, v);
    const msg = (key: string, w: number, o: number) => {
      const m = msgs.get(key);
      if (!m) return;
      put(m.box, '--w', w);
      put(m.box, 'opacity', o);
      moveTip(key, w);
    };

    // The story runs on a clock, not on the scroll: the name writes itself for
    // about four seconds, holds so it can be read, then the waves play the rest.
    // The clock only moves while the hero is on screen.
    const INTRO_MS = 4200;
    const HOLD_MS = 1600;
    const PLAY_MS = 16000;
    let elapsed = 0;
    let lastNow = 0;
    let p = 0;
    let frame = 0;
    let onScreen = true;
    const touch = el.querySelector<HTMLCanvasElement>('[data-touch]');

    const render = () => {
      const intro = outQuad(Math.min(1, elapsed / INTRO_MS));
      p = Math.min(1, Math.max(0, (elapsed - INTRO_MS - HOLD_MS) / PLAY_MS));

      let wave = 0;
      let wet = 0;
      for (const [a, m, b] of WAVES) {
        const w = p < m ? ease(seg(p, a, m)) : 1 - ease(seg(p, m, b));
        wave = Math.max(wave, w);
        wet = Math.max(wet, p < m ? seg(p, a + 0.04, m) : 1 - seg(p, b, b + 0.1));
      }

      set('--wave', wave);
      set('--wet', wet);
      set('--dusk', ease(seg(p, 0.66, 0.82)));
      set('--c-intro', 1 - seg(p, 0.03, 0.09));
      set('--c-web', seg(p, 0.28, 0.33) * (1 - seg(p, 0.4, 0.44)));
      set('--c-ai', seg(p, 0.58, 0.63) * (1 - seg(p, 0.68, 0.72)));
      set('--c-life', seg(p, 0.86, 0.92));
      const end = p > 0.9 ? '1' : '0';
      if (el.dataset.end !== end) el.dataset.end = end;

      const mmsOn = 1 - seg(p, 0.15, 0.19);
      msg('mms', intro, mmsOn);
      if (touch) put(touch, 'opacity', mmsOn);
      msg('web', outQuad(seg(p, 0.2, 0.36)), seg(p, 0.19, 0.195) * (1 - seg(p, 0.45, 0.49)));
      msg('ai', outQuad(seg(p, 0.5, 0.66)), seg(p, 0.49, 0.495) * (1 - seg(p, 0.73, 0.77)));
      msg('life', outQuad(seg(p, 0.79, 0.93)), seg(p, 0.77, 0.775));
    };

    const tick = (now: number) => {
      // A long gap (a background tab) counts as one frame, so the story never skips ahead.
      if (onScreen && lastNow) elapsed += Math.min(100, now - lastNow);
      lastNow = now;
      render();
      frame = p < 1 ? requestAnimationFrame(tick) : 0;
    };
    const play = () => { if (!frame) { lastNow = 0; frame = requestAnimationFrame(tick); } };

    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.35 });
    io.observe(el);

    const replay = el.querySelector<HTMLButtonElement>('[data-replay]');
    const onReplay = () => { elapsed = 0; play(); };
    replay?.addEventListener('click', onReplay);

    const onResize = () => { pick(); render(); };
    render();
    play();
    window.addEventListener('resize', onResize);
    const stopTouch = touchSand(el, () => p);
    return () => {
      window.removeEventListener('resize', onResize);
      replay?.removeEventListener('click', onReplay);
      io.disconnect();
      cancelAnimationFrame(frame);
      stopTouch();
      window.clearTimeout(duskTimer);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return null;
}
