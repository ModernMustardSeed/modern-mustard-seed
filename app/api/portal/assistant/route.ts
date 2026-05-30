import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { displayForIso } from '@/lib/booking';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * The in-portal AI guide. Scoped strictly to the signed-in client's own data
 * (their project, files, downloads, calls). It gives guided tours, answers
 * questions about their engagement, and helps them use what was built. It can
 * never see another client's account.
 */

const SYSTEM_PROMPT = `You are the Mustard Seed guide, the AI assistant inside a client's private Modern Mustard Seed portal. Modern Mustard Seed is Sarah Scarano's one-person AI product studio.

Your job:
- Help this client understand their project status, find their files, see upcoming calls, and use what Sarah built for them.
- If they bought a playbook (PDF), help them get the most from it and answer questions about applying it.
- Offer a short guided tour of their portal when they arrive or ask for one.
- When useful, suggest booking a call (their portal has a booking button) or point them to the right section.

Voice:
- Warm, brief, direct. No em dashes anywhere. Use periods, commas, parentheses.
- 2 to 5 sentences. Plain words.
- You only know THIS client's account. If they ask about something you cannot see, say so plainly and suggest they email sarah@modernmustardseed.com.
- Never invent project details, dates, prices, or files that are not in the context. If it is not in the context, say you are not sure and Sarah can confirm.`;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ reply: 'The assistant is not configured yet. Email sarah@modernmustardseed.com and she will help directly.' });

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  if (incoming.length === 0) return NextResponse.json({ error: 'Say something first.' }, { status: 400 });

  // Build a compact, strictly-scoped context for this email.
  const email = session.email;
  const supabase = getSupabase();
  const ctx: string[] = [`Client email: ${email}`];
  if (supabase) {
    try {
      const { data: c } = await supabase.from('clients').select('name, company, tier, welcome_note').eq('email', email).maybeSingle();
      if (c) ctx.push(`Client: ${c.name ?? 'unknown'}${c.company ? `, ${c.company}` : ''} (tier: ${c.tier}).`);
    } catch {}
    try {
      const { data: projects } = await supabase.from('projects').select('name, status, summary, progress, milestones, launch_target').eq('client_email', email);
      for (const p of projects ?? []) {
        const ms = Array.isArray(p.milestones) ? (p.milestones as Array<{ title: string; done?: boolean }>).map((m) => `${m.done ? '[done]' : '[ ]'} ${m.title}`).join('; ') : '';
        ctx.push(`Project "${p.name}": status ${p.status}, ${p.progress}% complete${p.launch_target ? `, launch target ${p.launch_target}` : ''}. ${p.summary ?? ''} Milestones: ${ms || 'none yet'}.`);
      }
    } catch {}
    try {
      const { data: files } = await supabase.from('client_files').select('label, kind').eq('client_email', email);
      if (files?.length) ctx.push(`Files available: ${files.map((f) => `${f.label} (${f.kind})`).join(', ')}.`);
    } catch {}
    try {
      const { data: orders } = await supabase.from('orders').select('product_name').eq('email', email).eq('status', 'paid');
      if (orders?.length) ctx.push(`Playbooks purchased: ${orders.map((o) => o.product_name).join(', ')}.`);
    } catch {}
    try {
      const { data: booked } = await supabase.from('leads').select('timeline').eq('email', email).eq('source', 'mustard-seed-booking').eq('status', 'booked').gte('timeline', new Date().toISOString()).order('timeline', { ascending: true });
      const next = booked?.find((b) => b.timeline);
      if (next) ctx.push(`Next call: ${displayForIso(next.timeline as string).display}.`);
    } catch {}
  }
  const contextBlock = ctx.join('\n');

  const anthropic = new Anthropic({ apiKey });
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Here is everything you know about this client (and nothing about anyone else):\n\n${contextBlock}` },
      ],
      messages: incoming.map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return NextResponse.json({ reply: reply || 'Tell me a little more and I will help.' });
  } catch (err) {
    console.error('portal assistant error', err);
    return NextResponse.json({ reply: 'I hit a snag. Try again, or email sarah@modernmustardseed.com.' });
  }
}
