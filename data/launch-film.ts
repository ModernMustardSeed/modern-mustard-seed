/**
 * THE LAUNCH FILM. A product launch film built from the product itself.
 *
 * The door opened 2026-09-08 with the IRL film as the example. Everything the
 * page says about that film is measured, not written: 76.000 seconds, 2,280
 * frames, 30 fps, three cuts, a score synthesised from scratch, every venue
 * and address on screen pulled out of the live app by the capture rig. If the
 * example film changes, re-measure before touching a number here.
 *
 * PRICES LIVE HERE IN CENTS AND NOWHERE ELSE. The checkout route, the page,
 * the JSON-LD offers and the order emails all read this file. Stripe gets
 * inline price_data from these numbers, the same way /pay does, so there is
 * no price id to create and nothing in Stripe that can drift from the page.
 *
 * These three prices were set by the studio on 2026-09-08 to sit well above
 * MUSTARD PICTURES ($197 to $497) and to be the premium film door. Sarah can
 * change any of them with one edit.
 */

export const LAUNCH_FILM = {
  name: 'The Launch Film',
  wordmark: '[ THE LAUNCH FILM ]',
  tagline: 'The film your launch deserves. Built from the real product.',
  promise:
    'We run your product for real, cut a film to a score written for it, render every frame from the actual screens, and hand you three finished formats plus the source. Nothing on screen is stock, and nothing is invented.',
  metaTitle: 'Product Launch Film. Built From the Real Product, Scored From Scratch',
  metaDescription:
    'A 60 to 90 second launch film for your app, product or company, built from real screens and real data, rendered frame by frame, with an original score. Widescreen, vertical and square cuts. Set price, delivered in ten business days, by Modern Mustard Seed in Kalispell, Montana.',
  delivery: 'delivered within ten business days',
  campaignDelivery: 'delivered within fifteen business days',
} as const;

/** What the example film measures. Read from the delivered files, not typed from memory. */
export const EXAMPLE_FILM = {
  title: 'IRL',
  client: 'IRL, the app that decides tonight for you',
  url: 'https://irl.modernmustardseed.com',
  seconds: 76,
  frames: 2280,
  fps: 30,
  cuts: 3,
  stockClips: 0,
  licensedTracks: 0,
  loudnessLufs: -14.9,
  wide: { mp4: '/video/launch-film-irl.mp4', webm: '/video/launch-film-irl.webm', poster: '/video/launch-film-irl-poster.jpg' },
  tall: { mp4: '/video/launch-film-irl-9x16.mp4', poster: '/video/launch-film-irl-9x16-poster.jpg' },
  /** Lines that appear in the film and came out of the running app, verbatim. */
  realThings: [
    'O’Shaughnessy Amphitheater, Grandview Drive, Kalispell',
    'VFW Post 2252, 1st Avenue West, Kalispell',
    'The Galway rain line and the Bergen golden-hour shift',
    'Twenty-one Italian venues from one trip run',
  ],
} as const;

export type LaunchFilmTier = {
  slug: 'launch-film' | 'launch-campaign' | 'launch-season';
  name: string;
  chip: string;
  priceCents: number;
  cadence: 'once' | 'monthly';
  mode: 'payment' | 'subscription';
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

export const launchFilmTiers: LaunchFilmTier[] = [
  {
    slug: 'launch-film',
    name: 'THE LAUNCH FILM',
    chip: '[ 60 TO 90 SECONDS ]',
    priceCents: 750000,
    cadence: 'once',
    mode: 'payment',
    pitch: 'One film, built from your real product, finished in every format you post to.',
    includes: [
      'A 60 to 90 second launch film written to your product, not to a template',
      'Every frame rendered from the real screens: your app, your data, your words',
      'An original score, synthesised for this film, with every cut on a bar line',
      'Widescreen 16:9, vertical 9:16 and square 1:1, plus poster frames',
      'The homepage player installed on your site, poster only until the click',
      'The source rig is yours: re-render a new end card or a new price without us',
      `Hand-finished and ${LAUNCH_FILM.delivery}`,
    ],
    cta: 'Book the film',
  },
  {
    slug: 'launch-campaign',
    name: 'THE LAUNCH CAMPAIGN',
    chip: '[ THE WHOLE LAUNCH WEEK ]',
    priceCents: 1500000,
    cadence: 'once',
    mode: 'payment',
    pitch: 'The film, plus everything a launch week needs cut from it.',
    includes: [
      'Everything in THE LAUNCH FILM',
      'Six cut-downs: 6, 15 and 30 seconds, in widescreen and vertical',
      'Twelve social cards and a share image set pulled from the frames',
      'A launch page section with the film, the proof strip and the call to action',
      'A seven-day posting calendar with the captions written',
      'A voiced version of the film, narrated, for the platforms that reward it',
      `Priority production, ${LAUNCH_FILM.campaignDelivery}`,
    ],
    cta: 'Book the campaign',
    featured: true,
  },
  {
    slug: 'launch-season',
    name: 'THE LAUNCH SEASON',
    chip: '[ A FILM A MONTH ]',
    priceCents: 450000,
    cadence: 'monthly',
    mode: 'subscription',
    pitch: 'For products that ship every month. A new film for every release.',
    includes: [
      'One new LAUNCH FILM tier film every month, on your release cadence',
      'Its cut-downs and social cards, every month',
      'The rig stays warm: a feature that shipped Tuesday is a film by Friday',
      'Your film library grows twelve a year, all in one visual language',
      'Month to month. One film per month, no rollover.',
    ],
    cta: 'Start the season',
  },
];

export function getLaunchFilmTier(slug: string): LaunchFilmTier | undefined {
  return launchFilmTiers.find((t) => t.slug === slug);
}

export function launchFilmUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** The method. Six steps, each one a thing we actually do, in the order we do it. */
export const launchFilmMethod = [
  {
    n: '01',
    title: 'The product runs for real',
    body: 'We drive your live app with a capture rig and keep what it produces. Every screen, every result and every line of data in the film came out of the product that day. No mockups, no stock, no filler text.',
  },
  {
    n: '02',
    title: 'The cut is written on bar lines',
    body: 'Picture and score share one clock. Every cut lands on a bar, every reveal on a beat. Nothing holds longer than three seconds unless it is the one moment the film is about.',
  },
  {
    n: '03',
    title: 'Rendered frame by frame',
    body: 'The film is not a screen recording. Every frame is seeked, painted and photographed, so two renders are identical and a dropped frame is impossible. Change one word and re-render only the frames it touches.',
  },
  {
    n: '04',
    title: 'A score written from scratch',
    body: 'Drums, bass, pads, a lead, the risers and the impacts, synthesised for this film and mastered to broadcast loudness. Nothing licensed, so nothing can be claimed, muted or taken down.',
  },
  {
    n: '05',
    title: 'Three formats from one film',
    body: 'The same film re-set for a phone held upright and for a square feed, not cropped. Widescreen for the site and YouTube, vertical for Reels, TikTok and Shorts, square for the feeds.',
  },
  {
    n: '06',
    title: 'Installed where it sells',
    body: 'The player goes on your homepage with a poster frame and loads nothing until the click. It picks the cut your visitor’s browser can really decode and never shows a spinner that spins forever.',
  },
] as const;

export const launchFilmFaq = [
  {
    q: 'What do you need from me to start?',
    a: 'The product, running, and thirty minutes. We drive it ourselves and keep what it produces. If it is not live yet, a staging URL works. The treatment comes back with the shot list and the length before anything is rendered.',
  },
  {
    q: 'Is this AI-generated footage?',
    a: 'No. The screens are your real product, captured while it runs. The type, the motion and the backdrops are painted procedurally, and the score is synthesised. Where a film calls for illustration we generate it to a character sheet, and we say so in the treatment.',
  },
  {
    q: 'What if I want changes?',
    a: 'Changes to the film we built are included. A new end card, a price that moved, a line you want said differently: tell us and it is re-rendered. The film is built frame by frame, so a change touches only the frames it touches.',
  },
  {
    q: 'What do I own?',
    a: 'Everything. The finished files in every format, full commercial rights, the poster frames, and the source rig that renders the film. You can re-render it yourself a year from now, or hand it to whoever builds the next one.',
  },
  {
    q: 'How long does it take?',
    a: `THE LAUNCH FILM is ${LAUNCH_FILM.delivery}. THE LAUNCH CAMPAIGN is ${LAUNCH_FILM.campaignDelivery}. The IRL film on this page went from a running app to three finished cuts in two days.`,
  },
  {
    q: 'Why not Mustard Pictures?',
    a: 'Mustard Pictures makes a cinematic commercial for a local business from a storyboard, from $197. The Launch Film is for a product: an app, a platform, a company. The screens are real, the data is real, and the film is written to the thing you built.',
  },
  {
    q: 'Can you put it on my site?',
    a: 'It is included. We install the player on your homepage or launch page: poster only until the click, the right cut for the browser, and a plain link if a browser refuses to play anything. If we built your site it takes an afternoon. If we did not, send the repo access and it takes a day.',
  },
] as const;
