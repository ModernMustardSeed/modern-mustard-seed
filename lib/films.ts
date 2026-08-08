/**
 * WHICH FILMS ARE SHIPPED. A declaration, deliberately NOT a filesystem check.
 *
 * ⚠️ THIS EXISTS BECAUSE `existsSync` IS A LIE ON VERCEL. Both film components
 * used to probe `public/video/...` on disk at render time. That works on a
 * fully static page, because the check runs at build time on a machine where
 * `public/` exists. It FAILS on any page that re-renders at request time:
 * `/hundredfold` carries `export const revalidate = 300`, so five minutes after
 * a deploy it regenerates on the lambda, where `public/` is not part of the
 * traced function bundle. The probe returned false, the hero silently fell back
 * to its no-film card, and the file was serving perfectly from the CDN the
 * whole time. `/hundredfold/webinar` has no `revalidate`, so it stayed static
 * and kept working, which is why exactly one of the two looked broken.
 *
 * A dynamic path is also invisible to Next's output file tracing, so bundling
 * would not have saved it either. The honest fix is to stop asking the
 * filesystem a question it cannot answer at runtime and simply state the fact
 * here, where it is version controlled next to the files themselves.
 *
 * ⚠️ Keep this true. `scripts/verify-films.mts` fails if a film marked shipped
 * is not actually in the repo, so this cannot rot silently.
 */

export type Film = {
  /** Public path to the cut. */
  mp4: string;
  /** Public path to the poster frame. */
  poster: string;
  /**
   * False means the page shows its honest no-film invitation instead. A dead
   * play button on the flagship is worse than no player.
   */
  shipped: boolean;
  /** Roughly, for the page to say out loud before somebody presses play. */
  runtime: string;
};

export const FILMS = {
  hero: {
    mp4: '/video/hundredfold-film.mp4',
    poster: '/video/hundredfold-film.jpg',
    shipped: true,
    runtime: '1 min 32 sec',
  },
  webinar: {
    mp4: '/video/hundredfold-webinar.mp4',
    poster: '/video/hundredfold-webinar.jpg',
    shipped: true,
    runtime: '3 min 4 sec',
  },
} as const satisfies Record<string, Film>;
