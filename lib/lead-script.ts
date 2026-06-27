import { COLD_CALL } from '@/data/sales-training';
import type { Prospect } from './prospects';

/**
 * Builds a ready-to-read cold-call script personalized to one specific lead:
 * its business name, city, and a pain hook tuned to what that TYPE of business
 * loses when calls get missed. The goal is zero guesswork for the rep: open the
 * lead, read top to bottom, dial, deliver.
 *
 * Category is read from the leading token of the prospect's notes (the seeded
 * data and the add form both put the category first). Unknown types fall back to
 * a solid generic hook.
 */

const HOOKS: { test: RegExp; hook: string }[] = [
  { test: /restaurant|cafe|coffee|\bbar\b|pub|food|pizza|grill|diner|eatery|brew|kitchen|bistro|taqueria|cantina/, hook: "during your rush the phone rings nonstop and you can't always grab it, so takeout orders and reservations slip away" },
  { test: /salon|spa|beauty|nail|barber|hair|lash|wax|massage|aesthetic|brow/, hook: "when you're with a client your phone goes to voicemail, and that caller usually just books with the next place" },
  { test: /auto|tyre|tire|mechanic|body shop|car wash|\bcar\b|motor|collision/, hook: "when you're under a car the phone goes to voicemail, and a missed call is a job that books down the street" },
  { test: /dentist|dental|orthodont/, hook: "when your front desk is slammed, patients calling to book can't get through and they try the next office" },
  { test: /clinic|doctor|medical|\bhealth|chiro|physical therapy|therapy|urgent care|wellness|pharmac/, hook: "when your staff is busy, patients calling to book slip to voicemail and you lose the appointment" },
  { test: /\bvet/, hook: "when the clinic is busy, pet owners calling to book go to voicemail and call somewhere else" },
  { test: /gym|fitness|pilates|yoga|crossfit|martial|cycle/, hook: "when you're running a class or on the floor, people calling about memberships go to voicemail and cool off" },
  { test: /real estate|realt|broker/, hook: "when you're showing a property or in a closing, buyers and sellers calling you slip to voicemail and move on" },
  { test: /\blaw\b|attorney|legal/, hook: "when you're with a client or in court, new clients calling slip to voicemail and call the next firm" },
  { test: /insurance/, hook: "when you're with a client, people calling for a quote go to voicemail and get one somewhere else" },
  { test: /account|financ|\btax\b|bookkeep/, hook: "during your busy season, clients and leads calling in can't get through and go elsewhere" },
  { test: /trade|plumb|hvac|heating|electric|roof|paint|carpent|contractor|handyman|construction|flooring|window|garage|locksmith|landscap|fenc|concrete/, hook: "you're on a job with your hands full, the phone rings, and that caller doesn't leave a message, they just call the next guy" },
  { test: /laundry|clean|dry clean/, hook: "when you're handling the counter, callers asking about service or pickup go to voicemail and try another shop" },
];
const GENERIC = "when you're busy serving customers, calls slip to voicemail and you lose business you never even knew called";

/** The category token at the start of a prospect's notes, if any. */
export function categoryLabel(notes: string | null): string {
  if (!notes) return '';
  return notes.split(' (OpenStreetMap')[0].split(' · Email')[0].split(' · ')[0].trim();
}

function hookFor(label: string): string {
  const l = label.toLowerCase();
  for (const h of HOOKS) if (h.test.test(l)) return h.hook;
  return GENERIC;
}

export type LeadScript = {
  category: string;
  steps: { label: string; line: string }[];
  voicemail: string;
  objections: { q: string; a: string }[];
  fullText: string;
};

export function buildLeadScript(p: Prospect, repName: string, bookDisplay: string): LeadScript {
  const first = (repName || '').split(' ')[0] || 'there';
  const biz = p.business;
  const city = p.city || 'your area';
  const category = categoryLabel(p.notes);
  const hook = hookFor(category);

  // If we have audited their site, the script LEADS with the audit (our outreach
  // mode), referencing the real score and top fix so it is ready with zero work.
  const audit = p.audit_json;
  const score = p.audit_score;
  let domain = p.website || '';
  try { if (domain) domain = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
  const topFix = audit?.top_three_fixes?.[0];

  let steps: { label: string; line: string }[];
  let voicemail: string;

  if (audit && score != null) {
    steps = [
      { label: 'Open', line: `Hi, is this ${biz}? Hey, my name is ${first}. I'll be honest, this is a quick cold call, do you have 20 seconds before I let you go?` },
      { label: 'Why you are calling', line: `Thanks, I appreciate it. I actually took a look at your website${domain ? `, ${domain},` : ''} and ran it through a quick audit. It came back at ${score} out of 100.${audit.headline ? ` The short version: ${audit.headline}` : ''}` },
      { label: 'The one thing', line: topFix ? `The biggest opportunity I saw was this: ${topFix.title}. ${topFix.why} That one alone is probably costing you business.` : `There are a few high-leverage fixes that would help your site bring in noticeably more business.` },
      { label: 'Offer the audit', line: `I put together the full breakdown of what to fix first, and it's free. I'd love to walk you through it for about ten minutes, or I can email you the whole report right now. Which is easier for you?` },
      { label: 'Lock it in', line: `Perfect. What's the best email to send it to? And would tomorrow morning or afternoon be better for a quick call? I'll send the report and a confirmation.` },
      { label: 'If they hesitate', line: `No pressure at all, I caught you out of the blue. Can I just email you the audit so you can look it over whenever? You can also grab a time here: ${bookDisplay}.` },
    ];
    voicemail = `Hi, this is ${first} with Modern Mustard Seed, calling for ${biz}. I ran a quick audit of your website and found a few things that are likely costing you business, it scored ${score} out of 100. I'd love to send you the free breakdown. Call or text me back, or I'll try you again. Thanks!`;
  } else {
    steps = [
      { label: 'Open', line: `Hi, is this ${biz}? Hey, my name is ${first}. I'll be honest, this is a quick cold call, do you have 20 seconds before I let you go?` },
      { label: 'Why you are calling', line: `Thanks, I appreciate it. Quick honest question I ask every owner: do you want your business to thrive? Because the ones that do never let a call slip. I work with a company that builds AI tools for ${city} businesses, and for a place like yours, ${hook}. We set up a system that answers your phone and books appointments around the clock, in a natural voice, even when you're closed or slammed.` },
      { label: 'Find the problem', line: `Quick question: when you're busy or after hours, what happens to your calls right now? Do they mostly go to voicemail?` },
      { label: 'Offer the demo', line: `That's exactly what we fix, and the easiest way is to hear it. I'd love to show you a quick live demo, you can actually talk to it. Takes about ten minutes. Would tomorrow morning or afternoon be better?` },
      { label: 'Lock it in', line: `Perfect. What's the best cell or email to send the details to? I'll book you in and send a confirmation. Looking forward to it.` },
      { label: 'If they hesitate', line: `No pressure at all, I caught you out of the blue. Can I text you a link so you can hear the demo yourself whenever you have a sec? It's ${bookDisplay}.` },
    ];
    voicemail = `Hi, this is ${first} with Modern Mustard Seed, calling for ${biz}. I help ${city} businesses make sure they never miss a call or a booking, even after hours. I'd love to show you a quick demo, it's pretty cool. Call or text me back, or I'll try you again. Thanks!`;
  }

  const fullText =
    `Call script for ${biz} (${city})\n\n` +
    steps.map((s, i) => `${i + 1}. ${s.label}\n${s.line}`).join('\n\n') +
    `\n\nIf you get voicemail:\n${voicemail}`;

  return { category, steps, voicemail, objections: COLD_CALL.objections, fullText };
}
