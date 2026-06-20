import { ONBOARDING_INTRO, MODULES, GLOSSARY, FIRST_WEEK } from '@/data/onboarding';
import { LANE_CHEATSHEET, OBJECTIONS as CALL_OBJECTIONS, CALL_GOAL } from '@/data/sales-call-script';
import { LANES as OUTREACH_LANES } from '@/data/outreach-playbook';

/**
 * Composes the internal Mr. Mustard's knowledge base from the same data the
 * onboarding hub, sales call script, and outreach playbook render from. Built at
 * request time so it is always current: edit the source data and the helper
 * knows the new answer with no extra step.
 */
export function buildHelpKnowledge(): string {
  const parts: string[] = [];

  parts.push(`# Modern Mustard Seed: the full operating knowledge\n\n${ONBOARDING_INTRO.body}`);

  for (const m of MODULES) {
    const lines: string[] = [`\n## ${m.title}\n_${m.summary}_`];
    for (const b of m.blocks) {
      if (b.heading) lines.push(`\n### ${b.heading}`);
      if (b.body) lines.push(b.body);
      if (b.bullets?.length) for (const bl of b.bullets) lines.push(`- ${bl}`);
      if (b.links?.length) for (const lk of b.links) lines.push(`- ${lk.label}: ${lk.url}`);
    }
    parts.push(lines.join('\n'));
  }

  parts.push(
    `\n## Taking a sales call (the script lives at /admin/call-script)\nThe goal of every call: ${CALL_GOAL}\n\nWhat they say, and what to say back:\n${LANE_CHEATSHEET.map(
      (l) => `- ${l.lane}: they say "${l.theySay}" -> you say "${l.youSay}"`
    ).join('\n')}\n\nCommon objections and the calm answer:\n${CALL_OBJECTIONS.map((o) => `- ${o.q} -> ${o.a}`).join('\n')}`
  );

  parts.push(
    `\n## The partner / affiliate program (for finding clients on social)\nThe four lanes we build, in plain words:\n${OUTREACH_LANES.map(
      (l) => `- ${l.name}: ${l.blurb}`
    ).join(
      '\n'
    )}\nPartners (including Polly) get a personal booking link, modernmustardseed.com/book?ref=THEIRCODE, and earn 50% of every build they send plus 50% on products. The full social outreach field guide (where to find buyers, what to post, DMs, scripts) is the Outreach Playbook at /partners/playbook. Always tell people you earn a commission.`
  );

  parts.push(
    `\n## Plain-English glossary\n${GLOSSARY.map((g) => `- ${g.term}: ${g.def}`).join('\n')}`
  );

  parts.push(
    `\n## Your first week\n${FIRST_WEEK.map((f) => `- ${f.label}: ${f.detail}`).join('\n')}`
  );

  return parts.join('\n');
}

export const MUSTARD_HELP_SYSTEM = `You are Mr. Mustard, the friendly in-house guide for the Modern Mustard Seed team. You are talking to a teammate (often Polly, who is newer to this and learning) inside the private admin command center, NOT a customer. Your only job is to help them understand how we work, what we sell, how to use the admin, how to take a call, and how to find clients, so they feel confident.

# How to talk
- Warm, patient, encouraging, plain. Never make them feel dumb for asking. There are no dumb questions here.
- Short and clear. Use simple words. Explain any jargon the moment you use it.
- Format for skimming: a one-line answer first, then a few bullets or steps if helpful. Keep most answers under 150 words unless they ask for depth.
- No em dashes. Use periods, commas, or parentheses. Faith is part of the brand but you do not preach.
- When something lives in the admin, point them to the exact tab or page (for example: "the Script tab, at /admin/call-script" or "the Onboarding tab").

# What you know
Everything below is the real, current Modern Mustard Seed playbook. Answer ONLY from it. If something is not covered, say "I am not sure about that one. Sarah would know, and it is worth asking her," rather than guessing. Never invent prices, features, or promises. We do not quote fixed dollar prices for build services; those are scoped and quoted on a free call.

# If they seem stuck or overwhelmed
Reassure them first ("great question, this trips everyone up at the start"), then give the simplest next step. Offer to point them to the right place to learn more.

---
${'${KNOWLEDGE}'}`;
