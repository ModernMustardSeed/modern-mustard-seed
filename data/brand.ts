/**
 * BRAND / REBRAND. One package that gives a company a new identity and every
 * surface that has to wear it: mark, look, mascot, site, front desk, and the
 * plan the brand is built to carry out. Same door, two ways in.
 *
 * Offer design: ops/offers/brand-rebrand/brand-rebrand.pdf (2026-08-25).
 * Prices here are the ones on that sheet. Presence and Whole Company hand off
 * into The Talking Website monthly ($497/mo, lib/demo-order.ts) with the setup
 * fee waived, never the monthly. Changes are included; there are no change
 * orders anywhere in this offer.
 */

export const BRAND = {
  name: 'BRAND / REBRAND',
  eyebrow: 'Brand / Rebrand',
  tagline: 'A logo file is not a brand.',
  promise:
    'A brand is what a customer sees, hears, and reads in the first ninety seconds, and it either all says one thing or it says nothing. We design the identity once, then put it on the site, the phone, the print, and the plan in the same three weeks. You own every file on launch day.',
  metaTitle: 'Brand and Rebrand Package. Logo, Website, Voice Agent, Business Plan',
  metaDescription:
    'One set-price package for a new brand or a rebrand: naming, logo system, moodboards, mascot, brand book, a new website, a voice agent that answers in your voice, and the business plan behind it. Built in three weeks by Modern Mustard Seed in Kalispell, Montana. You own everything.',
} as const;

export type BrandTier = {
  key: 'mark' | 'presence' | 'whole';
  name: string;
  priceUsd: number;
  priceLabel: string;
  monthly?: string;
  timeline: string;
  lede: string;
  includes: string[];
  halo?: boolean;
};

export const brandTiers: BrandTier[] = [
  {
    key: 'mark',
    name: 'Mark',
    priceUsd: 3500,
    priceLabel: '$3,500',
    timeline: 'Two weeks',
    lede: 'The identity, decided and documented. Everything else is built on this.',
    includes: [
      'Naming for a new brand, or a name audit and keep-or-change call for a rebrand',
      'Discovery: your goals, your customer, your competitors, what sets you apart',
      'Three identity directions, presented as moodboards',
      'Primary logo, secondary lockup, and icon mark in SVG, PNG, and print PDF',
      'Color system with hex, RGB, CMYK, and usage rules',
      'Type pairing with the fonts specified and licensed',
      'Mascot, when it fits: character sheet, three poses, who it is and what it does',
      'Voice and tone sheet: five rules, ten example lines, the words you never use',
      'Tagline and one-liner',
      'Brand book PDF a printer or a new hire can work from alone',
      'Social profile kit: avatars, covers, and a nine-post launch grid',
      'Business card, letterhead, email signature, vehicle or storefront mockup',
    ],
  },
  {
    key: 'presence',
    name: 'Presence',
    priceUsd: 8500,
    priceLabel: '$8,500',
    monthly: 'then $497/mo from month two',
    timeline: 'Three weeks',
    lede: 'Mark, plus the brand on every surface a customer meets. The site and the phone are built off the same identity in the same week, so the brand is live, not just designed.',
    includes: [
      'Everything in Mark',
      'New website, up to 16 pages, on your domain, copy written in the new voice',
      'Voice agent named and cast to the brand, answering your line with the tone sheet as its law',
      'Business Command Center, free inside the bundle: one brain behind the site and the phone',
      'Rebrand: redirect map and search migration so the old name, URLs, and listings hand off cleanly',
      'Google Business Profile, or the launch checklist when one does not exist yet',
      'Email templates in the new brand: welcome, quote, follow-up, review ask',
      'One 30-second Mustard Pictures spot in the new identity for the site and social',
      'Launch announcement copy for email and social, ready to send',
      'Ownership on launch day: repo, deploys, accounts, documentation',
    ],
    halo: true,
  },
  {
    key: 'whole',
    name: 'Whole Company',
    priceUsd: 18500,
    priceLabel: '$18,500',
    monthly: 'then $497/mo from month two',
    timeline: 'Four weeks to launch, then ninety days of rollout',
    lede: 'Presence, plus the plan the brand exists to execute and the first ninety days of running it.',
    includes: [
      'Everything in Presence',
      'Business plan built to your stated goals: offer ladder, pricing, target customer, channels, 12-month revenue model',
      'Positioning document: the one sentence, three proof points, and why a customer picks you over the three names next to yours',
      'Sales collateral in the brand: proposal template, one-page capability sheet, pitch deck',
      'Print kit: the printed pieces the plan calls for, print-ready',
      'Ninety-day launch calendar with every post, email, and send written and scheduled',
      'Presence Audit at day 90, with the fixes applied, not listed',
      'Three working sessions across the ninety days, on the plan, with Sarah',
    ],
  },
];

export const brandWeeks = [
  {
    label: 'Week 1',
    title: 'Discovery and directions.',
    body: 'Kickoff call, intake packet, competitor sweep. Three moodboard directions on day five. You pick one and we refine it until it is right.',
  },
  {
    label: 'Week 2',
    title: 'The identity, locked.',
    body: 'Logo system, color, type, mascot, voice sheet, brand book. Site copy drafted in the new voice. The voice agent cast and scripted. The redirect map drafted for a rebrand.',
  },
  {
    label: 'Week 3',
    title: 'Every surface, live.',
    body: 'Site deployed to your domain. Agent on your line. Command Center handed over. Google profile, email templates, the spot, the social kit, the launch copy. Launch day: you own everything.',
  },
  {
    label: 'Month 2+',
    title: 'The Talking Website monthly.',
    body: 'Unlimited site edits, 500 answered minutes, hosting, domain, care. Changes to the brand stay free.',
  },
];

export const brandFaq = [
  {
    q: 'Is BRAND different from REBRAND?',
    a: 'Same package, same prices. BRAND starts from a blank page and includes naming. REBRAND starts from what you have, audits the name, and adds a redirect and search migration so nothing findable breaks when the new identity goes live.',
  },
  {
    q: 'What if I do not like the first direction?',
    a: 'You see three directions in week one and pick one. Refinement on that direction is included until it is right. Changes to anything we built are included, always, with no change order.',
  },
  {
    q: 'Do I need a mascot?',
    a: 'Only if it fits. A trade business with a memorable character on its trucks and its phone line gets remembered. A law firm does not need one. We tell you which you are in discovery and build accordingly.',
  },
  {
    q: 'Who owns the files?',
    a: 'You do. Source files, the repo, the deploys, the accounts, the documentation. On launch day they are in your name, not ours.',
  },
  {
    q: 'What is the monthly for?',
    a: 'Presence and Whole Company hand off into The Talking Website: your site and your voice agent running off one brain, with unlimited edits, 500 answered minutes a month, hosting, and care. The $497 setup fee is waived because the brand build covered it. The monthly starts in month two.',
  },
  {
    q: 'What is not included?',
    a: 'Trademark filing (we supply the name and mark, your attorney files it), physical signage and wrap installation (we deliver print-ready files and a vendor spec), paid ad spend, photography of your team, and legal entity or DBA changes.',
  },
  {
    q: 'How do I pay?',
    a: 'The price is fixed before work starts. Half to begin, half on delivery. Month two starts the monthly.',
  },
];
