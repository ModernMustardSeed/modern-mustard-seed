import Link from '@/components/AttributionLink';
import s from './HeroDirections.module.css';
import SeedBloom from './SeedBloom';
import WorkRing from './WorkRing';

/* Homepage hero candidates, round two (2026-09-24): high class, cinematic.
   /hero-lab shows each in the real page so one can be picked. */

const SITES = [
  { name: 'D & D Landscaping', place: 'Tallahassee, Florida', slug: 'dd-landscaping', url: 'https://ddlandscapingfl.com' },
  { name: 'Cross + Covenant', place: 'Apparel, nationwide', slug: 'cross-covenant-current', url: 'https://crossandcovenant.co' },
  { name: 'Built Right in Montana', place: 'Custom homes, Flathead Valley', slug: 'brim-homes', url: 'https://brimhomes.com' },
  { name: 'Bare Earth', place: 'Landscape and construction, Montana', slug: 'bare-earth', url: 'https://bare-earth.vercel.app' },
  { name: 'Wildmere Honey Co.', place: 'Montana honey', slug: 'wildmere', url: 'https://wildmere.vercel.app' },
];

/* A line of display type that rises out of its own mask. */
function Line({ children, d }: { children: React.ReactNode; d: number }) {
  return <span className={s.line}><span style={{ animationDelay: d + 's' }}>{children}</span></span>;
}

/* I. The Seed: one mustard seed of light grows into a tree of gold on a warm
   black stage. The name, the parable and the promise in one image. */
export function HeroSeed() {
  return <section className={s.seed} aria-labelledby="studio-heading">
    <SeedBloom className={s.bloom} />
    <div className={s.seedGlow} aria-hidden="true" />
    <div className={s.seedInner}>
      <div className={s.rule}><span>Modern Mustard Seed</span><span>Design &amp; Agentic Systems Studio</span></div>
      <div className={s.seedCopy}>
        <h1 id="studio-heading"><Line d={0.9}>From a single seed,</Line><Line d={1.05}><em>something the world</em></Line><Line d={1.2}><em>comes to use.</em></Line></h1>
        <p className={s.seedLead}>Websites, custom software and agentic systems, designed and engineered by Sarah Scarano. Made in Montana. Built to be owned.</p>
        <div className={s.seedActions}>
          <Link href="/inquire" className={s.gold}>Begin a Conversation <span aria-hidden="true">→</span></Link>
          <a href="#selected-work" className={s.hair}>See the Work</a>
        </div>
      </div>
      <div className={s.foot}><span>Kalispell, Montana · Working nationwide</span><span className={s.cue}><i />Scroll</span></div>
    </div>
  </section>;
}

/* II. The Gallery: the live work hung on a slow turntable under one line of
   serif, on the studio's cream. Quiet, expensive, and all of it real. */
export function HeroGallery() {
  return <section className={s.gallery} aria-labelledby="studio-heading">
    <div className={s.galleryInner}>
      <div className={s.rule + ' ' + s.ruleInk}><span>Modern Mustard Seed</span><span>Kalispell, Montana · Working nationwide</span></div>
      <h1 id="studio-heading" className={s.galleryTitle}><Line d={0.15}>Beautiful work,</Line><Line d={0.3}><em>built to be used.</em></Line></h1>
      <WorkRing sites={SITES} className={s.ringWrap} stageClass={s.stage} panelClass={s.panel} frontClass={s.panelFront} captionClass={s.plaque} />
      <div className={s.galleryActions}>
        <Link href="/inquire" className={s.ink}>Begin a Conversation <span aria-hidden="true">→</span></Link>
        <Link href="/work" className={s.hair + ' ' + s.hairInk}>The Full Portfolio</Link>
      </div>
    </div>
  </section>;
}
