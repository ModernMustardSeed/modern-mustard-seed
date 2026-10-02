'use client';

import {useEffect, useRef, useState} from 'react';
import {flatheadFilms} from '@/data/flathead-films';

export default function StudioFilmLibrary() {
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState('');
  const [failed, setFailed] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const shouldPlay = useRef(false);
  const film = flatheadFilms[active];
  const matches = flatheadFilms.map((item, index) => ({...item, index})).filter(item => item.title.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => {
    setFailed(false);
    if (shouldPlay.current) void player.current?.play().catch(() => undefined);
  }, [active]);
  useEffect(() => {
    const pause = () => {if (document.hidden) player.current?.pause();};
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  function choose(index: number) {
    shouldPlay.current = true;
    if (index === active) void player.current?.play().catch(() => undefined);
    else setActive(index);
  }
  return <section id="network" className="studio-film-library" aria-labelledby="film-library-title">
    <div className="studio-film-heading"><p className="portfolio-kicker">Mustard Pictures</p><h2 id="film-library-title">Every film. <em>One studio.</em></h2><p>Choose a film and make yourself comfortable.</p></div>
    <div className="studio-film-layout">
      <div><div className="studio-film-frame"><video key={film.src} ref={player} controls playsInline preload="none" poster={film.poster} aria-label={film.title} onError={() => setFailed(true)}>
        <source src={film.src} type="video/mp4" />
        {film.track && <track kind="captions" src={film.track} srcLang="en" label="English" default />}
      </video></div><p className="studio-film-caption" aria-live="polite">{film.title}</p>{failed && <p role="alert">The film could not load. <a href={film.src}>Open the video directly</a> or choose another film.</p>}</div>
      <div className="studio-film-selection"><label htmlFor="film-library-search">Find a film <span>{flatheadFilms.length} films</span></label><input id="film-library-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search the collection" />
        <div className="studio-film-list" aria-label="Film collection">{matches.map(item => <button key={item.src} type="button" onClick={() => choose(item.index)} aria-pressed={item.index === active}><img src={item.poster} alt={`${item.title}: poster frame.`} width={100} height={56} loading="lazy" /><span>{item.title}</span><span aria-hidden="true">↗</span></button>)}{matches.length === 0 && <p role="status">No films match that search.</p>}</div>
      </div>
    </div>
  </section>;
}
