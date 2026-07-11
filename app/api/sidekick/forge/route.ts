/**
 * The Sidekick Forge API.
 *
 * mode "web"  : forge the persona, record the run, return assistantOverrides
 *               for the in-browser call (the guaranteed primary beat).
 * mode "phone": the encore. Rings the visitor's cell with THEIR Sidekick,
 *               once per run and once per phone number, user-initiated.
 *
 * Every gate fails CLOSED. Voice minutes cost real money:
 *   - honeypot + per-instance IP throttle
 *   - 1 forge per email, atomic via app_state pk claim (lib/sidekick-store)
 *   - 1 ring per phone number, same mechanism
 *   - global daily backstop across all visitors
 *   - Vapi billing failure trips a loud kill switch email to Sarah
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { resendClient } from '@/lib/send-email';
import { getSupabase, insertLead } from '@/lib/supabase';
import { forgeCall, ringDemoCall, toE164, type SidekickProfile } from '@/lib/sidekick';
import {
  claimEmail,
  claimPhone,
  claimRing,
  releaseRing,
  releaseKey,
  bumpDailyCount,
  saveRun,
  getRun,
  markRunRang,
  type SidekickRun,
} from '@/lib/sidekick-store';
import { SIDEKICK, getVertical } from '@/data/sidekick';

export const runtime = 'nodejs';
export const maxDuration = 30;

const GLOBAL_DAILY_CAP = 20;

// Soft per-instance IP throttle (the durable limits are per email/phone).
const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 5;
}

/** Escape user-typed values before they ride inside notification email HTML. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function notifySarah(subject: string, lines: string[]) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return;
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject,
      html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">${lines
        .map((l) => `<p style="margin:0 0 8px">${l}</p>`)
        .join('')}</div>`,
    });
  } catch (err) {
    console.error('sidekick notify failed', err instanceof Error ? err.message : err);
  }
}

type Body = {
  mode?: 'web' | 'phone';
  business?: string;
  vertical?: string;
  city?: string;
  ownerName?: string;
  services?: string;
  hours?: string;
  email?: string;
  /** phone mode */
  runId?: string;
  phone?: string;
  /** honeypot: humans never fill this */
  website?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Honeypot: give bots a plausible success that costs nothing.
  if (body.website) return NextResponse.json({ ok: true, runId: 'forged' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const supabase = getSupabase();
  // The caps live in Supabase. No store access = no free minutes. Fail closed.
  if (!supabase) return NextResponse.json({ error: 'forge_offline' }, { status: 503 });

  if (body.mode === 'phone') return handleRing(supabase, body);
  return handleForge(supabase, body, ip);
}

async function handleForge(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  body: Body,
  ip: string
) {
  const business = (body.business || '').trim().slice(0, 80);
  const city = (body.city || '').trim().slice(0, 60);
  const ownerName = (body.ownerName || '').trim().slice(0, 60);
  const services = (body.services || '').trim().slice(0, 400);
  const hours = (body.hours || '').trim().slice(0, 120);
  const verticalId = getVertical((body.vertical || '').trim()).id;
  const email = (body.email || '').trim().toLowerCase();

  if (business.length < 2) return NextResponse.json({ error: 'no_business' }, { status: 400 });
  if (ownerName.length < 2) return NextResponse.json({ error: 'no_name' }, { status: 400 });
  if (city.length < 2) return NextResponse.json({ error: 'no_city' }, { status: 400 });
  if (services.length < 10) return NextResponse.json({ error: 'no_services' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'bad_email' }, { status: 400 });

  const runId = randomUUID();

  // Cap 1: one forge per email, forever. Atomic (pk claim), fails closed.
  const emailClaim = await claimEmail(supabase, email, runId);
  if (emailClaim === 'error') return NextResponse.json({ error: 'forge_offline' }, { status: 503 });
  if (emailClaim === 'taken') {
    return NextResponse.json(
      { error: 'already_forged', message: 'You already forged your Sidekick. Ready to put him on your real phones? That is the button below.' },
      { status: 402 }
    );
  }

  // Cap 2: global daily backstop. Fails closed; releases the email claim so a
  // genuine visitor can come back tomorrow.
  const todayCount = await bumpDailyCount(supabase);
  if (todayCount === null) {
    await releaseKey(supabase, 'email', email);
    return NextResponse.json({ error: 'forge_offline' }, { status: 503 });
  }
  if (todayCount > GLOBAL_DAILY_CAP) {
    await releaseKey(supabase, 'email', email);
    await notifySarah('SIDEKICK FORGE: daily cap reached', [
      `The forge hit its ${GLOBAL_DAILY_CAP}-demo daily cap. Latest attempt: ${business} (${email}).`,
      'Raise GLOBAL_DAILY_CAP in app/api/sidekick/forge/route.ts if this is good traffic.',
    ]);
    return NextResponse.json(
      { error: 'forge_cooling', message: 'The forge is cooling down after a busy day. Come back tomorrow, or call Mr. Mustard right now at ' + SIDEKICK.phoneLine + '.' },
      { status: 429 }
    );
  }

  const profile: SidekickProfile = { business, verticalId, city, ownerName, services, hours: hours || undefined };
  const run: SidekickRun = { ...profile, email, ip, createdAt: new Date().toISOString() };

  if (!(await saveRun(supabase, runId, run))) {
    await releaseKey(supabase, 'email', email);
    return NextResponse.json({ error: 'forge_offline' }, { status: 503 });
  }

  const forged = await forgeCall(profile, runId, 'web');
  if (!forged.ok) {
    // Release every claim so a transient Vapi outage never locks this visitor out.
    await releaseKey(supabase, 'email', email);
    console.error('sidekick forge failed', forged.error);
    return NextResponse.json({ error: 'forge_offline' }, { status: 503 });
  }

  // The lead is the floor value of every demo. Capture before the fun starts.
  try {
    await insertLead({
      type: 'contact',
      email,
      name: ownerName,
      source: 'sidekick-forge',
      status: 'new',
      notes: `[sidekick] ${business} · ${getVertical(verticalId).label} · ${city} · taught him: ${services.slice(0, 160)}`,
    });
  } catch {
    /* non-fatal */
  }

  await notifySarah(`SIDEKICK FORGED: ${business} (${city})`, [
    `<strong>${esc(ownerName)}</strong> just forged a Sidekick for <strong>${esc(business)}</strong> (${getVertical(verticalId).label}, ${esc(city)}).`,
    `Email: ${esc(email)}`,
    `Taught him: ${esc(services.slice(0, 300))}`,
    `Run ${runId}. Transcript lands in the Vapi dashboard under metadata kind=sidekick-demo.`,
  ]);

  return NextResponse.json({ runId, call: forged.call, phoneLine: SIDEKICK.phoneLine });
}

async function handleRing(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  body: Body
) {
  const runId = (body.runId || '').trim();
  const to = toE164(body.phone);
  if (!runId) return NextResponse.json({ error: 'no_run' }, { status: 400 });
  if (!to) return NextResponse.json({ error: 'bad_phone', message: 'That does not look like a US phone number. He only makes domestic calls for now.' }, { status: 400 });

  const run = await getRun(supabase, runId);
  if (!run) return NextResponse.json({ error: 'no_run' }, { status: 404 });
  if (run.phoneCallId) {
    return NextResponse.json({ error: 'already_rang', message: 'He already made his one demo call. Keep him and he makes the rest on your line.' }, { status: 402 });
  }

  // Cap A: one ring per RUN, atomic. Concurrent requests on the same runId
  // cannot fan out to N numbers (the phoneCallId check above is check-then-act).
  const ringClaim = await claimRing(supabase, runId);
  if (ringClaim === 'error') return NextResponse.json({ error: 'forge_offline' }, { status: 503 });
  if (ringClaim === 'taken') {
    return NextResponse.json({ error: 'already_rang', message: 'He already made his one demo call. Keep him and he makes the rest on your line.' }, { status: 402 });
  }

  // Cap B: one ring per phone number, ever. Atomic (pk claim), fails closed.
  const phoneClaim = await claimPhone(supabase, to, runId);
  if (phoneClaim === 'error') {
    await releaseRing(supabase, runId);
    return NextResponse.json({ error: 'forge_offline' }, { status: 503 });
  }
  if (phoneClaim === 'taken') {
    await releaseRing(supabase, runId);
    return NextResponse.json({ error: 'already_rang', message: 'This number already met its Sidekick. Ready for the real thing?' }, { status: 402 });
  }

  const profile: SidekickProfile = {
    business: run.business,
    verticalId: run.verticalId || 'other',
    city: run.city || '',
    ownerName: run.ownerName || 'there',
    services: run.services || '',
    hours: run.hours,
  };

  const forged = await forgeCall(profile, runId, 'phone');
  if (!forged.ok) {
    await releaseKey(supabase, 'phone', to);
    await releaseRing(supabase, runId);
    return NextResponse.json({ error: 'forge_offline' }, { status: 503 });
  }

  const rang = await ringDemoCall(forged.call, to);
  if (!rang.ok) {
    await releaseKey(supabase, 'phone', to);
    await releaseRing(supabase, runId);
    if (rang.billing) {
      // Kill switch: the wallet is empty. Sarah hears about it immediately.
      // Awaited on purpose: Vercel may freeze the function after the response,
      // and this is the alert that also means inbound Mr. Mustard is down.
      await notifySarah('SIDEKICK KILL SWITCH: Vapi wallet problem', [
        `A demo ring to ${to} for ${esc(run.business)} failed with a billing error: ${esc(rang.error)}`,
        'Top up at dashboard.vapi.ai. Inbound Mr. Mustard is likely down too.',
      ]);
    }
    console.error('sidekick ring failed', rang.error);
    return NextResponse.json({ error: 'ring_failed', message: 'The call could not go out just now. The browser demo above still works, and Mr. Mustard is live at ' + SIDEKICK.phoneLine + '.' }, { status: 502 });
  }

  await markRunRang(supabase, runId, run, to, rang.callId);

  return NextResponse.json({ ok: true, from: SIDEKICK.phoneLine });
}
