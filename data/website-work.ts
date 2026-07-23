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
  { key: 'linen-fresh', name: 'Linen Fresh', trade: 'Laundromat', place: 'Las Vegas, NV', img: '/work-shots/linen-fresh.jpg', url: 'https://modernmustardseed.com/demo/site/f1a7cacd-d7d9-4384-894f-8651a687be53' },
  { key: 'hall-roofing', name: 'Hall Roofing', trade: 'Roofing', place: 'Bonifay, FL', img: '/work-shots/hall-roofing.jpg', url: 'https://hall-roofing-website.vercel.app' },
  { key: 'porsha-lee', name: 'Porsha Lee', trade: 'Auto paint & body', place: 'Tallahassee, FL', img: '/work-shots/porsha-lee.jpg', url: 'https://modernmustardseed.com/demo/site/cd196f09-7e0e-4fc4-af6d-56e0bb6900e0' },
  { key: 'dd-landscaping', name: 'D&D Landscaping', trade: 'Landscaping', place: 'Tallahassee, FL', img: '/work-shots/dd-landscaping.jpg', url: 'https://ddlandscaping.pro' },
  { key: 'jr-tree', name: 'JR Tree Removal', trade: 'Tree service', place: 'Mobile, AL', img: '/work-shots/jr-tree.jpg', url: 'https://jr-tree-website.vercel.app' },
  { key: 'fiat-lux', name: 'Fiat Lux Design', trade: 'AI staging studio', place: 'Real estate staging', img: '/work-shots/fiat-lux.jpg', url: 'https://fiatluxdesign.co' },
  { key: 'chinatown', name: 'Chinatown', trade: 'Restaurant', place: 'Kalispell, MT', img: '/work-shots/chinatown.jpg', url: 'https://chinatown-kalispell.vercel.app' },
  { key: 'wild-hope', name: 'Wild Hope', trade: 'Lake retreat', place: 'Flathead Lake, MT', img: '/work-shots/wild-hope.jpg', url: 'https://wildhopehq.com' },
  { key: 'cross-covenant', name: 'Cross + Covenant', trade: 'Faith apparel', place: 'The storefront', img: '/work-shots/cross-covenant.jpg', url: 'https://crossandcovenant.co' },
  { key: 'lago-society', name: 'Lago Society', trade: 'Fashion boutique', place: 'On the lake', img: '/work-shots/lago-society.jpg', url: 'https://lagosociety.com' },
  { key: 'parker-tidewater', name: 'Parker Tidewater', trade: 'Seafood wholesale', place: 'Gulf to Kansas City', img: '/work-shots/parker-tidewater.jpg', url: 'https://parker-tidewater.vercel.app' },
  { key: 'bare-earth', name: 'Bare Earth', trade: 'Landscaping', place: 'Flathead Valley, MT', img: '/work-shots/bare-earth.jpg', url: 'https://bare-earth.vercel.app' },
];

export const workByKey = Object.fromEntries(WORK_SITES.map((s) => [s.key, s]));
