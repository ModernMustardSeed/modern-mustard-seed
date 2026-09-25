'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/AttributionLink';
import s from './ShowreelHero.module.css';

/* The homepage hero as a showreel: the name in the studio serif on cream,
   and underneath it the live work, cut edge to edge. The reel is one file
   per shape (landscape for desktop, portrait for phones), five sites at 2.4
   seconds each, so the label and progress read the clip off currentTime. */

const CLIP = 2.4;
const SITES = [
  { name: 'D & D Landscaping', place: 'Tallahassee, Florida', url: 'https://ddlandscapingfl.com' },
  { name: 'Cross + Covenant', place: 'Apparel, nationwide', url: 'https://crossandcovenant.co' },
  { name: 'Built Right in Montana', place: 'Custom homes, Flathead Valley', url: 'https://brimhomes.com' },
  { name: 'Bare Earth', place: 'Landscape and construction, Montana', url: 'https://bare-earth.vercel.app' },
  { name: 'Wildmere Honey Co.', place: 'Montana honey', url: 'https://wildmere.vercel.app' },
];

function Line({ children, d }: { children: React.ReactNode; d: number }) {
  return <span className={s.line}><span style={{ animationDelay: d + 's' }}>{children}</span></span>;
}

export default function ShowreelHero() {
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [clip, setClip] = useState(0);
  const [phone, setPhone] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const set = () => setPhone(mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v || phone === null) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { v.pause(); return; }
    v.play().catch(() => {});
    let raf = 0, shown = -1;
    const tick = () => {
      const t = v.currentTime;
      const i = Math.floor(t / CLIP) % SITES.length;
      if (i !== shown) { shown = i; setClip(i); }
      if (bar.current) bar.current.style.transform = 'scaleX(' + ((t % CLIP) / CLIP) + ')';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); });
    io.observe(v);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [phone]);

  const site = SITES[clip];
  const shape = phone ? 'mobile' : 'desktop';
  return <section className={s.hero} aria-labelledby="studio-heading">
    <div className={s.top}><span>Design &amp; Agentic Systems Studio</span><span>Kalispell, Montana · Working nationwide</span></div>
    <h1 id="studio-heading" className={s.name}><Line d={0.1}>Modern Mustard <em>Seed</em></Line></h1>
    <div className={s.row}>
      <p className={s.lead}>Websites, custom software and voice agents, designed and engineered by Sarah Scarano. Beautiful work, built to be used, and yours to own.</p>
      <div className={s.actions}>
        <Link href="/inquire" className={s.cta}>Begin a Conversation <span aria-hidden="true">→</span></Link>
        <a href="#selected-work" className={s.quiet}>See the Work</a>
      </div>
    </div>
    <div className={s.reel}>
      {phone !== null && <video key={shape} ref={video} className={s.film} src={'/video/reel/reel-' + shape + '.mp4'} poster={'/video/reel/poster-' + shape + '.avif'} muted loop playsInline autoPlay preload="auto" aria-label="Showreel of live websites designed and built by Modern Mustard Seed" />}
      <div className={s.chrome}>
        <span className={s.tag}>Showreel · Live work</span>
        <a href={site.url} target="_blank" rel="noopener noreferrer" className={s.plate} key={clip}>
          <span className={s.count}>0{clip + 1} / 0{SITES.length}</span>
          <strong>{site.name}</strong>
          <em>{site.place}</em>
          <b aria-hidden="true">↗</b>
          <span className={s.track}><span ref={bar} /></span>
        </a>
      </div>
    </div>
  </section>;
}
