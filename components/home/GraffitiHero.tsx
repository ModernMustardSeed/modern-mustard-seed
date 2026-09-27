import Link from '@/components/AttributionLink';
import s from './GraffitiHero.module.css';

/**
 * The homepage hero: Graffiti Couture. Mr. Mustard in his gold puffer in
 * front of the dripping wall, the name in Anton with SEED in marker. The
 * painting shows whole, right-aligned under the nav, over a blurred copy of
 * itself (same file, one download), and the words sit in the calm left side.
 * On a phone the painting runs across the top and the words sit below it.
 */
const SCENE = '/art/hero/graffiti';
const LINE = 'Loud where it counts. Tailored everywhere else.';

export default function GraffitiHero() {
  return <section className={s.hero} aria-labelledby="studio-heading">
    <picture className={s.scene} aria-hidden="true">
      <source type="image/avif" srcSet={SCENE + '-960.avif 960w, ' + SCENE + '-1600.avif 1600w'} sizes="100vw" />
      <source type="image/webp" srcSet={SCENE + '-960.webp 960w, ' + SCENE + '-1600.webp 1600w'} sizes="100vw" />
      <img src={SCENE + '-1600.webp'} alt="" width={1600} height={1067} decoding="async" />
    </picture>
    <picture className={s.art}>
      <source type="image/avif" srcSet={SCENE + '-960.avif 960w, ' + SCENE + '-1600.avif 1600w'} sizes="100vw" />
      <source type="image/webp" srcSet={SCENE + '-960.webp 960w, ' + SCENE + '-1600.webp 1600w'} sizes="100vw" />
      <img src={SCENE + '-1600.webp'} alt="" width={1600} height={1067} decoding="async" fetchPriority="high" />
    </picture>
    <div className={s.scrim} aria-hidden="true" />
    <div className={s.copy}>
      <p className={s.credit}>Design &amp; Agentic Systems Studio · Kalispell, Montana</p>
      <h1 id="studio-heading" className={s.name}><span>Modern Mustard</span> <em>Seed</em><span className="sr-only">. {LINE}</span></h1>
      <p className={s.line} aria-hidden="true">{LINE}</p>
      <p className={s.what}><strong>Websites, custom software, and agentic systems,</strong> designed and built by Sarah Scarano in Kalispell, Montana.</p>
      <div className={s.actions}>
        <Link href="/inquire" className={s.cta}>Tell Us What You Have In Mind <span aria-hidden="true">↗</span></Link>
        <a href="#selected-work" className={s.quiet}>See The Work</a>
      </div>
    </div>
  </section>;
}
