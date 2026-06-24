import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
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
    ];
  },
};

export default config;
