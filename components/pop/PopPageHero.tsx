import type { ReactNode } from 'react';
import { Marquee } from '@/components/home/HeroMotion';
import s from './PopPageHero.module.css';

/**
 * The inner-page cover (studio edition since 2026-10-09; was the Riviera page hero). The homepage sets the
 * language: a sand-white card under a striped Tiffany awning with a
 * scalloped edge, the page's painting on a postcard, a perforated postage
 * stamp with a short word, a luggage tag for the issue, and the awning's
 * ticker running underneath. Every page keeps its own eyebrow, h1, lead and
 * actions; this only dresses them. Everything decorative is aria-hidden, the
 * only motion is the entrance and the ticker, and it all stands still under
 * prefers-reduced-motion.
 */

export type PopArt = {
  /** Path without size and extension, e.g. /art/riviera/inquire. Needs -960 and -1600 in .avif and .webp. */
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
  /** The painting on the postcard. Without it, the studio's coast-road painting goes up instead. */
  art?: PopArt;
  /** A speech tag on the poster, from Mr. Mustard (he is in the art). */
  mascot?: boolean | { bubble?: string };
  /** A luggage tag: a big number and up to two small lines. */
  issue?: { no: string; lines?: string[] };
  /** The postage stamp, one or two short words. */
  sticker?: string;
  /** The awning ticker under the card. */
  marquee?: string[];
  /** Kept for the pages that pass it; the copy always reads left-aligned. */
  align?: 'left' | 'center';
  className?: string;
};

/** The studio's coast-road painting: the family in a Tiffany-blue convertible above the sea. */
const ROAD: PopArt = { src: '/art/riviera/road', alt: '' };

/**
 * The studio edition (2026-10-09) hangs a still from the studio's own cartoon
 * films where the Riviera painting used to go. Each entry is a file pair in
 * /public/storybook (-800 and -1600 .webp) and the alt text for that still.
 * A painting with no entry here (the bootcamp art, for one) stays as it was.
 */
const STILLS: Record<string, { name: string; alt: string }> = {
  '/art/riviera/road': { name: 'road', alt: 'Dale the plumber drives his teal van down a sunny main street, smiling at his phone.' },
  '/art/riviera/industries': { name: 'industries', alt: 'A line of happy customers from every kind of business waits outside a shop while Dale waves from the door.' },
  '/art/riviera/system': { name: 'system', alt: 'A cutaway of the studio building, every room full of mustard seed characters at work.' },
  '/art/riviera/store': { name: 'store', alt: 'Families browse a busy bike shop while the owner helps a customer at the counter.' },
  '/art/riviera/legal': { name: 'legal', alt: 'A mustard seed character in a cap guards a golden vault with a ring of keys and a padlock.' },
  '/art/riviera/audit': { name: 'found', alt: 'A golden magnifying glass shines down on a storybook lakeside town, with a speech bubble above it.' },
  '/art/riviera/yacht': { name: 'yacht', alt: 'Sarah and Anthony peek out from behind giant flowers with the mustard seed crew.' },
  '/art/riviera/work': { name: 'venture', alt: 'Sarah and Anthony assemble a giant website on a stage while a crane lowers the final panel.' },
  '/art/riviera/montana': { name: 'montana', alt: 'A storybook Montana town among pine forests and a lake, with a golden map pin over Main Street.' },
  '/art/riviera/services': { name: 'services', alt: 'The whole mustard seed crew, each dressed for a different job, crowds together and waves.' },
  '/art/riviera/inquire': { name: 'inquire', alt: 'Sarah plants a seedling in a pot at a workbench while Dale the plumber leans in to watch.' },
  '/art/riviera/blog': { name: 'blog', alt: 'A mustard seed in a green hoodie types on a laptop beside a big cup of coffee at sunrise.' },
  '/art/riviera/advisory': { name: 'advisory', alt: 'A mustard seed with a clipboard leads a team of seed specialists through a sunny studio.' },
};

/** Class names for the actions a page passes in, so its links wear the house buttons. */
export const pop = { cta: s.cta, ctaAlt: s.ctaAlt, lead: s.lead, note: s.note, actions: s.actions, pill: s.pill, back: s.back };

/** The striped awning with its scalloped edge along the top of the card. */
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
  const still = STILLS[poster.src];
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
              {still ? (
                <img
                  src={`/storybook/${still.name}-1600.webp`}
                  srcSet={`/storybook/${still.name}-800.webp 800w, /storybook/${still.name}-1600.webp 1600w`}
                  sizes="(min-width: 1024px) 46vw, 90vw"
                  alt={decorative ? '' : still.alt}
                  width={1600}
                  height={1067}
                  className={s.posterImg}
                  fetchPriority="high"
                  decoding="async"
                />
              ) : (
                <picture>
                  <source type="image/avif" srcSet={`${poster.src}-960.avif 960w, ${poster.src}-1600.avif 1600w`} sizes="(min-width: 1024px) 46vw, 90vw" />
                  <source type="image/webp" srcSet={`${poster.src}-960.webp 960w, ${poster.src}-1600.webp 1600w`} sizes="(min-width: 1024px) 46vw, 90vw" />
                  <img src={`${poster.src}-960.webp`} alt={poster.alt} width={1600} height={1067} className={s.posterImg} style={poster.focus ? { objectPosition: poster.focus } : undefined} fetchPriority="high" decoding="async" />
                </picture>
              )}
              {poster.caption && !still && <figcaption className={s.posterCap} aria-hidden="true">{poster.caption}</figcaption>}
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
              {items.map((t) => <span key={t} className={s.mItem}>{t}<i /></span>)}
            </span>
          ))}
        </div>
      </Marquee>
    </div>
  );
}

/**
 * An awning moment for below the fold: the ticker on its own.
 * One per long page, never a stack.
 */
export function PopStrip({ items, className }: { items: string[]; className?: string }) {
  return <Banner items={items} className={[s.stripAlone, className ?? ''].join(' ')} />;
}
