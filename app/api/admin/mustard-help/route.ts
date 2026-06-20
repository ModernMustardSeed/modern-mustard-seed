import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from '@/lib/admin-auth';
import { buildHelpKnowledge, MUSTARD_HELP_SYSTEM } from '@/lib/mustard-help-knowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Msg = { role: 'user' | 'assistant'; content: string };

/**
 * The internal Mr. Mustard: an in-house guide for the team (Polly) versed on all
 * MMS procedures and services. Admin-gated. Knowledge is composed from the same
 * data the onboarding hub, call script, and outreach playbook use, so it is
 * always current.
 */
export async function POST(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').replace(/\\r|\\n/g, '').replace(/[\r\n]/g, '').trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Mr. Mustard is not configured yet (no API key).' }, { status: 500 });
  }

  let body: { messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const history = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const messages = history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Ask a question to get started.' }, { status: 400 });
  }

  const system = MUSTARD_HELP_SYSTEM.replace('${KNOWLEDGE}', buildHelpKnowledge());

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system,
      messages,
    });
    const reply = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return NextResponse.json({ reply: reply || 'Sorry, I lost my train of thought. Ask me again?' });
  } catch (err) {
    console.error('mustard-help error', err);
    return NextResponse.json({ error: 'Mr. Mustard had a hiccup. Try again in a moment.' }, { status: 500 });
  }
}
