/**
 * THE BLUEPRINT. The free MUSTARD LAUNCH lead magnet. The visitor typed their
 * idea into the launch console and gave an email to "save the mission." This:
 *   1. Guards (honeypot, IP throttle, durable free-credit check that fails closed)
 *   2. Captures the lead (source mustard-launch-blueprint)
 *   3. Generates ONE personalized launch Blueprint from the Claude API
 *   4. Stores the run so it is preloaded in the Launch Deck after purchase
 *   5. Returns { runId, blueprint } to play the ignition reveal
 */

import { NextResponse } from 'next/server';
import { getSupabase, insertLead } from '@/lib/supabase';
import { generateBlueprint } from '@/lib/mustard-launch';
import { countLaunchRuns, saveLaunchRun } from '@/lib/mustard-launch-store';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_RUNS_PER_EMAIL = 2;

// Soft per-instance IP throttle (durable limit is per email below).
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
  let body: { idea?: string; email?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Honeypot: real founders never fill the hidden "website" field.
  if (body.website) {
    return NextResponse.json({ error: 'coach_unavailable' }, { status: 503 });
  }

  const idea = (body.idea || '').trim().slice(0, 400);
  const email = (body.email || '').trim().toLowerCase();
  if (idea.length < 3) return NextResponse.json({ error: 'no_idea' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'bad_email' }, { status: 400 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const supabase = getSupabase();

  // Durable free-credit check. Fails CLOSED: if the count itself errors, we do
  // not hand out a live model call.
  if (supabase) {
    const count = await countLaunchRuns(supabase, email);
    if (count === null) return NextResponse.json({ error: 'coach_unavailable' }, { status: 503 });
    if (count >= MAX_RUNS_PER_EMAIL) {
      return NextResponse.json(
        { error: 'credit_spent', message: 'You have used your free Blueprints. Get the Launch Kit to generate your whole launch.' },
        { status: 402 }
      );
    }
  }

  // Capture the lead before the model call so no launch goes unattributed.
  try {
    await insertLead({
      type: 'contact',
      email,
      name: null,
      source: 'mustard-launch-blueprint',
      status: 'new',
      notes: `[launch-blueprint] ${idea.slice(0, 200)}`,
    });
  } catch {
    /* non-fatal */
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const blueprint = await generateBlueprint(idea);
  if (!blueprint) return NextResponse.json({ error: 'coach_unavailable' }, { status: 502 });

  // Store the run (explicit id so we can serve the PDF and preload the Deck).
  const runId = crypto.randomUUID();
  if (supabase) {
    try {
      await saveLaunchRun(supabase, { id: runId, email, idea, blueprint });
    } catch {
      /* non-fatal, the client still gets the blueprint */
    }
  }

  return NextResponse.json({ runId, blueprint });
}
