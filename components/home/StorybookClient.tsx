'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudioFilm } from '@/data/flathead-films';
import type { GardenControls } from './storybookScene';

/**
 * The hero stage. It paints as a still composition (film card plus engraved
 * flowers) so the headline stays the first paint. On idle, Three.js loads and
 * the same pieces come alive in depth. Reduced motion keeps the still version.
 */
export function StorybookStage() {
  const host = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const garden = useRef<GardenControls | null>(null);
  const [live, setLive] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const v = film.current;
    const el = host.current;
    if (!v || !el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.pause();
      setPlaying(false);
      return;
    }
    v.play().catch(() => setPlaying(false));

    let cancelled = false;
    const webgl = (() => {
      try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
      } catch {
        return false;
      }
    })();
    if (!webgl) return;

    const start = () => {
      import('./storybookScene')
        .then(({ mountGarden }) => {
          if (cancelled) return;
          const variant = new URLSearchParams(window.location.search).get('hero') === 'wreath' ? 'wreath' : 'quiet';
          garden.current = mountGarden(el, v, () => setLive(true), variant);
        })
        .catch(() => {});
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const idle = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 1800 }) : window.setTimeout(start, 700);
    return () => {
      cancelled = true;
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      garden.current?.dispose();
      garden.current = null;
    };
  }, []);

  function toggle() {
    const v = film.current;
    if (!v) return;
    if (playing) {
      v.pause();
      garden.current?.setPaused(true);
      setPlaying(false);
    } else {
      v.play().catch(() => {});
      garden.current?.setPaused(false);
      setPlaying(true);
    }
  }

  return (
    <div className={`sb-stage${live ? ' is-live' : ''}`} ref={host}>
      <div className="sb-stage-still" aria-hidden={live ? true : undefined}>
        <img className="sb-still-flower f1" src="/storybook/ms-mustard-dahlia-cut-640.webp" width={640} height={640} alt="" />
        <img className="sb-still-flower f2" src="/storybook/ms-ivory-cosmos-cut-640.webp" width={640} height={640} alt="" />
        <img className="sb-still-flower f3" src="/storybook/ms-mustard-blossom-cut-256.webp" width={256} height={256} alt="" />
        <div className="sb-still-card">
          <video
            ref={film}
            muted
            loop
            playsInline
            preload="metadata"
            poster="/storybook/hero-poster.webp"
            width={1024}
            height={572}
            aria-label="Sarah, Anthony and Mr. Mustard jump for joy in a field of mustard flowers with the seed crew."
          >
            <source src="/storybook/hero-loop.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
      <button type="button" className="sb-motion" onClick={toggle} aria-pressed={!playing}>
        {playing ? 'Pause motion' : 'Play motion'}
      </button>
    </div>
  );
}

/** Mustard TV: three films up front, every film in the list. */
export function StorybookTV({ films }: { films: StudioFilm[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const film = films[index] ?? films[0];
  const player = useRef<HTMLVideoElement>(null);
  const picked = useRef(false);

  useEffect(() => {
    if (!picked.current) return;
    player.current?.play().catch(() => {});
  }, [index]);

  function choose(next: number) {
    picked.current = true;
    setFailed(false);
    setIndex(next);
  }

  return (
    <div className="sb-tv-set">
      <div className="sb-tv-tabs" role="group" aria-label="Featured films">
        {films.slice(0, 3).map((f, i) => (
          <button key={f.src} type="button" aria-pressed={index === i} onClick={() => choose(i)}>
            <span>{String(i + 1).padStart(2, '0')} / {i === 0 ? 'Start here' : 'Now showing'}</span>
            <strong>{f.title}</strong>
          </button>
        ))}
      </div>
      <div className="sb-tv-screen">
        <video
          ref={player}
          key={film.src}
          controls
          playsInline
          preload="none"
          poster={film.poster}
          aria-label={film.title}
          onError={() => setFailed(true)}
        >
          <source src={film.src} type="video/mp4" onError={() => setFailed(true)} />
          {film.track ? <track kind="captions" src={film.track} srcLang="en" label="English" default /> : null}
        </video>
        {failed ? <p className="sb-tv-error">This film couldn’t load. Try another from the list.</p> : null}
      </div>
      <div className="sb-tv-dial">
        <label htmlFor="sb-film-select">All {films.length} films</label>
        <select id="sb-film-select" value={index} onChange={(e) => choose(Number(e.target.value))}>
          {films.map((f, i) => (
            <option key={`${f.src}-${i}`} value={i}>{f.title}</option>
          ))}
        </select>
        <p className="sb-sr" aria-live="polite">Now showing {film.title}</p>
      </div>
    </div>
  );
}
