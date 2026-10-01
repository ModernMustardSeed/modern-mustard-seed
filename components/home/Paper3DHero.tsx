import { preload } from 'react-dom';
import Link from '@/components/AttributionLink';
import PaperRiviera3D from './PaperRiviera3D';
import s from './PaperHero.module.css';
import d from './Paper3DHero.module.css';

/**
 * The homepage hero with the paper Riviera built in real 3D (PaperRiviera3D).
 * Same words, strips and buttons as PaperHero; the flat paper plate paints
 * first and stays as the fallback, and the 3D set fades in over it once
 * Three.js has drawn its first frame.
 */
export default function Paper3DHero() {
  preload('/art/paper/plate-1600.avif', { as: 'image', type: 'image/avif', fetchPriority: 'high', imageSrcSet: '/art/paper/plate-960.avif 960w, /art/paper/plate-1600.avif 1600w', imageSizes: '(max-width: 760px) 540px, max(100vw, 150svh)' });
  return (
    <section id="paper" className={`${s.hero} ${d.hero}`} data-story="" aria-labelledby="studio-heading">
      <div className={d.poster} aria-hidden="true">
        <picture>
          <source type="image/avif" srcSet="/art/paper/plate-960.avif 960w, /art/paper/plate-1600.avif 1600w" sizes="(max-width: 760px) 540px, max(100vw, 150svh)" />
          <img src="/art/paper/plate-1600.webp" alt="" width={1600} height={1067} fetchPriority="high" decoding="async" />
        </picture>
      </div>
      <PaperRiviera3D className={d.stage} />
      <div className={s.grain} aria-hidden="true" />

      <div className={s.words}>
        <p className={s.chip}><i aria-hidden="true" />Modern Mustard Seed <span>· websites and agentic systems</span></p>
        <h1 id="studio-heading" className={s.title}>
          We build <span className={`${s.strip} ${s.tiffany}`}>websites</span> and <span className={`${s.strip} ${s.mustard}`}>agentic systems</span> that run your <span className={s.white}>business.</span>
        </h1>
        <p className={s.lede}>Made to measure for businesses in every state. <span className={s.home}>Based in Kalispell, MT.</span> <b>So you can run your life.</b></p>
        <div className={s.actions}>
          <Link href="/inquire" className={s.cta}>Commission yours</Link>
          <a href="#selected-work" className={s.ghost}>See the work</a>
        </div>
      </div>
      <p className={s.alt}>A cut-paper diorama of the French Riviera built in 3D: a mustard paper sun, paper clouds and gulls, a whitewashed village on the cliff, a paper sailboat on layered torn-paper waves, and Mr. and Mrs. Mustard under a striped umbrella on a little paper beach, him on his phone. Each paper layer casts a soft shadow on the ones behind it.</p>
    </section>
  );
}
