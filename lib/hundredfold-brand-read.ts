/**
 * READ A MEMBER'S BRAND OFF THEIR OWN WEBSITE.
 *
 * The onboarding moment this is for: an owner joins, and instead of being handed
 * a form asking for hex codes they will never fill in, the Command Center comes
 * back with "here is your brand, we read it off your site" and a palette they
 * recognise. They correct what is wrong, which takes a minute, instead of
 * authoring what is missing, which takes never.
 *
 * ⚠️ THE MODEL PICKS, IT DOES NOT INVENT. The colours and font stacks handed to
 * it are the ones actually present in their CSS, counted by frequency, and it
 * is told to choose from that list. Left to invent, a model returns a tasteful
 * palette that is not theirs, which is exactly the failure this whole feature
 * exists to fix.
 */

import { llmText } from '@/lib/llm';
import { extractJson } from './claude-code-json';
import {
  fetchSiteSource,
  paletteCandidates,
  fontCandidates,
  logoCandidate,
  normalizeBrand,
  type Brand,
} from './hundredfold-brand';

const MODEL = process.env.HUNDREDFOLD_BRAND_MODEL || 'claude-opus-5';

export type BrandRead =
  | { ok: true; brand: Brand; cents: number; from: string }
  | { ok: false; reason: string; cents: number };

export async function readBrandFromSite(input: {
  memberId: string;
  business: string;
  url: string;
}): Promise<BrandRead> {
  const src = await fetchSiteSource(input.url);
  if (!src) {
    return {
      ok: false,
      reason: `We could not reach ${input.url}. Set the palette by hand and everything built will use it.`,
      cents: 0,
    };
  }

  const colours = paletteCandidates(src.css, src.html);
  const fonts = fontCandidates(src.css);
  const logo = logoCandidate(src.html, src.finalUrl);

  if (colours.length < 3) {
    return {
      ok: false,
      reason: 'That site did not expose enough of its styling to read a palette from. Set it by hand.',
      cents: 0,
    };
  }

  // Text only, and only the parts that carry brand: the model does not need the
  // whole page and a whole page is how you spend a dollar reading a homepage.
  const visible = src.html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 6000);

  const text = await llmText({
    label: 'hundredfold-brand-read',
    model: MODEL,
    timeoutMs: 120_000,
    system: `You read a small business's existing brand off their own website so that everything we build for them afterwards matches it.

Return ONLY a JSON object:
{"ink":"#RRGGBB","paper":"#RRGGBB","accent":"#RRGGBB","accent_soft":"#RRGGBB","line":"#RRGGBB",
 "display_font":"<css font-family stack>","body_font":"<css font-family stack>",
 "photo_direction":"one sentence of art direction for photographs of this business",
 "voice":"one sentence describing how they talk",
 "contact":{"phone":"","email":"","address":"","booking_url":"","hours":""},
 "legal":""}

Rules:
- CHOOSE the five colours FROM THE CANDIDATE LIST you are given. Do not invent a colour that is not on it. The list is ordered by how often each appears in their stylesheet, which is a good but not perfect proxy for importance.
- ink is their darkest text colour, paper their page background, accent the one colour a customer would name if asked what colour this business is, accent_soft a pale tint of the accent for fills, line a hairline grey.
- Never return pure #000000 for ink or an accent that is the same as ink or paper.
- Fonts: choose from the declared stacks. Return a COMPLETE css font-family value with fallbacks, because the documents we build are self-contained and cannot fetch a webfont.
- contact: copy ONLY what is literally on the page. An empty string is correct and expected. Never guess a phone number or an address.
- legal: only a licence number, certification, or disclaimer that actually appears.
- No em dashes anywhere.`,
    user: `BUSINESS: ${input.business}
SITE: ${src.finalUrl}

COLOUR CANDIDATES (hex, then how many times it appears):
${colours.map((c) => `${c.hex}  ${c.count}`).join('\n')}

FONT STACKS DECLARED:
${fonts.length ? fonts.join('\n') : '(none found)'}

VISIBLE PAGE TEXT:
${visible}`,
  });

  // Zero, and truthfully zero. The HUNDREDFOLD credit ledger sums these to show
  // an owner what their build cost, so a run on the subscription has to report
  // as free rather than as an estimate nobody paid.
  const cents = 0;

  const parsed = extractJson(text, {}, 'hundredfold-brand-read') as Partial<Brand>;
  if (!parsed?.accent) return { ok: false, reason: 'The reader could not settle on a palette.', cents };

  const brand = normalizeBrand(
    {
      ...parsed,
      logo_url: logo,
      source: 'extracted',
      extracted_from: src.finalUrl,
      extracted_at: new Date().toISOString(),
    },
    input.memberId,
  );

  return { ok: true, brand, cents, from: src.finalUrl };
}
