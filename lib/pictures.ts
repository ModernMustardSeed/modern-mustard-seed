/**
 * MUSTARD PICTURES engine (server-side).
 *
 * writeStoryboard: Claude drafts the director's treatment in Mr. Mustard's
 * voice (logline, six shots, three taglines). This is the guaranteed beat.
 *
 * paintHeroFrame: one nano-banana frame of the director on THEIR business's
 * set (same character transform the shipped commercials use). Generation can
 * be down (empty fal wallet, model hiccup): callers must treat a null frame
 * as "the darkroom is backed up", never a failure of the screen test.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getPicturesVertical } from '@/data/pictures';
import type { PicturesProfile } from '@/lib/pictures-store';

const CHARACTER =
  'a small cute 3D-rendered mustard seed mascot character, round teardrop-shaped glossy golden-yellow seed body, two small green sprout leaves growing from the top of its head, big friendly dark eyes with eyelashes, warm cheerful smile, white cartoon gloves on its hands, black rounded shoes, Pixar-quality subsurface scattering and soft studio-grade lighting';

const MASCOT_URL = 'https://modernmustardseed.com/brand/mascot.png';

export function storyboardSystemPrompt(): string {
  return `You are Mr. Mustard, the AI director at MUSTARD PICTURES (Modern Mustard Seed's film studio). A business owner just walked onto your set for their free Screen Test. You direct a treatment for THEIR ~30 second commercial, personalized to what they told you. You are warm, sharp, a little theatrical (you wear the beret unironically), and genuinely good at this.

Write EXACTLY this structure, plain text, no markdown headers:

LOGLINE: one sentence that captures their commercial's story (the emotional arc, not a feature list).

THE BOARD:
1. [shot name] — one vivid sentence of what we see, camera note included.
2. ... (exactly six shots. Shot 1 opens on a real customer moment or pain, shots 2-4 build their craft and warmth, shot 5 is the money moment, shot 6 is the button: warm close with their name.)

TAGLINES:
- three options, each under 8 words, no puns unless they are actually good.

DIRECTOR'S NOTE: two sentences max, spoken to the owner by name, about why this story will work for their exact business. End with your sign-off: "— Mr. M."

Hard rules: no em dashes anywhere except the shot-number separators shown above and the sign-off. Use ONLY facts they gave you; never invent prices, awards, or years in business. Every shot must be filmable without text on screen (captions come later). Keep the whole thing under 300 words. Their details follow.`;
}

export function storyboardUserPrompt(p: PicturesProfile): string {
  const v = getPicturesVertical(p.verticalId);
  return `Business: ${p.business} (${v.label}) in ${p.city}. Owner: ${p.ownerName}. What they told you about it: ${p.story}`;
}

export async function writeStoryboard(p: PicturesProfile): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 600,
      system: storyboardSystemPrompt(),
      messages: [{ role: 'user', content: storyboardUserPrompt(p) }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || null;
  } catch (err) {
    console.error('pictures storyboard error', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Paint the hero frame. Returns the image URL or null (darkroom backed up).
 * Costs ~$0.04 per frame; the route's caps bound the spend.
 */
export async function paintHeroFrame(p: PicturesProfile): Promise<string | null> {
  const falKey = (process.env.FAL_KEY || '').trim();
  if (!falKey) return null;
  const v = getPicturesVertical(p.verticalId);
  const prompt = `Transform this flat 2D cartoon mascot into ${CHARACTER}. Cinematic film still, behind the scenes at a film shoot: the tiny seed character stands on a director's chair wearing a tiny black beret, holding a small megaphone, directing a commercial film set styled as ${v.set}, warm movie lights and a cinema camera silhouette in the frame, golden cinematic glow, shallow depth of field, photorealistic environment with the stylized 3D character, joyful and grand, 16:9 widescreen. Absolutely no text, no letters, no words anywhere in the image.`;
  try {
    const res = await fetch('https://fal.run/fal-ai/nano-banana/edit', {
      method: 'POST',
      headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image_urls: [MASCOT_URL],
        num_images: 1,
        output_format: 'png',
        aspect_ratio: '16:9',
      }),
      // The screen test should feel snappy; the storyboard already landed.
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.error('pictures frame failed', res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = (await res.json()) as { images?: { url?: string }[] };
    return data.images?.[0]?.url || null;
  } catch (err) {
    console.error('pictures frame error', err instanceof Error ? err.message : err);
    return null;
  }
}
