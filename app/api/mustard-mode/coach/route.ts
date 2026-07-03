/**
 * The gated Mr. Mustard coach chat. Requires a signed-in client session with a
 * MUSTARD MODE entitlement. Context-aware: knows the player's tier, current
 * track/mission, and their saved free-play run.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getClientSession } from '@/lib/client-auth';
import { getMustardTier, buildCoachSystemPrompt } from '@/lib/mustard-mode';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tier = await getMustardTier(session.email);
  if (tier === 'none') return NextResponse.json({ error: 'not_entitled' }, { status: 403 });

  let body: { messages?: ChatMessage[]; trackName?: string; missionTitle?: string };
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

  // Pull the saved free-play run for coaching continuity.
  let savedRun: string | undefined;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('mustard_runs')
        .select('ambition')
        .eq('email', session.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      savedRun = (data?.ambition as string | undefined) || undefined;
    } catch {
      /* optional context */
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 700,
      system: buildCoachSystemPrompt({
        tier,
        trackName: body.trackName?.slice(0, 60),
        missionTitle: body.missionTitle?.slice(0, 100),
        savedRun,
      }),
      messages: incoming,
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('coach claude error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'coach_unavailable' }, { status: 502 });
  }
}
