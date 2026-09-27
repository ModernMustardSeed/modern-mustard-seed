import type { ReactNode } from 'react';
import { Marquee } from '@/components/home/HeroMotion';
import s from './PopPageHero.module.css';

/**
 * The Graffiti Couture page hero, carried onto the inner pages. The homepage
 * hero sets the language: a concrete wall panel with a yellow hard shadow,
 * paint dripping off its top edge, the page's art wheat-pasted on the wall
 * with tape and a torn edge, a spray-painted sticker (crown, star or arrow)
 * with a short tag word, a stencil arrow, and a spray-painted banner that
 * runs underneath. Every page keeps its own eyebrow, h1, lead and actions;
 * this only dresses them. Everything decorative is aria-hidden, the only
 * motion is the entrance and the banner, and it all stands still under
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
  /** A wheat-pasted poster on the right. Without it, the studio's open-road poster goes up instead. */
  art?: PopArt;
  /** A speech tag on the poster, from Mr. Mustard (he is in the art). */
  mascot?: boolean | { bubble?: string };
  /** A stencil tag on the wall: a big number and up to two small lines. */
  issue?: { no: string; lines?: string[] };
  /** The spray-painted sticker, one or two short words. */
  sticker?: string;
  /** A spray-painted banner under the wall. */
  marquee?: string[];
  /** Kept for the pages that pass it; the copy always reads left-aligned. */
  align?: 'left' | 'center';
  className?: string;
};

/** The studio's open-road poster: Mr. Mustard cruising under a painted overpass. */
const ROAD: PopArt = { src: '/art/pages/road', alt: '' };

/** Class names for the actions a page passes in, so its links wear the house buttons. */
export const pop = { cta: s.cta, ctaAlt: s.ctaAlt, lead: s.lead, note: s.note, actions: s.actions, pill: s.pill, back: s.back };

/** Paint running off the top edge of the wall. */
export function Drips({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 0H1200V10C1188 10 1184 14 1183 22 1182 30 1178 33 1175 33 1171 33 1169 29 1169 22 1168 14 1163 10 1150 10H1004C996 10 993 15 992 27 991 42 987 50 982 50 977 50 974 42 973 28 972 15 968 10 960 10H812C805 10 802 13 801 19 800 25 797 27 794 27 791 27 789 25 788 19 787 13 783 10 776 10H604C596 10 592 16 591 30 590 47 586 57 580 57 574 57 570 47 569 31 568 16 564 10 556 10H402C395 10 392 14 391 21 390 28 387 31 384 31 380 31 378 28 377 21 376 14 372 10 365 10H214C206 10 203 15 202 25 201 37 197 43 193 43 188 43 185 37 184 25 183 15 179 10 172 10H66C59 10 56 13 55 18 54 23 51 25 48 25 45 25 43 23 42 18 41 13 37 10 30 10H0Z" />
    </svg>
  );
}

function Sticker({ word }: { word: string }) {
  // One of three spray-painted shapes, picked by the word so a page always wears the same one.
  const kind = [...word].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
  return (
    <p className={`${s.sticker} ${kind === 0 ? s.crown : kind === 1 ? s.star : s.arrowTag}`} aria-hidden="true">
      <svg viewBox="0 0 200 160" className={s.stickerShape} focusable="false">
        {kind === 0 && <path d="M18 132 8 42 58 86 100 18 142 86 192 42 182 132Z" />}
        {kind === 1 && <path d="M100 4 124 58 184 54 138 94 160 150 100 118 40 150 62 94 16 54 76 58Z" />}
        {kind === 2 && <path d="M6 48H118V10L196 80 118 150V112H6Z" />}
      </svg>
      <span>{word}</span>
    </p>
  );
}

/** A spray stencil arrow on the wall, pointing at the poster. */
function StencilArrow({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 60" aria-hidden="true" focusable="false">
      <path d="M4 38C30 30 56 26 86 28L82 14 116 34 80 52 84 38C58 37 32 40 6 46Z" />
    </svg>
  );
}

export default function PopPageHero({ eyebrow, title, titleId, children, art, mascot, issue, sticker, marquee, className }: Props) {
  const bubble = typeof mascot === 'object' ? mascot.bubble : undefined;
  const poster = art ?? ROAD;
  const decorative = !art;
  return (
    <section className={[s.hero, issue ? s.withIssue : '', className ?? ''].join(' ')} aria-labelledby={titleId}>
      <div className={s.panel}>
        <Drips className={s.drips} />
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
          <StencilArrow className={s.arrow} />
          <figure className={s.poster}>
            <span className={`${s.tape} ${s.tapeL}`} aria-hidden="true" />
            <span className={`${s.tape} ${s.tapeR}`} aria-hidden="true" />
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
              {items.map((t) => <span key={t} className={s.mItem}>{t}<i>★</i></span>)}
            </span>
          ))}
        </div>
      </Marquee>
      <Drips className={s.bannerDrips} />
    </div>
  );
}

/**
 * A graffiti moment for below the fold: the spray-painted banner on its own.
 * One per long page, never a stack.
 */
export function PopStrip({ items, className }: { items: string[]; className?: string }) {
  return <Banner items={items} className={[s.stripAlone, className ?? ''].join(' ')} />;
}
