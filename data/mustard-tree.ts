/**
 * THE MUSTARD TREE, the one-prompt-in / whole-business-out product.
 * Single source for every string on /mustard-tree and its emails.
 * NO PRICES anywhere in this file on purpose: pricing is unratified, and the
 * waitlist page deliberately promises hard caps without naming numbers.
 */

export const MUSTARD_TREE = {
  name: 'The Mustard Tree',
  metaTitle: 'The Mustard Tree | One Seed In, A Whole Business Out',
  metaDescription:
    'Type one sentence and wake up to a living company: plan, brand, store, site, books, and marketing, with an AI staff already running it. Claim your planting number.',
  eyebrow: 'The Mustard Tree · Planting Soon',
  headline: ['One seed in.', 'A whole business out.'],
  promise:
    'Type one sentence about the business you want. The Mustard Tree interviews you like a sharp cofounder, then grows the whole thing overnight: the plan, the brand, the store, the site, the books, the marketing, with a staff of AI agents already working in the branches.',
  seedExample: 'a candle company that smells like Montana',
  grove: {
    headline: 'Claim your planting number.',
    sub: 'The first 100 plantings are the Founding Grove: founding pricing, first access, and a hand-numbered founding certificate.',
    referralNote: 'Every founder you bring moves you up 10 spots.',
    button: 'Plant My Seed',
  },
} as const;

export const treeStages = [
  {
    tag: 'Seed',
    title: 'Plant one sentence.',
    body: 'Your idea, plus any photos, links, or half-formed notes you have. That is all it needs to start.',
  },
  {
    tag: 'Sprout',
    title: 'It asks the right questions.',
    body: 'A short founder interview. Not forms: the questions a sharp cofounder would ask, and only the ones that matter.',
  },
  {
    tag: 'Sapling',
    title: 'It grows everything overnight.',
    body: 'Business plan, name and logo, products and services, storefront, website, back office, automations. One system, not a pile of tools.',
  },
  {
    tag: 'Company',
    title: 'The office moves in.',
    body: 'Six agents take their posts in the branches and keep the business growing while you sleep.',
  },
] as const;

export const treeStaff = [
  {
    role: 'The Founder',
    color: '#F5B700',
    job: 'Holds the vision, reviews every branch, and sends work back until it is right.',
  },
  {
    role: 'The Strategist',
    color: '#E0301E',
    job: 'Writes the 90-day plan, then re-plans every week from what actually happened.',
  },
  {
    role: 'The Designer',
    color: '#1E50C8',
    job: 'Logo, brand system, product art, site design. Nothing generic survives.',
  },
  {
    role: 'The Builder',
    color: '#F5B700',
    job: 'Raises the storefront and the site, wires checkout, taxes, and receipts.',
  },
  {
    role: 'The Marketer',
    color: '#E0301E',
    job: 'Campaigns, social, email, launch weeks. Always shipping something.',
  },
  {
    role: 'The Clerk',
    color: '#1E50C8',
    job: 'Opens the books, watches every dollar, and closes the month without being asked.',
  },
] as const;

export const treeOrgans = [
  { name: 'The Plan', gold: false, body: 'A real business plan with a 90-day map, not a template.' },
  { name: 'The Brand', gold: true, body: 'Name, logo, palette, voice. A brand you would pay a studio for.' },
  { name: 'The Store', gold: false, body: 'Products and services defined, priced, and shelved for sale.' },
  { name: 'The Site', gold: true, body: 'A live website built to sell, not a brochure.' },
  { name: 'The Books', gold: false, body: 'Accounts, invoices, and a monthly close that runs itself.' },
  { name: 'The Marketing', gold: true, body: 'Launch week, social calendar, and email flows, already queued.' },
] as const;

export const treeFaq = [
  {
    q: 'What is The Mustard Tree?',
    a: 'One sentence in, a whole business out. It interviews you, then grows the plan, brand, store, site, books, and marketing as one system, with an AI office of six agents that keeps running it after launch day.',
  },
  {
    q: 'Is it only for brand-new businesses?',
    a: 'No. Plant a new idea, or point it at the business you already run. In takeover mode the office moves in: it learns what you sell, rebuilds what is weak, and takes the busywork off your desk.',
  },
  {
    q: 'What will it cost?',
    a: 'Founding pricing is announced to the Grove first. Every plan will be hard-capped: you will never get a surprise usage bill from us.',
  },
  {
    q: 'Who is building this?',
    a: 'Modern Mustard Seed, the Montana studio behind The Talking Website and a working fleet of AI staff products. The Mustard Tree is grown from rails that already run real businesses today.',
  },
  {
    q: 'When do plantings open?',
    a: 'In cohorts, in Grove order. Your planting number is your place in line, and referrals move you up.',
  },
] as const;
