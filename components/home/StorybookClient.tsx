'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudioFilm } from '@/data/flathead-films';

/** The hero panel: a five second boomerang from They Say Your Name. Pausable, and still for reduced motion. */
export function StorybookHeroFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    if (still.matches) {
      v.pause();
      setPlaying(false);
      return;
    }
    v.play().catch(() => setPlaying(false));
  }, []);

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <figure className="sb-hero-film">
      <video
        ref={video}
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
      <button type="button" className="sb-film-toggle" onClick={toggle} aria-pressed={!playing}>
        {playing ? 'Pause' : 'Play'}
      </button>
    </figure>
  );
}

/** Mustard TV: the studio's films, first one on screen, a picker for the rest. */
export function StorybookTV({ films, first }: { films: StudioFilm[]; first: StudioFilm }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const film = films[index] ?? first;
  const player = useRef<HTMLVideoElement>(null);

  function choose(next: number) {
    setIndex(next);
    setFailed(false);
    requestAnimationFrame(() => {
      const v = player.current;
      if (!v) return;
      v.load();
      v.play().catch(() => {});
    });
  }

  return (
    <div className="sb-tv-set">
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
        {failed ? (
          <p className="sb-tv-error">This film couldn’t load. Try another from the list.</p>
        ) : null}
      </div>
      <div className="sb-tv-dial">
        <label htmlFor="sb-film-select">Now showing</label>
        <select id="sb-film-select" value={index} onChange={(e) => choose(Number(e.target.value))}>
          {films.map((f, i) => (
            <option key={`${f.src}-${i}`} value={i}>{f.title}</option>
          ))}
        </select>
        <p className="sb-tv-title" aria-live="polite">{film.title}</p>
      </div>
    </div>
  );
}
