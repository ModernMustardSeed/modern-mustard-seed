'use client';

import {useEffect, useRef, useState} from 'react';
import Link from '@/components/AttributionLink';
import {flatheadWork} from '@/data/flathead-work';

export default function PortfolioRail({id = 'work'}: {id?: string}) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({start: true, end: false});
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const measure = () => setEdges({start: element.scrollLeft < 4, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4});
    measure(); element.addEventListener('scroll', measure, {passive: true});
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => {element.removeEventListener('scroll', measure); observer.disconnect();};
  }, []);
  function move(direction: number) {
    const element = rail.current;
    if (element) element.scrollBy({left: direction * Math.max(280, element.clientWidth * .72), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  return <section id={id} className="portfolio-band" aria-labelledby={`${id}-title`}>
    <div className="portfolio-heading"><div><p className="portfolio-kicker">Client work. Studio ventures. Original ideas.</p><h2 id={`${id}-title`}>Out in <em>the world.</em></h2></div>
      <div className="portfolio-actions"><Link href="/work" className="portfolio-all">All the work <span aria-hidden="true">↗</span></Link><div className="portfolio-arrows"><button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label="Previous projects" aria-controls={`${id}-rail`}>←</button><button type="button" onClick={() => move(1)} disabled={edges.end} aria-label="Next projects" aria-controls={`${id}-rail`}>→</button></div></div>
    </div>
    <div ref={rail} id={`${id}-rail`} className="portfolio-rail" role="region" aria-label="Portfolio. Swipe, scroll, or use the arrow buttons." tabIndex={0}>
      {flatheadWork.map((project, index) => <article key={project.id} className="portfolio-project"><a href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${project.name}`}>
        <div className="portfolio-frame"><div className="portfolio-browser" aria-hidden="true"><span>● ● ●</span><span>{new URL(project.url).hostname.replace('www.', '')}</span><span>↗</span></div><picture><source type="image/avif" srcSet={`/flathead/portfolio/${project.id}-480.avif 480w, /flathead/portfolio/${project.id}-800.avif 800w`} sizes="(max-width:600px) 78vw, 330px"/><img src={`/flathead/portfolio/${project.id}-800.webp`} width={800} height={556} alt={`${project.name}: a preview of the website designed and built by Modern Mustard Seed.`} loading="lazy" decoding="async"/></picture></div>
        <div className="portfolio-caption"><span className="portfolio-number">{String(index + 1).padStart(2,'0')}</span><div><h3>{project.name}</h3><p>{project.kind}</p></div><span className="portfolio-visit" aria-hidden="true">↗</span></div><p className="portfolio-description">{project.description}</p>
      </a></article>)}
    </div><p className="portfolio-hint">A little of what we build. Scroll to explore. Open any project.</p>
  </section>;
}
