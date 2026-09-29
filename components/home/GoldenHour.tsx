import Link from '@/components/AttributionLink';
import s from './GoldenHour.module.css';

/**
 * The payoff for the sand story: the Mustard family at golden hour, on the
 * beach the hero just wrote on. The painting drifts closer as you scroll
 * through it and warm motes of light float up the frame. Scroll-driven CSS
 * only; with reduced motion it is a still painting.
 */

// Motes: left %, size px, delay s, duration s. Fixed so server and client agree.
const MOTES = [
  [8, 5, 0, 11], [16, 3, 3.5, 9], [23, 6, 7, 13], [31, 4, 1.5, 10], [39, 3, 5, 12],
  [47, 5, 8.5, 11], [55, 3, 2.5, 9], [62, 6, 6, 14], [70, 4, 0.8, 10], [78, 3, 4.2, 12],
  [85, 5, 9, 13], [92, 3, 1.2, 9],
] as const;

export default function GoldenHour() {
  return (
    <section className={s.golden} aria-labelledby="golden-heading">
      <div className={s.frame}>
        <picture className={s.art}>
          <source type="image/avif" srcSet="/art/sand/family-960.avif 960w, /art/sand/family-1600.avif 1600w" sizes="100vw" />
          <img src="/art/sand/family-1600.webp" width={1600} height={1067} loading="lazy" decoding="async" alt="Painting: the Mustard family on the Riviera at sunset. Mr. Mustard smiles at his phone on a lounger under a Tiffany-blue umbrella, Mrs. Mustard laughs beside him in her straw hat, and the kids and the puppy splash at the water's edge." />
        </picture>
        <div className={s.glow} aria-hidden="true" />
        <div className={s.motes} aria-hidden="true">
          {MOTES.map(([x, size, delay, dur], i) => (
            <i key={i} style={{ ['--x' as string]: `${x}%`, ['--s' as string]: `${size}px`, ['--d' as string]: `${delay}s`, ['--t' as string]: `${dur}s` }} />
          ))}
        </div>
        <div className={s.copy}>
          <p className={s.eyebrow}>Meet the Mustards</p>
          <h2 id="golden-heading">He runs his business <em>from here.</em></h2>
          <p className={s.lede}>His website books the jobs. His agents answer every call, send the quotes and chase the follow-ups. Mr. Mustard reads one text from the lounger and goes back to the kids.</p>
          <div className={s.actions}>
            <Link href="/inquire" className={s.cta}>Build mine <span aria-hidden="true">↗</span></Link>
            <Link href="/ai" className={s.quiet}>How the agents work</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
