'use client';

import { useState } from 'react';
import Link from '@/components/AttributionLink';
import s from './HeroDirections.module.css';
import SeedBloom, { type GroveSite } from './SeedBloom';

/* III. The Grove: the Seed and the Gallery in one image. A mustard seed of
   light grows into a tree of gold, and the live work hangs in its branches,
   the way the parable's birds come to rest there. */

const SITES: (GroveSite & { place: string })[] = [
  { name: 'D & D Landscaping', place: 'Tallahassee, Florida', slug: 'dd-landscaping', url: 'https://ddlandscapingfl.com' },
  { name: 'Cross + Covenant', place: 'Apparel, nationwide', slug: 'cross-covenant-current', url: 'https://crossandcovenant.co' },
  { name: 'Built Right in Montana', place: 'Custom homes, Flathead Valley', slug: 'brim-homes', url: 'https://brimhomes.com' },
  { name: 'Bare Earth', place: 'Landscape and construction', slug: 'bare-earth', url: 'https://bare-earth.vercel.app' },
  { name: 'Wildmere Honey Co.', place: 'Montana honey', slug: 'wildmere', url: 'https://wildmere.vercel.app' },
];

function Line({ children, d }: { children: React.ReactNode; d: number }) {
  return <span className={s.line}><span style={{ animationDelay: d + 's' }}>{children}</span></span>;
}

export default function HeroGrove() {
  const [front, setFront] = useState(-1);
  return <section className={s.seed + ' ' + s.grove} aria-labelledby="studio-heading">
    <SeedBloom className={s.bloom} sites={SITES} onFront={setFront} centered />
    <div className={s.seedInner}>
      <div className={s.rule}><span>Modern Mustard Seed</span>{front >= 0 && <a href={SITES[front].url} target="_blank" rel="noopener noreferrer" className={s.inBranch} key={front}>In the branches · <b>{SITES[front].name}</b> ↗</a>}</div>
      <div className={s.groveCopy}>
        <h1 id="studio-heading"><Line d={1.4}>From a single seed,</Line><Line d={1.55}><em>work the world comes to use.</em></Line></h1>
        <p className={s.seedLead}>Websites, custom software and agentic systems. Designed and engineered by Sarah Scarano, in Montana.</p>
        <div className={s.seedActions}>
          <Link href="/inquire" className={s.gold}>Begin a Conversation <span aria-hidden="true">→</span></Link>
          <a href="#selected-work" className={s.hair}>See the Work</a>
        </div>
        <ul className="sr-only" aria-label="Live sites we built">
          {SITES.map(x => <li key={x.slug}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.name}</a></li>)}
        </ul>
      </div>
    </div>
  </section>;
}
