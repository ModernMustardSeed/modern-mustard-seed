import type { ReactNode } from 'react';
import { Marquee } from '@/components/home/HeroMotion';
import s from './PopPageHero.module.css';

/**
 * The Mustard Building page hero, carried onto the inner pages. The homepage
 * hero sets the language: a black-lacquer panel under a gold stepped cornice,
 * the page's painting hung in a gilt arch with a champagne sunburst behind
 * it, a brass medallion with a short word, a floor plaque, and ticker tape
 * that runs underneath. Every page keeps its own eyebrow, h1, lead and
 * actions; this only dresses them. Everything decorative is aria-hidden, the
 * only motion is the entrance and the ticker, and it all stands still under
 * prefers-reduced-motion.
 */

export type PopArt = {
  /** Path without size and extension, e.g. /art/pages/inquire. Needs -960 and -1600 in .avif and .webp. */
  src: string;
  alt: string;
  /** Short caption written under the poster, decorative. */
  caption?: string;
  /** Which part of the poster to keep when the frame crops, e.g. '60% 40%'. */
  focus?: string;
};

type Props = {
  /** The page's eyebrow (label), exactly as it was. */
  eyebrow?: ReactNode;
  /** The h1 contents. Wrap the accent word in <em> for the marker accent. */
  title: ReactNode;
  titleId?: string;
  /** Lead paragraphs and anything else under the h1 (actions, notes). */
  children?: ReactNode;
  /** The painting in the gilt frame. Without it, the studio's night-drive painting hangs instead. */
  art?: PopArt;
  /** A speech tag on the poster, from Mr. Mustard (he is in the art). */
  mascot?: boolean | { bubble?: string };
  /** A brass floor plaque: a big number and up to two small lines. */
  issue?: { no: string; lines?: string[] };
  /** The brass medallion, one or two short words. */
  sticker?: string;
  /** Ticker tape under the panel. */
  marquee?: string[];
  /** Kept for the pages that pass it; the copy always reads left-aligned. */
  align?: 'left' | 'center';
  className?: string;
};

/** The studio's night-drive painting: Mr. Mustard's roadster on a Deco boulevard. */
const ROAD: PopArt = { src: '/art/pages/road', alt: '' };

/** Class names for the actions a page passes in, so its links wear the house buttons. */
export const pop = { cta: s.cta, ctaAlt: s.ctaAlt, lead: s.lead, note: s.note, actions: s.actions, pill: s.pill, back: s.back };

/** The gold stepped cornice along the top edge of the panel. */
export function Drips({ className }: { className?: string }) {
  return <span className={[s.cornice, className ?? ''].join(' ')} aria-hidden="true" />;
}

function Sticker({ word }: { word: string }) {
  return (
    <p className={s.sticker} aria-hidden="true">
      <span>{word}</span>
    </p>
  );
}

export default function PopPageHero({ eyebrow, title, titleId, children, art, mascot, issue, sticker, marquee, className }: Props) {
  const bubble = typeof mascot === 'object' ? mascot.bubble : undefined;
  const poster = art ?? ROAD;
  const decorative = !art;
  return (
    <section className={[s.hero, issue ? s.withIssue : '', className ?? ''].join(' ')} aria-labelledby={titleId}>
      <div className={s.panel}>
        <Drips />
        <div className={s.ground} aria-hidden="true"><i className={s.bloom} /><i className={s.splat} /></div>

        {issue && (
          <p className={s.issue} aria-hidden="true">
            <b>{issue.no}</b>
            {issue.lines?.map((l) => <span key={l}>{l}</span>)}
          </p>
        )}

        <div className={s.copy}>
          {eyebrow && <div className={s.eyebrow}>{eyebrow}</div>}
          <h1 id={titleId} className={s.h1}>{title}</h1>
          {children}
        </div>

        <div className={s.stage} aria-hidden={decorative || undefined}>
          <figure className={s.poster}>
            <div className={s.paper}>
              <picture>
                <source type="image/avif" srcSet={`${poster.src}-960.avif 960w, ${poster.src}-1600.avif 1600w`} sizes="(min-width: 1024px) 46vw, 90vw" />
                <source type="image/webp" srcSet={`${poster.src}-960.webp 960w, ${poster.src}-1600.webp 1600w`} sizes="(min-width: 1024px) 46vw, 90vw" />
                <img src={`${poster.src}-960.webp`} alt={poster.alt} width={1600} height={1067} className={s.posterImg} style={poster.focus ? { objectPosition: poster.focus } : undefined} fetchPriority="high" decoding="async" />
              </picture>
              {poster.caption && <figcaption className={s.posterCap} aria-hidden="true">{poster.caption}</figcaption>}
            </div>
          </figure>
          {sticker && <Sticker word={sticker} />}
          {bubble && <span className={s.bubble} aria-hidden="true">{bubble}</span>}
        </div>
      </div>

      {marquee && marquee.length > 0 && <Banner items={marquee} />}
    </section>
  );
}

function Banner({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={[s.banner, className ?? ''].join(' ')}>
      <Marquee className={s.marquee}>
        <div>
          {[0, 1].map((k) => (
            <span key={k} className={s.mRun}>
              {items.map((t) => <span key={t} className={s.mItem}>{t}<i>◆</i></span>)}
            </span>
          ))}
        </div>
      </Marquee>
    </div>
  );
}

/**
 * A ticker-tape moment for below the fold: the tape on its own.
 * One per long page, never a stack.
 */
export function PopStrip({ items, className }: { items: string[]; className?: string }) {
  return <Banner items={items} className={[s.stripAlone, className ?? ''].join(' ')} />;
}
