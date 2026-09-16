import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { isCode, recordVisit } from '@/lib/campaigns';

export const runtime = 'nodejs';

/**
 * A SCAN LANDED. The client's site posts here once when a page opens with
 * ?src=<code> in the address. The code is counted against its campaign and
 * nothing else is kept about the visitor beyond a salted hash of the browser,
 * which exists only so one person reloading is not ten scans.
 */
function cors(res: NextResponse, origin: string | null): NextResponse {
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  return res;
}
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin') ?? '';
  for (const p of Object.values(CLIENT_PROJECTS)) if (p.origins.includes(origin)) return origin;
  return null;
}

export async function OPTIONS(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return new NextResponse(null, { status: 403 });
  return cors(new NextResponse(null, { status: 204 }), origin);
}

export async function POST(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return NextResponse.json({ ok: false }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return cors(NextResponse.json({ ok: false }, { status: 400 }), origin);
  }
  const project = CLIENT_PROJECTS[String(body.project ?? '')];
  const code = String(body.src ?? '').trim().toLowerCase();
  if (!project || !isCode(code)) return cors(NextResponse.json({ ok: false }, { status: 400 }), origin);
  const sb = getSupabase();
  if (!sb) return cors(NextResponse.json({ ok: false }, { status: 503 }), origin);

  const ua = req.headers.get('user-agent') ?? '';
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const uaHash = createHash('sha256').update(`${ip}|${ua}|${day}|visit`).digest('hex').slice(0, 24);
  // One person, one scan a day. A reload or a back-button is not a second sign.
  const { data: dup } = await sb.from('client_visits').select('id').eq('client_email', project.clientEmail).eq('campaign_code', code).eq('ua_hash', uaHash).limit(1);
  if (dup && dup.length) return cors(NextResponse.json({ ok: true, counted: false }), origin);

  const counted = await recordVisit(sb, project.clientEmail, code, typeof body.path === 'string' ? body.path.slice(0, 300) : null, typeof body.ref === 'string' ? body.ref.slice(0, 300) : null, uaHash);
  return cors(NextResponse.json({ ok: true, counted }), origin);
}
