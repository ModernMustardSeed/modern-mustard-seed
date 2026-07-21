/**
 * THE MOODBOARD FORGE (server only: pulls the Anthropic SDK, so no client
 * component may import this file; the types, pairings, and sanitizer live in
 * lib/moodboard-shared.ts).
 */

import Anthropic from '@anthropic-ai/sdk';
import { FONT_PAIRINGS, sanitizeMoodboard, type Moodboard } from './moodboard-shared';

export * from './moodboard-shared';

const MODEL = 'claude-sonnet-5';

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */
export type MoodboardBrief = {
  businessName: string;
  trade?: string;
  city?: string;
  services?: string;
  brandColors?: string;   // whatever the client typed or picked at intake
  notes?: string;         // anything else from intake worth honoring
  sarahNote?: string;     // optional steer typed on the admin board
};

const SYSTEM = `You are the art director at Modern Mustard Seed, a product studio whose design bar is Apple, Linear, and Awwwards site-of-the-day work. You are forging a DIRECTION BOARD for a small business's new website. The client already paid; this board is what they approve before their site goes live.

Return ONLY a JSON object, no markdown fences, with exactly these keys:
{
  "directionName": "two or three evocative words, like a paint color name",
  "directionLine": "one warm sentence selling the direction to the owner, in plain words",
  "vibeWords": ["three", "single", "words"],
  "pairingId": "one id from the type library below",
  "palette": [{ "name": "Swatch name", "hex": "#RRGGBB", "role": "what it does on the site" }],
  "heroLine": "the sample homepage headline in the business's own voice",
  "heroSub": "the sample subline under it",
  "imageryNotes": "how their photos will be treated (crops, warmth, texture)",
  "signatureMoment": "the ONE unforgettable interaction their site gets, specific and buildable",
  "motionNotes": "how the site moves, one or two short sentences",
  "voiceNote": "how the site talks, one short sentence"
}

Type library (pick pairingId by vibe): ${FONT_PAIRINGS.map((p) => `${p.id} (${p.display} + ${p.body}: ${p.vibe})`).join('; ')}.

Palette rules:
- Exactly 5 swatches: one dominant light neutral, one deep anchor, ONE saturated signature accent, one warm support, one crisp paper/ink counterpoint. Name them like paint chips ("Glacier Milk", not "light gray").
- If the client gave brand colors, keep their recognition but refine: shift muddy or default-looking values toward sophisticated adjacents. Never output pure #FF0000/#0000FF defaults.
- Never a purple-gradient-on-white template look. Contrast must survive text on the light neutral.

Length budget (hard, the renderer truncates past these): directionLine one sentence under 260 characters; each swatch role under 80 characters; imageryNotes and signatureMoment two or three sentences under 450 characters each; motionNotes and voiceNote under 240 characters.

Taste law: the board must be a level above what the client imagined. Specific to THEIR trade and town, never generic. The signature moment must be concrete (what the visitor sees and does), buildable in a week, and tied to their business, not a stock idea. No em dashes anywhere. Use periods, commas, parentheses. Never invent facts about the business you were not told.`;

function extractJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

/** Forge a moodboard from the intake brief. Returns null on any failure. */
export async function generateMoodboard(brief: MoodboardBrief): Promise<Moodboard | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  const lines = [
    `Business: ${brief.businessName}`,
    brief.trade ? `Trade: ${brief.trade}` : '',
    brief.city ? `Town: ${brief.city}` : '',
    brief.services ? `Services: ${brief.services}` : '',
    brief.brandColors ? `Brand colors they gave us: ${brief.brandColors}` : 'Brand colors: none given, derive from the trade and town.',
    brief.notes ? `From their intake: ${brief.notes}` : '',
    brief.sarahNote ? `Steer from Sarah (follow it): ${brief.sarahNote}` : '',
  ].filter(Boolean);
  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: MODEL,
      // The model thinks before it answers; a tight cap here trips the
      // truncation guard on thinking alone (found live, 2026-07-21).
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: 'user', content: lines.join('\n') }],
    });
    if (res.stop_reason === 'max_tokens') return null; // truncated JSON, do not ship
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return sanitizeMoodboard(extractJson(text));
  } catch (err) {
    console.error('generateMoodboard failed', err instanceof Error ? err.message : err);
    return null;
  }
}
