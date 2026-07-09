import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Rewrite a campaign outreach email as a fresh, different draft. Interactive and
 * low-volume, so it uses the metered Anthropic API directly (same pattern as the
 * Tracker/Outbound draft-reply). Returns a new subject + body only; the rep
 * reviews, edits, and sends. Admin-gated (campaigns are visible to all roles).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'AI drafting is not configured (ANTHROPIC_API_KEY missing).' }, { status: 500 });

  let payload: {
    subject?: string;
    body?: string;
    context?: { name?: string; title?: string; company?: string; product?: string; brand?: string; hook?: string; rep?: string; cell?: string; instruction?: string };
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const subject = (payload.subject ?? '').trim();
  const body = (payload.body ?? '').trim();
  if (!body) return NextResponse.json({ error: 'Nothing to rewrite yet.' }, { status: 400 });

  const ctx = payload.context ?? {};
  const rep = ctx.rep || 'Sarah Scarano';

  const cell = (ctx.cell ?? '').trim();
  const signLine = cell ? `Sign it as ${rep.split(' ')[0]} and keep the cell number ${cell} in the sign-off.` : `Sign it as ${rep.split(' ')[0]}.`;
  const system = `You are ${rep} of Modern Mustard Seed, a small AI studio. You write cold B2B outreach that books meetings. Voice: warm, sharp, founder to founder, specific, no hype, no jargon, short paragraphs. NO em dashes ever (use periods, commas, parentheses). It must read like a personal note to one real decision maker, never a mass blast. Keep it the same length or shorter than the original, and keep the same goal (earn a short demo or call). Do NOT invent facts, prices, or features that are not in the original. ${signLine} Output format, exactly: the first line is "Subject: <the new subject>", then one blank line, then the email body. Output nothing else.`;

  const user = `Rewrite this outreach email as a genuinely different take: a fresh opening or angle, same intent. Keep it personalized to the recipient.

Recipient: ${ctx.name || 'the contact'}${ctx.title ? `, ${ctx.title}` : ''}${ctx.company ? ` at ${ctx.company}` : ''}.
What we sell: ${ctx.product || 'our AI product'}${ctx.brand ? ` (for ${ctx.brand})` : ''}.${ctx.hook ? `\nThe angle for this person: ${ctx.hook}` : ''}${ctx.instruction ? `\nExtra direction from the sender: ${ctx.instruction}` : ''}

Current subject: ${subject || '(none)'}
Current body:
${body}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) return NextResponse.json({ error: 'The rewrite came back empty. Try again.' }, { status: 500 });

    // Parse "Subject: <...>" then a blank line then the body. Fall back gracefully.
    let newSubject = subject;
    let newBody = text;
    const m = text.match(/^\s*subject:\s*(.+?)\r?\n\s*\r?\n([\s\S]*)$/i);
    if (m) {
      newSubject = m[1].trim();
      newBody = m[2].trim();
    } else {
      const single = text.match(/^\s*subject:\s*(.+?)\r?\n([\s\S]*)$/i);
      if (single) {
        newSubject = single[1].trim();
        newBody = single[2].trim();
      }
    }
    return NextResponse.json({ ok: true, subject: newSubject, body: newBody });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Rewrite failed' }, { status: 500 });
  }
}
