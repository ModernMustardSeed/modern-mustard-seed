import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { KINDS, openDays, zoneLabel, HORIZON_DAYS, LEAD_HOURS, type SlotKind } from '@/lib/client-booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHAT TIMES ARE OPEN, for the booking page on a client's own site.
 *
 * The page asks for this once per kind and renders exactly what comes back.
 * Availability is never computed in the browser, because a slot a visitor can
 * see has to be a slot they can have.
 *
 * Same origin rules as the lead endpoint, so the only sites that can read a
 * client's diary are that client's own.
 */
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin') ?? '';
  for (const p of Object.values(CLIENT_PROJECTS)) if (p.origins.includes(origin)) return origin;
  return null;
}
function cors(res: NextResponse, origin: string | null): NextResponse {
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function OPTIONS(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return new NextResponse(null, { status: 403 });
  return cors(new NextResponse(null, { status: 204 }), origin);
}

export async function GET(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return cors(NextResponse.json({ ok: false, error: 'origin not allowed' }, { status: 403 }), null);

  const url = new URL(req.url);
  const projectKey = url.searchParams.get('project') ?? '';
  const project = CLIENT_PROJECTS[projectKey];
  if (!project) return cors(NextResponse.json({ ok: false, error: 'unknown project' }, { status: 400 }), origin);
  if (!project.origins.includes(origin)) return cors(NextResponse.json({ ok: false, error: 'origin not allowed for this project' }, { status: 403 }), origin);

  const kind = (url.searchParams.get('kind') ?? 'consult') as SlotKind;
  if (!KINDS[kind]) return cors(NextResponse.json({ ok: false, error: 'unknown kind' }, { status: 400 }), origin);

  const sb = getSupabase();
  if (!sb) return cors(NextResponse.json({ ok: false, error: 'booking is not available right now' }, { status: 503 }), origin);

  const days = await openDays(sb, { project: projectKey, clientEmail: project.clientEmail, kind });
  const rule = KINDS[kind];
  return cors(
    NextResponse.json({
      ok: true,
      zone: zoneLabel(new Date()),
      leadHours: LEAD_HOURS,
      horizonDays: HORIZON_DAYS,
      phone: project.phone,
      kinds: Object.values(KINDS).map((k) => ({ key: k.key, label: k.label, minutes: k.minutes, blurb: k.blurb, places: k.places, needsAddress: k.needsAddress })),
      kind: { key: rule.key, label: rule.label, minutes: rule.minutes, blurb: rule.blurb, places: rule.places, needsAddress: rule.needsAddress },
      days,
    }),
    origin
  );
}
