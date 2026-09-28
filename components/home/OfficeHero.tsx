import Link from '@/components/AttributionLink';
import { Marquee } from './HeroMotion';
import s from './OfficeHero.module.css';

/**
 * The homepage hero: The Mustard Building. The studio’s penthouse office,
 * sixty floors over a Roaring Twenties city at night: Mr. Mustard at the
 * drafting table in his pinstripes, the family and friends at the typewriter,
 * the telephone, the ticker and the tube, building somebody's presence. The
 * painting runs edge to edge; the words sit over the night windows on the
 * left, which the painting keeps dark for them. Searchlights sweep the sky
 * and the elevator dial climbs to the penthouse as the page opens. On a
 * phone the painting runs across the top and the words sit below it.
 */
const SCENE = '/art/hero/office';
const LINE = 'We build your presence.';
const TICKER = ['Websites', 'Custom Software', 'Voice Agents', 'Agentic Systems', 'Brand & Identity', 'Marketing', 'Advisory'];

export default function OfficeHero() {
  return <>
    <section className={s.hero} aria-labelledby="studio-heading">
      <picture className={s.art}>
        <source type="image/avif" srcSet={SCENE + '-960.avif 960w, ' + SCENE + '-1600.avif 1600w'} sizes="100vw" />
        <source type="image/webp" srcSet={SCENE + '-960.webp 960w, ' + SCENE + '-1600.webp 1600w'} sizes="100vw" />
        <img src={SCENE + '-1600.webp'} alt="Painting: Mr. Mustard in a mustard pinstripe suit waves from a drafting table in a 1920s penthouse office at night, a shopfront blueprint under his glove, while his family and friends type, telephone, read the ticker and send the pneumatic tube, and the city's skyscrapers glitter through arched windows behind them." width={1600} height={1067} decoding="async" fetchPriority="high" />
      </picture>
      <div className={s.beams} aria-hidden="true"><i /><i /></div>
      <div className={s.scrim} aria-hidden="true" />
      <div className={s.frame} aria-hidden="true"><i /><i /><i /><i /></div>
      <div className={s.copy}>
        <div className={s.dial} aria-hidden="true">
          <svg viewBox="0 0 120 66" focusable="false">
            <path className={s.dialArc} d="M10 60A50 50 0 0 1 110 60" />
            <g className={s.dialTicks}>
              <path d="M10 60h9" /><path d="M24.6 24.6l6.4 6.4" /><path d="M60 10v9" /><path d="M95.4 24.6l-6.4 6.4" /><path d="M110 60h-9" />
            </g>
            <text x="22" y="64">L</text><text x="60" y="30" textAnchor="middle">30</text><text x="98" y="64" textAnchor="end">PH</text>
            <g className={s.needle}><path d="M60 60L60 18" /><circle cx="60" cy="60" r="5" /></g>
          </svg>
          <span>Going up <b>Penthouse</b></span>
        </div>
        <p className={s.credit}>Design &amp; Agentic Systems Studio <i>&middot;</i> Kalispell, Montana</p>
        <h1 id="studio-heading" className={s.name}><span>Modern Mustard</span> <em>Seed</em><span className="sr-only">. {LINE}</span></h1>
        <p className={s.line} aria-hidden="true">{LINE}</p>
        <p className={s.what}><strong>Websites, custom software, and agentic systems,</strong> designed and built by Sarah Scarano in Kalispell, Montana.</p>
        <div className={s.actions}>
          <Link href="/inquire" className={s.cta}>Tell Us What You Have In Mind <span aria-hidden="true">↗</span></Link>
          <a href="#selected-work" className={s.quiet}>See The Work</a>
        </div>
      </div>
    </section>
    <div className={s.ticker}>
      <Marquee className={s.tape}>
        <div>{[0, 1].map((k) => <span key={k} className={s.run}>{TICKER.map((t) => <span key={t} className={s.item}>{t}<i>◆</i></span>)}</span>)}</div>
      </Marquee>
    </div>
  </>;
}
