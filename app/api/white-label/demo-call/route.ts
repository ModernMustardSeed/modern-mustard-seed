/**
 * THE WHITE LABEL DEMO CALL.
 *
 * Builds a live in-browser voice agent for a sample client, branded as the
 * agency showing it. The agent speaks as the client's business, names the
 * agency as the one who set it up, and never says Modern Mustard Seed or
 * Sarah: that is the whole product being demonstrated.
 *
 * It rides on the demo-agent rails on purpose. `metadata.kind = 'demo-agent'`
 * plus a stored run is what lets /api/voice resolve check_availability and
 * book_appointment against the sample client's own demo calendar, and what
 * sends Sarah the end-of-call summary. A white label demo is a sales signal
 * like any other built demo, so it should land in her inbox the same way.
 *
 * Every gate fails CLOSED, because minutes cost money:
 *   - honeypot and a per-instance IP throttle
 *   - its own daily cap, separate from the public build's, so agency meetings
 *     can never starve the voice-agent build page (or the other way round)
 *   - five minute calls
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { getAssistantModel, demoModel, SPEAKING_PIPELINE, type BuiltCall } from '@/lib/demo-agent';
import { demoBookingTools } from '@/lib/demo-booking-tools';
import { demoVoice } from '@/lib/demo-voice';
import { saveRun } from '@/lib/demo-run-store';
import { getVertical } from '@/data/demo-agent';
import { wlSample, wlClean } from '@/data/white-label';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DAILY_CAP = 40;
const CALL_SECONDS = 300;

const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 8;
}

type Body = { agency?: string; client?: string; sample?: string; city?: string; website?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited', message: 'That is a lot of demo calls in an hour. Try again shortly.' }, { status: 429 });

  const agency = wlClean(body.agency) || 'Your Agency';
  const sample = wlSample(body.sample);
  const client = wlClean(body.client, 80) || sample.client;
  const city = wlClean(body.city) || 'your town';

  const db = getSupabase();
  const apiKey = (process.env.VAPI_API_KEY || '').trim();
  if (!db || !apiKey) return NextResponse.json({ error: 'unavailable', message: 'The demo line is offline right now.' }, { status: 503 });

  const count = await bumpDay(db);
  if (count === null) return NextResponse.json({ error: 'unavailable', message: 'The demo line is offline right now.' }, { status: 503 });
  if (count > DAILY_CAP) {
    return NextResponse.json({ error: 'cooling', message: 'The demo line has taken its calls for today. It opens again tomorrow.' }, { status: 429 });
  }

  const base = await getAssistantModel(apiKey);
  if (!base) return NextResponse.json({ error: 'unavailable', message: 'The demo line is offline right now.' }, { status: 503 });

  // The stored run is what the voice webhook books against. Owner reads as the
  // agency so the booking alert says whose meeting it came from.
  const runId = randomUUID();
  const saved = await saveRun(db, runId, {
    business: client,
    verticalId: sample.verticalId,
    city,
    ownerName: `${agency} (white label demo)`,
    services: sample.services,
    hours: sample.hours,
    flow: 'outbound',
    voice: 'female',
    email: 'white-label-demo@modernmustardseed.com',
    ip,
    createdAt: new Date().toISOString(),
  });
  if (!saved) return NextResponse.json({ error: 'unavailable', message: 'The demo line is offline right now.' }, { status: 503 });

  const scenario = getVertical(sample.verticalId).scenario;
  const call: BuiltCall = {
    firstMessage: `Thanks for calling ${client}, how can I help you today?`,
    model: demoModel(base, prompt({ agency, client, city, services: sample.services, hours: sample.hours, scenario }), new Set(), demoBookingTools(client)),
    transcriber: {
      provider: 'deepgram',
      model: 'nova-3',
      language: 'en',
      numerals: true,
      keyterm: [...new Set([client, agency, city].filter(Boolean))].slice(0, 6),
    },
    ...SPEAKING_PIPELINE,
    maxDurationSeconds: CALL_SECONDS,
    metadata: { kind: 'demo-agent', mode: 'web', runId, business: client.slice(0, 80), whiteLabel: agency.slice(0, 60) },
    voice: demoVoice('female'),
  };

  return NextResponse.json({ ok: true, call });
}

function prompt(p: { agency: string; client: string; city: string; services: string; hours: string; scenario: string }): string {
  return `You are the AI receptionist for ${p.client} in ${p.city}. You answer the phone the way the best front desk hire would: warm, quick, and sure of what you know. You speak as the business: "we", "us", "our".

This is a live demonstration that ${p.agency} set up. The person talking to you is most likely someone from ${p.agency}, or a business owner ${p.agency} is showing you to. Treat every turn as a real customer call unless they step out of the role.

# What you know about ${p.client} (your ONLY facts)
- ${p.services}
- Hours: ${p.hours}
- What calls look like in this line of work: ${p.scenario}

# Getting callers on the schedule
You have a real calendar for ${p.client} and you can book on it now.
- Call check_availability BEFORE you say any day or time. Offer two of the times it returns, in its own wording.
- When they pick one, call book_appointment with that slot's exact startsAt and their name. Then say the day and time back and tell them they are booked.
- Never say someone will call them back to confirm a time. You confirm it.
- Only when nothing suits them, use take_message.

# If they step out of the role
- If asked what you are: you are an AI receptionist that ${p.agency} built and runs for ${p.client}. Say it plainly and proudly.
- If asked who makes the technology, who is behind it, or what company built you: ${p.agency}. That is the only company you ever name besides ${p.client}.
- If asked what it costs: ${p.agency} will walk them through it. Do not say a number.
- If they ask how to get one for their own business: tell them ${p.agency} sets it up, and that this exact receptionist could be answering their phone within a week.

# Hard rules
- NEVER invent prices, policies, insurance answers or advice you were not given. Take their name and number and say the office will confirm that today.
- Never mention any studio, vendor, platform or person other than ${p.client} and ${p.agency}. You do not know of any.
- You are an AI and say so whenever asked. Never pretend to be human.
- Turns are one or two sentences. Natural, zero pushiness. No em dashes.
- If you did not catch something, ask once, then take your best read and keep going.
- A US phone number has exactly ten digits; if you heard more or fewer, take it again.
- Read back every name, phone number and email before it goes into a tool.`;
}

async function bumpDay(db: NonNullable<ReturnType<typeof getSupabase>>): Promise<number | null> {
  const key = `white-label:day:${new Date().toISOString().slice(0, 10)}`;
  const { data, error } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
  if (error) return null;
  const count = ((data?.value as { count?: number } | null)?.count ?? 0) + 1;
  const { error: upErr } = await db.from('app_state').upsert({ key, value: { count }, updated_at: new Date().toISOString() });
  return upErr ? null : count;
}
