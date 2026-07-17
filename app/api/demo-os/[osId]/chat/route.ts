import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { resolveTrade, resolveTradeKey } from '@/data/demo-os-trades';
import { priceBookFor } from '@/data/demo-os-pricebooks';
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
  const preset = resolveTrade(cfg);

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

  let body: { mode?: 'chat' | 'ad' | 'campaign'; goal?: string; messages?: { role: 'user' | 'assistant'; content: string }[] } = {};
  try {
    body = await req.json();
  } catch {
    /* fall through to 400 */
  }
  const mode = body.mode === 'ad' ? 'ad' : body.mode === 'campaign' ? 'campaign' : 'chat';
  const goal = typeof body.goal === 'string' ? body.goal.slice(0, 200) : '';
  const history = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  if (mode === 'chat' && (!history.length || history[history.length - 1].role !== 'user')) {
    return NextResponse.json({ error: 'Say something first.' }, { status: 400 });
  }

  const place = [cfg.city, cfg.state].filter(Boolean).join(', ');
  const tradeLabel = preset.label;
  const book = priceBookFor(resolveTradeKey(cfg));
  const dataSummary = [
    `Business: ${cfg.business} (${tradeLabel}${place ? `, ${place}` : ''}). Phone: ${cfg.phone}. Typical ${preset.jobWord} value in this trade: ~$${preset.avgTicket.toLocaleString()}.`,
    `This week (sample data): revenue $${preset.weekRevenue.toLocaleString()}, pipeline: ${preset.customers.map((c) => `${c.name} (${c.need}, $${c.value}, ${preset.stages[c.stage]})`).join('; ')}.`,
    `Overnight calls the AI receptionist caught: ${preset.overnightCalls.map((c) => `${c.caller} at ${c.time}: ${c.need} -> ${c.outcome}`).join('; ')}.`,
    `Today: ${preset.todayJobs.map((j) => `${j.time} ${j.title} (${j.who})`).join('; ')}.`,
    `${preset.signature.title} (${preset.signature.metricLabel}: ${preset.signature.metricValue}): ${preset.signature.rows.map((r) => `${r.title} [${r.tag}${typeof r.amount === 'number' ? `, $${r.amount.toLocaleString()}` : `, ${r.amount}`}]: ${r.sub}`).join('; ')}.`,
    `Price book (sample, editable in the Quotes module): ${book.items.map((i) => `${i.name} $${i.price.toLocaleString()} ${i.unit}`).join('; ')}.`,
    `Other modules the owner can open: Quotes (branded ${book.docWord.toLowerCase()}s that get signed on the phone), Jobs (the day's run sheet, finished work invoices itself), Campaigns (growth plays + the Ad studio), Money, Books, Reviews, Automations.`,
  ].join('\n');

  const system =
    mode === 'ad'
      ? `You write one short social ad for ${cfg.business}, a ${tradeLabel} business${place ? ` in ${place}` : ''}. Reply with EXACTLY two lines: line 1 a punchy headline under 60 characters, line 2 body copy under 140 characters ending with a reason to call ${cfg.phone}. Confident, local, written in the working language of the ${tradeLabel} trade (the jobs, seasons, and emergencies its customers actually have), never generic small-business copy. Never invent prices, discounts, awards, or years in business. No em dashes, no hashtags, no quotes around the lines.`
      : mode === 'campaign'
        ? `You design ONE marketing campaign for ${cfg.business}, a ${tradeLabel} business${place ? ` in ${place}` : ''}, to be run automatically by their business software (texts, emails, ads, and an AI receptionist that books ${preset.jobWord}s).${goal ? ` The owner's goal, in their words: ${goal}.` : ''} Reply with EXACTLY five lines and nothing else, no labels, no numbering: line 1 the campaign name under 40 characters; line 2 the one-line promise under 110 characters; lines 3-5 three steps the software runs, each under 90 characters, each starting with a verb. Speak the working language of the ${tradeLabel} trade. Reach only people who already know the business or its neighborhood; never spam strangers. Never invent prices, discounts, or awards. No em dashes, no hashtags, no markdown.`
        : `You are the AI office assistant inside ${cfg.business}'s demo command center, built by Modern Mustard Seed. You speak the working language of the ${tradeLabel} trade. The dashboard data you can see:\n${dataSummary}\nAll figures are SAMPLE data for this demo; say so if asked about accuracy. Be warm, sharp, and useful: answer questions about the day, the pipeline, the ${preset.signature.title.toLowerCase()}, the overnight calls, the price book, or any module; draft texts, replies, quotes, or review responses on request. Keep replies to 1 to 3 short sentences unless drafting something. Plain text only: no markdown, no asterisks, no bullet syntax (the chat renders raw text). If asked to do something outside the demo (send, buy, post), explain the real build does it and this preview shows the draft. No em dashes. If asked what it costs or how to get the real thing: book a call with Sarah at modernmustardseed.com/book.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: mode === 'ad' ? 120 : mode === 'campaign' ? 240 : 320,
      system,
      messages:
        mode === 'ad'
          ? [{ role: 'user', content: 'Write the ad now.' }]
          : mode === 'campaign'
            ? [{ role: 'user', content: 'Design the campaign now.' }]
            : history,
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
