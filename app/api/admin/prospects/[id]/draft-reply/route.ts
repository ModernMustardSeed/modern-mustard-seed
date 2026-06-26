import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Draft a reply to a lead based on what they actually wrote, plus what we know
 * about them (their business and audit). Interactive and low-volume (one click
 * when Sarah is replying), so it uses the metered Anthropic API, unlike the bulk
 * audits/scripts which run through Claude Code. Returns just the body text for
 * Sarah to tweak and send.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data, error } = await sb.from('rep_prospects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const p = data as Prospect;

  const { data: lastIn } = await sb
    .from('messages')
    .select('subject,body,snippet')
    .eq('prospect_id', id)
    .eq('direction', 'inbound')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/\\n$/, '');
  if (!apiKey) return NextResponse.json({ error: 'AI is not configured.' }, { status: 500 });

  const audit = p.audit_json;
  const prompt = [
    'You are Sarah Scarano, founder of Modern Mustard Seed, an AI and web studio for local businesses. Write a warm, concise, genuine reply to a lead who emailed back. Sound like a real person, not a template or a salesbot. Plain words. No em dashes (use periods, commas, parentheses). The goal is to move toward a quick call or sending the free audit, without being pushy. Match their tone.',
    `The lead is ${p.business}${p.city ? `, ${p.city}` : ''}.`,
    audit ? `We audited their website: ${p.audit_score} out of 100. ${audit.headline}. The top fix we found: ${audit.top_three_fixes?.[0]?.title ?? 'several high-impact improvements'}.` : '',
    `Here is the message they sent:\n"""\n${(lastIn?.body || lastIn?.snippet || '(no message captured, write a friendly check-in that offers the free audit)').slice(0, 3000)}\n"""`,
    'Write ONLY the reply body, 2 to 5 short sentences. No subject line, no greeting line beyond a natural opener, no signature.',
  ].filter(Boolean).join('\n\n');

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = r.content.find((b) => b.type === 'text');
    const draft = block && block.type === 'text' ? block.text.trim() : '';
    if (!draft) return NextResponse.json({ error: 'No draft generated.' }, { status: 502 });
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    console.error('draft-reply failed', err);
    return NextResponse.json({ error: 'Could not draft a reply. Try again.' }, { status: 500 });
  }
}
