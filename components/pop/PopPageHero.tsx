import type { ReactNode } from 'react';
import { Marquee } from '@/components/home/HeroMotion';
import s from './PopPageHero.module.css';

/**
 * The comic-book cover, carried onto the inner pages. The homepage hero
 * (components/home/CardHero) and the /book hero set the language: a thick
 * ink panel with a hard shadow, mustard rays, action lines, a red halftone
 * corner, an issue box, a POW sticker, a framed screenprint with tape, and
 * Mr. Mustard. Every page keeps its own eyebrow, h1, lead and actions; this
 * only dresses them. Everything decorative is aria-hidden, the only motion is
 * the entrance, and it all stands still under prefers-reduced-motion.
 */

export type PopArt = {
  /** Path without size and extension, e.g. /art/pages/inquire. Needs -960 and -1600 in .avif and .webp. */
  src: string;
  alt: string;
  /** Short caption lettered under the print, decorative. */
  caption?: string;
  /** Which part of the print to keep when the frame crops, e.g. '60% 40%'. */
  focus?: string;
};

type Props = {
  /** The page's eyebrow (label pill), exactly as it was. */
  eyebrow?: ReactNode;
  /** The h1 contents. Wrap the accent word in <em> for the mustard highlight. */
  title: ReactNode;
  titleId?: string;
  /** Lead paragraphs and anything else under the h1 (actions, notes). */
  children?: ReactNode;
  /** A framed screenprint on the right. Without it, Mr. Mustard pops out of the panel instead. */
  art?: PopArt;
  /** Mr. Mustard waving at the corner of the print, with an optional speech bubble. */
  mascot?: boolean | { bubble?: string };
  /** The cover's issue box: a big number and up to two small lines. */
  issue?: { no: string; lines?: string[] };
  /** The red POW burst, one or two short words. */
  sticker?: string;
  /** An ink marquee strip under the panel. */
  marquee?: string[];
  /** Center the copy when there is no art (legal and long-read pages). */
  align?: 'left' | 'center';
  className?: string;
};

/** Mr. Mustard, waving. AVIF first, WebP next, the PNG for everything else. */
function Mascot({ sizes, eager = false, className }: { sizes: string; eager?: boolean; className?: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet="/brand/mascot-hero-480.avif 480w, /brand/mascot-hero-720.avif 720w" sizes={sizes} />
      <source type="image/webp" srcSet="/brand/mascot-hero-480.webp 480w, /brand/mascot-hero-720.webp 720w" sizes={sizes} />
      <img src="/brand/mascot.png" alt="" width={480} height={652} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />
    </picture>
  );
}

/** Class names for the actions a page passes in, so its links wear the house buttons. */
export const pop = { cta: s.cta, ctaAlt: s.ctaAlt, lead: s.lead, note: s.note, actions: s.actions, pill: s.pill, back: s.back };

export default function PopPageHero({ eyebrow, title, titleId, children, art, mascot, issue, sticker, marquee, align = 'left', className }: Props) {
  const bubble = typeof mascot === 'object' ? mascot.bubble : undefined;
  const solo = !art;
  return (
    <section className={[s.hero, solo ? s.solo : '', issue ? s.withIssue : '', align === 'center' ? s.center : '', className ?? ''].join(' ')} aria-labelledby={titleId}>
      <div className={s.panel}>
        <div className={s.ground} aria-hidden="true"><i className={s.rays} /><i className={s.lines} /><i className={s.dots} /></div>

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

        {art ? (
          <div className={s.stage}>
            <figure className={s.frame}>
              <span className={`${s.tape} ${s.tapeL}`} aria-hidden="true" />
              <span className={`${s.tape} ${s.tapeR}`} aria-hidden="true" />
              <picture>
                <source type="image/avif" srcSet={`${art.src}-960.avif 960w, ${art.src}-1600.avif 1600w`} sizes="(min-width: 1024px) 46vw, 90vw" />
                <source type="image/webp" srcSet={`${art.src}-960.webp 960w, ${art.src}-1600.webp 1600w`} sizes="(min-width: 1024px) 46vw, 90vw" />
                <img src={`${art.src}-960.webp`} alt={art.alt} width={1600} height={1067} className={s.frameImg} style={art.focus ? { objectPosition: art.focus } : undefined} fetchPriority="high" decoding="async" />
              </picture>
              {art.caption && <figcaption className={s.frameCap} aria-hidden="true">{art.caption}</figcaption>}
            </figure>
            {sticker && (
              <p className={s.pow} aria-hidden="true"><span>{sticker}</span></p>
            )}
            {mascot && (
              <div className={s.mascot} aria-hidden="true">
                {bubble && <span className={s.bubble}>{bubble}</span>}
                <Mascot sizes="(max-width: 760px) 96px, 150px" className={s.mascotImg} eager />
              </div>
            )}
          </div>
        ) : (
          <div className={s.popOut} aria-hidden="true">
            {sticker && <p className={s.pow}><span>{sticker}</span></p>}
            {bubble && <span className={s.bubble}>{bubble}</span>}
            <Mascot sizes="(max-width: 760px) 150px, 300px" className={s.mascotBig} eager />
          </div>
        )}
      </div>

      {marquee && marquee.length > 0 && (
        <Marquee className={s.marquee}>
          <div>
            {[0, 1].map((k) => (
              <span key={k} className={s.mRun}>
                {marquee.map((t) => <span key={t} className={s.mItem}>{t}<i>✦</i></span>)}
              </span>
            ))}
          </div>
        </Marquee>
      )}
    </section>
  );
}

/**
 * A comic art moment for below the fold: an ink marquee strip, optionally with
 * a framed print beside a caption box. One per long page, never a stack.
 */
export function PopStrip({ items, className }: { items: string[]; className?: string }) {
  return (
    <Marquee className={[s.marquee, s.stripAlone, className ?? ''].join(' ')}>
      <div>
        {[0, 1].map((k) => (
          <span key={k} className={s.mRun}>
            {items.map((t) => <span key={t} className={s.mItem}>{t}<i>✦</i></span>)}
          </span>
        ))}
      </div>
    </Marquee>
  );
}
