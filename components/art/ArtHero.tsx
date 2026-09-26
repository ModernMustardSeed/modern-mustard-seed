'use client';

import type { ReactNode } from 'react';
import Link from '@/components/AttributionLink';
import { artStyle, type ArtStyleId } from '@/lib/art-styles';
import { useArtStyle } from './useArtStyle';
import s from './ArtHero.module.css';

/**
 * The homepage hero, in whichever hand the dial is set to. Pop art is the
 * house hero (passed in as children, so it stays a server-rendered page);
 * every other style is its own painted scene with the name set in that
 * style's type. The h1 is the same words in every style.
 */
export default function ArtHero({ ready, children }: { ready: ArtStyleId[]; children: ReactNode }) {
  const id = useArtStyle();
  const style = artStyle(ready.includes(id) ? id : 'pop');
  // The house hero carries data-hero="pop" so app/art-styles.css can hide it
  // before hydration when a visitor comes back to another style: no flash.
  if (!style.scene) return <div data-hero="pop">{children}</div>;

  const src = style.scene;
  return <section className={s.hero} data-scene={style.id} aria-labelledby="studio-heading">
    {/* The painting shows whole, below the nav, so Mr. Mustard is never
        cropped; a blurred copy of it (same file, one download) fills the
        rest of the frame. */}
    <picture className={s.scene} key={style.id + '-fill'} aria-hidden="true">
      <source type="image/avif" srcSet={src + '-960.avif 960w, ' + src + '-1600.avif 1600w'} sizes="100vw" />
      <source type="image/webp" srcSet={src + '-960.webp 960w, ' + src + '-1600.webp 1600w'} sizes="100vw" />
      <img src={src + '-1600.webp'} alt="" width={1600} height={1067} decoding="async" />
    </picture>
    <picture className={s.art} key={style.id}>
      <source type="image/avif" srcSet={src + '-960.avif 960w, ' + src + '-1600.avif 1600w'} sizes="100vw" />
      <source type="image/webp" srcSet={src + '-960.webp 960w, ' + src + '-1600.webp 1600w'} sizes="100vw" />
      <img src={src + '-1600.webp'} alt="" width={1600} height={1067} decoding="async" fetchPriority="high" />
    </picture>
    <div className={s.scrim} aria-hidden="true" />
    <div className={s.light} aria-hidden="true" />
    <div className={s.copy} key={style.id + '-copy'}>
      <p className={s.credit}>{style.credit}</p>
      <h1 id="studio-heading" className={s.name}><span>Modern Mustard</span> <em>Seed</em><span className="sr-only">. {style.line}</span></h1>
      <p className={s.line} aria-hidden="true">{style.line}</p>
      <p className={s.what}>Websites, custom software, and agentic systems, designed and built by Sarah Scarano in Kalispell, Montana.</p>
      <div className={s.actions}>
        <Link href="/inquire" className={s.cta}>Tell Us What You Have In Mind <span aria-hidden="true">↗</span></Link>
        <a href="#selected-work" className={s.quiet}>See The Work</a>
      </div>
    </div>
  </section>;
}
