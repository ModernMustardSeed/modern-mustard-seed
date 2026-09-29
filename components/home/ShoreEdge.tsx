import s from './ShoreEdge.module.css';

/**
 * The shoreline where a sand-coloured section meets a sea-coloured one. Sits
 * between the two as a zero-height strip; the sea swells up over the seam and
 * settles as the seam scrolls into view, with a line of lace foam riding it.
 * Scroll-driven CSS only (animation-timeline: view()); browsers without it get
 * the settled edge. No client code.
 *
 * `sea` is the next section's colour; `seaLeft`, when set, is the lighter tone
 * some sections glow with at their top left, so the seam stays invisible.
 * `offset` is any margin between the strip and the section it belongs to.
 */
export default function ShoreEdge({ id, sea, seaLeft, offset = 0 }: { id: string; sea: string; seaLeft?: string; offset?: number }) {
  return (
    <div className={s.edge} style={{ ['--sea' as string]: sea, ['--fill' as string]: `url(#${id}-sea)`, ['--offset' as string]: `${offset}px` }} aria-hidden="true">
      <svg className={s.art} viewBox="0 0 1440 96" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={`${id}-sea`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={seaLeft ?? sea} />
            <stop offset=".6" stopColor={sea} />
          </linearGradient>
          <filter id={`${id}-lace`} x="0" y="-60%" width="100%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.28" numOctaves="3" seed="11" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="18" />
          </filter>
        </defs>
        <g className={s.swell}>
          <path className={s.wash} d="M0 34 C90 22 170 44 260 36 S430 20 520 32 700 50 800 38 980 18 1080 30 1260 48 1350 36 1440 26 V96 H0Z" />
          <path className={s.body} d="M0 48 C90 38 170 58 260 50 S430 36 520 46 700 62 800 52 980 34 1080 44 1260 60 1350 50 1440 42 V96 H0Z" />
          <g className={s.drift}>
            <path className={s.foam} filter={`url(#${id}-lace)`} d="M0 48 C90 38 170 58 260 50 S430 36 520 46 700 62 800 52 980 34 1080 44 1260 60 1350 50 1440 42 L1440 56 C1350 64 1260 74 1080 58 S980 48 800 66 520 60 430 50 260 64 90 52 0 62Z" />
            <path className={s.foam} filter={`url(#${id}-lace)`} transform="translate(1440 0)" d="M0 48 C90 38 170 58 260 50 S430 36 520 46 700 62 800 52 980 34 1080 44 1260 60 1350 50 1440 42 L1440 56 C1350 64 1260 74 1080 58 S980 48 800 66 520 60 430 50 260 64 90 52 0 62Z" />
          </g>
        </g>
      </svg>
    </div>
  );
}
