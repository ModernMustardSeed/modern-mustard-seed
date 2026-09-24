'use client';

import { useEffect, useRef, useState } from 'react';

type Reel = { name: string; place: string; slug: string; url: string };

/* The Night Screen hero's monitor: real work on a loop, one site at a time,
   with a channel list the visitor can click. Only the playing clip loads. */
export default function NowShowing({ reels, className, screenClass, chipsClass, captionClass }: { reels: Reel[]; className: string; screenClass: string; chipsClass: string; captionClass: string }) {
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (still) return;
    const t = window.setTimeout(() => setI(n => (n + 1) % reels.length), 8000);
    return () => window.clearTimeout(t);
  }, [i, still, reels.length]);

  const r = reels[i];
  const poster = '/images/editorial/' + r.slug + '-960.avif';
  return <div className={className}>
    <div className={screenClass}>
      {still
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={poster} alt={r.name + ' website, designed and built by Modern Mustard Seed'} width={960} height={600} />
        : <video key={r.slug} ref={video} src={'/video/work/' + r.slug + '.mp4'} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-label={r.name + ' website, designed and built by Modern Mustard Seed'} />}
      <a href={r.url} target="_blank" rel="noopener noreferrer" className={captionClass}><span>Now showing</span><strong>{r.name}</strong><em>{r.place}</em><b aria-hidden="true">↗</b></a>
    </div>
    <div className={chipsClass} role="tablist" aria-label="Choose a site to watch">
      {reels.map((x, n) => <button key={x.slug} type="button" role="tab" aria-selected={n === i} onClick={() => setI(n)}><i>0{n + 1}</i>{x.name}</button>)}
    </div>
  </div>;
}
