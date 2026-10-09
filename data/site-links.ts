/**
 * The website at a glance: every live page, share card, icon, tool and pull
 * request from the studio edition (2026-10-09), so no link lives only in a
 * chat. /admin/website shows all of it; the Bootcamp desk's Links tab shows
 * the groups tagged bootcamp. Add a row here and both pages pick it up.
 */
export type SiteLink = { label: string; url: string; note?: string };
export type SiteLinkGroup = { title: string; blurb: string; bootcamp?: boolean; links: SiteLink[] };

const SITE = 'https://modernmustardseed.com';
const REPO = 'https://github.com/ModernMustardSeed/modern-mustard-seed/pull';

export const SITE_LINK_GROUPS: SiteLinkGroup[] = [
  {
    title: 'Live site',
    blurb: 'The studio edition, live since October 9, 2026.',
    links: [
      { label: 'Homepage', url: SITE, note: 'Three.js garden hero, the team, managed end to end' },
      { label: 'About (the team)', url: `${SITE}/about`, note: 'Sarah and Anthony Scarano' },
      { label: 'How We Work', url: `${SITE}/work-with-us`, note: 'Ends on Managed for you' },
      { label: 'Websites', url: `${SITE}/websites` },
      { label: 'AI Voice Agents', url: `${SITE}/voice-agents` },
      { label: 'Custom Software', url: `${SITE}/services` },
      { label: 'Agentic Systems', url: `${SITE}/ai` },
      { label: 'Marketing', url: `${SITE}/marketing` },
      { label: 'Book a call', url: `${SITE}/book` },
      { label: 'Free presence audit', url: `${SITE}/presence-audit` },
    ],
  },
  {
    title: 'Bootcamp',
    blurb: 'The One-Person Company Bootcamp pages, in the studio edition with the bootcamp film stills.',
    bootcamp: true,
    links: [
      { label: 'Bootcamp', url: `${SITE}/bootcamp` },
      { label: 'Free masterclass', url: `${SITE}/bootcamp/masterclass`, note: 'Tuesday, January 26, 2027' },
      { label: 'The Operator Program', url: `${SITE}/bootcamp/operator` },
      { label: 'Host a Room', url: `${SITE}/bootcamp/host` },
      { label: 'Bootcamp share card', url: `${SITE}/brand/bootcamp-share-studio.jpg`, note: 'No price on it, on purpose' },
    ],
  },
  {
    title: 'Share cards and icons',
    blurb: 'What shows when a link is shared, and the icon in the tab and on a home screen.',
    bootcamp: true,
    links: [
      { label: 'Homepage share card', url: `${SITE}/brand/mms-share-studio-2.jpg` },
      { label: 'Bootcamp share card', url: `${SITE}/brand/bootcamp-share-studio.jpg` },
      { label: 'Favicon (the seed)', url: `${SITE}/favicon.svg` },
      { label: 'Home-screen icon', url: `${SITE}/icon-512.png` },
    ],
  },
  {
    title: 'Tools',
    blurb: 'Refresh a cached preview, ask Google to recrawl, check speed.',
    bootcamp: true,
    links: [
      { label: 'Facebook Sharing Debugger', url: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(SITE)}`, note: 'Scrape again after a share card changes' },
      { label: 'Facebook Sharing Debugger: bootcamp', url: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(`${SITE}/bootcamp`)}` },
      { label: 'LinkedIn Post Inspector', url: `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(SITE)}` },
      { label: 'Google Search Console', url: 'https://search.google.com/search-console', note: 'Request indexing for /, /about, /work-with-us' },
      { label: 'PageSpeed Insights', url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(SITE)}` },
    ],
  },
  {
    title: 'Sister sites',
    blurb: 'The other studio surfaces that wear the same look.',
    links: [
      { label: 'The Mustard Office', url: 'https://office.modernmustardseed.com', note: 'The 64-agent staff directory' },
      { label: 'Mustard Studio', url: 'https://mustardstudio.modernmustardseed.com' },
      { label: 'SeedSide', url: 'https://seedside.modernmustardseed.com', note: 'The flagship: the only software you will need' },
    ],
  },
  {
    title: 'Pull requests',
    blurb: 'Where each change was made, for the record.',
    links: [
      { label: 'Site redesign: the studio edition', url: `${REPO}/571` },
      { label: 'Favicon, icons and share card', url: `${REPO}/581` },
      { label: 'Bootcamp in the studio edition', url: `${REPO}/584` },
    ],
  },
];
