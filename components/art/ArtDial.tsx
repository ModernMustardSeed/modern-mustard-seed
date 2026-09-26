'use client';

import { useRef, useState } from 'react';
import { ART_STYLES, artStyle, type ArtStyleId } from '@/lib/art-styles';
import { setArtStyle, useArtStyle } from './useArtStyle';
import { trackEvent } from '@/lib/analytics';
import s from './ArtDial.module.css';

/**
 * The dial. A real knob: tap it to turn one notch, drag it round, or use the
 * arrow keys. Each notch is a master; the page blooms into that hand from the
 * knob outward. Only styles whose scene exists are on the dial.
 */
export default function ArtDial({ ready }: { ready: ArtStyleId[] }) {
  const styles = ART_STYLES.filter((x) => x.id === 'pop' || ready.includes(x.id));
  const current = useArtStyle();
  const idx = Math.max(0, styles.findIndex((x) => x.id === current));
  const step = 360 / styles.length;
  const knob = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ a0: number; turned: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  // Whole laps the knob has made, so turning past the last notch keeps
  // going round instead of unwinding backwards to the first.
  const [laps, setLaps] = useState(0);
  const spin = idx * step + laps * 360;

  if (styles.length < 2) return null;

  const go = (i: number) => {
    if (i >= styles.length) setLaps((l) => l + 1);
    if (i < 0) setLaps((l) => l - 1);
    const next = styles[(i + styles.length) % styles.length];
    const r = knob.current?.getBoundingClientRect();
    setArtStyle(next.id, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
    trackEvent('art_dial', { style: next.id });
  };

  const angleAt = (e: React.PointerEvent) => {
    const r = knob.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  const style = artStyle(current);
  return <div className={s.dock} data-open={open ? '' : undefined}>
    <div className={s.face}>
      <button
        ref={knob}
        type="button"
        role="slider"
        aria-label="Artist dial: choose the style this site is painted in"
        aria-valuemin={1}
        aria-valuemax={styles.length}
        aria-valuenow={idx + 1}
        aria-valuetext={style.name + ', ' + style.credit}
        className={s.knob}
        style={{ transform: 'rotate(' + spin + 'deg)' }}
        onPointerDown={(e) => { drag.current = { a0: angleAt(e), turned: false }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          let delta = angleAt(e) - d.a0;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          if (Math.abs(delta) >= step * 0.6) { d.turned = true; d.a0 = angleAt(e); go(idx + (delta > 0 ? 1 : -1)); }
        }}
        onPointerUp={() => { const d = drag.current; drag.current = null; if (d && !d.turned) go(idx + 1); }}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); go(idx + 1); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); go(idx - 1); }
          if (e.key === 'Home') { e.preventDefault(); go(0); }
        }}
      >
        <span className={s.grip} aria-hidden="true" />
        <span className={s.notch} aria-hidden="true" />
      </button>
      <ol className={s.ticks} aria-hidden="true">
        {styles.map((x, i) => <li key={x.id} data-on={i === idx ? '' : undefined} style={{ transform: 'rotate(' + i * step + 'deg) translateY(var(--tick-r))' }} />)}
      </ol>
    </div>
    <button type="button" className={s.label} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="art-dial-list">
      <small>Turn the dial</small>
      <strong key={style.id}>{style.name}</strong>
      <em>{style.credit}</em>
    </button>
    {open && <ul id="art-dial-list" className={s.list}>
      {styles.map((x, i) => <li key={x.id}><button type="button" aria-current={i === idx ? 'true' : undefined} onClick={() => { go(i); setOpen(false); }}><b>{x.name}</b><span>{x.credit}</span></button></li>)}
    </ul>}
  </div>;
}
