import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getPartnerGuide, setPartnerGuide, type PartnerGuide } from '@/lib/partner-guide';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read or write one partner's field guide (lib/partner-guide.ts).
 *   GET  /api/admin/partner-guide?code=EASTON      -> { guide | null }
 *   POST /api/admin/partner-guide  { guide }        -> { ok }
 * Admin session only. The partner reads their own copy at /partners/hq/guide.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const code = new URL(req.url).searchParams.get('code')?.trim() ?? '';
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });
  const guide = await getPartnerGuide(code);
  return NextResponse.json({ guide });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: { guide?: PartnerGuide };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const g = body.guide;
  if (!g || typeof g.code !== 'string' || !g.code.trim() || typeof g.title !== 'string' || !Array.isArray(g.sections)) {
    return NextResponse.json({ error: 'guide needs code, title and sections' }, { status: 400 });
  }
  const ok = await setPartnerGuide(g);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Could not save the guide' }, { status: 500 });
}
