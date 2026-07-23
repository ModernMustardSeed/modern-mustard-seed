/**
 * Real MMS-built websites, screenshotted for the /websites page: the hero, the
 * brochure-vs-engine toggle, and the bottom showcase scroll all read from here.
 * Every URL is a live site the studio designed and shipped. Shots live in
 * public/work-shots (optimized JPEGs). Refresh the shots when a site changes.
 */

export type WorkSite = {
  key: string;
  name: string;
  trade: string;
  place: string;
  img: string;
  url: string;
};

export const WORK_SITES: WorkSite[] = [
  { key: 'modern-mustard-seed', name: 'Modern Mustard Seed', trade: 'AI web studio', place: 'This very site', img: '/work-shots/modern-mustard-seed.jpg', url: 'https://modernmustardseed.com' },
  { key: 'linen-fresh', name: 'Linen Fresh', trade: 'Laundromat', place: 'Las Vegas, NV', img: '/work-shots/linen-fresh.jpg', url: 'https://modernmustardseed.com/demo/site/f1a7cacd-d7d9-4384-894f-8651a687be53' },
  { key: 'dd-landscaping', name: 'D&D Landscaping', trade: 'Landscaping', place: 'Tallahassee, FL', img: '/work-shots/dd-landscaping.jpg', url: 'https://ddlandscaping.pro' },
  { key: 'fiat-lux', name: 'Fiat Lux Design', trade: 'AI staging studio', place: 'Real estate staging', img: '/work-shots/fiat-lux.jpg', url: 'https://fiatluxdesign.co' },
  { key: 'chinatown', name: 'Chinatown', trade: 'Restaurant', place: 'Kalispell, MT', img: '/work-shots/chinatown.jpg', url: 'https://chinatown-kalispell.vercel.app' },
  { key: 'wild-hope', name: 'Wild Hope', trade: 'Lake retreat', place: 'Flathead Lake, MT', img: '/work-shots/wild-hope.jpg', url: 'https://wildhopehq.com' },
  { key: 'cross-covenant', name: 'Cross + Covenant', trade: 'Faith apparel store', place: 'Cart to checkout', img: '/work-shots/cross-covenant.jpg', url: 'https://crossandcovenant.co/shop' },
  { key: 'lago-society', name: 'Lago Society', trade: 'Fashion boutique', place: 'On the lake', img: '/work-shots/lago-society.jpg', url: 'https://lagosociety.com' },
  { key: 'parker-tidewater', name: 'Parker Tidewater', trade: 'Seafood wholesale', place: 'Gulf to Kansas City', img: '/work-shots/parker-tidewater.jpg', url: 'https://parker-tidewater.vercel.app' },
  { key: 'bare-earth', name: 'Bare Earth', trade: 'Landscaping', place: 'Flathead Valley, MT', img: '/work-shots/bare-earth.jpg', url: 'https://bare-earth.vercel.app' },
];

export const workByKey = Object.fromEntries(WORK_SITES.map((s) => [s.key, s]));
