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
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/case-studies', destination: '/work', permanent: true },
      { source: '/case-studies/:slug', destination: '/work/:slug', permanent: true },
      // The Build Queue page was retired in favor of Book a Call. Any query
      // (e.g. the ?idea= carried from the home terminal) passes through to
      // /book automatically, where BookCall prefills it. /api/build-queue is
      // a distinct path and is not affected by this redirect.
      { source: '/build-queue', destination: '/book', permanent: true },
    ];
  },
};

export default config;
