import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * WHO OPENED THE PREP.
 *
 * A prospect gets a deck, an audit and a demo site before they say yes. Each
 * of those pages sends one beacon here on load and the row lands in
 * prep_visits, so "has he looked yet" has an answer.
 *
 * The beacon is a no-cors POST with a text/plain body, which browsers send
 * without a preflight, so there is nothing to negotiate. The body is parsed
 * by hand for the same reason. Only projects on the allowlist are recorded,
 * and the address is stored as a salted day hash, never raw.
 */

const PROJECTS = new Set(['built-right']);
// Every page a prospect can open: the pitch (deck, audit, site) and the close
// (quote, start, done) and the forms (onboard, handover). Sarah asks 'has he
// opened anything yet' and the answer has to cover the pages that matter most.
const SURFACES = new Set(['deck', 'audit', 'site', 'quote', 'start', 'done', 'onboard', 'handover']);

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>;
  } catch {
    return cors(NextResponse.json({ ok: false }, { status: 400 }));
  }
  const project = String(body.project ?? '').slice(0, 40);
  const surface = String(body.surface ?? '').slice(0, 20);
  const path = String(body.path ?? '/').slice(0, 300);
  const referrer = String(body.ref ?? '').slice(0, 500) || null;
  if (!PROJECTS.has(project) || !SURFACES.has(surface)) {
    return cors(NextResponse.json({ ok: false }, { status: 400 }));
  }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = ip ? createHash('sha256').update(`${ip}|${day}|prep-visit`).digest('hex').slice(0, 24) : null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 300) || null;
  const country = req.headers.get('x-vercel-ip-country');
  const region = req.headers.get('x-vercel-ip-country-region');
  const city = req.headers.get('x-vercel-ip-city');

  const sb = getSupabase();
  if (sb) {
    await sb.from('prep_visits').insert({
      project,
      surface,
      path,
      referrer,
      country,
      region,
      city: city ? decodeURIComponent(city) : null,
      ua,
      ip_hash: ipHash,
    });
  }
  return cors(NextResponse.json({ ok: true }));
}
