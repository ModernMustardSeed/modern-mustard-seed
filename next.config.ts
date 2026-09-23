import type { NextConfig } from 'next';

/**
 * SECURITY HEADERS.
 *
 * Added 2026-09-16 after an outside audit flagged a missing Content Security
 * Policy and missing frame protection. Before this the site served exactly one
 * security header, Strict-Transport-Security, and nothing else.
 *
 * ── Why the CSP is split in two ──
 *
 * A Content Security Policy written from guesswork breaks a site silently: the
 * browser blocks a request, nothing throws, and a form or a video or the voice
 * widget simply stops working with no error anybody sees.
 *
 * The riskiest thing here is the voice agent. @vapi-ai/web runs the call over
 * Daily's WebRTC stack, which opens websockets and media connections to a set
 * of origins that a census of ordinary page loads never sees, because none of
 * it loads until somebody presses the button.
 *
 * So the policy ships in two parts:
 *
 *   ENFORCED    the directives that cannot break a working page and close the
 *               holes the audit named: framing, base tag injection, plugin
 *               embedding, form hijacking, mixed content.
 *
 *   REPORT-ONLY the full lockdown, including script-src and connect-src.
 *               Browsers report violations to the console without blocking
 *               anything, so the allow-list can be completed from real traffic
 *               and then promoted into the enforced policy.
 *
 * To promote it: watch the console on the homepage, /book, /audit and a real
 * voice call, fold every violated origin into the lists below, then move the
 * directives from REPORT_ONLY_CSP into ENFORCED_CSP.
 *
 * ── The allow-lists ──
 *
 * Measured, not guessed. A crawl of 24 public pages found the browser touching
 * only this origin plus Google Analytics. The rest below are origins the code
 * can reach but the crawl did not trigger: the Meta Pixel (env-gated), Vapi and
 * Daily (voice), YouTube (the video component), and Google Fonts (two pages
 * that load a face at runtime rather than through next/font).
 */
const SELF = "'self'";

const GOOGLE_ANALYTICS = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://analytics.google.com',
  'https://stats.g.doubleclick.net',
  'https://www.google.com',
  'https://googleads.g.doubleclick.net',
];

const META_PIXEL = ['https://connect.facebook.net', 'https://www.facebook.com'];

// The voice agent. Vapi brokers the call, Daily carries the audio.
const VOICE = [
  'https://api.vapi.ai',
  'wss://api.vapi.ai',
  'https://*.daily.co',
  'wss://*.daily.co',
  'https://*.wss.daily.co',
];

const GOOGLE_FONTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

/**
 * ENFORCED. Every directive here is one that cannot break a page that already
 * works, and between them they close what the audit flagged.
 *
 * frame-ancestors 'self' is the frame protection: no other site may frame
 * ours, which stops clickjacking.
 *
 * ⚠️ NOT 'none' (2026-09-23). This shipped as 'none' on the belief that
 * nothing embeds this site, but the site embeds ITSELF: every demo website is
 * served at /demo/site/<id>/raw inside the /demo/site/<id> shell, and the admin
 * previews sites in frames too. 'none' made every demo site read "refused to
 * connect" for a week. Same-origin framing is the whole requirement.
 */
const ENFORCED_CSP = [
  // ⚠️ NO default-src HERE, ON PURPOSE.
  //
  // The first version of this policy carried
  // `default-src 'self' https: data: blob:` and it broke the entire site in
  // testing: script-src and style-src fall back to default-src, that value has
  // no 'unsafe-inline', and so every Next.js hydration script and every React
  // inline style was refused. 281 violations across 28 pages, and the failure
  // mode is a page that renders and then never wakes up.
  //
  // None of the directives below fall back to default-src, so leaving it out
  // means this policy restricts exactly what it names and nothing else. The
  // full lockdown lives in REPORT_ONLY_CSP until its allow-list is proven.
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Every form on the site posts to our own API via fetch. Stripe is reached by
  // redirect rather than by form post, so 'self' is the whole truth.
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * REPORT-ONLY. The real lockdown, reporting rather than blocking until the
 * allow-list is proven against a live voice call.
 *
 * script-src keeps 'unsafe-inline' deliberately. Next.js emits inline hydration
 * scripts and the gtag bootstrap is inline, so removing it needs a nonce, and a
 * nonce forces every page to render dynamically, which would cost the whole
 * static cache. That trade is worth making separately, not silently.
 */
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  `script-src ${[SELF, "'unsafe-inline'", "'unsafe-eval'", ...GOOGLE_ANALYTICS, ...META_PIXEL].join(' ')}`,
  `style-src ${[SELF, "'unsafe-inline'", ...GOOGLE_FONTS].join(' ')}`,
  `font-src ${[SELF, 'data:', ...GOOGLE_FONTS].join(' ')}`,
  `img-src ${[SELF, 'data:', 'blob:', 'https:'].join(' ')}`,
  `media-src ${[SELF, 'data:', 'blob:'].join(' ')}`,
  `connect-src ${[SELF, ...GOOGLE_ANALYTICS, ...META_PIXEL, ...VOICE].join(' ')}`,
  `frame-src ${[SELF, 'https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://*.daily.co'].join(' ')}`,
  `worker-src ${[SELF, 'blob:'].join(' ')}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: ENFORCED_CSP },
  { key: 'Content-Security-Policy-Report-Only', value: REPORT_ONLY_CSP },
  // Belt and braces with frame-ancestors, for anything that still reads this.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The microphone stays open to our own origin or the voice agent dies.
  {
    key: 'Permissions-Policy',
    value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(self), usb=()',
  },
  // allow-popups, not same-origin: Stripe and OAuth open windows.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // Two years, subdomains, and preload-eligible. It was two years and nothing else.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const config: NextConfig = {
  reactStrictMode: true,
  // Dev-only: without this, hitting the dev server as 127.0.0.1 (how most of
  // our scripts and Playwright runs address it) gets /_next dev resources
  // BLOCKED as cross-origin, and pages render but never hydrate: no errors,
  // React just stays dead. Costs nothing in production.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // node-ical (and its rrule/moment-timezone deps) must run from node_modules
  // untouched. Bundling it breaks at runtime ("BigInt is not a function").
  serverExternalPackages: ['node-ical'],
  /**
   * NEVER TRACE public/ INTO A SERVERLESS FUNCTION.
   *
   * On 2026-08-03 production stopped deploying entirely, four builds in a row,
   * with: 'The Vercel Function "api/admin/outbound/leads/[id]/audit" is 1.63gb
   * uncompressed which exceeds the maximum uncompressed size limit of 250mb'.
   * `next build` passes locally, because the build is fine; it is the DEPLOY
   * that refuses, so the first sign of it is a red deployment and a site frozen
   * on yesterday's code.
   *
   * The cause was the file tracer following the audit engine's dynamic file
   * handling and giving up, at which point it conservatively swept in the whole
   * project root. `public/` is 2.4GB of marketing videos (twenty 16x9 ad cuts at
   * 20-40MB each), and every one of them was being packed into a lambda whose
   * job is to read a website and return JSON.
   *
   * Files in public/ are served by the CDN as static assets and are never read
   * from disk by a function, so excluding them is correct on its own merits and
   * not just a size workaround. Fonts and templates that ARE read at runtime
   * live under app/ and lib/, which stay traced.
   */
  outputFileTracingExcludes: {
    '**': [
      // ONLY the heavy asset directories, named explicitly.
      //
      // A first attempt also excluded supabase/, docs/, youtube/, marketing/,
      // store-assets/, product-drafts/ and backups/. That took production's API
      // routes down with 'require() of ES Module route.js from
      // ___next_launcher.cjs not supported': this package is "type": "module",
      // so the Vercel Node launcher depends on files the broad list was
      // stripping to work out that the emitted route is CommonJS. Pages kept
      // rendering, which made it look like a partial outage rather than a
      // config mistake. Excluding an entire top-level directory is not worth the
      // blast radius when four asset folders are the actual weight.
      'social-drafts/**',
      'scripts/launch-video/**',
      // Everything in public/ is served by the CDN, so a function never reads it
      // from disk. The ONE exception is public/brand, which the eight
      // opengraph-image routes readFileSync at render time, so it is not listed.
      'public/social/**',
      'public/ads/**',
      'public/video/**',
      'public/demos/**',
      'public/agents/**',
      'public/**/*.mp4',
      'public/**/*.mov',
      'public/**/*.webm',
      // content/ is NOT excluded: lib/content.ts reads the blog, work and
      // playbook MDX from disk on every render.
    ],
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // The portfolio page at /sarahscarano renders the project images the gallery
    // already serves, so the two never drift.
    remotePatterns: [{ protocol: 'https', hostname: 'sarahscarano.com', pathname: '/images/web/**' }],
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return [
      // Sarah's own page: a self-contained, illustrated flip-book resume that
      // lives as one static HTML file in public/sarahscarano/. The rewrite lets
      // the clean URL serve it; the file is CDN-served, never traced.
    ];
  },
  async redirects() {
    return [
      { source: '/ads', destination: '/pictures', permanent: true },
      // Retired navigation URLs still appear in Search Console and old links.
      { source: '/home', destination: '/', permanent: true },
      { source: '/notes', destination: '/blog', permanent: true },
      // /sarahscarano is a real page again (2026-09-08): her portfolio in the
      // studio's grammar, sourced from data/sarah-portfolio.ts. The full gallery,
      // the plain resume PDF and the OG cover stay on her own domain, so every
      // old deep link under the path still forwards there.
      { source: '/sarahscarano/:path+', destination: 'https://sarahscarano.com/:path+', permanent: true },
      // /Mustard is handled in middleware.ts, NOT here. Config redirects match
      // case-insensitively, so a `/Mustard -> /mustard` rule here also matches
      // `/mustard` and redirects the real page to itself in an infinite loop.
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/case-studies', destination: '/work', permanent: true },
      // The partner program answers to every name people search it by.
      { source: '/ambassadors', destination: '/partners', permanent: true },
      { source: '/ambassador', destination: '/partners', permanent: true },
      { source: '/affiliates', destination: '/partners', permanent: true },
      { source: '/affiliate', destination: '/partners', permanent: true },
      { source: '/referral-program', destination: '/partners', permanent: true },
      { source: '/referrals', destination: '/partners', permanent: true },
      { source: '/case-studies/:slug', destination: '/work/:slug', permanent: true },
      // The Build Queue page was retired in favor of Book a Call. Any query
      // (e.g. the ?idea= carried from the home terminal) passes through to
      // /book automatically, where BookCall prefills it. /api/build-queue is
      // a distinct path and is not affected by this redirect.
      { source: '/build-queue', destination: '/book', permanent: true },
      // The Sidekick Build became the Voice Agent Build (2026-07-28) and moved
      // under the /voice-agents hub, alongside /whitepaper and the trade fleet.
      // /sidekick is in live ads, sent emails, YouTube descriptions, and every
      // partner referral link, so these are permanent and the query string
      // (notably ?ref=CODE, which pays the partner) passes through untouched.
      { source: '/sidekick', destination: '/voice-agents/build', permanent: true },
      { source: '/sidekick/:path*', destination: '/voice-agents/build/:path*', permanent: true },
      // The word "forge" was retired 2026-08-25 (Sarah: bad word, everywhere).
      // /voice-agents/forge is in sent emails, the outbound drip, social posts,
      // and every demo link already delivered, so the old path is permanent and
      // the run id (/demo/:runId) and query string pass straight through.
      { source: '/voice-agents/forge', destination: '/voice-agents/build', permanent: true },
      { source: '/voice-agents/forge/:path*', destination: '/voice-agents/build/:path*', permanent: true },
      { source: '/partners/hq/forge', destination: '/partners/hq/build', permanent: true },
      { source: '/admin/hq/forge', destination: '/admin/hq/build', permanent: false },
      { source: '/admin/outbound/forge', destination: '/admin/outbound/build', permanent: false },
      { source: '/admin/acquisition/forge', destination: '/admin/acquisition/build', permanent: false },
      // The build's own API moved with it (/api/sidekick -> /api/demo-agent,
      // 2026-08-25). A browser tab left open across the deploy would POST to
      // the old path mid-build and get a 404 with their details already typed
      // in. 308 preserves the method and the body, so the build just works.
      { source: '/api/sidekick/:path*', destination: '/api/demo-agent/:path*', permanent: true },
      // The Text Line (/sms) was retired 2026-08-01 (Sarah: we do not offer
      // texting anywhere). The URL is indexed and was filed with carriers, so
      // it redirects to the contact page instead of 404ing.
      { source: '/sms', destination: '/contact', permanent: true },
      // The AI receptionist pricing post was pulled 2026-08-01 (Sarah: we do
      // not talk about pricing in the blog). It was indexed and cited in
      // llms.txt, so it lands on the sibling comparison guide, which covers
      // the same buying question without quoting our prices.
      {
        source: '/blog/how-much-does-an-ai-receptionist-cost',
        destination: '/blog/ai-receptionist-vs-answering-service',
        permanent: true,
      },
    ];
  },
};

export default config;
