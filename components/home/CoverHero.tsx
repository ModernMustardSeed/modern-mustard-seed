import { preload } from 'react-dom';
import Link from '@/components/AttributionLink';
import CoverMotion from './CoverMotion';
import s from './CoverHero.module.css';

/**
 * The homepage hero as a magazine cover: The Agentic Issue.
 *
 * A Riviera sky, the masthead set edge to edge, and Mr. and Mrs. Mustard as
 * the cover stars standing in front of the letters, the way a cover star
 * breaks the masthead. The cover lines are the services, and each one is a
 * link. Two cover lines only, so the masthead and the stars carry the cover.
 * The main line is the promise and the call to action commissions the work. The layers sit at different depths and drift apart with the pointer,
 * like a pop-up book. One screen, rendered on the server; CoverMotion is the
 * only client code and it writes two numbers.
 */

const LINES = [
  { kicker: 'Websites', line: 'Found on Google. Recommended by ChatGPT.', href: '/websites' },
  { kicker: 'Voice agents', line: 'The receptionist who never sleeps.', href: '/voice-agents' },
];


export default function CoverHero() {
  preload('/art/cover/sky-1600.avif', { as: 'image', type: 'image/avif', fetchPriority: 'high', imageSrcSet: '/art/cover/sky-960.avif 960w, /art/cover/sky-1600.avif 1600w', imageSizes: '100vw' });
  return (
    <section id="cover" className={s.cover} data-story="" aria-labelledby="studio-heading">
      <picture className={`${s.layer} ${s.sky}`}>
        <source media="(max-width: 760px)" type="image/avif" srcSet="/art/cover/sky-tall-960.avif" />
        <source type="image/avif" srcSet="/art/cover/sky-960.avif 960w, /art/cover/sky-1600.avif 1600w" sizes="100vw" />
        <img src="/art/cover/sky-1600.webp" alt="" width={1600} height={1067} fetchPriority="high" decoding="async" />
      </picture>

      <p className={s.dateline}><span>The Agentic Issue</span><span>Fall 2026</span></p>

      {/* The masthead is type stretched to the exact width of the cover. */}
      <svg className={`${s.layer} ${s.masthead}`} viewBox="0 0 1000 150" preserveAspectRatio="xMidYMin meet" aria-hidden="true" focusable="false">
        <text x="0" y="128" textLength="1000" lengthAdjust="spacingAndGlyphs">MODERN MUSTARD SEED</text>
      </svg>
      <svg className={`${s.layer} ${s.mastheadTall}`} viewBox="0 0 1000 330" preserveAspectRatio="xMidYMin meet" aria-hidden="true" focusable="false">
        <text x="0" y="148" textLength="1000" lengthAdjust="spacingAndGlyphs">MODERN</text>
        <text x="0" y="316" textLength="1000" lengthAdjust="spacingAndGlyphs">MUSTARD SEED</text>
      </svg>

      <picture className={`${s.layer} ${s.stars}`}>
        <source type="image/avif" srcSet="/art/cover/couple-760.avif" />
        <img src="/art/cover/couple-760.webp" alt="Mr. and Mrs. Mustard on the cover: he in sunglasses and an open linen shirt with his phone in hand, she laughing under a wide straw hat." width={760} height={985} decoding="async" />
      </picture>

      <nav className={s.lines} aria-label="Inside this issue">
        {LINES.map((l, i) => (
          <Link key={l.href} href={l.href} className={s.coverline} style={{ ['--i' as string]: i }}>
            <span className={s.kicker}>{l.kicker}</span>
            <span className={s.lineText}>{l.line}</span>
          </Link>
        ))}
      </nav>

      <div className={s.main}>
        <h1 id="studio-heading" className={s.promise}>We build websites and <em>agentic systems</em> that run your business.</h1>
        <div className={s.actions}>
          <Link href="/inquire" className={s.cta}>Commission yours <span aria-hidden="true">↗</span></Link>
        </div>
      </div>


      <CoverMotion />
    </section>
  );
}
