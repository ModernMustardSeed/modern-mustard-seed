import type { NextConfig } from 'next';

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
  },
  async rewrites() {
    return [
      // Sarah's own page: a self-contained, illustrated flip-book resume that
      // lives as one static HTML file in public/sarahscarano/. The rewrite lets
      // the clean URL serve it; the file is CDN-served, never traced.
      { source: '/sarahscarano', destination: '/sarahscarano/index.html' },
    ];
  },
  async redirects() {
    return [
      // /Mustard is handled in middleware.ts, NOT here. Config redirects match
      // case-insensitively, so a `/Mustard -> /mustard` rule here also matches
      // `/mustard` and redirects the real page to itself in an infinite loop.
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/case-studies', destination: '/work', permanent: true },
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
