import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { OS_PRESETS } from '@/data/demo-os';
import type { OsDemoConfig } from '@/lib/outbound-demo';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ osId: string }>;

/**
 * The one live-AI surface inside the forged BUSINESS OS demo: the office
 * assistant chat and the ad maker's "new angle" button. Hard-capped and
 * fail-closed (never-leak-revenue rule): 60 calls per demo LIFETIME via an
 * atomic-ish app_state counter, short outputs, Haiku. Unguessable demo id is
 * the access key; no id, no tokens.
 */
const LIFETIME_CAP = 60;
const CAP_KEY = (id: string) => `demoos:use:${id}`;

export async function POST(req: Request, { params }: { params: Params }) {
  const { osId } = await params;
  const sb = getSupabase();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!sb || !apiKey) return NextResponse.json({ error: 'Demo assistant is warming up.' }, { status: 503 });
  if (!/^[0-9a-f-]{36}$/i.test(osId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: demo } = await sb.from('outbound_demo_os').select('config').eq('id', osId).maybeSingle();
  if (!demo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const cfg = demo.config as OsDemoConfig;
  const preset = OS_PRESETS[cfg.niche] ?? OS_PRESETS.other;

  // Cap check, fail closed: unreadable counter means no call.
  const { data: capRow, error: capErr } = await sb.from('app_state').select('value').eq('key', CAP_KEY(osId)).maybeSingle();
  if (capErr) return NextResponse.json({ error: 'Assistant is resting. Try again shortly.' }, { status: 429 });
  const used = (capRow?.value as { count?: number } | null)?.count ?? 0;
  if (used >= LIFETIME_CAP) {
    return NextResponse.json({
      reply: 'This demo assistant has hit its preview limit. In the real build I answer all day, every day. Ask Sarah at Modern Mustard Seed to make me permanent.',
      capped: true,
    });
  }
  const { error: bumpErr } = await sb.from('app_state').upsert({ key: CAP_KEY(osId), value: { count: used + 1 } });
  if (bumpErr) return NextResponse.json({ error: 'Assistant is resting. Try again shortly.' }, { status: 429 });

  let body: { mode?: 'chat' | 'ad'; messages?: { role: 'user' | 'assistant'; content: string }[] } = {};
  try {
    body = await req.json();
  } catch {
    /* fall through to 400 */
  }
  const mode = body.mode === 'ad' ? 'ad' : 'chat';
  const history = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  if (mode === 'chat' && (!history.length || history[history.length - 1].role !== 'user')) {
    return NextResponse.json({ error: 'Say something first.' }, { status: 400 });
  }

  const place = [cfg.city, cfg.state].filter(Boolean).join(', ');
  const dataSummary = [
    `Business: ${cfg.business} (${cfg.tradeLabel}${place ? `, ${place}` : ''}). Phone: ${cfg.phone}.`,
    `This week (sample data): revenue $${preset.weekRevenue.toLocaleString()}, pipeline: ${preset.customers.map((c) => `${c.name} (${c.need}, $${c.value}, ${preset.stages[c.stage]})`).join('; ')}.`,
    `Overnight calls the AI receptionist caught: ${preset.overnightCalls.map((c) => `${c.caller} at ${c.time}: ${c.need} -> ${c.outcome}`).join('; ')}.`,
    `Today: ${preset.todayJobs.map((j) => `${j.time} ${j.title} (${j.who})`).join('; ')}.`,
  ].join('\n');

  const system =
    mode === 'ad'
      ? `You write one short social ad for ${cfg.business}, a ${cfg.tradeLabel} business${place ? ` in ${place}` : ''}. Reply with EXACTLY two lines: line 1 a punchy headline under 60 characters, line 2 body copy under 140 characters ending with a reason to call ${cfg.phone}. Confident, local, specific to the trade. Never invent prices, discounts, awards, or years in business. No em dashes, no hashtags, no quotes around the lines.`
      : `You are the AI office assistant inside ${cfg.business}'s demo command center, built by Modern Mustard Seed. The dashboard data you can see:\n${dataSummary}\nAll figures are SAMPLE data for this demo; say so if asked about accuracy. Be warm, sharp, and useful: answer questions about the day, the pipeline, and the overnight calls; draft texts, replies, or review responses on request. Keep replies to 1 to 3 short sentences unless drafting something. If asked to do something outside the demo (send, buy, post), explain the real build does it and this preview shows the draft. No em dashes. If asked what it costs or how to get the real thing: book a call with Sarah at modernmustardseed.com/book.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: mode === 'ad' ? 120 : 320,
      system,
      messages: mode === 'ad' ? [{ role: 'user', content: 'Write the ad now.' }] : history,
    });
    const reply = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return NextResponse.json({ reply, remaining: Math.max(0, LIFETIME_CAP - used - 1) });
  } catch {
    return NextResponse.json({ error: 'The assistant lost its train of thought. Try again.' }, { status: 502 });
  }
}
