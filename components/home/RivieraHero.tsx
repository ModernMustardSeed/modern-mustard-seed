import Link from '@/components/AttributionLink';
import { Marquee } from './HeroMotion';
import s from './RivieraHero.module.css';

/**
 * The homepage hero: The Riviera. Mr. Mustard runs the business from his
 * phone on a lounger under a Tiffany-blue umbrella while Mrs. Mustard suns
 * in her big hat and the kids and the dog play at the water's edge, a white
 * yacht offshore. The agentic systems do the work; the family lives.
 *
 * The painting runs edge to edge and keeps the open sea on the left for the
 * words. The name is set huge in Bodoni Moda, each letter rolling in like a
 * wave; the promise follows in the italic. A striped awning with a scalloped
 * edge runs the services underneath. On a phone the painting sits across the
 * top and the words sit below it on sand.
 */
const SCENE = '/art/hero/riviera';
const LINE = 'We build it. You live it.';
const TICKER = ['Websites', 'Custom software', 'Voice agents', 'Agentic systems', 'Brand & identity', 'Marketing', 'Advisory'];

function Rolling({ text, from }: { text: string; from: number }) {
  return <>{[...text].map((ch, i) => <span key={i} className={s.ch} style={{ ['--i' as string]: from + i }}>{ch === ' ' ? ' ' : ch}</span>)}</>;
}

export default function RivieraHero() {
  return <>
    <section className={s.hero} aria-labelledby="studio-heading">
      <picture className={s.art}>
        <source type="image/avif" srcSet={SCENE + '-960.avif 960w, ' + SCENE + '-1600.avif 1600w'} sizes="100vw" />
        <source type="image/webp" srcSet={SCENE + '-960.webp 960w, ' + SCENE + '-1600.webp 1600w'} sizes="100vw" />
        <img src={SCENE + '-1600.webp'} alt="Painting: Mr. Mustard in sunglasses and a light-blue linen shirt works on his phone from a lounger under a Tiffany-blue striped umbrella on a French Riviera beach. Mrs. Mustard in a straw sun hat lounges beside him, the kids splash and build a sandcastle at the water's edge, the seed dog chases a wave, and a white yacht sits offshore below a whitewashed village." width={1600} height={1067} decoding="async" fetchPriority="high" />
      </picture>
      <div className={s.glare} aria-hidden="true" />
      <div className={s.scrim} aria-hidden="true" />
      <div className={s.copy}>
        <p className={s.credit}>Design &amp; agentic systems studio <i>·</i> Kalispell, Montana</p>
        <h1 id="studio-heading" className={s.name}>
          <span className="sr-only">Modern Mustard Seed. {LINE}</span>
          <span aria-hidden="true" className={s.row}><Rolling text="Modern" from={0} /></span>
          <span aria-hidden="true" className={s.row}><Rolling text="Mustard" from={6} /> <em><Rolling text="Seed" from={13} /></em></span>
        </h1>
        <p className={s.line} aria-hidden="true">We build it. <em>You live it.</em></p>
        <p className={s.what}><strong>Websites, custom software, and agentic systems,</strong> designed and built by Sarah Scarano in Kalispell, Montana. They run the business, so you can run your life.</p>
        <div className={s.actions}>
          <Link href="/inquire" className={s.cta}>Tell us what you have in mind <span aria-hidden="true">↗</span></Link>
          <a href="#selected-work" className={s.quiet}>See the work</a>
        </div>
      </div>
    </section>
    <div className={s.awning}>
      <Marquee className={s.tape}>
        <div>{[0, 1].map((k) => <span key={k} className={s.run}>{TICKER.map((t) => <span key={t} className={s.item}>{t}<i /></span>)}</span>)}</div>
      </Marquee>
    </div>
  </>;
}
