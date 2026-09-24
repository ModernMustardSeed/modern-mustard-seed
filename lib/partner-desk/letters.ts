import { COMMISSION_BUILD_PRODUCER_RATE, COMMISSION_BUILD_RATE, COMMISSION_PRODUCT_RATE, COMMISSION_SUBSCRIPTION_MONTHS, COMMISSION_SUBSCRIPTION_RATE } from '@/lib/affiliate';
import { DEMO_BUNDLE, DEMO_PRODUCTS } from '@/lib/demo-order';
import { SITE } from '@/lib/seo';
import type { Prospect } from './store';

/**
 * THE PARTNER DESK, the letters.
 *
 * Pure functions, no LLM, no network: every letter is a starting point Sarah
 * reads and edits on the desk before it goes out, one at a time, from her own
 * address. Three touches per person (day 0, day 4, day 10), a voice per kind.
 *
 * Every number here is computed from the price constants and the commission
 * rates, so a price move on the site moves the letters with it. Nothing is
 * promised that lib/affiliate.ts does not pay.
 */

export const APPLY_URL = `${SITE.url}/partners`;

const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** What a partner earns on one referred subscription, per month and over the paid year. */
export function partnerMath() {
  const pct = Math.round(COMMISSION_SUBSCRIPTION_RATE * 100);
  const months = COMMISSION_SUBSCRIPTION_MONTHS;
  const tw = Math.round(DEMO_BUNDLE.monthlyCents * COMMISSION_SUBSCRIPTION_RATE);
  const voice = Math.round(DEMO_PRODUCTS.voice.monthlyCents * COMMISSION_SUBSCRIPTION_RATE);
  const site = Math.round(DEMO_PRODUCTS.site.monthlyCents * COMMISSION_SUBSCRIPTION_RATE);
  return {
    pct,
    months,
    productPct: Math.round(COMMISSION_PRODUCT_RATE * 100),
    buildPct: Math.round(COMMISSION_BUILD_RATE * 100),
    producerPct: Math.round(COMMISSION_BUILD_PRODUCER_RATE * 100),
    talkingWebsite: { name: DEMO_BUNDLE.name, plural: `${DEMO_BUNDLE.name.replace(/^The /, '')}s`, monthly: DEMO_BUNDLE.monthlyCents, setup: DEMO_BUNDLE.setupCents, perMonth: tw, year: tw * months },
    voice: { name: DEMO_PRODUCTS.voice.name, monthly: DEMO_PRODUCTS.voice.monthlyCents, perMonth: voice, year: voice * months },
    site: { name: DEMO_PRODUCTS.site.name, monthly: DEMO_PRODUCTS.site.monthlyCents, perMonth: site, year: site * months },
    tenTalkingWebsites: { perMonth: tw * 10, year: tw * 10 * months },
    dollars,
  };
}

function firstName(name: string): string {
  return (name || 'there').trim().split(/\s+/)[0];
}

function hello(p: Prospect): string {
  return p.kind === 'community' ? `Hi ${p.name} team,` : `Hi ${firstName(p.name)},`;
}

function nicheLine(p: Prospect): string {
  const n = (p.niche || '').trim();
  if (p.kind === 'creator') {
    return n
      ? `Your audience around ${n} is the exact person we build for: someone who already runs a business and answers their own phone.`
      : `Your audience is the exact person we build for: someone who already runs a business and answers their own phone.`;
  }
  return '';
}

const ABOUT = `I'm Sarah, founder of Modern Mustard Seed, a design and agentic systems studio in Montana. We build websites that answer their own phone: a site and a voice agent off one brain, at a set price, with every edit included forever.`;

function offer(): string[] {
  const m = partnerMath();
  return [
    `Here is the whole program, plainly:`,
    `- You send a business name. We build them a free demo: their own site and a voice agent they can call, built to their trade, in a day. You never sell. You introduce.`,
    `- If they keep it, you earn ${m.pct}% of every monthly invoice for ${m.months} months. On ${m.talkingWebsite.name} that is ${dollars(m.talkingWebsite.perMonth)} a month, ${dollars(m.talkingWebsite.year)} over the year, per business.`,
    `- Ten kept ${m.talkingWebsite.plural} is ${dollars(m.tenTalkingWebsites.perMonth)} a month to you for a year.`,
    `- A bigger client who needs a real build pays you ${m.buildPct}% of the project, ${m.producerPct}% once you are closing them regularly.`,
    `- Every playbook we sell pays ${m.productPct}% the moment someone buys, and you get all of them free.`,
    `- Your own link, a dashboard with live earnings, and a field guide written for you. No quota, no cap.`,
  ];
}

function creatorBody(p: Prospect): string {
  return [
    hello(p),
    ``,
    ABOUT,
    ``,
    nicheLine(p),
    ``,
    `I'd like you in the partner program.`,
    ...offer(),
    ``,
    `Everything is here, including the numbers: ${APPLY_URL}`,
    ``,
    `If it fits, apply there or reply to this and I'll set you up the same day.`,
    ``,
    `Sarah Scarano`,
  ].join('\n');
}

function referralBody(p: Prospect): string {
  const n = (p.niche || '').trim();
  return [
    hello(p),
    ``,
    ABOUT,
    ``,
    n
      ? `You meet new business owners every week through ${n}, and the two things they ask for in the first year are a website and a way to stop missing calls. That is what we build.`
      : `You meet new business owners every week, and the two things they ask for in the first year are a website and a way to stop missing calls. That is what we build.`,
    ``,
    `I'd like you as a referral partner.`,
    ...offer(),
    ``,
    `It costs your client nothing to look: the demo is free and built before anyone pays. Everything is here: ${APPLY_URL}`,
    ``,
    `Reply with one name you would send and I'll build their demo this week so you can see what your people will see.`,
    ``,
    `Sarah Scarano`,
  ].join('\n');
}

function communityBody(p: Prospect): string {
  return [
    hello(p),
    ``,
    ABOUT,
    ``,
    `Your members are the businesses we build for. I'd like to offer ${p.name} a partnership that pays the organisation and costs the members nothing.`,
    ...offer(),
    ``,
    `The shape for a community: one link for your members, a free demo built for any member who asks, and the ${partnerMath().pct}% paid to ${p.name} on every member who keeps their site. If you would rather I come demo it live at a meeting, I will.`,
    ``,
    `Everything is here: ${APPLY_URL}`,
    ``,
    `Who is the right person to talk to about member benefits?`,
    ``,
    `Sarah Scarano`,
  ].join('\n');
}

export function emailSubject(p: Prospect): string {
  const fn = firstName(p.name);
  const m = partnerMath();
  switch (p.kind) {
    case 'referral':
      return `${fn}, ${dollars(m.talkingWebsite.year)} a year for every business you send us`;
    case 'community':
      return `A member benefit that pays ${p.name}`;
    default:
      return `${fn}, an invite to the Modern Mustard Seed partner program`;
  }
}

export function emailBody(p: Prospect): string {
  switch (p.kind) {
    case 'referral':
      return referralBody(p);
    case 'community':
      return communityBody(p);
    default:
      return creatorBody(p);
  }
}

export function followUpSubject(p: Prospect): string {
  return `Re: ${emailSubject(p)}`;
}

export function followUpBody(p: Prospect): string {
  const m = partnerMath();
  const short =
    p.kind === 'referral'
      ? `send a business name, we build their demo free, you earn ${m.pct}% of every monthly invoice for a year`
      : p.kind === 'community'
        ? `one link for your members, a free demo for any who ask, ${m.pct}% of every monthly invoice paid to ${p.name} for a year`
        : `send a business name, we build their demo free, you earn ${m.pct}% of every monthly invoice for a year, ${dollars(m.talkingWebsite.year)} per business`;
  return [
    hello(p),
    ``,
    `Floating this back up. The short version: ${short}.`,
    ``,
    `If there is a better inbox for partnerships, point me there and I'll take it from here. Otherwise the whole program is at ${APPLY_URL}.`,
    ``,
    `Sarah Scarano`,
  ].join('\n');
}

export function lastNoteBody(p: Prospect): string {
  return [
    hello(p),
    ``,
    `Last note from me, and then I'll leave your inbox alone.`,
    ``,
    `The partner program stays open whenever the timing is right: ${APPLY_URL}. One name back and I'll build their demo the same week.`,
    ``,
    `Sarah Scarano`,
  ].join('\n');
}

/** The three touches and their spacing. Sent by hand from the desk; the desk only says when the next is due. */
export const SEQUENCE = [
  { step: 0, delayDays: 0, label: 'First letter', subject: emailSubject, body: emailBody },
  { step: 1, delayDays: 4, label: 'Follow-up', subject: followUpSubject, body: followUpBody },
  { step: 2, delayDays: 6, label: 'Last note', subject: followUpSubject, body: lastNoteBody },
] as const;

export function letterFor(p: Prospect, step: number): { subject: string; body: string; label: string } | null {
  const s = SEQUENCE[Math.min(Math.max(step, 0), SEQUENCE.length - 1)];
  if (step >= SEQUENCE.length) return null;
  return { subject: s.subject(p), body: s.body(p), label: s.label };
}

/** Short messages for the platforms where a letter cannot go. */
export function instagramDM(p: Prospect): string {
  const m = partnerMath();
  return `Hi ${firstName(p.name)}, Sarah from Modern Mustard Seed here. We build websites that answer their own phone for small businesses. I'd like you in our partner program: you send a business name, we build their demo free, and you earn ${m.pct}% of every monthly invoice for a year (${dollars(m.talkingWebsite.year)} per business). Everything is here: ${APPLY_URL}`;
}

export function tiktokDM(p: Prospect): string {
  const m = partnerMath();
  return `Hey ${firstName(p.name)}, Sarah from Modern Mustard Seed. Sites that answer their own phone, built for small businesses. Partner program: send a name, we build the demo free, you earn ${m.pct}% of every monthly invoice for a year. ${APPLY_URL}`;
}

export function xDM(p: Prospect): string {
  const m = partnerMath();
  return `Hi ${firstName(p.name)}, Sarah from Modern Mustard Seed. Partner program: send a business name, we build their demo free, you earn ${m.pct}% of every monthly invoice for a year (${dollars(m.talkingWebsite.year)} per business). ${APPLY_URL}`;
}

export function linkedinDM(p: Prospect): string {
  const m = partnerMath();
  return `Hi ${firstName(p.name)}, I'm Sarah, founder of Modern Mustard Seed. We build websites that answer their own phone for small businesses, at a set price. I'd like you as a referral partner: you send a business name, we build their demo free, and you earn ${m.pct}% of every monthly invoice for ${m.months} months. The whole program: ${APPLY_URL}`;
}

const bareHandle = (h?: string | null) => (h || '').trim().replace(/^@/, '');

export function profileUrls(p: Prospect): { label: string; url: string }[] {
  const out: { label: string; url: string }[] = [];
  const platform = (p.platform || '').toLowerCase();
  const ig = bareHandle(p.instagram || (platform === 'instagram' ? p.handle : ''));
  const tt = bareHandle(p.tiktok || (platform === 'tiktok' ? p.handle : ''));
  const x = bareHandle(p.x || (platform === 'x' ? p.handle : ''));
  if (p.youtube) out.push({ label: 'YouTube', url: p.youtube });
  else if (platform === 'youtube' && p.handle) out.push({ label: 'YouTube', url: `https://www.youtube.com/@${bareHandle(p.handle)}` });
  if (ig) out.push({ label: 'Instagram', url: `https://instagram.com/${ig}` });
  if (tt) out.push({ label: 'TikTok', url: `https://tiktok.com/@${tt}` });
  if (x) out.push({ label: 'X', url: `https://x.com/${x}` });
  if (p.linkedin) out.push({ label: 'LinkedIn', url: p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${bareHandle(p.linkedin)}` });
  if (p.website) out.push({ label: 'Website', url: p.website.startsWith('http') ? p.website : `https://${p.website}` });
  return out;
}

/** One-click searches that surface an email and the rest of someone's profiles. */
export function researchLinks(p: Prospect): { label: string; url: string }[] {
  const q = encodeURIComponent;
  const h = bareHandle(p.handle);
  const links: { label: string; url: string }[] = [];
  links.push({
    label: 'Google: email',
    url: `https://www.google.com/search?q=${q(`"${p.name}" ${h ? '@' + h + ' ' : ''}(email OR contact OR "business inquiries" OR gmail.com)`)}`,
  });
  links.push({ label: 'Google: who', url: `https://www.google.com/search?q=${q(`${p.name} ${h ? '@' + h : ''}`)}` });
  if (h) {
    links.push({ label: 'Instagram', url: `https://instagram.com/${h}` });
    links.push({ label: 'YouTube', url: `https://www.youtube.com/results?search_query=${q(h)}` });
  }
  links.push({ label: 'LinkedIn', url: `https://www.linkedin.com/search/results/all/?keywords=${q(p.name)}` });
  return links;
}
