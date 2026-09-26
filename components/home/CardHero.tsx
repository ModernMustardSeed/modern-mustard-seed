import Link from '@/components/AttributionLink';
import s from './CardHero.module.css';
import { MascotLean, Marquee } from './HeroMotion';

/* The homepage hero is a comic-book cover. Mr. Mustard and the comic
   wordmark take most of the frame and burst out of an ink panel, with an
   issue box, a POW burst, action lines and a caption box the way a cover
   carries them (Sarah, 2026-09-26: "bigger ... even more like a comic
   book"). Talking to him is the floating widget's job, not the hero's.
   Pop art that stays readable: mustard, ink, cream and red, no outlined type. */
export default function CardHero() {
  return <section className={s.card} aria-labelledby="studio-heading">
    <div className={s.panel}>
      <div className={s.ground} aria-hidden="true"><i className={s.rays} /><i className={s.lines} /><i className={s.dots} /></div>

      <p className={s.issue} aria-hidden="true"><b>No.1</b><span>Kalispell, Montana</span><span>Nationwide</span></p>

      <p className={s.pow} aria-hidden="true"><span>POW!</span></p>

      <div className={s.pop}>
        <MascotLean className={s.lean} danceClass={s.dance} confettiClass={s.confetti}>
          <picture>
            <source type="image/avif" srcSet="/brand/lockup-560.avif 560w, /brand/lockup-1000.avif 1000w" sizes="(max-width: 760px) 88vw, 640px" />
            <source type="image/webp" srcSet="/brand/lockup-560.webp 560w, /brand/lockup-1000.webp 1000w" sizes="(max-width: 760px) 88vw, 640px" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-lockup.png" alt="" width={1000} height={1093} className={s.lockup} fetchPriority="high" decoding="async" />
          </picture>
        </MascotLean>
        <span className={s.spark + ' ' + s.s1} aria-hidden="true">✦</span>
        <span className={s.spark + ' ' + s.s2} aria-hidden="true">✦</span>
        <span className={s.spark + ' ' + s.s3} aria-hidden="true">✦</span>
      </div>

      <h1 id="studio-heading" className={s.caption}><span className="sr-only">Modern Mustard Seed. </span>Websites, custom software, and <em>agentic systems.</em></h1>
    </div>

    <div className={s.actions}>
      <Link href="/inquire" className={s.cta}>Tell Us What You Have In Mind <span aria-hidden="true">↗</span></Link>
      <a href="#selected-work" className={s.quiet}>See The Work <span aria-hidden="true">↓</span></a>
      <span className={s.studio}>Design &amp; Agentic Systems Studio</span>
    </div>

    <Marquee className={s.marquee}><div>{[0, 1].map(k => <span key={k}>Websites ✦ Custom Software ✦ Agentic Systems ✦ Voice Agents ✦ Brand &amp; Identity ✦ Advisory ✦&nbsp;</span>)}</div></Marquee>
  </section>;
}
