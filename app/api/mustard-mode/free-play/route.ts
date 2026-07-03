/**
 * The Multiplier's live reply. The visitor typed an ambition on /mustard-mode,
 * got the instant cached opener client-side, and gave an email to "save the
 * run." This route:
 *   1. Captures the lead (source mustard-mode-free-play)
 *   2. Enforces the free credit (2 live replies per email, durable via mustard_runs)
 *   3. Returns one personalized Mr. Mustard reply from the Claude API
 *   4. Stores the run so it is preloaded in the HQ when they buy
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase, insertLead } from '@/lib/supabase';
import { FREE_PLAY_SYSTEM } from '@/lib/mustard-mode';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_RUNS_PER_EMAIL = 2;

// Soft per-instance IP throttle (the durable limit is per email below).
const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 6;
}

export async function POST(req: Request) {
  let body: { ambition?: string; email?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Honeypot: real players never fill the hidden "website" field. Bots that do
  // get a plausible success and cost us nothing.
  if (body.website) {
    return NextResponse.json({ reply: 'Nice run. Check your inbox to continue.' });
  }

  const ambition = (body.ambition || '').trim().slice(0, 300);
  const email = (body.email || '').trim().toLowerCase();
  if (!ambition || ambition.length < 3) return NextResponse.json({ error: 'no_ambition' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'bad_email' }, { status: 400 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const supabase = getSupabase();

  // Durable free-credit check. Fails CLOSED: if the check itself errors we do
  // not hand out live model calls.
  if (supabase) {
    const { count, error } = await supabase
      .from('mustard_runs')
      .select('id', { count: 'exact', head: true })
      .eq('email', email);
    if (error) {
      console.error('free-play credit check failed', error.message);
      return NextResponse.json({ error: 'coach_unavailable' }, { status: 503 });
    }
    if ((count ?? 0) >= MAX_RUNS_PER_EMAIL) {
      return NextResponse.json({
        error: 'credit_spent',
        message: 'Your free credit is played. Level up to keep coaching with Mr. Mustard.',
      }, { status: 402 });
    }
  }

  // Capture the lead before the model call so no delight goes unattributed.
  try {
    await insertLead({
      type: 'contact',
      email,
      name: null,
      source: 'mustard-mode-free-play',
      status: 'new',
      notes: `[free-play] ${ambition.slice(0, 180)}`,
    });
  } catch {
    /* non-fatal */
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let reply = '';
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      system: FREE_PLAY_SYSTEM,
      messages: [{ role: 'user', content: `My ambition: ${ambition}` }],
    });
    reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  } catch (err) {
    console.error('free-play claude error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'coach_unavailable' }, { status: 502 });
  }

  // Store the run so the HQ preloads it after purchase.
  if (supabase) {
    try {
      await supabase.from('mustard_runs').insert({ email, ambition, reply });
    } catch {
      /* non-fatal */
    }
  }

  return NextResponse.json({ reply });
}
