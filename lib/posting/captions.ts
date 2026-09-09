/**
 * THE WRITER. One brief in, six captions out, in the business's own voice.
 *
 * Claude writes them through `lib/llm` (Sarah's subscription, nothing
 * metered). When the drainer is slow the template writer steps in at publish
 * time, so a post always goes out with words on it. The template is not a
 * stand-in for Claude; it is the floor, and the floor is written properly.
 */
import { llmEnqueue } from '@/lib/llm';
import type { Captions, MaterialRow, Platform, SettingsRow } from './types';
import type { EvergreenBrief } from './evergreen';

export const CAPTION_SCHEMA = {
  type: 'object',
  required: ['headline', 'facebook', 'instagram', 'linkedin', 'x', 'gbp', 'houzz'],
  properties: {
    headline: { type: 'string', description: 'Six words or fewer. What the post is about, for the calendar.' },
    facebook: { type: 'string' },
    instagram: { type: 'string' },
    linkedin: { type: 'string' },
    x: { type: 'string', description: 'At most 260 characters.' },
    gbp: { type: 'string', description: 'A Google Business Profile update. At most 1200 characters. No hashtags.' },
    houzz: { type: 'string', description: 'A Houzz project note. Plain, descriptive, no hashtags.' },
  },
} as const;

export type Brief = {
  kind: 'material' | 'evergreen';
  material?: Pick<MaterialRow, 'note' | 'url' | 'kind'> | null;
  evergreen?: EvergreenBrief | null;
  dateStr: string;
};

export function systemPrompt(s: SettingsRow): string {
  const towns = s.towns.length ? s.towns.join(', ') : 'the Flathead Valley';
  const services = s.services.length ? s.services.join('; ') : 'custom homes and remodels';
  return [
    `You write the daily social posts for ${s.business_name}, a real business. You are the business speaking: we, us, our. Never "he", "she", the owner's name as a third person, or "the team at".`,
    `Towns we serve, lead towns first: ${towns}. Lead towns get named more often than the rest.`,
    `What we do: ${services}.`,
    s.facts ? `Facts you may use, and only these facts: ${s.facts}` : 'Use no facts about the business beyond what is in this brief.',
    s.tone ? `How we talk: ${s.tone}` : 'How we talk: plain, confident, warm, specific. Short sentences. Nothing that sounds like begging for work. Nothing cartoonish.',
    s.hard_nos ? `Hard rules: ${s.hard_nos}` : '',
    'Never quote a price, a price per square foot, a timeline, a completion date, or anything about financing. Never invent a project, a client, a review, an award, or a number. Never claim our name is on a building, truck or sign.',
    'No em dashes anywhere. No exclamation stacks. At most one exclamation point across all six captions. No emoji except at most two on Instagram.',
    'Write six captions from one brief. Facebook: two to four short paragraphs, conversational, ends with one plain invitation (call, message, or the site). Instagram: three to five short lines, then a line break and five to eight hashtags that are real and local. LinkedIn: two to three paragraphs, a touch more formal, no hashtags or at most two. X: one to three sentences, under 260 characters, no hashtags. Google Business Profile: one paragraph a searcher would find useful, no hashtags, ends with a call to action in plain words. Houzz: a project note in two or three sentences, descriptive, about the craft.',
    s.phone ? `Our phone is ${s.phone}. Use it in at most two of the six captions.` : '',
    s.site_url ? `Our website is ${s.site_url}. Use it in at most two of the six captions, and never on X.` : '',
    'Return only the JSON.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function userPrompt(b: Brief): string {
  if (b.kind === 'material' && b.material) {
    return [
      `Date of the post: ${b.dateStr}.`,
      'Today the business dropped a photo in the portal with this note:',
      `"${(b.material.note ?? '').trim() || 'No note. A photo from a job in progress.'}"`,
      'Write the six captions about this photo and note. Stay inside what the note says; do not invent where it is or whose it is.',
    ].join('\n');
  }
  const e = b.evergreen;
  return [
    `Date of the post: ${b.dateStr}.`,
    'No new photo today. Write from this brief instead:',
    e?.angle ?? 'What we do, and why people choose us.',
    e?.town ? `Name the town: ${e.town}.` : '',
    e?.service ? `The service in focus: ${e.service}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Queue the writing job; the planner records the id and the publisher reads the answer. */
export async function enqueueCaptions(s: SettingsRow, b: Brief): Promise<string> {
  return llmEnqueue({
    system: systemPrompt(s),
    user: userPrompt(b),
    label: `posting:${s.client_email}:${b.dateStr}`,
    model: 'sonnet',
    schema: CAPTION_SCHEMA,
  });
}

/** Turn a drainer answer into captions, or null if it is not one. */
export function captionsFromJson(json: unknown): { headline: string; captions: Captions } | null {
  if (!json || typeof json !== 'object') return null;
  const j = json as Record<string, unknown>;
  const pick = (k: string) => (typeof j[k] === 'string' ? (j[k] as string).trim() : '');
  const captions: Captions = {
    facebook: pick('facebook'),
    instagram: pick('instagram'),
    linkedin: pick('linkedin'),
    x: pick('x').slice(0, 275),
    gbp: pick('gbp').slice(0, 1400),
    houzz: pick('houzz'),
  };
  if (!captions.facebook || !captions.instagram) return null;
  return { headline: pick('headline').slice(0, 80) || 'Today', captions: scrub(captions) };
}

/** No em dash leaves this module, whoever wrote the words. */
export function scrub(c: Captions): Captions {
  const out: Captions = {};
  for (const k of Object.keys(c) as Platform[]) {
    const v = c[k];
    if (typeof v !== 'string') continue;
    out[k] = v.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',').replace(/\s+\n/g, '\n').trim();
  }
  return out;
}

/* ───────────────────── the floor: a template writer that never fails ───────────────────── */

export function templateCaptions(s: SettingsRow, b: Brief): { headline: string; captions: Captions } {
  const name = s.business_name;
  const lead = s.towns[0] ?? 'the Flathead Valley';
  const second = s.towns[1] ?? null;
  const where = second ? `${lead} and ${second}` : lead;
  const site = s.site_url ? s.site_url.replace(/^https?:\/\//, '') : null;
  const phone = s.phone ?? null;
  const ask = phone ? `Call us at ${phone}.` : site ? `Start at ${site}.` : 'Send us a message.';

  if (b.kind === 'material' && b.material) {
    const note = (b.material.note ?? '').trim();
    const line = note ? note.replace(/\s+/g, ' ') : 'On site this week.';
    const sentence = /[.!?]$/.test(line) ? line : `${line}.`;
    return {
      headline: (note.split(/[.!?\n]/)[0] || 'On site').slice(0, 60),
      captions: scrub({
        facebook: `${sentence}\n\nThis is the part of the work we like best: the day the plan turns into something you can stand inside. Every home we build in ${where} starts with a walk on the land and a long conversation.\n\nIf you have a lot and an idea, we would like to hear it. ${ask}`,
        instagram: `${sentence}\nBuilt by hand, built to last, built for a Montana winter.\nWe build custom homes and remodels across ${where}.\n\n#${slug(lead)} #${slug(second ?? 'FlatheadValley')} #MontanaBuilder #CustomHome #MontanaLiving #FlatheadValley #BuiltRight`,
        linkedin: `${sentence}\n\nWe have been building custom homes and remodels in ${where} for a long time, and the process has not changed: walk the land first, get the plan right, then build it properly. If you are planning a home in the valley, we are glad to talk.`,
        x: `${sentence} Custom homes and remodels in ${where}.`.slice(0, 260),
        gbp: `${sentence} We build custom homes and remodels across ${where}, starting with a site visit to see whether the lot suits the idea. ${ask}`,
        houzz: `${sentence} Custom work in ${where}, built for the climate and the view.`,
      }),
    };
  }

  const e = b.evergreen;
  const town = e?.town ?? lead;
  const service = e?.service ?? 'custom homes';
  const angle = e?.key.split(':')[0] ?? 'process';
  const body = EVERGREEN_TEXT[angle] ?? EVERGREEN_TEXT.process;
  const fb = body(name, town, service, where);
  return {
    headline: HEADLINES[angle] ?? 'How we build',
    captions: scrub({
      facebook: `${fb}\n\n${ask}`,
      instagram: `${fb.split('\n\n')[0]}\n\n#${slug(town)} #MontanaBuilder #CustomHome #FlatheadValley #MontanaLiving #${slug(service)}`,
      linkedin: fb,
      x: `${fb.split('\n\n')[0]}`.slice(0, 260),
      gbp: `${fb.replace(/\n\n/g, ' ')} ${ask}`.slice(0, 1400),
      houzz: fb.split('\n\n')[0],
    }),
  };
}

const HEADLINES: Record<string, string> = {
  'first-visit': 'The first site visit',
  'land-first': 'It starts with the land',
  process: 'How we build',
  service: 'What we do',
  'winter-build': 'Built for winter',
  'remodel-or-new': 'Remodel or new',
  question: 'A question we get',
  town: 'Building here',
  craft: 'The part nobody sees',
  'since-1997': 'Since 1997',
  'plans-no-land': 'Plans, no land yet',
  referral: 'Thank you',
  family: 'A family business',
  'pre-construction': 'Before the numbers',
};

const EVERGREEN_TEXT: Record<string, (name: string, town: string, service: string, where: string) => string> = {
  'first-visit': (_n, town) => `The first thing we do with a new idea is walk the lot. Not the plans, not the numbers. The land.\n\nIn ${town} a lot can look perfect from the road and tell a different story once you see the slope, the access and where the sun goes in January. An hour on site answers more than a week of drawings.\n\nIf you own land and have an idea, bring it to us. We will walk it with you.`,
  'land-first': () => `A Montana home starts with the land. Access in winter, where the water goes, how the sun moves, what the wind does. Get those right and the house takes care of itself.\n\nThat is why we look before we draw.`,
  process: (name) => `How a home with ${name} comes together: a conversation, a walk on the land, a plan that fits it, a pre-construction agreement with the real numbers, and then a build with the same crew from footing to keys.\n\nNo surprises is the whole point.`,
  service: (_n, town, service) => `${cap(service)} in ${town}. We do this the same way every time: listen first, walk the site, plan it properly, build it to last.\n\nIf ${service.toLowerCase()} is what you are thinking about, we are glad to talk it through.`,
  'winter-build': () => `Building for a Flathead Valley winter changes things. The roof pitch, the envelope, where the mechanical room sits, how the driveway drains. Get them right in the plan and you never think about them again.\n\nWe have built through enough winters to know which details matter.`,
  'remodel-or-new': () => `Sometimes a remodel is the right answer. Sometimes it is not, and the honest thing is to say so before anyone spends money.\n\nWe will tell you which one you are looking at, and why.`,
  question: () => `A question we hear every week: where do we start? Start with the land, or the house you already have, and a clear idea of how you want to live in it.\n\nThe numbers and the schedule come after the plan, not before. That order is what keeps a build calm.`,
  town: (_n, town) => `Building in ${town}. Every part of the valley has its own habits: the lots, the views, the permitting, the neighbours. We have built here long enough to know them.\n\nIf you are planning a home in ${town}, we would like to see the site.`,
  craft: () => `The part of a house nobody sees after drywall is the part we care about most. Framing that is square, flashing that is right, insulation that is continuous, a mechanical room laid out for the next thirty years.\n\nIt is not what people photograph. It is what keeps the house good.`,
  'since-1997': (name) => `${name} has been at this since 1997. The subs we work with have been with us for years. The homes we built early on are still standing well, and some of those families have come back for a second one.\n\nThat is the record we build on.`,
  'plans-no-land': () => `Have plans but no land yet? That happens more than you would think. We help match a plan to a lot, and we tell you plainly what changes once the lot is found.\n\nBring the plans. We will talk about where they fit.`,
  referral: () => `Most of our work comes from someone who built with us telling a friend. Thank you for that. It is the best thing anyone can say about a builder.\n\nIf you know someone planning a home, send them our way.`,
  family: (name) => `${name} is a family business: a founder who started it, a son on site every day, and an office that answers the phone. When you call, you get one of us.\n\nThat is how we like it.`,
  'pre-construction': () => `A pre-construction agreement is where the real numbers and the real schedule come from. Before it, anyone quoting you a figure is guessing.\n\nWe would rather do the work to get it right, and then stand behind it.`,
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '');
}
