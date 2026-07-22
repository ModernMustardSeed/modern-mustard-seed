import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAdminUser } from '@/lib/admin-auth';
import { PROMPTER_SCRIPTS, isDirectionLine } from '@/app/sarah/scripts';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * The "you do the text and title" half of the loop. Given a booth script (or raw
 * text), Claude writes a YouTube title, description, and tags in Sarah's voice.
 * Sarah edits whatever she wants before publishing; this just removes the blank page.
 */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI is not configured (ANTHROPIC_API_KEY).' }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { scriptId?: string; text?: string } | null;
  const script = body?.scriptId ? PROMPTER_SCRIPTS.find((s) => s.id === body.scriptId) : undefined;

  let sourceTitle = '';
  let transcript = (body?.text ?? '').trim();
  let kind = 'video';
  if (script) {
    sourceTitle = script.title;
    kind = script.kind === 'short' ? 'YouTube Short' : script.kind === 'ad' ? 'social ad' : 'YouTube episode';
    transcript = script.sections
      .flatMap((sec) => sec.paragraphs)
      .filter((p) => !isDirectionLine(p)) // spoken lines only, never the direction cues
      .join('\n\n');
  }
  if (!transcript) return NextResponse.json({ error: 'Give a scriptId or some text to work from.' }, { status: 400 });

  const sys = `You write YouTube metadata for Modern Mustard Seed, a small AI studio run by Sarah Scarano, a Christian founder in Kalispell Montana who builds AI systems for small businesses. Voice: warm, capable, founder to founder, specific, no hype, faith undertone when natural. HARD RULES: never use an em dash (use periods, commas, parentheses). No clickbait, no all-caps words, no fake urgency. Return ONLY valid minified JSON, no markdown, no preamble.`;

  const prompt = `This is a ${kind} titled "${sourceTitle || 'untitled'}". Here is the spoken script:\n\n${transcript.slice(0, 6000)}\n\nWrite metadata as JSON with exactly these keys:\n- "title": a compelling YouTube title, at most 90 characters, that promises the real value and sounds like Sarah, not a marketer.\n- "description": 130 to 240 words. Open with a strong first sentence (it shows in search). Say what the viewer will learn or feel. Then a short call to action to see what the studio builds at ${SITE.url}. End with the line "Small faith. Real leverage. Work that shelters." No hashtags in the body.\n- "tags": an array of 12 to 18 lowercase search tags relevant to the topic (mix of broad and specific), no hashes.\nReturn only the JSON object.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      system: sys,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = resp.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim();
    const jsonText = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonText) as { title?: string; description?: string; tags?: string[] };
    if (!parsed.title || !parsed.description) throw new Error('missing fields');
    return NextResponse.json({
      title: String(parsed.title).slice(0, 100),
      description: String(parsed.description),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).toLowerCase()).slice(0, 30) : [],
    });
  } catch (e) {
    return NextResponse.json({ error: `Could not draft the metadata: ${(e as Error).message}` }, { status: 500 });
  }
}
