import Link from '@/components/AttributionLink';
import s from './CardHero.module.css';
import { MascotLean, Marquee } from './HeroMotion';

/* The homepage hero is the link-preview card Sarah loves, blown up: Mr.
   Mustard waving over the comic wordmark, on cream in a mustard glow, the one
   line that says what the studio does, and the way in. Talking to him is the
   floating widget's job, not the hero's (Sarah, 2026-09-25). Pop art that stays
   readable: mustard, ink, cream and red, no outlined UI type. */
export default function CardHero() {
  return <section className={s.card} aria-labelledby="studio-heading">
    <div className={s.glow} aria-hidden="true" />
    <div className={s.rays} aria-hidden="true" />
    <div className={s.dots} aria-hidden="true" />
    <div className={s.top}><span>Design &amp; Agentic Systems Studio</span><span>Nationwide Reach · Hometown: Kalispell, Montana</span></div>

    <div className={s.stage}>
      <span className={s.spark + ' ' + s.s1} aria-hidden="true">✦</span>
      <span className={s.spark + ' ' + s.s2} aria-hidden="true">✦</span>
      <span className={s.spark + ' ' + s.s3} aria-hidden="true">✦</span>
      <span className={s.spark + ' ' + s.s4} aria-hidden="true">✦</span>
      <div className={s.pop}>
        <MascotLean className={s.lean} danceClass={s.dance} confettiClass={s.confetti}>
          <picture>
            <source type="image/avif" srcSet="/brand/lockup-560.avif 560w, /brand/lockup-1000.avif 1000w" sizes="(max-width: 760px) 78vw, 500px" />
            <source type="image/webp" srcSet="/brand/lockup-560.webp 560w, /brand/lockup-1000.webp 1000w" sizes="(max-width: 760px) 78vw, 500px" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-lockup.png" alt="" width={1000} height={1093} className={s.lockup} fetchPriority="high" decoding="async" />
          </picture>
        </MascotLean>
      </div>
    </div>

    <div className={s.copy}>
      <h1 id="studio-heading"><span className="sr-only">Modern Mustard Seed. </span>Websites, custom software, and <em>agentic systems.</em></h1>
      <p className={s.lead}>Designed and built by Sarah Scarano in Montana, for people with something of their own to build. You own all of it.</p>
      <div className={s.actions}>
        <Link href="/inquire" className={s.cta}>Tell Us What You Have In Mind <span aria-hidden="true">↗</span></Link>
        <a href="#selected-work" className={s.quiet}>See The Work <span aria-hidden="true">↓</span></a>
      </div>
    </div>

    <Marquee className={s.marquee}><div>{[0, 1].map(k => <span key={k}>Websites ✦ Custom Software ✦ Agentic Systems ✦ Voice Agents ✦ Brand &amp; Identity ✦ Advisory ✦&nbsp;</span>)}</div></Marquee>
  </section>;
}
