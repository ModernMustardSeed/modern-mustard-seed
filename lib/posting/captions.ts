/**
 * THE EDITOR. Their words in, one version per platform out, and a line on
 * what changed.
 *
 * We do not write posts for a client. They say what they want to say; we
 * tighten it and shape it for each feed so each algorithm is happy: Facebook
 * wants paragraphs and a plain invitation, Instagram wants line breaks and
 * local hashtags, LinkedIn wants a professional frame, X wants one thought
 * under the limit, Google wants something a searcher can use, Houzz wants a
 * project note. Meaning, facts and voice stay theirs. Nothing is added that
 * their text did not say. Every version carries a one-line note on what the
 * edit did, so the client can see the work and trust it.
 *
 * Claude edits through `lib/llm` (Sarah's subscription). When the drainer is
 * slow the mechanical editor steps in at publish time: their text, verbatim,
 * with the platform's formatting around it. Either way, their words go out.
 */
import { llmEnqueue } from '@/lib/llm';
import type { Captions, MaterialRow, Notes, Platform, SettingsRow } from './types';

export const CAPTION_SCHEMA = {
  type: 'object',
  required: ['headline', 'facebook', 'instagram', 'linkedin', 'x', 'gbp', 'houzz', 'notes'],
  properties: {
    headline: { type: 'string', description: 'Six words or fewer. What the post is about, for the calendar.' },
    facebook: { type: 'string' },
    instagram: { type: 'string' },
    linkedin: { type: 'string' },
    x: { type: 'string', description: 'At most 260 characters.' },
    gbp: { type: 'string', description: 'A Google Business Profile update. At most 1200 characters. No hashtags.' },
    houzz: { type: 'string', description: 'A Houzz project note. Plain, descriptive, no hashtags.' },
    notes: {
      type: 'object',
      description: 'One short sentence per platform on what the edit did and why it suits that feed. Plain words to the business owner.',
      properties: { facebook: { type: 'string' }, instagram: { type: 'string' }, linkedin: { type: 'string' }, x: { type: 'string' }, gbp: { type: 'string' }, houzz: { type: 'string' } },
    },
  },
} as const;

export type Brief = {
  material: Pick<MaterialRow, 'text' | 'note' | 'url' | 'wants_graphic' | 'graphic_brief' | 'link' | 'platforms'>;
  dateStr: string;
};

export function systemPrompt(s: SettingsRow): string {
  const towns = s.towns.length ? s.towns.join(', ') : 'the Flathead Valley';
  return [
    `You are the social media editor for ${s.business_name}, a real business. The business writes its own posts. Your job is to edit one post into six platform versions. You are not the author.`,
    'Keep their meaning, their facts and their voice. Fix spelling and grammar. Tighten what rambles. Never add a fact, a claim, a project, a name, a number, a price, a date or a promise that is not in their text. If their text is one line, the versions are short; do not pad.',
    'The business speaks as itself: we, us, our. If they wrote in first person singular, keep it.',
    `Towns they serve, for hashtags and local framing only: ${towns}.`,
    s.tone ? `How they talk: ${s.tone}` : '',
    s.hard_nos ? `Hard rules from the business: ${s.hard_nos}` : '',
    'Never introduce a price, a price per square foot, a timeline or financing unless their text already states it. Never claim their name is on a building, truck or sign.',
    'No em dashes anywhere. At most one exclamation point across all six versions. No emoji except at most two on Instagram, and only if their text had a light tone.',
    'Platform shapes. Facebook: their text as two to four short paragraphs, conversational, ending with one plain invitation only if their text invites something. Instagram: three to six short lines from their text, then a blank line and five to eight real local hashtags. LinkedIn: their text framed for a professional reader, two to three paragraphs, at most two hashtags. X: the single strongest thought from their text, under 260 characters, no hashtags, no link. Google Business Profile: one paragraph a searcher would find useful, no hashtags, ending with a plain call to action if their text has one. Houzz: a project note in two or three sentences, descriptive, about the work.',
    'Notes: for each platform, one short sentence to the business owner on what you changed and why that shape suits the feed. If you changed nothing, say so.',
    s.phone ? `Their phone is ${s.phone}. Use it only where their text asks people to call.` : '',
    s.site_url ? `Their website is ${s.site_url}. Use it only where their text points to the site, never on X.` : '',
    'Return only the JSON.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function userPrompt(b: Brief): string {
  const m = b.material;
  return [
    `Date of the post: ${b.dateStr}.`,
    'Their post, exactly as they wrote it:',
    `"""${(m.text ?? '').trim()}"""`,
    m.url ? 'A photo or graphic goes with it.' : m.wants_graphic ? `A graphic is being made for it${m.graphic_brief ? `: ${m.graphic_brief}` : ''}.` : 'No image with this one.',
    m.link ? `They want this link with it: ${m.link}. Put it at the end of the Facebook, LinkedIn and Google versions as a plain URL. Never on X or Instagram.` : '',
    m.platforms?.length ? `They are posting this to: ${m.platforms.join(', ')}. Still return every version.` : '',
    m.note ? `Their note to the editor: ${m.note}` : '',
    'Edit it into the six versions, with a note on each.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Queue the edit; the planner records the id and the publisher reads the answer. */
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
export function captionsFromJson(json: unknown): { headline: string; captions: Captions; notes: Notes } | null {
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
  const notes: Notes = {};
  const n = (j.notes && typeof j.notes === 'object' ? j.notes : {}) as Record<string, unknown>;
  for (const k of Object.keys(captions) as Platform[]) if (typeof n[k] === 'string') notes[k] = (n[k] as string).replace(/\s*[—–]\s*/g, ', ').trim().slice(0, 240);
  return { headline: pick('headline').slice(0, 80) || 'Post', captions: scrub(captions), notes };
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

/* ─────────── the floor: their text, verbatim, shaped for each platform ─────────── */

export function templateCaptions(s: SettingsRow, b: Brief): { headline: string; captions: Captions; notes: Notes } {
  const raw = (b.material.text ?? '').replace(/\r/g, '').trim();
  const text = raw || 'A new post.';
  const firstLine = text.split(/\n/)[0].trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const lead = s.towns[0] ?? 'FlatheadValley';
  const tags = [...new Set([lead, s.towns[1], 'MontanaBuilder', 'FlatheadValley', 'MontanaLiving'].filter(Boolean))].map((t) => `#${String(t).replace(/[^a-z0-9]+/gi, '')}`).join(' ');
  const xText = sentences[0] && sentences[0].length <= 260 ? sentences[0] : `${text.slice(0, 257).trimEnd()}...`;
  const link = b.material.link ? `\n\n${b.material.link}` : '';
  return {
    headline: (firstLine.split(/[.!?]/)[0] || 'Post').slice(0, 60),
    captions: scrub({
      facebook: paragraphs.join('\n\n') + link,
      instagram: `${sentences.slice(0, 5).join('\n')}\n\n${tags}`,
      linkedin: paragraphs.join('\n\n') + link,
      x: xText.slice(0, 260),
      gbp: (sentences.join(' ') + link).slice(0, 1400),
      houzz: sentences.slice(0, 3).join(' '),
    }),
    notes: {
      facebook: 'Your words as you wrote them, in short paragraphs.',
      instagram: 'Your words line by line, with local hashtags added.',
      linkedin: 'Your words as you wrote them.',
      x: 'Your first sentence, so it fits the limit.',
      gbp: 'Your words as one paragraph for a searcher.',
      houzz: 'Your first three sentences as a project note.',
    },
  };
}
