import { preload } from 'react-dom';
import Link from '@/components/AttributionLink';
import DepthMotion from './DepthMotion';
import s from './PaperHero.module.css';

/**
 * The homepage hero as a cut-paper diorama of the Riviera.
 *
 * Torn craft paper, stacked in layers: the cliff village and the sea, a
 * mustard paper sun, a paper sailboat, a band of torn-paper waves in front, and
 * Mr. and Mrs. Mustard cut from paper under a striped umbrella on a paper sand bar. On load the
 * pieces drop onto the table one after another; then everything "boils" at a
 * handmade four frames a second, the way stop-motion breathes. The headline is
 * pasted up like a collage, with its two key phrases on torn paper strips. With
 * a pointer the layers part like a real diorama.
 *
 * Server rendered; DepthMotion is the only client code. One screen, no scroll
 * pinning. Reduced motion shows the finished scene, still.
 */

type Piece = { k: string; src: string; w: number; h: number; d: number };

// Back to front, in paint order. Depth (d) is how far a layer drifts with the
// pointer: the nearer, the more.
const PIECES: Piece[] = [
  { k: 'sun', src: 'sun-480', w: 480, h: 476, d: 6 },
  { k: 'wave', src: 'wave-1600', w: 1600, h: 348, d: 16 },
  { k: 'sail', src: 'sail-360', w: 360, h: 391, d: 12 },
  { k: 'sand', src: 'sand-900', w: 900, h: 240, d: 20 },
  { k: 'lounge', src: 'lounge-760', w: 760, h: 795, d: 24 },
];

export default function PaperHero() {
  preload('/art/paper/plate-1600.avif', { as: 'image', type: 'image/avif', fetchPriority: 'high', imageSrcSet: '/art/paper/plate-960.avif 960w, /art/paper/plate-1600.avif 1600w', imageSizes: '(max-width: 760px) 540px, max(100vw, 150svh)' });
  return (
    <section id="paper" className={s.hero} data-story="" aria-labelledby="studio-heading">
      <div className={s.scene} aria-hidden="true">
        <picture className={s.plate}>
          <source type="image/avif" srcSet="/art/paper/plate-960.avif 960w, /art/paper/plate-1600.avif 1600w" sizes="(max-width: 760px) 540px, max(100vw, 150svh)" />
          <img src="/art/paper/plate-1600.webp" alt="" width={1600} height={1067} fetchPriority="high" decoding="async" />
        </picture>
        {PIECES.map((p) => (
          <div key={p.k} className={`${s.piece} ${s[p.k]}`} style={{ ['--d' as string]: p.d }}>
            <picture>
              <source type="image/avif" srcSet={`/art/paper/${p.src}.avif`} />
              <img src={`/art/paper/${p.src}.webp`} alt="" width={p.w} height={p.h} fetchPriority="low" decoding="async" draggable={false} />
            </picture>
          </div>
        ))}
      </div>
      <div className={s.grain} aria-hidden="true" />

      <div className={s.words}>
        <h1 id="studio-heading" className={s.title}>
          We build <span className={`${s.strip} ${s.tiffany}`}>websites</span> and <span className={`${s.strip} ${s.mustard}`}>agentic systems</span> that run your <span className={s.white}>business.</span>
        </h1>
        <p className={s.lede}>Made to measure for businesses in every state. <span className={s.home}>Based in Kalispell, MT.</span> <b>So you can run your life.</b></p>
        <div className={s.actions}>
          <Link href="/inquire" className={s.cta}>Commission yours</Link>
          <a href="#selected-work" className={s.ghost}>See the work</a>
        </div>
      </div>
      <p className={s.alt}>A cut-paper diorama of the French Riviera: a mustard paper sun, a whitewashed village on the cliff, a paper sailboat on torn-paper waves, and Mr. and Mrs. Mustard under a striped umbrella on a little paper beach, him on his phone.</p>
      <DepthMotion target="paper" />
    </section>
  );
}
