/**
 * The gated Mr. Mustard launch coach chat. Requires a signed-in client session
 * with the Launch Room subscription (the live coach is the Room's headline
 * value; Kit buyers get a 403 upsell). Context-aware: knows their idea, their
 * one-liner, and the phase they are working.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getClientSession } from '@/lib/client-auth';
import { getLaunchTier, buildLaunchSystemPrompt } from '@/lib/mustard-launch';
import { getSupabase } from '@/lib/supabase';
import { getLatestLaunchRun } from '@/lib/mustard-launch-store';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tier = await getLaunchTier(session.email);
  if (tier === 'none') return NextResponse.json({ error: 'not_entitled' }, { status: 403 });
  if (tier !== 'room') {
    return NextResponse.json(
      { error: 'room_only', message: 'The live coach is part of the Launch Room. Open the Room to have Mr. Mustard work it with you.' },
      { status: 403 }
    );
  }

  let body: { messages?: ChatMessage[]; currentPhase?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const incoming = (body.messages || [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (incoming.length === 0 || incoming[incoming.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'no_message' }, { status: 400 });
  }

  // Pull their saved idea + blueprint one-liner for coaching continuity.
  let idea: string | undefined;
  let oneLiner: string | undefined;
  const supabase = getSupabase();
  if (supabase) {
    const latest = await getLatestLaunchRun(supabase, session.email);
    idea = latest?.idea;
    oneLiner = latest?.blueprint?.oneLiner;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 700,
      system: buildLaunchSystemPrompt({ tier, idea, oneLiner, currentPhase: body.currentPhase?.slice(0, 60) }),
      messages: incoming,
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('launch coach claude error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'coach_unavailable' }, { status: 502 });
  }
}
