import Link from '@/components/AttributionLink';
import Image from 'next/image';
import s from './HeroLab.module.css';

const INTRO = 'Websites, custom software, and AI systems. Designed and built by Sarah Scarano in Montana, for people with something of their own to build.';
const CTA = 'Tell Us What You Have In Mind';
const SITES = [
  { image: 'dd-landscaping', name: 'D & D Landscaping', kind: 'Landscaping, Tallahassee' },
  { image: 'cross-covenant-current', name: 'Cross + Covenant', kind: 'Apparel storefront' },
  { image: 'brim-homes', name: 'Built Right in Montana', kind: 'Custom homes, Flathead Valley' },
  { image: 'bare-earth', name: 'Bare Earth', kind: 'Landscape & construction' },
  { image: 'wildmere', name: 'Wildmere Honey Co.', kind: 'Brand experience' },
];

function Arrow() { return <span aria-hidden="true">↗</span>; }
function Shot({ image, alt, priority }: { image: string; alt: string; priority?: boolean }) {
  return <Image unoptimized src={'/images/editorial/' + image + '-960.webp'} alt={alt} width={960} height={600} fetchPriority={priority ? 'high' : undefined} />;
}
function Browser({ image, alt, className, priority }: { image: string; alt: string; className?: string; priority?: boolean }) {
  return <div className={s.browser + (className ? ' ' + className : '')}><div className={s.chrome} aria-hidden="true"><i /><i /><i /></div><Shot image={image} alt={alt} priority={priority} /></div>;
}

/* A. Poster: the pop-art OG card, blown up to a full hero. */
export function HeroPoster() {
  return <section className={s.poster} aria-labelledby="poster-heading">
    <div className={s.posterDots} aria-hidden="true" />
    <div className={s.posterTop}><span>Bespoke Design &amp; Technology Studio</span><span>Kalispell, Montana · Working Everywhere</span></div>
    <div className={s.posterGrid}>
      <div className={s.posterCopy}>
        <p className={s.posterEyebrow}>Design &amp; technology, with character.</p>
        <h1 id="poster-heading"><span>Your vision.</span><span className={s.plate}><em>Beautifully</em></span><span>built.</span></h1>
        <p className={s.posterIntro}>{INTRO}</p>
        <Link href="/inquire" className={s.posterCta}>{CTA} <Arrow /></Link>
      </div>
      <div className={s.posterArt}>
        <div className={s.burst} aria-hidden="true" />
        <Image src="/brand/mascot-full.png" alt="Mr. Mustard, the studio mascot, waving hello" width={876} height={1190} className={s.posterMascot} sizes="(max-width: 760px) 70vw, 34vw" priority />
        <p className={s.posterBubble}>Let’s build yours.</p>
        <span className={s.spark + ' ' + s.sparkOne} aria-hidden="true">✦</span>
        <span className={s.spark + ' ' + s.sparkTwo} aria-hidden="true">✦</span>
        <span className={s.spark + ' ' + s.sparkThree} aria-hidden="true">✦</span>
      </div>
    </div>
    <div className={s.marquee} aria-hidden="true"><div>{Array.from({ length: 2 }).map((_, k) => <span key={k}>Websites ✦ Custom Software ✦ AI Systems ✦ Voice Agents ✦ Brand &amp; Identity ✦ Advisory ✦&nbsp;</span>)}</div></div>
  </section>;
}

/* B. Stage: dark, centered, the work fanned out like prints on a table. */
export function HeroStage() {
  return <section className={s.stage} aria-labelledby="stage-heading">
    <div className={s.stageGlow} aria-hidden="true" />
    <div className={s.stageTop}><span>Bespoke Design &amp; Technology Studio</span><span>Kalispell, Montana · Working Everywhere</span></div>
    <div className={s.stageCopy}>
      <p className={s.stageEyebrow}>Design &amp; technology, with character.</p>
      <h1 id="stage-heading">Your vision. <em>Beautifully</em> built.</h1>
      <p className={s.stageIntro}>{INTRO}</p>
      <Link href="/inquire" className={s.stageCta}>{CTA} <Arrow /></Link>
    </div>
    <div className={s.deck}>
      <Browser image="dd-landscaping" alt="D & D Landscaping website" className={s.deckLeft} />
      <Browser image="brim-homes" alt="Built Right in Montana website" className={s.deckRight} />
      <Browser image="cross-covenant-current" alt="Cross + Covenant storefront" className={s.deckCenter} priority />
      <Image src="/brand/mascot-full.png" alt="Mr. Mustard peeking over the work, waving" width={876} height={1190} className={s.stageMascot} sizes="200px" />
    </div>
  </section>;
}

/* C. Reel: clean split, one big window that plays the real work. */
export function HeroReel() {
  return <section className={s.reel} aria-labelledby="reel-heading">
    <div className={s.reelTop}><span>Bespoke Design &amp; Technology Studio</span><span>Kalispell, Montana · Working Everywhere</span></div>
    <div className={s.reelGrid}>
      <div className={s.reelCopy}>
        <p className={s.reelEyebrow}><span />Design &amp; technology, with character.</p>
        <h1 id="reel-heading"><span>Your vision.</span><em>Beautifully</em><span>built.</span></h1>
        <p className={s.reelIntro}>{INTRO}</p>
        <div className={s.reelActions}><Link href="/inquire" className={s.reelCta}>{CTA} <Arrow /></Link><a href="#selected-work" className={s.reelLink}>See The Work</a></div>
      </div>
      <div className={s.reelArt}>
        <div className={s.reelSun} aria-hidden="true" />
        <div className={s.player}>
          <div className={s.chrome} aria-hidden="true"><i /><i /><i /><b>modernmustardseed.com / work</b></div>
          <div className={s.slides}>{SITES.map((site, i) => <figure key={site.image} className={s.slide} style={{ animationDelay: i * 4 + 's' }}><Shot image={site.image} alt={site.name + ' website, built by Modern Mustard Seed'} priority={i === 0} /><figcaption><strong>{site.name}</strong><span>{site.kind}</span></figcaption></figure>)}</div>
        </div>
        <Image src="/brand/mascot-full.png" alt="Mr. Mustard waving beside the work" width={876} height={1190} className={s.reelMascot} sizes="190px" />
      </div>
    </div>
  </section>;
}
