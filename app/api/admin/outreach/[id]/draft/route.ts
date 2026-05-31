import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { templateFor, RUBRIC, type ChannelType } from '@/lib/outreach';

export const runtime = 'nodejs';
export const maxDuration = 40;

/**
 * The agentic step. Reads what Sarah knows about the prospect, scores fit
 * against the five-point rubric, and personalizes the correct verbatim
 * template into a ready-to-review draft. Sarah always approves before anything
 * sends. It never invents facts that are not in the notes.
 */
const SYSTEM_PROMPT = `You are Sarah Scarano's partner-outreach drafter for Modern Mustard Seed. You do two things, honestly and generously.

1) Score the prospect's fit, 1 to 5 on each of five dimensions:
${RUBRIC.map((r) => `- ${r.key} (${r.label}): a 5 means "${r.five}"`).join('\n')}

2) Personalize the provided message template by filling ONLY the bracketed placeholders from the prospect's notes. Keep every non-bracketed sentence exactly as written. This is a finished, brand-approved template; do not rewrite it.

Rules:
- No em dashes anywhere. Use periods, commas, parentheses.
- Never invent facts. Only use specifics that appear in the notes. If a bracket cannot be filled truthfully from the notes, write a tasteful, genuine, non-specific version instead (for example, "the work you share").
- Warm, specific, human. Honest, never hypey.

Output ONLY valid JSON, no prose, in this exact shape:
{"fit":{"audience":n,"trust":n,"values":n,"buildClient":n,"warmth":n},"rationale":"one short sentence","subject":"the subject or empty string","body":"the personalized message"}`;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured (set ANTHROPIC_API_KEY).' }, { status: 503 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data: prospect } = await supabase.from('prospects').select('*').eq('id', id).maybeSingle();
  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

  const channel = (prospect.channel_type as ChannelType) || 'email';
  const tpl = templateFor(channel, 1);

  const userMsg = `Prospect: ${prospect.name}
Channel: ${channel}
Their work / channel: ${prospect.channel ?? 'unknown'}
Tier: ${prospect.tier}
What I know about their public work (use ONLY this for specifics):
${prospect.notes ?? '(no notes provided)'}

Template to personalize${tpl.subject ? ` (subject: "${tpl.subject}")` : ''}:
"""
${tpl.body}
"""`;

  const anthropic = new Anthropic({ apiKey });
  let parsed: { fit?: Record<string, number>; rationale?: string; subject?: string; body?: string };
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMsg }],
    });
    const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
    const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error('outreach draft failed', err);
    return NextResponse.json({ error: 'Could not draft. Try again.' }, { status: 502 });
  }

  const fit = parsed.fit ?? {};
  const clamp = (n: unknown) => Math.min(5, Math.max(0, Math.round(Number(n) || 0)));
  const breakdown = {
    audience: clamp(fit.audience), trust: clamp(fit.trust), values: clamp(fit.values),
    buildClient: clamp(fit.buildClient), warmth: clamp(fit.warmth), rationale: (parsed.rationale ?? '').slice(0, 400),
  };
  const fitScore = breakdown.audience + breakdown.trust + breakdown.values + breakdown.buildClient + breakdown.warmth;

  await supabase.from('prospects').update({ fit_score: fitScore, fit_breakdown: breakdown, status: 'drafted' }).eq('id', id);

  // Replace any existing touch-1 draft for this prospect.
  await supabase.from('outreach_messages').delete().eq('prospect_id', id).eq('touch', 1).eq('status', 'draft');
  const { data: message } = await supabase
    .from('outreach_messages')
    .insert({ prospect_id: id, touch: 1, channel, subject: parsed.subject ?? tpl.subject ?? null, body: parsed.body ?? tpl.body, status: 'draft' })
    .select()
    .single();

  return NextResponse.json({ ok: true, fitScore, breakdown, message });
}
