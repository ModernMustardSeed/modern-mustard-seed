import { NextResponse } from 'next/server';
import { makeChallenge } from '@/lib/human-check';
import { CLIENT_PROJECTS } from '@/lib/client-leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The form asks for a question, shows it, and sends the answer back with the
 * lead. Same origin rules as the lead endpoint itself.
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
  if (!origin) return NextResponse.json({ error: 'origin not allowed' }, { status: 403 });
  return cors(NextResponse.json(makeChallenge()), origin);
}
