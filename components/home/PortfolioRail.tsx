'use client';

import {useEffect, useRef, useState} from 'react';
import Link from '@/components/AttributionLink';
import {flatheadWork} from '@/data/flathead-work';

export default function PortfolioRail({id = 'work'}: {id?: string}) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({start: true, end: false});
  const [automatic, setAutomatic] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {if (preference.matches) setAutomatic(false);};
    change(); preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const element = rail.current;
    if (!element || !automatic || hovered || focused || !inView) return;
    let frame = 0, previous = 0, position = element.scrollLeft;
    const advance = (time: number) => {
      const clone = element.querySelector<HTMLElement>('.portfolio-clone');
      const first = element.querySelector<HTMLElement>('.portfolio-project');
      if (clone && first && !document.hidden) {
        const cycle = clone.offsetLeft - first.offsetLeft;
        if (previous) position = (position + Math.min(time - previous, 64) * .023) % cycle;
        element.scrollLeft = position;
      }
      previous = time; frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [automatic, hovered, focused, inView]);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const measure = () => setEdges({start: element.scrollLeft < 4, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4});
    measure(); element.addEventListener('scroll', measure, {passive: true});
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => {element.removeEventListener('scroll', measure); observer.disconnect();};
  }, []);
  function move(direction: number) {
    setAutomatic(false);
    const element = rail.current;
    if (element) element.scrollBy({left: direction * Math.max(280, element.clientWidth * .72), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  return <section id={id} className="portfolio-band" aria-labelledby={`${id}-title`}>
    <div className="portfolio-heading"><div><p className="portfolio-kicker">Selected work by Modern Mustard Seed.</p><h2 id={`${id}-title`}>Out in <em>the world.</em></h2></div>
      <div className="portfolio-actions"><Link href="/work" className="portfolio-all">All the work <span aria-hidden="true">↗</span></Link><div className="portfolio-arrows"><button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label="Previous projects" aria-controls={`${id}-rail`}>←</button><button type="button" onClick={() => move(1)} disabled={edges.end} aria-label="Next projects" aria-controls={`${id}-rail`}>→</button></div></div>
    </div>
    <div ref={rail} id={`${id}-rail`} className="portfolio-rail" data-automatic={automatic && !hovered && !focused} role="region" aria-label="Portfolio. Swipe, scroll, or use the arrow buttons." tabIndex={0} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);}} onPointerDown={() => setAutomatic(false)} onWheel={() => setAutomatic(false)}>
      {[...flatheadWork, ...flatheadWork].map((project, index) => <article key={`${project.id}-${index}`} className={`portfolio-project${index >= flatheadWork.length ? ' portfolio-clone' : ''}`} aria-hidden={index >= flatheadWork.length ? true : undefined}><a href={project.url} target="_blank" rel="noopener noreferrer" tabIndex={index >= flatheadWork.length ? -1 : undefined} aria-label={`Visit ${project.name}`}>
        <div className="portfolio-frame"><div className="portfolio-browser" aria-hidden="true"><span>● ● ●</span><span>{new URL(project.url).hostname.replace('www.', '')}</span><span>↗</span></div><picture><source type="image/avif" srcSet={`/flathead/portfolio/${project.id}-480.avif 480w, /flathead/portfolio/${project.id}-800.avif 800w`} sizes="(max-width:600px) 78vw, 330px"/><img src={`/flathead/portfolio/${project.id}-800.webp`} width={800} height={556} alt={`${project.name}: a preview of the website designed and built by Modern Mustard Seed.`} loading="lazy" decoding="async"/></picture></div>
        <div className="portfolio-caption"><span className="portfolio-number">{String(index % flatheadWork.length + 1).padStart(2,'0')}</span><div><h3>{project.name}</h3></div><span className="portfolio-visit" aria-hidden="true">↗</span></div>
      </a></article>)}
    </div><div className="portfolio-controls"><p className="portfolio-hint">Scroll to explore. Open any project.</p><button type="button" className="portfolio-motion" onClick={() => setAutomatic(value => !value)} aria-pressed={!automatic} aria-controls={`${id}-rail`}>{automatic ? 'Pause scrolling' : 'Play scrolling'}</button></div>
  </section>;
}
