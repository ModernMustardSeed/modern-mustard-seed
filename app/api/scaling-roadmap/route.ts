import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { runScalingRoadmap, type RoadmapContext } from '@/lib/scaling-roadmap';
import { saveRoadmap } from '@/lib/roadmap-store';
import { deliverRoadmap } from '@/lib/roadmap-delivery';

export const runtime = 'nodejs';
// The read is capped at 22s and the model call measures 60 to 120s at 12k output
// tokens, so the ceiling has to leave room for a slow site AND a slow model.
export const maxDuration = 300;

/**
 * Public roadmap endpoint. The engine lives in lib/scaling-roadmap so the admin
 * desk and the seed script generate the identical document.
 *
 * Every successful run is persisted immediately, before any email is asked for.
 * That is the point: the row is the lead, and the slug is the share link.
 */

/**
 * A cheap per-IP throttle. This is a free tool that spends real model tokens, so
 * one bored visitor must not be able to hold the wallet open. In-memory means
 * per-instance rather than global, which is fine: it exists to stop a loop, not
 * a determined attacker, and it costs nothing.
 */
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 4;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep the map from growing forever on a long-lived instance.
  if (hits.size > 2000) {
    for (const [k, v] of hits) if (v.every((t) => now - t > RATE_WINDOW_MS)) hits.delete(k);
  }
  return false;
}

const clean = (v: unknown, max = 400): string | undefined => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return s || undefined;
};

export async function POST(req: Request) {
  let body: {
    url?: string;
    email?: string;
    name?: string;
    phone?: string;
    context?: Record<string, unknown>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32);

  if (rateLimited(ipHash)) {
    return NextResponse.json(
      { error: 'That is four roadmaps in an hour. Take one for a walk first, then come back.' },
      { status: 429 }
    );
  }

  // ⚠️ THE GATE. Sarah, 2026-08-07: "must get their info first".
  //
  // The roadmap costs real model tokens to produce and is the top of the whole
  // funnel, so it is no longer handed to anonymous traffic. Name and a real
  // email before anything is generated. The report still renders in full on the
  // page the moment it is ready (nothing is held back or drip-fed), and a copy
  // is emailed automatically, so the trade is honest: your address for the
  // document, delivered both ways, immediately.
  const email = (body.email ?? '').trim().toLowerCase();
  const name = (body.name ?? '').trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'We need a real email to send your roadmap to.' }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'Tell us your name first.' }, { status: 400 });
  }

  const raw = (body.context ?? {}) as Record<string, unknown>;
  const context: RoadmapContext = {
    revenue: clean(raw.revenue, 120),
    team_size: clean(raw.team_size, 120),
    main_offer: clean(raw.main_offer, 400),
    price_point: clean(raw.price_point, 200),
    biggest_headache: clean(raw.biggest_headache, 600),
    goal: clean(raw.goal, 400),
  };

  // Medium effort by default (high measured 320s for the model call alone, which
  // does not fit here), and a deadline 20s under the ceiling so the engine
  // declines a retry it cannot finish instead of handing the visitor a 504.
  const result = await runScalingRoadmap(body.url ?? '', context, { deadlineMs: 280_000 });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Persist, but never let a storage failure cost the visitor their roadmap.
  const saved = await saveRoadmap({
    url: result.url,
    host: result.host,
    report: result.report,
    context,
    source: 'public',
    ipHash,
  });

  // They gave us the address before we spent a token, so the copy goes out
  // automatically rather than waiting behind a second form. Best effort: a
  // failed send must never cost them the roadmap they are already looking at.
  if (saved?.slug) {
    try {
      await deliverRoadmap({
        slug: saved.slug,
        email,
        name,
        phone: (body.phone ?? '').trim(),
      });
    } catch (err) {
      console.error('scaling-roadmap: delivery failed', err);
    }
  }

  return NextResponse.json({
    ok: true,
    url: result.url,
    host: result.host,
    slug: saved?.slug ?? null,
    report: result.report,
    emailed: Boolean(saved?.slug),
  });
}
