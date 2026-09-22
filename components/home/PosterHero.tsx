import Link from '@/components/AttributionLink';
import Image from 'next/image';
import s from './PosterHero.module.css';

/* The homepage hero: the pop-art social card, blown up to a full poster. */
export default function PosterHero() {
  return <section className={s.poster} aria-labelledby="studio-heading">
    <div className={s.posterDots} aria-hidden="true" />
    <div className={s.posterTop}><span>Bespoke Design &amp; Technology Studio</span><span>Kalispell, Montana · Working Everywhere</span></div>
    <div className={s.posterGrid}>
      <div className={s.posterCopy}>
        <p className={s.posterEyebrow}>Design &amp; technology, with character.</p>
        <h1 id="studio-heading"><span>Your vision.</span><span className={s.plate}><em>Beautifully</em></span><span>built.</span></h1>
        <p className={s.posterIntro}>Websites, custom software, and AI systems. Designed and built by Sarah Scarano in Montana, for people with something of their own to build.</p>
        <Link href="/inquire" className={s.posterCta}>Tell Us What You Have In Mind <span aria-hidden="true">↗</span></Link>
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
    <div className={s.marquee} aria-hidden="true"><div>{[0, 1].map(k => <span key={k}>Websites ✦ Custom Software ✦ AI Systems ✦ Voice Agents ✦ Brand &amp; Identity ✦ Advisory ✦&nbsp;</span>)}</div></div>
  </section>;
}
