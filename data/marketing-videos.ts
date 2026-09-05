/**
 * THE MARKETING VIDEO LIBRARY. Every finished film we have, in one place,
 * rendered by components/admin/VideoLibrary.tsx at /admin/videos.
 *
 * ⚠️ THIS IS A DECLARATION, NOT A FILESYSTEM SCAN, for exactly the reason
 * spelled out in lib/films.ts: `existsSync` on `public/` returns false on any
 * render that happens at request time, and it fails silently. So the facts live
 * here, version controlled next to the files, and `scripts/verify-films.mts`
 * fails if any of them stops being true.
 *
 * Every number below was measured with ffprobe, not estimated. Every entry in
 * `runsAt` was found by grepping app/, components/, data/ and lib/ for the file
 * name; it is where the video actually plays, not where we intended it to.
 * A video with an empty `runsAt` is genuinely referenced nowhere in the code.
 *
 * Adding a film: put the cut and its poster in public/video/, add the entry,
 * then run `npx tsx scripts/verify-films.mts` before you commit.
 */

export type VideoCut = {
  /** Public path, served straight off the CDN. */
  file: string;
  label: string;
  width: number;
  height: number;
};

export type MarketingVideo = {
  id: string;
  title: string;
  /** Seconds, from ffprobe. The page formats it. */
  runtime: number;
  /** Widest cut first: the page plays formats[0]. */
  formats: VideoCut[];
  /** Public path to a poster frame, when one exists in the repo. */
  poster?: string;
  /** What it is. No claims that are not visible in the film itself. */
  summary: string;
  /**
   * Where this file is referenced in the codebase. Empty means nothing plays
   * it: the file is in the repo and shipping to the CDN, unused.
   */
  runsAt: string[];
  /** True when the cut carries no audio track. */
  silent?: boolean;
  /** A watch page or artifact link, where one exists. */
  watchUrl?: string;
  /** Where the project that renders it lives, outside this repo. */
  source?: string;
};

export const MARKETING_VIDEOS: MarketingVideo[] = [
  {
    id: 'mms-brand-film',
    title: 'A Wonderful Time To Be Alive',
    runtime: 96,
    formats: [
      { file: '/video/mms-brand-film-16x9.mp4', label: '16:9', width: 1920, height: 1080 },
      { file: '/video/mms-brand-film-9x16.mp4', label: '9:16', width: 1080, height: 1920 },
    ],
    poster: '/video/mms-brand-film.jpg',
    summary:
      'The brand film. Ephesians 5:15 and the number of days, the four levels of value with imagination on top, letting the machines do machine work, then the seed, the tree and the birds. Mr. Mustard, Mrs. Mustard and Dijon the dog. Narration is Kokoro-82M running locally, the score is synthesised, and every frame was rendered rather than recorded.',
    runsAt: [],
    watchUrl: 'https://claude.ai/code/artifact/e03e0a06-9c54-4f0d-885c-1c4c8b071d6a',
    source: 'marketing/mms-film-2026-09-04',
  },
  {
    id: 'hundredfold-film',
    title: 'HUNDREDFOLD film',
    runtime: 91.7,
    formats: [{ file: '/video/hundredfold-film.mp4', label: '16:9', width: 1920, height: 1080 }],
    poster: '/video/hundredfold-film.jpg',
    summary: 'The flagship film on the HUNDREDFOLD page, above the fold.',
    runsAt: ['lib/films.ts → /hundredfold'],
  },
  {
    id: 'hundredfold-webinar',
    title: 'HUNDREDFOLD webinar',
    runtime: 184.4,
    formats: [{ file: '/video/hundredfold-webinar.mp4', label: '16:9', width: 1920, height: 1080 }],
    poster: '/video/hundredfold-webinar.jpg',
    summary: 'The long-form webinar cut. The longest thing in the library.',
    runsAt: ['lib/films.ts → /hundredfold/webinar'],
  },
  {
    id: 'demo-agent',
    title: 'Demo agent film',
    runtime: 34.2,
    formats: [
      { file: '/video/demo-agent-16x9.mp4', label: '16:9', width: 1920, height: 1080 },
      { file: '/video/demo-agent-9x16.mp4', label: '9:16', width: 1080, height: 1920 },
      { file: '/video/demo-agent-youtube-16x9.mp4', label: 'YouTube cut, 73.9s', width: 1920, height: 1080 },
    ],
    summary:
      'The demo agent, cut three ways. The two short cuts go out in the outbound and outreach cadences; the long cut is the YouTube version.',
    runsAt: [
      'app/api/cron/outbound-cadence',
      'app/api/cron/outreach-cadence',
      'app/api/demo-agent/build',
    ],
  },
  {
    id: 'demo-welcome',
    title: 'Demo welcome',
    runtime: 118.5,
    formats: [{ file: '/video/demo-welcome.mp4', label: '16:9', width: 1280, height: 720 }],
    poster: '/video/demo-welcome-poster.jpg',
    summary: 'The full welcome walkthrough sent with a demo. Three 27.5s cuts split out of it below.',
    runsAt: ['app/api/demo-station', 'lib/email.ts', 'lib/outbound-email.ts'],
  },
  {
    id: 'demo-welcome-parts',
    title: 'Demo welcome, three parts',
    runtime: 27.5,
    formats: [
      { file: '/video/demo-welcome-site.mp4', label: 'Site', width: 1280, height: 720 },
      { file: '/video/demo-welcome-voice.mp4', label: 'Voice', width: 1280, height: 720 },
      { file: '/video/demo-welcome-os.mp4', label: 'Command Center', width: 1280, height: 720 },
    ],
    poster: '/video/demo-welcome-site-poster.jpg',
    summary: 'One cut per door, for when the whole two minutes is too much to ask of a cold lead.',
    runsAt: ['app/api/demo-station', 'lib/email.ts', 'lib/outbound-email.ts'],
  },
  {
    id: 'build-the-tree',
    title: 'Build the tree',
    runtime: 24.3,
    formats: [
      { file: '/video/build-the-tree-16x9.mp4', label: '1080p', width: 1920, height: 1080 },
      { file: '/video/build-the-tree-960.mp4', label: '960, web weight', width: 960, height: 540 },
    ],
    poster: '/video/build-the-tree-poster.jpg',
    summary: 'The homepage hero film. The 960 cut is what the page actually loads.',
    runsAt: ['components/HeroVideo.tsx'],
  },
  {
    id: 'night-shift',
    title: 'Night Shift',
    runtime: 29.2,
    formats: [
      { file: '/video/night-shift-16x9.mp4', label: '1080p', width: 1920, height: 1080 },
      { file: '/video/night-shift-960.mp4', label: '960, web weight', width: 960, height: 540 },
    ],
    poster: '/video/night-shift-poster.jpg',
    summary: 'The voice agent film: the phone that gets answered after hours.',
    runsAt: ['components/voice-agents/NightShiftFilm.tsx', 'components/pictures/PicturesSections.tsx'],
  },
  {
    id: 'mustard-mode',
    title: 'Mustard Mode',
    runtime: 29.0,
    formats: [
      { file: '/video/mustard-mode-16x9.mp4', label: '16:9', width: 1920, height: 1080 },
      { file: '/video/mustard-mode-9x16.mp4', label: '9:16', width: 1080, height: 1920 },
    ],
    summary: 'The Mustard Mode film, cut for feed and for stories.',
    runsAt: ['app/api/front-desk', 'app/api/mustard-mode/checkout', 'app/api/mustard-mode/coach'],
  },
  {
    id: 'chief-ad',
    title: 'The Chief',
    runtime: 36.0,
    formats: [{ file: '/video/chief-ad.mp4', label: '720p', width: 1280, height: 720 }],
    poster: '/video/chief-ad-poster.jpg',
    summary: 'The Chief spot, on its own product page.',
    runsAt: ['app/chief/page.tsx'],
  },
  {
    id: 'demos-landing',
    title: 'Demos landing loop',
    runtime: 27.5,
    formats: [{ file: '/video/demos-landing-web.mp4', label: '720p', width: 1280, height: 720 }],
    poster: '/video/demos-landing-poster.jpg',
    summary: 'The loop on the demos landing page, the one a QR scan lands on.',
    runsAt: ['app/demos/page.tsx'],
  },
  {
    id: 'wildmere-scroll',
    title: 'Wildmere scroll',
    runtime: 18.8,
    formats: [{ file: '/video/wildmere-scroll.mp4', label: '1280x800', width: 1280, height: 800 }],
    poster: '/video/wildmere-scroll-poster.jpg',
    summary: 'A site scrolling under its own weight, on the websites page. No audio.',
    runsAt: ['app/websites/page.tsx', 'components/websites/HeroFilm.tsx'],
    silent: true,
  },
  {
    id: 'portal-walkthrough',
    title: 'Portal walkthrough',
    runtime: 50.3,
    formats: [{ file: '/video/portal-walkthrough.mp4', label: '1080p', width: 1920, height: 1080 }],
    poster: '/video/portal-walkthrough-poster.jpg',
    summary: 'A screen tour of the client portal. No audio, so it can autoplay.',
    runsAt: ['components/PortalShowcase.tsx'],
    silent: true,
  },
  {
    id: 'celebration',
    title: 'Celebration',
    runtime: 8.0,
    formats: [{ file: '/video/celebration.mp4', label: '9:16', width: 720, height: 1280 }],
    summary: 'The eight-second celebration sting used on go-live and in a reference demo.',
    runsAt: ['app/celebrate/page.tsx', 'app/demo/reference/daisys-cafe', 'app/sarahbook/scripts.ts'],
  },
  {
    id: 'hero',
    title: 'Hero loop',
    runtime: 8.0,
    formats: [{ file: '/video/hero.mp4', label: '1080p', width: 1920, height: 1088 }],
    summary: 'The eight-second hero loop handed to built client sites and demo deliveries.',
    runsAt: [
      'app/admin/clients/[email]',
      'app/api/admin/delivery/[projectId]',
      'app/api/admin/outbound/leads/[id]/build-site',
    ],
  },

  // Below here: in the repo, shipping to the CDN, referenced by nothing.
  {
    id: 'hundredfold-ad',
    title: 'HUNDREDFOLD ad',
    runtime: 56.2,
    formats: [{ file: '/video/hundredfold-ad.mp4', label: '1080p', width: 1920, height: 1080 }],
    poster: '/video/hundredfold-ad.jpg',
    summary: 'A HUNDREDFOLD ad cut. Nothing in the codebase plays it.',
    runsAt: [],
  },
  {
    id: 'team-welcome',
    title: 'Team welcome',
    runtime: 35.5,
    formats: [
      { file: '/video/team-welcome-16x9.mp4', label: '16:9', width: 1280, height: 720 },
      { file: '/video/team-welcome-9x16.mp4', label: '9:16', width: 720, height: 1280 },
    ],
    poster: '/video/team-welcome-poster.png',
    summary: 'A welcome film for new team members. Not wired into Academy or onboarding.',
    runsAt: [],
  },
  {
    id: 'hero-seed',
    title: 'Hero seed loop',
    runtime: 8.0,
    formats: [{ file: '/video/hero-seed.mp4', label: '720p', width: 1280, height: 720 }],
    summary: 'An alternate hero loop. Superseded by hero.mp4 and build-the-tree.',
    runsAt: [],
  },
  {
    id: 'chipman-arrival',
    title: 'Chipman arrival',
    runtime: 20.1,
    formats: [{ file: '/video/chipman-arrival.mp4', label: '1280x722', width: 1280, height: 722 }],
    poster: '/video/chipman-arrival-poster.jpg',
    summary: 'A client arrival clip. No audio, and nothing references it.',
    runsAt: [],
    silent: true,
  },
];

/** Total bytes are not stored here: the API route stats the real files. */
export const VIDEO_COUNT = MARKETING_VIDEOS.length;
