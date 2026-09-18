/**
 * CAMPAIGN 28, THE FREE PRESENCE AUDIT, as the Ads Playbook renders it.
 *
 * The organic launch for /presence-audit (2026-09-18): one carousel, one
 * 20-second vertical film, one story, one link card, and the copy for
 * LinkedIn, Facebook, Instagram and TikTok. The assets live in
 * public/ads/presence-audit/ and their source (the HTML the cards and the film
 * are rendered from) is dev/mms/marketing/presence-audit-2026-09-18/.
 *
 * Every platform links with its own utm_source, which the request form carries
 * through to the Audit Desk card ("via linkedin"), so the tally on the campaign
 * tab counts real requests per platform, not clicks.
 */

export const PA_BASE = '/ads/presence-audit';

const link = (source: string) =>
  `https://modernmustardseed.com/presence-audit?utm_source=${source}&utm_medium=social&utm_campaign=presence-audit`;

export const PA_PLATFORMS = ['linkedin', 'facebook', 'instagram', 'tiktok'] as const;
export type PaPlatform = (typeof PA_PLATFORMS)[number];

export const PA_LINKS: Record<PaPlatform, { label: string; where: string; url: string }> = {
  linkedin: { label: 'LinkedIn', where: 'First comment on the post', url: link('linkedin') },
  facebook: { label: 'Facebook', where: 'In the post, and on the story link sticker', url: link('facebook') },
  instagram: { label: 'Instagram', where: 'Bio link, and the story link sticker', url: link('instagram') },
  tiktok: { label: 'TikTok', where: 'Bio link', url: link('tiktok') },
};

export const PA_CAROUSEL = [
  { file: '01-hook', label: 'The hook', alt: 'Most people decide about you before they reach your website. A sample Google listing: Sample Roofing Co., 4.8 stars from 58 reviews.' },
  { file: '02-a-third', label: 'A third of the problem', alt: 'A website audit grades a third of the problem. The website 45 percent, the reviews 30 percent, the Google profile 25 percent.' },
  { file: '03-sample-report', label: 'The sample report', alt: 'Sample report: 64 out of 100, a D. Your reviews are outrunning your website. Website 41, reviews 88, profile 75. Fix number one: publish your hours on Google.' },
  { file: '04-eight-checks', label: 'Eight checks', alt: 'Eight checks, pass or fail. The Google profile pillar has no AI and every check can be verified in a minute.' },
  { file: '05-how-it-works', label: 'How it works', alt: 'You ask. We grade. It lands. Leave your email, we grade all three, the report hits your inbox.' },
  { file: '06-get-yours', label: 'Get yours free', alt: 'Get yours free. Your website, your Google profile and your reviews, graded and emailed to you. modernmustardseed.com/presence-audit' },
];

const LINKEDIN = `Your customers already graded you. Most of them did it before they opened your website.

They searched your trade and your town. They saw a star rating, a review count, whether your hours are listed, whether anyone picks up after five. Then they decided. Your website got the last word, if it got one at all.

So I built an audit that grades what they actually see:

→ Your website, on seven categories, read from your real pages. 45% of the score.
→ Your reviews, volume and rating against businesses like yours. 30%.
→ Your Google Business Profile, on eight checks that each pass or fail. 25%.

Two of those three pillars have no AI in them, on purpose. Every check prints what it is worth and where the number came from, so you can verify the whole report in about ninety seconds. An audit nobody can check is a horoscope with a logo.

Leave your email and the full report lands in your inbox with the fixes ranked. The free fixes come first.

It is free. No card, and nobody calls you unless you ask.

Swipe for a sample report. Link to get yours is in the first comment.

#SmallBusiness #LocalSEO #GoogleBusinessProfile`;

const FACEBOOK = `Before anyone calls you, they Google you.

They see your stars, your review count, your hours (or the lack of them), and they make up their mind. Your website comes last, if they click it at all.

The Free Online Presence Audit grades all three: your website, your Google profile and your reviews. Every check is printed so you can verify it, and the report comes to your inbox with the fixes in order, free ones first.

No card. No sales call unless you ask.

Get yours: ${link('facebook')}`;

const IG_CAROUSEL = `Most people decide about you before they reach your website. 👇

They see your stars, your reviews and your Google profile first. So that is what we grade: all three, with every check printed so you can verify it yourself.

Free. Yours to keep. No call unless you ask.

Get yours at the link in bio.

#smallbusiness #localbusiness #googlebusinessprofile #localseo #websitedesign #smallbusinessowner #contractor #marketingtips #onlinepresence #montanabusiness`;

const IG_REEL = `Before they call you, they Google you. Free audit of all three things they see. Link in bio.

#smallbusiness #localseo #googlebusinessprofile #onlinepresence #smallbusinessowner`;

const TIKTOK = `Your customers graded you before they ever saw your website 👀 Free audit of your site, your Google profile and your reviews. Every check printed. Link in bio.

#smallbusiness #smallbusinesstips #localseo #googlebusinessprofile #businessowner #websitetips`;

export type PaPost = { platform: string; assets: string; steps?: string[]; copy: { title: string; text: string }[] };

export const PA_POSTS: PaPost[] = [
  {
    platform: 'LinkedIn',
    assets: 'The carousel PDF as a document post. Title the document "The Free Online Presence Audit".',
    steps: ['Post the document with the copy below.', 'Right after it goes up, add the first comment with the link.'],
    copy: [
      { title: 'LinkedIn post', text: LINKEDIN },
      { title: 'LinkedIn first comment', text: `Get your free Online Presence Audit here: ${link('linkedin')}` },
    ],
  },
  {
    platform: 'Facebook',
    assets: 'The six carousel cards as one multi-photo post, in order. Or a link post with the link card.',
    steps: ['Post the six cards with the copy below.', 'Share the story card with a link sticker on the Facebook link.'],
    copy: [{ title: 'Facebook post', text: FACEBOOK }],
  },
  {
    platform: 'Instagram',
    assets: 'The carousel (4:5, in order), the 20-second reel, and the story card with a link sticker.',
    steps: ['Set the bio link to the Instagram link first.', 'Post the carousel, then the reel, then the story.'],
    copy: [
      { title: 'Instagram carousel caption', text: IG_CAROUSEL },
      { title: 'Instagram reel caption', text: IG_REEL },
    ],
  },
  {
    platform: 'TikTok',
    assets: 'The 20-second vertical film. Add a sound in the app at low volume; every word is already on screen.',
    steps: ['Set the bio link to the TikTok link first.', 'Post the film with the caption, then pin the comment.'],
    copy: [
      { title: 'TikTok caption', text: TIKTOK },
      { title: 'TikTok pinned comment', text: 'Free, no card, no sales call. Link in bio to get yours.' },
    ],
  },
];
